import logging
from asyncio import gather
from functools import partial
from json import dumps
from textwrap import dedent

from src.constants import FIELD_NAME_PARENT_ID, FIELD_NAME_WORKSPACE_ID
from src.embeddings import generate_embeddings
from src.rag.ai_search import retrieve_documents
from src.rag.dto import DocumentDTO, GenerationResult, ResearchAimDTO, ResearchPlanGenerationResponse, ResearchTaskDTO
from src.rag.prompts import (
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
    RESEARCH_AIM_GENERATION_SYSTEM_PROMPT,
    RESEARCH_AIM_GENERATION_USER_PROMPT,
    RESEARCH_AIM_QUERIES_PROMPT,
    RESEARCH_TASK_GENERATION_CLINICAL_TRIAL_QUESTIONS,
    RESEARCH_TASK_GENERATION_SYSTEM_PROMPT,
    RESEARCH_TASK_GENERATION_USER_PROMPT,
    RESEARCH_TASK_QUERIES_PROMPT,
)
from src.rag.search_queries import create_search_queries
from src.rag.utils import handle_segmented_text_generation, handle_tool_call_request

logger = logging.getLogger(__name__)


async def generate_research_aim_text(
    previous_part_text: str | None,
    *,
    research_aim: ResearchAimDTO,
    retrieval_results: list[DocumentDTO],
    research_task_texts: list[str],
) -> GenerationResult:
    """Generate a part of the research aim text.

    Args:
        previous_part_text: The previous part of the research aim text, if any.
        research_aim: The research aim to generate text for.
        retrieval_results: The results of the RAG retrieval.
        research_task_texts: The research task texts to include in the research aim text.

    Returns:
        GenerationResult: The generated text for the research aim.
    """
    system_prompt = RESEARCH_AIM_GENERATION_SYSTEM_PROMPT.substitute(
        part_generation_instructions=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS if previous_part_text else "",
    ).strip()

    user_prompt = RESEARCH_AIM_GENERATION_USER_PROMPT.substitute(
        research_aim=dumps(
            {
                "title": research_aim["title"],
                "description": research_aim["description"],
            }
        ),
        rag_results=dumps(retrieval_results),
        previous_part_text=previous_part_text,
        research_tasks=dumps(research_task_texts),
    ).strip()

    return await handle_tool_call_request(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )


async def generate_research_task_text(
    previous_part_text: str | None,
    *,
    research_task: ResearchTaskDTO,
    retrieval_results: list[DocumentDTO],
    requires_clinical_trials: bool,
) -> GenerationResult:
    """Generate a part of the research task text.

    Args:
        previous_part_text: The previous part of the research aim text, if any.
        research_task: The research task to generate text for.
        retrieval_results: The results of the RAG retrieval.
        requires_clinical_trials: Whether the research task includes clinical trials.

    Returns:
        GenerationResult: The generated text for the research aim.
    """
    system_prompt = RESEARCH_TASK_GENERATION_SYSTEM_PROMPT.substitute(
        part_generation_instructions=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS if previous_part_text else "",
        clinical_trial_questions=RESEARCH_TASK_GENERATION_CLINICAL_TRIAL_QUESTIONS if requires_clinical_trials else "",
    ).strip()

    user_prompt = RESEARCH_TASK_GENERATION_USER_PROMPT.substitute(
        research_task=dumps(
            {
                "title": research_task["title"],
                "description": research_task["description"],
            }
        ),
        rag_results=dumps(retrieval_results),
        previous_part_text=previous_part_text,
    ).strip()

    return await handle_tool_call_request(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )


async def handle_research_task_text_generation(
    research_task: ResearchTaskDTO,
    workspace_id: str,
    research_aim_id: str,
    requires_clinical_trials: bool,
) -> str:
    """Generate the text for a research task.

    Args:
        research_task: The research task to generate text for.
        workspace_id: The workspace ID.
        research_aim_id: The ID of the research aim.
        requires_clinical_trials: Whether the research task requires clinical trials.

    Returns:
        The generated text for the research task.
    """
    search_queries = await create_search_queries(
        RESEARCH_TASK_QUERIES_PROMPT.substitute(
            research_task=dumps(
                {
                    "title": research_task["title"],
                    "description": research_task["description"],
                }
            )
        ),
    )
    search_filter = f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}' and ({FIELD_NAME_PARENT_ID} eq '{research_task['id']}' or {FIELD_NAME_PARENT_ID} eq '{research_aim_id}')"

    query_embeddings = await generate_embeddings(search_queries)
    search_text = " | ".join([f'"{query}"' for query in search_queries])

    search_result = await retrieve_documents(
        embeddings_matrix=query_embeddings,
        filter_query=search_filter,
        search_text=search_text,
        session_id=workspace_id,
    )

    handler = partial(
        generate_research_task_text,
        research_task=research_task,
        retrieval_results=search_result,
        requires_clinical_trials=requires_clinical_trials,
    )

    result = await handle_segmented_text_generation(
        entity_type="research_task",
        entity_identifier=research_task["id"],
        prompt_handler=handler,
    )

    logger.info("Generated research task %s", result)
    return result


async def handle_research_aim_text_generation(
    research_aim: ResearchAimDTO,
    workspace_id: str,
) -> str:
    """Generate the text for a research aim.

    Args:
        research_aim: The research aim to generate text for.
        workspace_id: The workspace ID.

    Returns:
        The generated text for the research aim.
    """
    research_task_texts = await gather(
        *[
            handle_research_task_text_generation(
                research_task=research_task,
                workspace_id=workspace_id,
                research_aim_id=research_aim["id"],
                requires_clinical_trials=research_aim["requires_clinical_trials"],
            )
            for research_task in research_aim["tasks"]
        ],
    )

    search_queries = await create_search_queries(
        RESEARCH_AIM_QUERIES_PROMPT.substitute(research_aim=dumps(research_aim)),
    )
    search_filter = (
        f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}' and {FIELD_NAME_PARENT_ID} eq '{research_aim['id']}'"
    )

    query_embeddings = await generate_embeddings(search_queries)
    search_text = " | ".join([f'"{query}"' for query in search_queries])

    search_result = await retrieve_documents(
        embeddings_matrix=query_embeddings,
        filter_query=search_filter,
        search_text=search_text,
        session_id=workspace_id,
    )

    handler = partial(
        generate_research_aim_text,
        research_aim=research_aim,
        retrieval_results=search_result,
        research_task_texts=research_task_texts,
    )

    result = await handle_segmented_text_generation(
        entity_type="research_aim",
        entity_identifier=research_aim["id"],
        prompt_handler=handler,
    )
    logger.info("Generated research aim %s", result)

    return result + "\n".join(research_task_texts)


async def generate_research_plan(
    *,
    research_aims: list[ResearchAimDTO],
    workspace_id: str,
) -> ResearchPlanGenerationResponse:
    """Generate a research plan for a grant application.

    Args:
        research_aims: A list of research aims to include in the research plan.
        workspace_id: The workspace ID.

    Returns:
        The generated research plan.
    """
    research_aim_texts: list[str] = await gather(
        *[handle_research_aim_text_generation(research_aim=aim, workspace_id=workspace_id) for aim in research_aims],
    )
    logger.info("Generated research %d research aims", len(research_aim_texts))

    research_aims_text = "\n".join(research_aim_texts)

    research_plan_text = dedent(f"""
    ## Research Plan
    ### Research Aims

    {research_aims_text}
    """).strip()

    return ResearchPlanGenerationResponse(research_plan_text=research_plan_text)
