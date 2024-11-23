from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError
from azure.search.documents._generated.models import VectorizedQuery
from azure.search.documents.aio import SearchClient

from src.constants import (
    FIELD_NAME_APPLICATION_ID,
    FIELD_NAME_CONTENT,
    FIELD_NAME_CONTENT_VECTOR,
    FIELD_NAME_FILENAME,
    FIELD_NAME_PAGE_NUMBER,
    FIELD_NAME_SECTION_NAME,
    FIELD_NAME_WORKSPACE_ID,
)
from src.embeddings import generate_embeddings
from src.rag_backend.dto import DocumentDTO
from src.utils.env import get_env
from src.utils.exceptions import OpenAIFailureError, RequestFailureError
from src.utils.retry import exponential_backoff_retry

if TYPE_CHECKING:
    from src.data_types import SectionName


logger = logging.getLogger(__name__)


@exponential_backoff_retry(RequestFailureError, OpenAIFailureError)
async def retrieve_documents(
    *,
    application_id: str,
    search_queries: list[str],
    section_name: SectionName,
    session_id: str,
    workspace_id: str,
) -> list[DocumentDTO]:
    """Retrieve documents from Azure Search using the given query vectors.

    Args:
        application_id: The application ID.
        search_queries: The search queries.
        section_name: The section name.
        session_id: The session ID.
        workspace_id: The workspace ID.

    Raises:
        RequestFailureError: If the request fails.

    Returns:
        list[dict[str, str]]: The retrieved documents.
    """
    client = SearchClient(
        endpoint=get_env("AZURE_AI_SEARCH_ENDPOINT"),
        index_name=get_env("AZURE_AI_SEARCH_INDEX_NAME"),
        credential=AzureKeyCredential(get_env("AZURE_AI_SEARCH_KEY")),
    )

    search_filter = f"{FIELD_NAME_WORKSPACE_ID} eq '{workspace_id}' and {FIELD_NAME_APPLICATION_ID} eq '{application_id}' and {FIELD_NAME_SECTION_NAME} eq '{section_name}'"

    try:
        query_embeddings = await generate_embeddings(search_queries)
        search_text = " | ".join([f'"{query}"' for query in search_queries])

        search_results = await client.search(
            search_text=search_text,
            filter=search_filter,
            vector_queries=[
                VectorizedQuery(
                    vector=embeddings,
                    fields=FIELD_NAME_CONTENT_VECTOR,
                )
                for embeddings in query_embeddings
            ],
            session_id=session_id,
        )

        output: list[DocumentDTO] = []

        async for search_result in search_results:
            doc = DocumentDTO(
                filename=search_result[FIELD_NAME_FILENAME],
                content=search_result[FIELD_NAME_CONTENT],
            )
            if page_number := search_result.get(FIELD_NAME_PAGE_NUMBER):
                doc["page_number"] = page_number

            output.append(doc)

        logger.info("Successfully retrieved documents from Azure Search")
        return output
    except HttpResponseError as e:
        logger.warning("Failed to retrieve documents from Azure Search: %s", e)
        raise RequestFailureError(
            message="Failed to upload documents to Azure Search",
            status_code=e.status_code if e.status_code else 0,
            context=str(e),
        ) from e
    finally:
        await client.close()
