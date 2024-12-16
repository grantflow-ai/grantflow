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
)
from src.rag.dto import DocumentDTO, GenerationResultDTO
from src.rag.retrieval import retrieve_documents
from src.rag.search_queries import create_search_queries
from src.rag.utils import handle_completions_request, handle_segmented_text_generation
from src.utils.logging import get_logger
from src.utils.serialization import serialize

logger = get_logger(__name__)

INNOVATION_GENERATION_USER_PROMPT: Final[Template] = Template("""
Your task is to write the innovation section for a research grant application.
${previous_part_text}

Use the following sources to write the text:

1. Research Innovation Description:
    <innovation_description>
    ${innovation_description}
    </innovation_description>

2. Previously generated significance section:
    <significance_text>
    ${significance_text}
    </significance_text>

3. The full text of the research plan section:
    <research_plan_text>
    ${research_plan_text}
    </research_plan_text>

4. RAG Retrieval Results for additional context:
    <rag_results>
    ${rag_results}
    </rag_results>

The innovation section should highlight the novel aspects of the proposed project.
It should address the following implicit questions:

1. What makes this project unique compared to previous research?
2. What state-of-the-art technologies will be used in the project?
3. How is the use of these technologies innovative in this research context?
4. If the project aims to develop new tools, how do they differ from existing ones, and how will they benefit the project and the field in general?
5. How does the project challenges or shifts current research or clinical practice paradigms?

Ensure that the text builds upon the significance section and maintains consistency in style, tone, and terminology.

Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for roughly one page length (~400-500 words).
""")

RESEARCH_INNOVATION_QUERIES_PROMPT: Final[Template] = Template("""
The next task in the RAG pipeline is to write the research innovation. This section should answer the following (implicit) questions:

- What makes the project unique compared to what has been done before?
- What state-of-the-art technologies are being planned to use?
- How is the use of these technologies in the research context innovative?
- If the project aims to develop new tools, explain what makes the development different from what already exists in the field and how will t new tools be significant as part of the project and for the field in general?

This is the description of the research innovation provided by the user ${innovation_description}
""")


async def generate_innovation_text(
    previous_part_text: str | None,
    *,
    application: Application,
    research_plan_text: str,
    retrieval_results: list[DocumentDTO],
    significance_text: str,
) -> GenerationResultDTO:
    """Generate a part of the innovation text.

    Args:
        previous_part_text: The previous part of the innovation text, if any.
        application: The grant application.
        research_plan_text: The full text of the research plan section.
        retrieval_results: The results of the RAG retrieval.
        significance_text: The generated significance text.

    Returns:
        GenerationResultDTO: The generated text for the innovation section.
    """
    user_prompt = INNOVATION_GENERATION_USER_PROMPT.substitute(
        innovation_description=application.innovation or "No description provided.",
        significance_text=significance_text,
        rag_results=serialize(retrieval_results),
        previous_part_text=previous_part_text,
        research_plan_text=research_plan_text,
    ).strip()

    return await handle_completions_request(
        prompt_identifier="innovation",
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        model=PREMIUM_TEXT_GENERATION_MODEL,
    )


async def handle_innovation_text_generation(
    *,
    application: Application,
    research_plan_text: str,
    significance_text: str,
    session_maker: async_sessionmaker[Any],
) -> str:
    """Generate the text for the innovation section.

    Args:
        application: The grant application.
        research_plan_text: The text of the research plan section.
        significance_text: The generated significance text.
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
                TextGenerationResult.section_type == "innovation",
            )
            .where(
                TextGenerationResult.application_id == application.id,
            )
        ):
            return cast(str, result)

    search_queries = await create_search_queries(
        RESEARCH_INNOVATION_QUERIES_PROMPT.substitute(
            innovation_description=application.innovation or "No description provided.",
        ).strip()
    )

    search_result = await retrieve_documents(
        application_id=str(application.id),
        search_queries=search_queries,
    )

    handler = partial(
        generate_innovation_text,
        application=application,
        research_plan_text=research_plan_text,
        retrieval_results=search_result,
        significance_text=significance_text,
    )

    content, number_of_api_calls, generation_duration = await handle_segmented_text_generation(
        entity_type="innovation",
        entity_identifier="innovation",
        prompt_handler=handler,
    )

    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(TextGenerationResult).values(
                    {
                        "application_id": application.id,
                        "content": content,
                        "generation_duration": generation_duration,
                        "number_of_api_calls": number_of_api_calls,
                        "section_type": "innovation",
                    }
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error while saving generated sections.", exec_info=e)
            raise DatabaseError("Error while saving generated sections") from e

    return content
