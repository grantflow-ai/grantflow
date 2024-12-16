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
from src.rag.search_queries import create_search_queries
from src.rag.utils import handle_completions_request, handle_segmented_text_generation
from src.utils.logging import get_logger
from src.utils.serialization import serialize

logger = get_logger(__name__)

SPECIFIC_AIMS_USER_PROMPT: Final[Template] = Template("""
Your task is to write the Specific Aims section for a research grant application.
${previous_part_text}

Use the following sources to write the text:

1. The full text of the research plan, detailing all the research aims and tasks in the application:
    <research_plan_text>
    ${research_plan_text}
    </research_plan_text>

2. The Significance section of the grant application:
    <significance_text>
    ${significance_text}
    </significance_text>

3. The Innovation section of the grant application:
    <innovation_text>
    ${innovation_text}
    </innovation_text>

4. RAG Retrieval Results for additional context:
    <rag_results>
    ${rag_results}
    </rag_results>

The Specific Aims section should clearly and concisely outline the purpose and goals of the proposed research.
It should be one page long (400-500 words) and it should address the following implicit questions:

1. What is the long-term goal of this research?
2. What critical gap in knowledge or problem does this project address?
3. What are the measurable objectives (Specific Aims) of the research?
4. If applicable, what hypotheses are being tested?
5. How will achieving these aims impact the field or address the stated problem?

Ensure that the Specific Aims section:
- Address an important and significant problem in the field.
- Are structured to provide value regardless of the outcome (e.g., designing aims where multiple outcomes are of interest).
- Are tied to a central hypothesis (or hypotheses) to maintain a cohesive theme.
- Clearly aligns with the project's overall significance, innovation, and feasibility.
- Demonstrate potential to advance the field with new discoveries or insights.
- Includes clear endpoints that reviewers can readily assess.
- Reflect a high level of clarity, innovation, and feasibility to engage reviewers effectively.

Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for roughly one page length (~400-500 words).
""")

SPECIFIC_AIMS_QUERIES_PROMPT: Final[str] = """
The next task in the RAG pipeline is to write the Specific Aims section.
The Specific Aims section should clearly and concisely outline the purpose and goals of the proposed research and it should answer the following questions:

1. What is the long-term goal of this research?
2. What critical gap in knowledge or problem does this project address?
3. What are the measurable objectives (Specific Aims) of the research?
4. If applicable, what hypotheses are being tested?
5. How will achieving these aims impact the field or address the stated problem?
"""


async def generate_specific_aims_text(
    previous_part_text: str | None,
    *,
    innovation_text: str,
    research_plan_text: str,
    significance_text: str,
    retrieval_results: list[DocumentDTO],
) -> GenerationResultDTO:
    """Generate the text for the Specific Aims section of a research grant application.

    Args:
        previous_part_text: The previous part of the research aim text, if any.
        innovation_text: The text of the Innovation section of the grant application.
        research_plan_text: The full text of the research plan, detailing all the research aims and tasks in the application.
        significance_text: The Significance section of the grant application.
        retrieval_results: The RAG retrieval results for additional context.

    Returns:
        GenerationResultDTO: The generated text for the research aim.
    """
    user_prompt = SPECIFIC_AIMS_USER_PROMPT.substitute(
        previous_part_text=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS.substitute(
            previous_part_text=previous_part_text,
        )
        if previous_part_text
        else "",
        research_plan_text=research_plan_text,
        significance_text=significance_text,
        innovation_text=innovation_text,
        rag_results=serialize(retrieval_results),
    ).strip()

    return await handle_completions_request(
        prompt_identifier="research_aims",
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        model=PREMIUM_TEXT_GENERATION_MODEL,
    )


async def handle_specific_aims_text_generation(
    *,
    application: Application,
    innovation_text: str,
    research_plan_text: str,
    session_maker: async_sessionmaker[Any],
    significance_text: str,
) -> str:
    """Generate the text for a research aim.

    Args:
        application: The grant application.
        innovation_text: The text of the Innovation section of the grant application.
        research_plan_text: The text of the research plan section.
        session_maker: The session maker.
        significance_text: The Significance section of the grant application.

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
                TextGenerationResult.section_type == "specific-aims",
            )
            .where(
                TextGenerationResult.application_id == application.id,
            )
        ):
            return cast(str, result)

    search_queries = await create_search_queries(SPECIFIC_AIMS_QUERIES_PROMPT)

    search_result = await retrieve_documents(
        application_id=str(application.id),
        search_queries=search_queries,
    )

    handler = partial(
        generate_specific_aims_text,
        innovation_text=innovation_text,
        research_plan_text=research_plan_text,
        significance_text=significance_text,
        retrieval_results=search_result,
    )

    content, number_of_api_calls, generation_duration = await handle_segmented_text_generation(
        entity_type="specific-aims",
        prompt_handler=handler,
    )
    logger.debug("Generated specific aims")

    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(TextGenerationResult).values(
                    {
                        "application_id": application.id,
                        "content": content,
                        "generation_duration": generation_duration,
                        "number_of_api_calls": number_of_api_calls,
                        "section_type": "specific-aims",
                    }
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error while saving generated sections.", exec_info=e)
            raise DatabaseError("Error while saving generated sections") from e

    return content
