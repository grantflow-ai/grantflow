import logging
from functools import partial
from json import dumps

from src.constants import FIELD_NAME_PARENT_ID, FIELD_NAME_WORKSPACE_ID
from src.embeddings import generate_embeddings
from src.rag.ai_search import retrieve_documents
from src.rag.dto import DocumentDTO, GenerationResult, InnovationAndSignificanceGenerationResult
from src.rag.prompts import (
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
    INNOVATION_GENERATION_SYSTEM_PROMPT,
    INNOVATION_GENERATION_USER_PROMPT,
    SIGNIFICANCE_GENERATION_SYSTEM_PROMPT,
    SIGNIFICANCE_GENERATION_USER_PROMPT,
)
from src.rag.search_queries import create_search_queries
from src.rag.utils import handle_segmented_text_generation, handle_tool_call_request

logger = logging.getLogger(__name__)


async def generate_significance_text(
    previous_part_text: str | None,
    significance_description: str,
    retrieval_results: list[DocumentDTO],
) -> GenerationResult:
    """Generate a part of the significance text.

    Args:
        previous_part_text: The previous part of the significance text, if any.
        significance_description: The description of the research significance.
        retrieval_results: The results of the RAG retrieval.

    Returns:
        GenerationResult: The generated text for the significance section.
    """
    system_prompt = SIGNIFICANCE_GENERATION_SYSTEM_PROMPT.substitute(
        part_generation_instructions=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS if previous_part_text else "",
    ).strip()

    user_prompt = SIGNIFICANCE_GENERATION_USER_PROMPT.substitute(
        significance_description=significance_description,
        rag_results=dumps(retrieval_results),
        previous_part_text=previous_part_text,
    ).strip()

    return await handle_tool_call_request(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )


async def generate_innovation_text(
    previous_part_text: str | None,
    innovation_description: str,
    significance_text: str,
    retrieval_results: list[DocumentDTO],
) -> GenerationResult:
    """Generate a part of the innovation text.

    Args:
        previous_part_text: The previous part of the innovation text, if any.
        innovation_description: The description of the research innovation.
        significance_text: The generated significance text.
        retrieval_results: The results of the RAG retrieval.

    Returns:
        GenerationResult: The generated text for the innovation section.
    """
    system_prompt = INNOVATION_GENERATION_SYSTEM_PROMPT.substitute(
        part_generation_instructions=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS if previous_part_text else "",
    ).strip()

    user_prompt = INNOVATION_GENERATION_USER_PROMPT.substitute(
        innovation_description=innovation_description,
        significance_text=significance_text,
        rag_results=dumps(retrieval_results),
        previous_part_text=previous_part_text,
    ).strip()

    return await handle_tool_call_request(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )


async def handle_significance_text_generation(
    significance_description: str,
    significance_id: str,
    workspace_id: str,
) -> str:
    """Generate the text for the significance section.

    Args:
        significance_description: The description of the research significance.
        significance_id: The ID of the significance section.
        workspace_id: The workspace ID.

    Returns:
        The generated text for the significance section.
    """
    search_queries = await create_search_queries(significance_description)
    query_embeddings = await generate_embeddings(search_queries)
    search_text = " | ".join([f'"{query}"' for query in search_queries])

    search_filter = f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}' and {FIELD_NAME_PARENT_ID} eq '{significance_id}'"

    search_result = await retrieve_documents(
        embeddings_matrix=query_embeddings,
        filter_query=search_filter,
        search_text=search_text,
        session_id=workspace_id,
    )

    handler = partial(
        generate_significance_text,
        significance_description=significance_description,
        retrieval_results=search_result,
    )

    return await handle_segmented_text_generation(
        entity_type="significance",
        entity_identifier=significance_id,
        prompt_handler=handler,
    )


async def handle_innovation_text_generation(
    innovation_description: str,
    innovation_id: str,
    significance_text: str,
    workspace_id: str,
) -> str:
    """Generate the text for the innovation section.

    Args:
        innovation_description: The description of the research innovation.
        innovation_id: The ID of the innovation section.
        significance_text: The generated significance text.
        workspace_id: The workspace ID.

    Returns:
        The generated text for the innovation section.
    """
    search_queries = await create_search_queries(innovation_description)
    query_embeddings = await generate_embeddings(search_queries)
    search_text = " | ".join([f'"{query}"' for query in search_queries])

    search_filter = f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}' and {FIELD_NAME_PARENT_ID} eq '{innovation_id}'"

    search_result = await retrieve_documents(
        embeddings_matrix=query_embeddings,
        filter_query=search_filter,
        search_text=search_text,
        session_id=workspace_id,
    )

    handler = partial(
        generate_innovation_text,
        innovation_description=innovation_description,
        significance_text=significance_text,
        retrieval_results=search_result,
    )

    return await handle_segmented_text_generation(
        entity_type="innovation",
        entity_identifier=innovation_id,
        prompt_handler=handler,
    )


async def generate_significance_and_innovation(
    *,
    significance_description: str,
    innovation_description: str,
    significance_id: str,
    innovation_id: str,
    workspace_id: str,
) -> InnovationAndSignificanceGenerationResult:
    """Generate the significance and innovation sections for a grant application.

    Args:
        significance_description: The description of the research significance.
        innovation_description: The description of the research innovation.
        significance_id: The ID of the significance section.
        innovation_id: The ID of the innovation section.
        workspace_id: The workspace ID.

    Returns:
        A tuple containing the generated significance and innovation texts.
    """
    significance_text = await handle_significance_text_generation(
        significance_description=significance_description,
        significance_id=significance_id,
        workspace_id=workspace_id,
    )
    logger.info("Generated significance section: %s", significance_text)

    innovation_text = await handle_innovation_text_generation(
        innovation_description=innovation_description,
        innovation_id=innovation_id,
        significance_text=significance_text,
        workspace_id=workspace_id,
    )
    logger.info("Generated innovation section: %s", innovation_text)

    return InnovationAndSignificanceGenerationResult(
        innovation_text=innovation_text, significance_text=significance_text
    )
