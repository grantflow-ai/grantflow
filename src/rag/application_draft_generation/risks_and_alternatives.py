from functools import partial
from string import Template
from typing import Any, Final, cast

from sqlalchemy import insert, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.constants import PREMIUM_TEXT_GENERATION_MODEL
from src.db.tables import TextGenerationResult
from src.exceptions import DatabaseError
from src.rag.application_draft_generation.dto import ResearchAimDTO
from src.rag.application_draft_generation.shared_prompts import (
    BASE_SYSTEM_PROMPT,
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
)
from src.rag.dto import (
    DocumentDTO,
    GenerationResultDTO,
)
from src.rag.retrieval import retrieve_documents
from src.rag.search_queries import handle_create_search_queries
from src.rag.utils import CompletionsResult, handle_completions_request, handle_segmented_text_generation
from src.utils.logging import get_logger
from src.utils.serialization import serialize

logger = get_logger(__name__)

RISKS_AND_ALTERNATIVES_GENERATION_USER_PROMPT: Final[Template] = Template("""
You task is to write the Risks and Alternatives which forms a for the following research aim text:
    <research_aim_text>
    ${research_aim_text}
    </research_aim_text>

Use the following sources to write the text:

1. User input on Risks and Alternatives:
    <risks_and_alternatives>
    ${risks_and_alternatives}
    </risks_and_alternatives>

3. Retrieval Results for additional context as a JSON array:
    <rag_results>
    ${rag_results}
    </rag_results>

Risks and Alternatives are potential challenges that may arise during the research process and possible solutions to mitigate them.
This section should address the following implicit questions:

1. What are the specific risks involved in this research, and how would you describe their severity (High/Medium/Low)?
2. What strategies can be implemented to mitigate each identified risk (if applicable/possible)?
3. What alternative approaches are available if these strategies fail (if any)?
4. How should these risks be prioritized based on both their severity and likelihood of occurrence?

**Important Guidelines**:
- Do not include the provided research aim text in the generated text.
- Do not use the title of the research aim in the text and do not add a title.
- Make sure to include concrete facts where applicable.

Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for roughly two to three paragraphs with a maximum length of half a page (~150-300 words).
""")

RISKS_AND_ALTERNATIVES_QUERIES_PROMPT: Final[Template] = Template("""
The next task in the RAG pipeline is to write a description for the Risks and Alternatives section.
Risks and Alternatives are potential challenges that may arise during the research process and possible solutions to mitigate them.
The description should address the following implicit questions:

1. What are the specific risks involved in this research, and how would you describe their severity (High/Medium/Low)?
2. What strategies can be implemented to mitigate each identified risk?
3. What alternative approaches are available if these strategies fail?
4. How should these risks be prioritized based on both their severity and likelihood of occurrence?

Here is the user input for preliminary results:
    <risks_and_alternatives>
    ${risks_and_alternatives}
    </risks_and_alternatives>

Here is the description of the research aim:
    <research_aim_text>
    ${research_aim_text}
    </research_aim_text>
""")


async def generate_risks_and_alternatives_text(
    previous_part_text: str | None,
    *,
    research_aim_text: str,
    risks_and_alternatives: str | None,
    retrieval_results: list[DocumentDTO],
) -> CompletionsResult[GenerationResultDTO]:
    """Generate the text for the preliminary results section of a research aim.

    Args:
        previous_part_text: The previous part of the research aim text, if any.
        research_aim_text: The research aim text.
        risks_and_alternatives: The user input for the preliminary results.
        retrieval_results: The results of the RAG retrieval.

    Returns:
        The generation result tuple.
    """
    user_prompt = RISKS_AND_ALTERNATIVES_GENERATION_USER_PROMPT.substitute(
        research_aim_text=research_aim_text,
        rag_results=serialize(retrieval_results),
        risks_and_alternatives=risks_and_alternatives,
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


async def handle_risks_and_alternatives_text_generation(
    *,
    application_id: str,
    research_aim_dto: ResearchAimDTO,
    research_aim_description: str,
    session_maker: async_sessionmaker[Any],
) -> str:
    """Generate the text for risks and alternatives of a research aim.

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
                TextGenerationResult.section_type == "risks-and-alternatives",
            )
        ):
            return cast(str, result)

    queries_result = await handle_create_search_queries(
        RISKS_AND_ALTERNATIVES_QUERIES_PROMPT.substitute(
            risks_and_alternatives=research_aim_dto.risks_and_alternatives, research_aim_text=research_aim_description
        ),
    )

    search_result = await retrieve_documents(
        application_id=application_id,
        search_queries=queries_result.queries,
    )

    handler = partial(
        generate_risks_and_alternatives_text,
        research_aim_text=research_aim_description,
        retrieval_results=search_result,
        risks_and_alternatives=research_aim_dto.risks_and_alternatives,
    )

    result = await handle_segmented_text_generation(
        entity_type="risks-and-alternatives",
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
                        "billable_characters_used": queries_result.billable_characters_used
                        + result.billable_characters_used,
                        "content": result.content,
                        "generation_duration": result.generation_duration,
                        "number_of_api_calls": result.number_of_api_calls,
                        "section_id": research_aim_dto.id,
                        "section_type": "risks-and-alternatives",
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
