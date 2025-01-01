from functools import partial
from string import Template
from typing import Any, Final, cast

from sqlalchemy import insert, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import TextGenerationResult
from src.exceptions import DatabaseError
from src.rag.application_draft.dto import ResearchTaskDTO
from src.rag.application_draft.shared_prompts import (
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

RESEARCH_TASK_GENERATION_BASE_QUESTIONS: Final[str] = """
1. What is task goal or objectives?
2. What is the experimental design methodology used?
3. What are the data collection methods?
4. What is the results analysis and interpretation framework?
"""

RESEARCH_TASK_GENERATION_CLINICAL_TRIAL_QUESTIONS: Final[str] = """
5. If the task includes randomized groups/interventions, what is the sample size, group/intervention information, and method of sample analysis?
6. If the task involves vertebrate animals/humans, what are the pertinent biological variables (e.g. subject sex, age etc.)?
7. If the task involves hazardous elements, what are the detailed hazard descriptions and planned safety measures and precautions?
8. If the task uses Human Embryonic Stem Cells (hESCs) not in the NIH Registry, what is the justification for non-registered hESC usage?
9. If the task uses Human Fetal Tissue (HFT), what is the necessity of HFT, documentation of alternative evaluation methods, and evidence of alternatives consideration?x

Note that these sections should be added only if they apply to the given research task.
"""

RESEARCH_TASK_GENERATION_USER_PROMPT: Final[Template] = Template("""
Your task is to write a research task description.
${previous_part_text}

Use the following sources to write the text:

1. Research Task Data as a JSON object:
    <research_task>
    ${research_task}
    </research_task>

2. RAG Retrieval Results for additional context:
    <rag_results>
    ${rag_results}
    </rag_results>

A research task is a specific task within a larger research aim.
The description should be specific, measurable, achievable, relevant, and time-bound (SMART).
It should address the following implicit questions:

${guiding_questions}

**Important Guidelines**:
- The research task JSON object includes an array of relations with other research tasks. If the array is not empty, make sure to include a detailed description of these relations in the text.
- Do not use the title of the research task in the text - the title will be provided to the user above the text.
- Describe the specific research steps planned in the task in detail.
- Include concrete facts where applicable, citing the relevant source documents when drawing from RAG results

Format your response as a continuous text without headings, bullet points, lists, or tables. Aim for roughly one page length (~300-400 words).
""")

RESEARCH_TASK_QUERIES_PROMPT: Final[str] = """
The next task in the RAG pipeline is to write a description for a research task.
A research task is a specific task within a larger research aim.
The description should be specific, measurable, achievable, relevant, and time-bound (SMART).
The description should address the following implicit questions:
"""

RESEARCH_TASK_TEMPLATE: Final[Template] = Template("""
###### Task ${task_number}: ${title}

${content}
""")


async def generate_research_task_text(
    previous_part_text: str | None,
    *,
    guiding_questions: str,
    research_task: ResearchTaskDTO,
    retrieval_results: list[DocumentDTO],
) -> CompletionsResult[GenerationResultDTO]:
    """Generate a part of the research task text.

    Args:
        previous_part_text: The previous part of the research task text, if any.
        guiding_questions: The guiding questions for the research task.
        research_task: The research task to generate text for.
        retrieval_results: The results of the RAG retrieval.

    Returns:
        The generation result tuple.
    """
    user_prompt = RESEARCH_TASK_GENERATION_USER_PROMPT.substitute(
        research_task=serialize(research_task),
        rag_results=serialize(retrieval_results),
        guiding_questions=guiding_questions,
        previous_part_text=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS.substitute(
            previous_part_text=previous_part_text,
        )
        if previous_part_text
        else "",
    ).strip()

    return await handle_completions_request(
        prompt_identifier="research_tasks",
        system_prompt=BASE_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        response_type=GenerationResultDTO,
    )


async def handle_research_task_text_generation(
    *,
    application_id: str,
    requires_clinical_trials: bool,
    research_task_dto: ResearchTaskDTO,
    research_task_id: str,
    session_maker: async_sessionmaker[Any],
) -> str:
    """Generate the text for a research task.

    Args:
        application_id: The application ID.
        requires_clinical_trials: Whether the research task includes clinical trials.
        research_task_dto: The research task to generate text for.
        research_task_id: The ID of the research task.
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
                TextGenerationResult.section_id == research_task_id,
            )
        ):
            return cast(str, result)

    guiding_questions = (
        f"{RESEARCH_TASK_GENERATION_BASE_QUESTIONS}\n{RESEARCH_TASK_GENERATION_CLINICAL_TRIAL_QUESTIONS}"
        if requires_clinical_trials
        else RESEARCH_TASK_GENERATION_BASE_QUESTIONS
    )

    queries_result = await handle_create_search_queries(
        task_description=RESEARCH_TASK_QUERIES_PROMPT,
        research_task=research_task_dto,
        guiding_questions=guiding_questions,
    )
    search_result = await retrieve_documents(
        application_id=application_id,
        search_queries=queries_result.queries,
    )

    handler = partial(
        generate_research_task_text,
        guiding_questions=guiding_questions,
        research_task=research_task_dto,
        retrieval_results=search_result,
    )

    result = await handle_segmented_text_generation(
        entity_type="research-task",
        entity_identifier=research_task_id,
        prompt_handler=handler,
    )

    logger.info("Generated research task.", task_number=research_task_dto.task_number)

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
                        "section_id": research_task_id,
                        "section_type": "research-task",
                        "tokens_used": queries_result.tokens_used,
                    }
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error while saving generated sections.", exec_info=e)
            raise DatabaseError("Error while saving generated sections", context=str(e)) from e

    return RESEARCH_TASK_TEMPLATE.substitute(
        task_number=research_task_dto.task_number, title=research_task_dto.title, content=cast(str, result.content)
    )
