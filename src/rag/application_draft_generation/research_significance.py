from functools import partial
from string import Template
from typing import Any, Final, cast

from sqlalchemy import insert, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.constants import PREMIUM_TEXT_GENERATION_MODEL
from src.db.tables import Application, TextGenerationResult
from src.exceptions import DatabaseError
from src.rag.application_draft_generation.shared_prompts import (
    BASE_SYSTEM_PROMPT,
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
)
from src.rag.dto import DocumentDTO, GenerationResultDTO
from src.rag.retrieval import retrieve_documents
from src.rag.search_queries import handle_create_search_queries
from src.rag.utils import CompletionsResult, handle_completions_request, handle_segmented_text_generation
from src.utils.logging import get_logger
from src.utils.serialization import serialize

logger = get_logger(__name__)

SIGNIFICANCE_GENERATION_USER_PROMPT: Final[Template] = Template("""
Your task is to create the significance section for a grant application.
${previous_part_text}

Use the following sources to write the text:

1. Research Significance Description:
    <significance_description>
    ${significance_description}
    </significance_description>

2. The full text of the research plan section:
    <research_plan_text>
    ${research_plan_text}
    </research_plan_text>

3. RAG Retrieval Results for additional context:
    <rag_results>
    ${rag_results}
    </rag_results>

4. Grant Funding Organization:
    <grant_funding_organization>
    ${grant_funding_organization}
    </grant_funding_organization>

5. CFP Code and Title:
    <cfp_title>
    ${cfp_title}
    </cfp_title>

6. Grant Application Title:
    <application_title>
    ${application_title}
    </application_title>

The significance section should highlight the importance of the problem or critical barrier that the project addresses, and how it impacts both the scientific field and human lives.
It should address the following implicit questions:

1. What is the core problem or challenge this project aims to address?
2. Why is this problem significant, and how does it impact human lives?
3. How does this problem relate to the stated aims of the funding program?
4. What is the current state of research in relevant fields?
5. What recent efforts have been made to solve this problem?
6. Why were those efforts insufficient?
7. What is the hypothesis for the right path to solving the problem?
8. How is this solution transformative compared to previous approaches?
9. How could this solution improve human lives in the future?

The significance section should open with an introductory paragraph or two that contextualizes the research project. It should go into detail about the research project itself.

Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for roughly one page length (~400-500 words).
""")

RESEARCH_SIGNIFICANCE_QUERIES_PROMPT: Final[Template] = Template("""
The next task in the RAG pipeline is to generate the significance section for a grant application.

This section should explain the importance of the problem or critical barrier that the project addresses, and how it impacts human lives.
The text should answer the following (implicit) questions:

- What is the problem or challenge the project aims to solve?
- Why is this problem significant and how does it impact human lives?
- How is the problem related to the stated aims of the program you are submitting to?
- What is the current state of research in the relevant fields related to the problem?
- What has been done in recent years to solve the problem?
- Why were those efforts insufficient?
- What is the hypothesis about the right path to solving the problem?
- How is this solution transformational in comparison to what has been done before?
- How could this solution improve human lives in the future?

This is the the description of the research significance provided by the user ${significance_description}
""")


async def generate_significance_text(
    previous_part_text: str | None,
    *,
    application: Application,
    retrieval_results: list[DocumentDTO],
    research_plan_text: str,
) -> CompletionsResult[GenerationResultDTO]:
    """Generate a part of the significance text.

    Args:
        previous_part_text: The previous part of the significance text, if any.
        application: The grant application.
        retrieval_results: The results of the RAG retrieval.
        research_plan_text: The text of the research plan section.

    Returns:
        The generation result tuple.
    """
    user_prompt = SIGNIFICANCE_GENERATION_USER_PROMPT.substitute(
        application_title=application.title,
        cfp_title=f"{application.cfp.code} - {application.cfp.title}",
        grant_funding_organization=application.cfp.funding_organization.name,
        previous_part_text=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS.substitute(
            previous_part_text=previous_part_text,
        )
        if previous_part_text
        else "",
        rag_results=serialize(retrieval_results),
        significance_description=application.significance or "No description provided.",
        research_plan_text=research_plan_text,
    ).strip()

    return await handle_completions_request(
        prompt_identifier="significance",
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        model=PREMIUM_TEXT_GENERATION_MODEL,
        response_type=GenerationResultDTO,
    )


async def handle_significance_text_generation(
    *,
    application: Application,
    research_plan_text: str,
    session_maker: async_sessionmaker[Any],
) -> str:
    """Generate the text for the significance section.

    Args:
        application: The grant application.
        research_plan_text: The text of the research plan section.
        session_maker: The session maker.

    Raises:
        DatabaseError: If there was an issue updating the application draft in the database.

    Returns:
        The generated section text.
    """
    async with session_maker() as session:
        if result := await session.scalar(
            select(
                TextGenerationResult.content,
            )
            .where(
                TextGenerationResult.section_type == "significance",
            )
            .where(
                TextGenerationResult.application_id == application.id,
            )
        ):
            return cast(str, result)

    queries_result = await handle_create_search_queries(
        RESEARCH_SIGNIFICANCE_QUERIES_PROMPT.substitute(
            significance_description=application.significance or "No description provided.",
        ).strip()
    )
    search_result = await retrieve_documents(
        application_id=str(application.id),
        search_queries=queries_result.queries,
    )

    handler = partial(
        generate_significance_text,
        application=application,
        research_plan_text=research_plan_text,
        retrieval_results=search_result,
    )

    result = await handle_segmented_text_generation(
        entity_type="significance",
        prompt_handler=handler,
    )

    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(TextGenerationResult).values(
                    {
                        "application_id": application.id,
                        "billable_characters_used": queries_result.billable_characters_used
                        + result.billable_characters_used,
                        "content": result.content,
                        "generation_duration": result.generation_duration,
                        "number_of_api_calls": result.number_of_api_calls,
                        "section_type": "significance",
                        "tokens_used": queries_result.tokens_used,
                    }
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error while saving generated sections.", exec_info=e)
            raise DatabaseError("Error while saving generated sections", context=str(e)) from e

    return cast(str, result.content)
