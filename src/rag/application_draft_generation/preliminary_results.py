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
from src.rag.utils import CompletionsResult, handle_completions_request, handle_segmented_text_generation
from src.utils.logging import get_logger
from src.utils.serialization import serialize

logger = get_logger(__name__)

PRELIMINARY_RESULTS_GENERATION_USER_PROMPT: Final[Template] = Template("""
You task is to write the Preliminary Results section which forms a sub-section for the following research aim text:
    <research_aim_text>
    ${research_aim_text}
    </research_aim_text>

Use the following sources to write the text:

1. User input on Preliminary Results:
    <preliminary_results>
    ${preliminary_results}
    </preliminary_results>

3. Retrieval Results for additional context as a JSON array:
    <rag_results>
    ${rag_results}
    </rag_results>

Preliminary Results are detailed experimental findings and data analyses that demonstrate research feasibility.
This sub-section should address the following implicit questions:

1. What experiments/analyses have been conducted?
2. What methods and techniques were used?
3. How was the data analyzed and interpreted?
4. How do these findings support the proposed research?

**Important Guidelines**:
- Generate the text for the subsection preliminary results assuming it will come immediately after the research aim text provided above.
- Do not include the provided research aim text in the generated text.
- Do not use the title of the research aim in the text and do not add a title.
- Make sure to include concrete facts where applicable.

Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for a minimum of half a page, and a maximum of two pages in length (~200-800 words).
""")

PRELIMINARY_RESULTS_QUERIES_PROMPT: Final[Template] = Template("""
The next task in the RAG pipeline is to write a description for the Preliminary Results section.
Preliminary Results are detailed experimental findings and data analyses that demonstrate research feasibility for a specific research aim or objective.
The description should address the following implicit questions:

1. What experiments/analyses have been conducted?
2. What methods and techniques were used?
3. How was the data analyzed and interpreted?
4. How do these findings support the proposed research?

Here is the user input for preliminary results:
    <preliminary_results>
    ${preliminary_results}
    </preliminary_results>

Here is the description of the research aim:
    <research_aim_text>
    ${research_aim_text}
    </research_aim_text>
""")


async def generate_preliminary_results_text(
    previous_part_text: str | None,
    *,
    research_aim_text: str,
    preliminary_results: str | None,
    retrieval_results: list[DocumentDTO],
) -> CompletionsResult[GenerationResultDTO]:
    """Generate the text for the preliminary results section of a research aim.

    Args:
        previous_part_text: The previous part of the research aim text, if any.
        research_aim_text: The research aim text.
        preliminary_results: The user input for the preliminary results.
        retrieval_results: The results of the RAG retrieval.

    Returns:
        The generation result tuple.
    """
    user_prompt = PRELIMINARY_RESULTS_GENERATION_USER_PROMPT.substitute(
        research_aim_text=research_aim_text,
        rag_results=serialize(retrieval_results),
        preliminary_results=preliminary_results,
        previous_part_text=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS.substitute(
            previous_part_text=previous_part_text,
        )
        if previous_part_text
        else "",
    ).strip()

    return await handle_completions_request(
        prompt_identifier="research_aims",
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        model=PREMIUM_TEXT_GENERATION_MODEL,
        response_type=GenerationResultDTO,
    )


async def handle_preliminary_results_text_generation(
    *,
    application_id: str,
    research_aim_dto: ResearchAimDTO,
    research_aim_description: str,
    session_maker: async_sessionmaker[Any],
) -> str:
    """Generate the text for preliminary results of a research aim.

    Args:
        application_id: The ID of the application.
        research_aim_dto: The research aim DTO.
        research_aim_description: The text of the research aim.
        session_maker: The session maker instance.

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
                TextGenerationResult.section_id == research_aim_dto.id,
            )
            .where(
                TextGenerationResult.section_type == "preliminary-results",
            )
        ):
            return cast(str, result)

    queries_result = await create_search_queries(
        PRELIMINARY_RESULTS_QUERIES_PROMPT.substitute(
            preliminary_results=research_aim_dto.preliminary_results, research_aim_text=research_aim_description
        ),
    )

    search_result = await retrieve_documents(
        application_id=application_id,
        search_queries=queries_result.queries,
    )

    handler = partial(
        generate_preliminary_results_text,
        research_aim_text=research_aim_description,
        retrieval_results=search_result,
        preliminary_results=research_aim_dto.preliminary_results,
    )

    result = await handle_segmented_text_generation(
        entity_type="preliminary-results",
        entity_identifier=research_aim_dto.id,
        prompt_handler=handler,
    )
    logger.info("Generated research aim", aim_number=str(research_aim_dto.aim_number))

    async with session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(TextGenerationResult).values(
                    {
                        "application_id": application_id,
                        "content": result.content,
                        "generation_duration": result.generation_duration,
                        "number_of_api_calls": result.number_of_api_calls,
                        "section_id": research_aim_dto.id,
                        "section_type": "preliminary-results",
                        "billable_characters_used": queries_result.billable_characters_used
                        + result.billable_characters_used,
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
