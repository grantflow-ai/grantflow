import hashlib
import json
import time
from typing import Any, Final, cast

from packages.db.src.connection import get_session_maker
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import GrantApplicationSource, GrantingInstitutionSource, RagSource, TextVector
from packages.shared_utils.src.ai import GENERATION_MODEL
from packages.shared_utils.src.embeddings import generate_embeddings
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import func, or_

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.post_processing import post_process_documents
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.search_queries import handle_create_search_queries

logger = get_logger(__name__)


MAX_RESULTS: Final[int] = 10

_document_cache: dict[str, tuple[list[str], float]] = {}
CACHE_TTL_SECONDS: Final[int] = 1800


def _create_cache_key(**kwargs: Any) -> str:
    cache_data = {k: v for k, v in kwargs.items() if k != "trace_id"}
    cache_str = json.dumps(cache_data, sort_keys=True, default=str)
    return hashlib.sha256(cache_str.encode()).hexdigest()[:16]


def _get_cached_documents(cache_key: str) -> list[str] | None:
    if cache_key in _document_cache:
        documents, timestamp = _document_cache[cache_key]
        if time.time() - timestamp < CACHE_TTL_SECONDS:
            logger.debug("Document cache hit", cache_key=cache_key)
            return documents
        del _document_cache[cache_key]
        logger.debug("Document cache expired", cache_key=cache_key)
    return None


def _cache_documents(cache_key: str, documents: list[str]) -> None:
    _document_cache[cache_key] = (documents, time.time())
    logger.debug("Document cache set", cache_key=cache_key, count=len(documents))


async def retrieve_vectors_for_embedding(
    *,
    application_id: str | None = None,
    embeddings: list[list[float]],
    file_table_cls: type[GrantApplicationSource | GrantingInstitutionSource],
    iteration: int = 1,
    limit: int = MAX_RESULTS,
    organization_id: str | None = None,
    trace_id: str,
) -> list[TextVector]:
    session_maker = get_session_maker()

    max_threshold = 1.0
    threshold = min(0.3 + 0.2 * iteration, max_threshold)
    similarity_conditions = [TextVector.embedding.cosine_distance(embedding) <= threshold for embedding in embeddings]

    async with session_maker() as session:
        result = list(
            await session.scalars(
                select_active(TextVector)
                .join(RagSource, TextVector.rag_source_id == RagSource.id)
                .join(file_table_cls, RagSource.id == file_table_cls.rag_source_id)
                .where(
                    file_table_cls.grant_application_id == application_id
                    if hasattr(file_table_cls, "grant_application_id")
                    else file_table_cls.granting_institution_id == organization_id
                )
                .where(or_(*similarity_conditions))
                .order_by(func.least(*[TextVector.embedding.cosine_distance(embedding) for embedding in embeddings]))
                .limit(limit)
            )
        )

    if len(result) < limit and threshold < 1.0:
        return await retrieve_vectors_for_embedding(
            file_table_cls=file_table_cls,
            application_id=application_id,
            organization_id=organization_id,
            embeddings=embeddings,
            limit=limit,
            iteration=iteration + 1,
            trace_id=trace_id,
        )

    if not result and threshold >= max_threshold:
        logger.warning("No results found within the threshold range.", trace_id=trace_id)

    return result


async def handle_retrieval(
    *,
    application_id: str | None = None,
    max_results: int,
    organization_id: str | None = None,
    search_queries: list[str],
    model_name: str | None = None,
    trace_id: str,
) -> list[TextVector]:
    query_embeddings = (
        await generate_embeddings(search_queries, model_name=model_name)
        if model_name
        else await generate_embeddings(search_queries)
    )
    file_table_cls = GrantApplicationSource if application_id else GrantingInstitutionSource

    return (
        await retrieve_vectors_for_embedding(
            file_table_cls=file_table_cls,
            application_id=application_id,
            organization_id=organization_id,
            embeddings=query_embeddings,
            limit=max_results,
            trace_id=trace_id,
        )
        if len(query_embeddings)
        else []
    )


async def retrieve_documents(
    *,
    application_id: str | None = None,
    max_results: int = MAX_RESULTS,
    max_tokens: int = 4000,
    model: str = GENERATION_MODEL,
    organization_id: str | None = None,
    search_queries: list[str] | None = None,
    task_description: str | PromptTemplate,
    with_guided_retrieval: bool = False,
    embedding_model: str | None = None,
    trace_id: str,
    **kwargs: Any,
) -> list[str]:
    return await _retrieve_documents_cached(
        application_id=application_id,
        max_results=max_results,
        max_tokens=max_tokens,
        model=model,
        organization_id=organization_id,
        search_queries_tuple=tuple(search_queries) if search_queries else None,
        task_description=str(task_description),
        with_guided_retrieval=with_guided_retrieval,
        embedding_model=embedding_model,
        trace_id=trace_id,
        kwargs=kwargs,
    )


async def _retrieve_documents_cached(
    *,
    application_id: str | None = None,
    max_results: int = MAX_RESULTS,
    max_tokens: int = 4000,
    model: str = GENERATION_MODEL,
    organization_id: str | None = None,
    search_queries_tuple: tuple[str, ...] | None = None,
    task_description: str,
    with_guided_retrieval: bool = False,
    embedding_model: str | None = None,
    trace_id: str,
    kwargs: dict[str, Any],
) -> list[str]:
    kwargs_for_cache = {k: v for k, v in kwargs.items() if k != "trace_id"}

    cache_key = _create_cache_key(
        application_id=application_id,
        max_results=max_results,
        max_tokens=max_tokens,
        model=model,
        organization_id=organization_id,
        search_queries_tuple=search_queries_tuple,
        task_description=task_description,
        with_guided_retrieval=with_guided_retrieval,
        embedding_model=embedding_model,
        **kwargs_for_cache,
    )

    cached_documents = _get_cached_documents(cache_key)
    if cached_documents is not None:
        return cached_documents

    start_time = time.time()
    entity_id = application_id or organization_id
    entity_type = "application" if application_id else "organization"

    if not application_id and not organization_id:
        raise ValueError("Either application_id or organization_id must be provided.")

    search_queries = list(search_queries_tuple) if search_queries_tuple else None

    search_queries = search_queries or await handle_create_search_queries(
        user_prompt=task_description, embedding_model=embedding_model, **kwargs
    )
    vectors = await handle_retrieval(
        application_id=application_id,
        organization_id=organization_id,
        search_queries=search_queries,
        max_results=max_results,
        model_name=embedding_model,
        trace_id=trace_id,
    )

    documents = [
        cast(
            "DocumentDTO",
            {k: v for k, v in vector.chunk.items() if k in DocumentDTO.__annotations__ and v is not None},
        )
        for vector in vectors
    ]

    processed_contents = await post_process_documents(
        documents=documents,
        query=",".join(search_queries),
        task_description=str(task_description),
        max_tokens=max_tokens,
        model=model,
        trace_id=trace_id,
    )

    total_duration = time.time() - start_time
    logger.info(
        "Document retrieval completed",
        entity_id=entity_id,
        entity_type=entity_type,
        result_count=len(processed_contents),
        guided_retrieval=with_guided_retrieval,
        total_duration_ms=round(total_duration * 1000, 2),
        trace_id=trace_id,
    )
    _cache_documents(cache_key, processed_contents)
    return processed_contents
