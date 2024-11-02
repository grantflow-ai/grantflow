from typing import Final

from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError
from azure.search.documents._generated.models import VectorizedQuery
from azure.search.documents.aio import SearchClient

from src.constants import FIELD_NAME_CONTENT_VECTOR
from src.utils.env import get_env
from src.utils.exceptions import RequestFailureError
from src.utils.retry import exponential_backoff_retry

NUM_DOCUMENTS_TO_RETRIEVE: Final[int] = 10


@exponential_backoff_retry(RequestFailureError)
async def retrieve(
    *,
    embeddings: list[list[float]],
    filter_query: str,
    search_text: str,
    session_id: str,
) -> list[dict[str, str]]:
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
    # FIXME: semantic ranker is not available in EU region. It gives better results overall. add once it is available.
    # FIXME: search_score is random and not usable as a cut-off threshold, fix it by a custom threshold mechanism.
    try:
        results = await client.search(
            search_text=search_text,
            filter=filter_query,
            top=NUM_DOCUMENTS_TO_RETRIEVE,
            vector_queries=[
                VectorizedQuery(
                    vector=vector,
                    fields=FIELD_NAME_CONTENT_VECTOR,
                    k_nearest_neighbors=10,
                )
                for vector in embeddings
            ],
            session_id=session_id,
        )
        return [result async for result in results]
    except HttpResponseError as e:
        raise RequestFailureError(
            message="Failed to upload documents to Azure Search",
            status_code=e.status_code if e.status_code else 0,
            context=str(e),
        ) from e
    finally:
        await client.close()
