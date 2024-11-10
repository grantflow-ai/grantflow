import logging
from asyncio import gather
from functools import partial
from json import dumps

from src.constants import FIELD_NAME_PARENT_ID, FIELD_NAME_WORKSPACE_ID
from src.embeddings import generate_embeddings
from src.rag.ai_search import retrieve_documents
from src.rag.dto import DocumentDTO, GenerationResult, ResearchAimDTO, ResearchPlanGenerationResult
from src.rag.prompts import (
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
    RESEARCH_AIM_GENERATION_SYSTEM_PROMPT,
    RESEARCH_AIM_GENERATION_USER_PROMPT,
    RESEARCH_AIM_QUERIES_PROMPT,
    RESEARCH_PLAN_SYSTEM_PROMPT,
    RESEARCH_PLAN_USER_PROMPT,
)
from src.rag.search_queries import create_search_queries
from src.rag.utils import handle_segmented_text_generation, handle_tool_call_request

logger = logging.getLogger(__name__)


async def generate_research_aim_text(
    previous_part_text: str | None,
    *,
    research_aim: ResearchAimDTO,
    retrieval_results: list[DocumentDTO],
) -> GenerationResult:
    """Generate a part of the research aim text.

    Args:
        previous_part_text: The previous part of the research aim text, if any.
        research_aim: The research aim to generate text for.
        retrieval_results: The results of the RAG retrieval.

    Returns:
        GenerationResult: The generated text for the research aim.
    """
    system_prompt = RESEARCH_AIM_GENERATION_SYSTEM_PROMPT.substitute(
        part_generation_instructions=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS if previous_part_text else "",
    ).strip()

    user_prompt = RESEARCH_AIM_GENERATION_USER_PROMPT.substitute(
        research_aim=dumps(research_aim),
        rag_results=dumps(retrieval_results),
        previous_part_text=previous_part_text,
    ).strip()

    return await handle_tool_call_request(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )


async def generate_research_plan_text(
    previous_part_text: str | None,
    *,
    application_title: str,
    research_aims_texts: list[str],
) -> GenerationResult:
    """Generate a part of the research plan text.

    Args:
        application_title: The title of the grant application
        previous_part_text: The previous part of the research plan text, if any.
        research_aims_texts: The research aims texts to generate the research plan text for.

    Returns:
        GenerationResult: The generated text for the research plan.
    """
    system_prompt = RESEARCH_PLAN_SYSTEM_PROMPT.substitute(
        part_generation_instructions=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS if previous_part_text else "",
    ).strip()

    user_prompt = RESEARCH_PLAN_USER_PROMPT.substitute(
        application_title=application_title,
        research_aims_texts=dumps(research_aims_texts),
        previous_part_text=previous_part_text,
    ).strip()

    return await handle_tool_call_request(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )


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
    search_queries = await create_search_queries(
        RESEARCH_AIM_QUERIES_PROMPT.substitute(research_aim=dumps(research_aim)),
    )
    parent_id_filter = " or ".join(
        [
            f"{FIELD_NAME_PARENT_ID} eq '{value}'"
            for value in [research_aim["id"], *(task["id"] for task in research_aim["tasks"])]
        ]
    )
    search_filter = f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}' and ({parent_id_filter})"

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
    )

    return await handle_segmented_text_generation(
        entity_type="research_aim",
        entity_identifier=research_aim["id"],
        prompt_handler=handler,
    )


async def handle_research_plan_text_generation(application_title: str, research_aim_texts: list[str]) -> str:
    """Generate the text for a research plan.

    Args:
        application_title: The title of the grant application.
        research_aim_texts: The research aim texts to generate the research plan text for.

    Returns:
        The generated text for the research plan.
    """
    handler = partial(
        generate_research_plan_text,
        application_title=application_title,
        research_aims_texts=research_aim_texts,
    )

    return await handle_segmented_text_generation(
        entity_type="research_plan",
        entity_identifier=application_title,
        prompt_handler=handler,
    )


async def generate_research_plan(
    *,
    application_title: str,
    research_aims: list[ResearchAimDTO],
    workspace_id: str,
) -> ResearchPlanGenerationResult:
    """Generate a research plan for a grant application.

    Args:
        application_title: The title of the grant application.
        research_aims: A list of research aims to include in the research plan.
        workspace_id: The workspace ID.

    Returns:
        The generated research plan.
    """
    research_aim_texts: list[str] = await gather(
        *[handle_research_aim_text_generation(research_aim=aim, workspace_id=workspace_id) for aim in research_aims],
    )
    logger.info("Generated research %d research aims", len(research_aim_texts))

    result = await handle_research_plan_text_generation(
        application_title=application_title,
        research_aim_texts=research_aim_texts,
    )
    return ResearchPlanGenerationResult(
        research_plan_text=result,
    )
