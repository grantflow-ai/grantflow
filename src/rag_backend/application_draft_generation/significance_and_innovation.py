import logging
from functools import partial
from json import dumps
from textwrap import dedent

from src.constants import FIELD_NAME_PARENT_ID, FIELD_NAME_WORKSPACE_ID
from src.embeddings import generate_embeddings
from src.rag_backend.ai_search import retrieve_documents
from src.rag_backend.application_draft_generation.prompts import (
    CONSECUTIVE_PART_GENERATION_INSTRUCTIONS,
    INNOVATION_GENERATION_SYSTEM_PROMPT,
    INNOVATION_GENERATION_USER_PROMPT,
    RESEARCH_INNOVATION_QUERIES_PROMPT,
    RESEARCH_SIGNIFICANCE_QUERIES_PROMPT,
    SIGNIFICANCE_GENERATION_SYSTEM_PROMPT,
    SIGNIFICANCE_GENERATION_USER_PROMPT,
)
from src.rag_backend.dto import DocumentDTO, GenerationResult
from src.rag_backend.search_queries import create_search_queries
from src.rag_backend.utils import handle_segmented_text_generation, handle_tool_call_request

logger = logging.getLogger(__name__)


async def generate_significance_text(
    previous_part_text: str | None,
    *,
    application_title: str,
    cfp_title: str,
    grant_funding_organization: str,
    retrieval_results: list[DocumentDTO],
    significance_description: str,
) -> GenerationResult:
    """Generate a part of the significance text.

    Args:
        previous_part_text: The previous part of the significance text, if any.
        application_title: The title of the grant application.
        cfp_title: The CFP action code and title.
        grant_funding_organization: The funding organization for the grant.
        retrieval_results: The results of the RAG retrieval.
        significance_description: The description of the research significance.

    Returns:
        GenerationResult: The generated text for the significance section.
    """
    system_prompt = SIGNIFICANCE_GENERATION_SYSTEM_PROMPT.substitute(
        part_generation_instructions=CONSECUTIVE_PART_GENERATION_INSTRUCTIONS if previous_part_text else "",
    ).strip()

    user_prompt = SIGNIFICANCE_GENERATION_USER_PROMPT.substitute(
        application_title=application_title,
        cfp_title=cfp_title,
        grant_funding_organization=grant_funding_organization,
        previous_part_text=previous_part_text,
        rag_results=dumps(retrieval_results),
        significance_description=significance_description,
    ).strip()

    return await handle_tool_call_request(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )


async def generate_innovation_text(
    previous_part_text: str | None,
    *,
    innovation_description: str,
    retrieval_results: list[DocumentDTO],
    significance_text: str,
) -> GenerationResult:
    """Generate a part of the innovation text.

    Args:
        previous_part_text: The previous part of the innovation text, if any.
        innovation_description: The description of the research innovation.
        retrieval_results: The results of the RAG retrieval.
        significance_text: The generated significance text.

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
    *,
    application_id: str,
    application_title: str,
    cfp_title: str,
    grant_funding_organization: str,
    significance_description: str,
    significance_id: str,
    workspace_id: str,
) -> str:
    """Generate the text for the significance section.

    Args:
        application_id: The ID of the grant application.
        application_title: The title of the grant application.
        cfp_title: The CFP action code and title.
        grant_funding_organization: The funding organization for the grant.
        significance_description: The description of the research significance.
        significance_id: The ID of the significance section.
        workspace_id: The workspace ID.

    Returns:
        The generated text for the significance section.
    """
    search_queries = await create_search_queries(
        RESEARCH_SIGNIFICANCE_QUERIES_PROMPT.substitute(
            significance_description=significance_description,
        ).strip()
    )
    query_embeddings = await generate_embeddings(search_queries)
    search_text = " | ".join([f'"{query}"' for query in search_queries])

    search_filter = f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}' and ({FIELD_NAME_PARENT_ID} eq '{significance_id}' or {FIELD_NAME_PARENT_ID} eq '{application_id}')"

    search_result = await retrieve_documents(
        embeddings_matrix=query_embeddings,
        filter_query=search_filter,
        search_text=search_text,
        session_id=workspace_id,
    )

    handler = partial(
        generate_significance_text,
        application_title=application_title,
        cfp_title=cfp_title,
        grant_funding_organization=grant_funding_organization,
        retrieval_results=search_result,
        significance_description=significance_description,
    )

    return await handle_segmented_text_generation(
        entity_type="significance",
        entity_identifier=significance_id,
        prompt_handler=handler,
    )


async def handle_innovation_text_generation(
    *,
    application_id: str,
    innovation_description: str,
    innovation_id: str,
    significance_text: str,
    workspace_id: str,
) -> str:
    """Generate the text for the innovation section.

    Args:
        application_id: The ID of the grant application.
        innovation_description: The description of the research innovation.
        innovation_id: The ID of the innovation section.
        significance_text: The generated significance text.
        workspace_id: The workspace ID.

    Returns:
        The generated text for the innovation section.
    """
    search_queries = await create_search_queries(
        RESEARCH_INNOVATION_QUERIES_PROMPT.substitute(
            innovation_description=innovation_description,
        ).strip()
    )
    query_embeddings = await generate_embeddings(search_queries)
    search_text = " | ".join([f'"{query}"' for query in search_queries])

    search_filter = f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}' and ({FIELD_NAME_PARENT_ID} eq '{innovation_id}' or {FIELD_NAME_PARENT_ID} eq '{application_id}')"

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
    application_id: str,
    application_title: str,
    cfp_title: str,
    grant_funding_organization: str,
    innovation_description: str,
    innovation_id: str,
    significance_description: str,
    significance_id: str,
    workspace_id: str,
) -> str:
    """Generate the significance and innovation sections for a grant application.

    Args:
        application_id: The ID of the grant application.
        application_title: The title of the grant application.
        cfp_title: The CFP action code and title.
        grant_funding_organization: The funding organization for the grant.
        innovation_description: The description of the research innovation.
        innovation_id: The ID of the innovation section.
        significance_description: The description of the research significance.
        significance_id: The ID of the significance section.
        workspace_id: The workspace ID.

    Returns:
        A tuple containing the generated significance and innovation texts.
    """
    significance_text = await handle_significance_text_generation(
        application_id=application_id,
        application_title=application_title,
        cfp_title=cfp_title,
        grant_funding_organization=grant_funding_organization,
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
        application_id=application_id,
    )
    logger.info("Generated innovation section: %s", innovation_text)

    return dedent(f"""
        ## Significance
        {significance_text}

        ## Innovation
        {innovation_text}
    """).strip()
