from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError
from azure.search.documents._generated.models import VectorizedQuery
from azure.search.documents.aio import SearchClient

from src.constants import FIELD_NAME_CONTENT, FIELD_NAME_CONTENT_VECTOR, FIELD_NAME_FILENAME, FIELD_NAME_PAGE_NUMBER
from src.rag.dto import DocumentDTO
from src.utils.env import get_env
from src.utils.exceptions import RequestFailureError
from src.utils.retry import exponential_backoff_retry


@exponential_backoff_retry(RequestFailureError)
async def retrieve_documents(
    *,
    embeddings: list[float],
    filter_query: str,
    search_text: str,
    session_id: str,
) -> list[DocumentDTO]:
    """Retrieve documents from Azure Search using the given query vectors.

    Args:
        embeddings: The embeddings for the search text.
        filter_query: The filter query.
        search_text: The search text.
        session_id: The session ID.

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

    try:
        search_results = await client.search(
            search_text=search_text,
            filter=filter_query,
            vector_queries=[
                VectorizedQuery(
                    vector=embeddings,
                    fields=FIELD_NAME_CONTENT_VECTOR,
                    k_nearest_neighbors=10,
                )
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

        return output
    except HttpResponseError as e:
        raise RequestFailureError(
            message="Failed to upload documents to Azure Search",
            status_code=e.status_code if e.status_code else 0,
            context=str(e),
        ) from e
    finally:
        await client.close()
