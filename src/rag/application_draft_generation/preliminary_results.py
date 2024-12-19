from functools import partial
from string import Template
from typing import Any, Final, cast

from sqlalchemy import insert, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.constants import PREMIUM_TEXT_GENERATION_MODEL
from src.db.tables import TextGenerationResult
from src.exceptions import DatabaseError
from src.rag.application_draft_generation.shared_prompts import (
    BASE_SYSTEM_PROMPT,
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
)
from src.rag.dto import (
    DocumentDTO,
    GenerationResultDTO,
    ResearchAimDTO,
)
from src.rag.retrieval import retrieve_documents
from src.rag.search_queries import create_search_queries
from src.rag.utils import handle_completions_request, handle_segmented_text_generation
from src.utils.logging import get_logger
from src.utils.serialization import serialize

logger = get_logger(__name__)

PRELIMINARY_RESULTS_GENERATION_USER_PROMPT: Final[Template] = Template("""
You task is to add the preliminary results sub-section to the following research aims text:
    <research_aim_text>
    ${research_aim_text}
    </research_aim_text>

Use the following sources to write the text:

1. User input on preliminary results:
    <preliminary_results>
    ${preliminary_results}
    </preliminary_results>

3. RAG Retrieval Results for additional context as a JSON array:
    <rag_results>
    ${rag_results}
    </rag_results>

Preliminary results are detailed experimental findings and data analyses that demonstrate research feasibility.
They should address the following implicit questions:

1. What experiments/analyses have been conducted?
2. What methods and techniques were used?
3. How was the data analyzed and interpreted?
4. How do these findings support the proposed research?

**Important Guidelines**:
- Generate the text for the subsection preliminary results assuming it will come immediately after the research aim text provided.
- Do not include the provided research aim text in the generated text.
- Do not use the title of the research aim in the text.
- Make sure to include concrete facts where applicable.
""")

PRELIMINARY_RESULTS_QUERIES_PROMPT: Final[Template] = Template("""
""")


async def generate_research_aim_text(
    previous_part_text: str | None,
    *,
    research_aim: ResearchAimDTO,
    research_task_titles: list[str],
    retrieval_results: list[DocumentDTO],
) -> GenerationResultDTO:
    """Generate a part of the research aim text.

    Args:
        previous_part_text: The previous part of the research aim text, if any.
        research_aim: The research aim to generate text for.
        research_task_titles: The titles of the research tasks that are included in this aim.
        retrieval_results: The results of the RAG retrieval.

    Returns:
        GenerationResultDTO: The generated text for the research aim.
    """
    user_prompt = PRELIMINARY_RESULTS_GENERATION_USER_PROMPT.substitute(
        research_aim=serialize(research_aim),
        rag_results=serialize(retrieval_results),
        previous_part_text=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS.substitute(
            previous_part_text=previous_part_text,
        )
        if previous_part_text
        else "",
        research_task_titles=",".join(research_task_titles),
    ).strip()

    return await handle_completions_request(
        prompt_identifier="research_aims",
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        model=PREMIUM_TEXT_GENERATION_MODEL,
        response_type=GenerationResultDTO,
    )


async def handle_research_aim_text_generation(
    *,
    application_id: str,
    research_aim_dto: ResearchAimDTO,
    research_aim_id: str,
    session_maker: async_sessionmaker[Any],
) -> tuple[str, str]:
    """Generate the text for a research aim.

    Args:
        application_id: The application ID.
        research_aim_dto: The research aim to generate text for.
        research_aim_id: The ID of the research aim.
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
                TextGenerationResult.application_id == application_id,
            )
            .where(
                TextGenerationResult.section_id == research_aim_id,
            )
        ):
            return research_aim_id, cast(str, result)

    research_task_titles = [research_task.title for research_task in research_aim_dto.research_tasks]

    search_queries = await create_search_queries(
        PRELIMINARY_RESULTS_QUERIES_PROMPT.substitute(research_aim=serialize(research_aim_dto)),
    )

    search_result = await retrieve_documents(
        application_id=application_id,
        search_queries=search_queries,
    )

    handler = partial(
        generate_research_aim_text,
        research_aim=research_aim_dto,
        retrieval_results=search_result,
        research_task_titles=research_task_titles,
    )

    content, number_of_api_calls, generation_duration = await handle_segmented_text_generation(
        entity_type="research-aim",
        entity_identifier=research_aim_id,
        prompt_handler=handler,
    )
    logger.info("Generated research aim", aim_number=str(research_aim_dto.aim_number))

    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(TextGenerationResult).values(
                    {
                        "application_id": application_id,
                        "content": content,
                        "generation_duration": generation_duration,
                        "number_of_api_calls": number_of_api_calls,
                        "section_id": research_aim_id,
                        "section_type": "research-aim",
                    }
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error while saving generated sections.", exec_info=e)
            raise DatabaseError("Error while saving generated sections", context=str(e)) from e

    return research_aim_id, content
