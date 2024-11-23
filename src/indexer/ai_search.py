from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Final

from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError, ResourceNotFoundError
from azure.search.documents.aio import SearchClient
from azure.search.documents.indexes.models import (
    HnswAlgorithmConfiguration,
    HnswParameters,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SimpleField,
    VectorSearch,
    VectorSearchAlgorithmKind,
    VectorSearchAlgorithmMetric,
    VectorSearchProfile,
)

from src.constants import (
    FIELD_NAME_APPLICATION_ID,
    FIELD_NAME_CHUNK_ID,
    FIELD_NAME_CONTENT,
    FIELD_NAME_CONTENT_HASH,
    FIELD_NAME_CONTENT_VECTOR,
    FIELD_NAME_FILENAME,
    FIELD_NAME_ID,
    FIELD_NAME_KEYWORDS,
    FIELD_NAME_LABELS,
    FIELD_NAME_PAGE_NUMBER,
    FIELD_NAME_SECTION_NAME,
    FIELD_NAME_WORKSPACE_ID,
)
from src.utils.env import get_env
from src.utils.exceptions import RequestFailureError
from src.utils.retry import exponential_backoff_retry

if TYPE_CHECKING:
    from src.indexer.dto import SearchSchema


logger = logging.getLogger(__name__)

# Constants for HNSW (Hierarchical Navigable Small World) algorithm
HNSW_EF_CONSTRUCTION: Final[int] = 400
HNSW_EF_SEARCH: Final[int] = 200
HNSW_M: Final[int] = 4
HNSW_NAME: Final[str] = "default"
HNSW_PROFILE_NAME: Final[str] = "myHnswProfile"

# Analyzer constants
ANALYZER_STANDARD_LUCENE: Final[str] = "standard.lucene"
ANALYZER_EN_MICROSOFT: Final[str] = "en.microsoft"

# Embedding model and dimensions
EMBEDDING_MODEL: Final[str] = "text-embedding-3-large"
EMBEDDING_DIMENSIONS: Final[int] = 3072


def create_search_index(index_name: str) -> SearchIndex:
    """Create a search index optimized for scientific documents using text-embedding-3-large.

    Args:
        index_name: The name of the search index.

    Returns:
        SearchIndex: The configured search index.
    """
    fields = [
        SimpleField(
            name=FIELD_NAME_ID,
            type=SearchFieldDataType.String,
            key=True,
            searchable=False,
            retrievable=True,
            filterable=True,
        ),
        SearchableField(
            name=FIELD_NAME_FILENAME,
            type=SearchFieldDataType.String,
            searchable=True,
            retrievable=True,
            filterable=True,
            sortable=True,
            analyzer_name=ANALYZER_STANDARD_LUCENE,
        ),
        SearchableField(
            name=FIELD_NAME_WORKSPACE_ID,
            type=SearchFieldDataType.String,
            searchable=False,
            retrievable=True,
            filterable=True,
        ),
        SearchableField(
            name=FIELD_NAME_APPLICATION_ID,
            type=SearchFieldDataType.String,
            searchable=False,
            retrievable=True,
            filterable=True,
        ),
        SearchableField(
            name=FIELD_NAME_SECTION_NAME,
            type=SearchFieldDataType.String,
            searchable=False,
            retrievable=True,
            filterable=True,
        ),
        SearchableField(
            name=FIELD_NAME_CHUNK_ID,
            type=SearchFieldDataType.String,
            searchable=False,
            retrievable=True,
            sortable=True,
            filterable=True,
        ),
        SearchableField(
            name=FIELD_NAME_CONTENT,
            type=SearchFieldDataType.String,
            searchable=True,
            retrievable=True,
            filterable=True,
            analyzer_name=ANALYZER_EN_MICROSOFT,
        ),
        SearchField(
            name=FIELD_NAME_CONTENT_VECTOR,
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            vector_search_dimensions=EMBEDDING_DIMENSIONS,
            vector_search_profile_name=HNSW_PROFILE_NAME,
        ),
        SimpleField(
            name=FIELD_NAME_PAGE_NUMBER,
            type=SearchFieldDataType.Int32,
            filterable=True,
            sortable=True,
            retrievable=True,
        ),
        SearchableField(
            name=FIELD_NAME_CONTENT_HASH,
            type=SearchFieldDataType.Int32,
            searchable=True,
            filterable=True,
            facetable=False,
            sortable=False,
        ),
        SearchableField(
            name=FIELD_NAME_KEYWORDS,
            type=SearchFieldDataType.Collection(SearchFieldDataType.String),
            searchable=True,
            retrievable=True,
            filterable=True,
            facetable=True,
        ),
        SearchableField(
            name=FIELD_NAME_LABELS,
            type=SearchFieldDataType.Collection(SearchFieldDataType.String),
            searchable=True,
            retrievable=True,
            filterable=True,
            facetable=True,
        ),
    ]

    vector_search = VectorSearch(
        algorithms=[
            HnswAlgorithmConfiguration(
                name=HNSW_NAME,
                kind=VectorSearchAlgorithmKind.HNSW,
                parameters=HnswParameters(
                    m=HNSW_M,
                    ef_construction=HNSW_EF_CONSTRUCTION,
                    ef_search=HNSW_EF_SEARCH,
                    metric=VectorSearchAlgorithmMetric.COSINE,
                ),
            ),
        ],
        profiles=[
            VectorSearchProfile(
                name=HNSW_PROFILE_NAME,
                algorithm_configuration_name=HNSW_NAME,
            ),
        ],
    )

    return SearchIndex(
        name=index_name,
        fields=fields,
        vector_search=vector_search,
    )


async def ensure_index_exists() -> None:
    """Ensure that the search index exists.

    Returns:
        None
    """
    from azure.search.documents.indexes.aio import SearchIndexClient

    index_name = get_env("AZURE_AI_SEARCH_INDEX_NAME")

    index_client = SearchIndexClient(
        endpoint=get_env("AZURE_AI_SEARCH_ENDPOINT"), credential=AzureKeyCredential(get_env("AZURE_AI_SEARCH_KEY"))
    )
    logger.info("Checking if Search Index %s exists.", index_name)

    try:
        await index_client.get_index(name=index_name)
        logger.info("Search Index %s exists.", index_name)
    except ResourceNotFoundError:
        logger.info(
            "Search Index %s does not exist. Creating the search index with the required fields.",
            index_name,
        )
        await index_client.create_index(create_search_index(index_name))
        logger.info("Search Index %s created successfully.", index_name)
    finally:
        await index_client.close()


@exponential_backoff_retry(RequestFailureError)
async def upload_to_ai_search(data: list[SearchSchema]) -> None:
    """Upload elements to Azure Search.

    Args:
        data: list of chunks to be uploaded to Azure Search.

    Raises:
        RequestFailureError: If the request fails.

    Returns:
        None
    """
    client = SearchClient(
        endpoint=get_env("AZURE_AI_SEARCH_ENDPOINT"),
        index_name=get_env("AZURE_AI_SEARCH_INDEX_NAME"),
        credential=AzureKeyCredential(get_env("AZURE_AI_SEARCH_KEY")),
    )
    try:
        logger.info("Uploading %d documents to Azure Search.", len(data))
        await client.upload_documents(documents=cast(list[dict[str, Any]], data))
        logger.info("Uploaded chunks to Azure Search")
    except HttpResponseError as e:
        raise RequestFailureError(
            message="Failed to upload documents to Azure Search",
            status_code=e.status_code if e.status_code else 0,
            context=str(e),
        ) from e
    finally:
        await client.close()
