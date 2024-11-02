import logging
from http import HTTPStatus
from typing import Literal

from azure.functions import HttpRequest, HttpResponse

from src.constants import CONTENT_TYPE_JSON, FIELD_NAME_FILENAME, FIELD_NAME_PARENT_ID, FIELD_NAME_WORKSPACE_ID
from src.embeddings import generate_embeddings
from src.rag.ai_search import retrieve
from src.rag.dto import APIError, RagRequest, RagResponse
from src.rag.prompts import create_search_queries
from src.utils.exceptions import DeserializationError
from src.utils.serialization import deserialize, serialize

logger = logging.getLogger(__name__)


async def handle_rag_request(req: HttpRequest) -> HttpResponse:
    """Handle a request to the RAG API.

    Args:
        req: An Azure Function HttpRequest object.

    Returns:
        An Azure Function HttpResponse object.
    """
    logger.info("Handling RAG request")

    try:
        request_body = deserialize(req.get_body(), RagRequest)

        logger.info("Successfully generated a RAG response")
        return HttpResponse(
            body=serialize(RagResponse(data="")),
            status_code=HTTPStatus.CREATED,
            mimetype=CONTENT_TYPE_JSON,
        )
    except DeserializationError as e:
        logger.error("Failed to deserialize the request body due to an exception: %s", e)
        return HttpResponse(
            status_code=HTTPStatus.BAD_REQUEST,
            body=serialize(
                APIError(
                    message="Failed to deserialize the request body",
                    details=str(e),
                )
            ),
            mimetype=CONTENT_TYPE_JSON,
        )


def create_filter(
    *,
    workspace_id: str,
    parent_id: str,
    section_files: list[str] | None,
) -> str:
    """Create a filter query for the RAG response.

    Args:
        workspace_id: The id of the workspace
        parent_id: The id of the parent
        section_files: The files for the section.

    Returns:
        The filter query.
    """
    filters = [f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}'", f"{FIELD_NAME_PARENT_ID} eq '{parent_id}'"]
    if section_files:
        filters.append(f"search.ismatch('{"|".join(section_files)}', '{FIELD_NAME_FILENAME}', 'full', 'all')")
    return " and ".join(filters)


async def generate_section(
    *,
    workspace_id: str,
    parent_id: str,
    section_name: Literal["significance", "innovation", "research-plan", "summary"],
    section_text: str,
    section_files: list[str] | None,
    previous_version: str | None = None,
) -> str:
    """Generate a section of the RAG response.

    Args:
        workspace_id: The id of the workspace
        parent_id: The id of the parent
        section_name: The name of the section.
        section_text: The text for the section.
        section_files: The files for the section.
        previous_version: Additional context for the section.

    Returns:
        str: The generated section.
    """
    filter_query = create_filter(
        workspace_id=workspace_id,
        parent_id=parent_id,
        section_files=section_files,
    )

    search_queries = await create_search_queries(section_text)
    embeddings = await generate_embeddings(search_queries)
    search_text = " | ".join([f'"{query}"' for query in search_queries])

    search_result = await retrieve(
        embeddings=embeddings,
        filter_query=filter_query,
        search_text=search_text,
        session_id=workspace_id,
    )
