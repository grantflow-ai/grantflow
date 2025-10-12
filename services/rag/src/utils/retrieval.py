import hashlib
import json
import re
import time
from typing import TYPE_CHECKING, Any, Final, TypedDict, cast

from packages.db.src.connection import get_session_maker
from packages.db.src.query_helpers import build_metadata_filter, select_active
from packages.db.src.tables import GrantApplicationSource, GrantingInstitutionSource, RagSource, TextVector
from packages.shared_utils.src.ai import GENERATION_MODEL
from packages.shared_utils.src.embeddings import generate_embeddings
from packages.shared_utils.src.logger import get_logger
from sentence_transformers import util
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.post_processing import post_process_documents
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.search_queries import handle_create_search_queries

if TYPE_CHECKING:
    from packages.shared_utils.src.extraction import DocumentMetadata

logger = get_logger(__name__)


MAX_RESULTS: Final[int] = 10

__all__ = [
    "MetadataFilterParams",
    "MetadataWeights",
    "handle_retrieval",
    "retrieve_documents",
    "retrieve_vectors_for_embedding",
]

_document_cache: dict[str, tuple[list[str], float]] = {}
CACHE_TTL_SECONDS: Final[int] = 1800


class MetadataWeights(TypedDict):
    keywords: float
    entities: float
    doc_type: float


DEFAULT_METADATA_WEIGHTS: Final[MetadataWeights] = MetadataWeights(
    keywords=0.4,
    entities=0.3,
    doc_type=0.3,
)


class MetadataFilterParams(TypedDict, total=False):
    entity_types: list[str]
    categories: list[str]
    category_match_mode: str
    min_quality_score: float


def calculate_document_metadata_score(
    document_metadata: "DocumentMetadata | None",
    search_queries: list[str],
    weights: MetadataWeights | None = None,
) -> float:
    if not document_metadata:
        return 0.7

    if weights is None:
        weights = DEFAULT_METADATA_WEIGHTS

    query_terms = set()
    for query in search_queries:
        tokens = re.findall(r"\b\w+\b", query.lower())
        query_terms.update(tokens)

    score = 0.0

    doc_keywords = {
        kw["keyword"].lower() if isinstance(kw, dict) else str(kw).lower()
        for kw in document_metadata.get("keywords", [])
    }
    if doc_keywords and query_terms:
        overlap = len(doc_keywords & query_terms)
        score += weights["keywords"] * min(overlap / max(len(doc_keywords), 5), 1.0)

    entities_raw = document_metadata.get("entities", [])
    doc_entities = {
        ent["text"].lower() if isinstance(ent, dict) else str(ent).lower()
        for ent in (entities_raw if isinstance(entities_raw, list) else [])
    }
    if doc_entities and query_terms:
        entity_overlap = len(doc_entities & query_terms)
        score += weights["entities"] * min(entity_overlap / max(len(doc_entities), 3), 1.0)

    doc_type = str(document_metadata.get("document_type", "")).lower()
    if any(t in doc_type for t in ["research", "scientific", "academic", "paper"]):
        score += weights["doc_type"]

    return 0.5 + (score * 0.5)


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
    metadata_filter: MetadataFilterParams | None = None,
    organization_id: str | None = None,
    search_queries: list[str] | None = None,
    trace_id: str,
) -> list[TextVector]:
    session_maker = get_session_maker()

    max_threshold = 1.0
    threshold = min(0.3 + 0.2 * iteration, max_threshold)
    similarity_conditions = [TextVector.embedding.cosine_distance(embedding) <= threshold for embedding in embeddings]

    async with session_maker() as session:
        total_vectors_count = None
        if metadata_filter:
            base_query = (
                select_active(TextVector)
                .join(RagSource, TextVector.rag_source_id == RagSource.id)
                .join(file_table_cls, RagSource.id == file_table_cls.rag_source_id)
                .where(
                    file_table_cls.grant_application_id == application_id
                    if hasattr(file_table_cls, "grant_application_id")
                    else file_table_cls.granting_institution_id == organization_id
                )
                .where(or_(*similarity_conditions))
            )
            total_vectors_count = await session.scalar(select(func.count()).select_from(base_query.subquery()))

        query = (
            select_active(TextVector)
            .options(selectinload(TextVector.rag_source))
            .join(RagSource, TextVector.rag_source_id == RagSource.id)
            .join(file_table_cls, RagSource.id == file_table_cls.rag_source_id)
            .where(
                file_table_cls.grant_application_id == application_id
                if hasattr(file_table_cls, "grant_application_id")
                else file_table_cls.granting_institution_id == organization_id
            )
        )

        if metadata_filter:
            metadata_condition = build_metadata_filter(RagSource.document_metadata, **metadata_filter)  # type: ignore[arg-type]
            if metadata_condition is not None:
                query = query.where(metadata_condition)

        query = (
            query.where(or_(*similarity_conditions))
            .order_by(func.least(*[TextVector.embedding.cosine_distance(embedding) for embedding in embeddings]))
            .limit(limit * 2)
        )

        vectors = list(await session.scalars(query))

        if metadata_filter and total_vectors_count is not None:
            filtered_count = len(vectors)
            reduction_pct = (
                ((total_vectors_count - filtered_count) / total_vectors_count * 100) if total_vectors_count > 0 else 0.0
            )
            logger.info(
                "Metadata pre-filter applied",
                trace_id=trace_id,
                total_candidates=total_vectors_count,
                after_filter=filtered_count,
                reduction_pct=round(reduction_pct, 1),
                entity_types=metadata_filter.get("entity_types"),
                categories=metadata_filter.get("categories"),
                min_quality_score=metadata_filter.get("min_quality_score"),
            )

    if search_queries and vectors:
        scored_vectors = []
        for vector in vectors:
            cosine_similarities = [float(util.cos_sim(vector.embedding, embedding).item()) for embedding in embeddings]
            max_cosine_similarity = max(cosine_similarities) if cosine_similarities else 0.0

            metadata_score = calculate_document_metadata_score(vector.rag_source.document_metadata, search_queries)

            combined_score = (0.7 * max_cosine_similarity) + (0.3 * metadata_score)

            scored_vectors.append((vector, combined_score, metadata_score))

        scored_vectors.sort(key=lambda x: x[1], reverse=True)

        logger.debug(
            "Re-ranked vectors by metadata",
            trace_id=trace_id,
            original_count=len(vectors),
            metadata_scores=[round(x[2], 2) for x in scored_vectors[:5]],
        )

        result = [v[0] for v in scored_vectors[:limit]]
    else:
        result = vectors[:limit]

    if len(result) < limit and threshold < 1.0:
        return await retrieve_vectors_for_embedding(
            file_table_cls=file_table_cls,
            application_id=application_id,
            organization_id=organization_id,
            embeddings=embeddings,
            search_queries=search_queries,
            metadata_filter=metadata_filter,
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
            search_queries=search_queries,
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
