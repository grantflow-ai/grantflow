from asyncio import gather
from itertools import chain
from typing import Any, Final, cast

from prompt_template import PromptTemplate
from sqlalchemy import select

from src.db.connection import get_session_maker
from src.db.tables import GrantApplicationFile, OrganizationFile, RagFile, TextVector
from src.rag.dto import DocumentDTO
from src.rag.rerank import rerank_vectors
from src.rag.search_queries import handle_create_search_queries
from src.utils.embeddings import TaskType, generate_embeddings
from src.utils.logger import get_logger

logger = get_logger(__name__)

MAX_RESULTS: Final[int] = 25
INITIAL_RETRIEVAL_MULTIPLIER: Final[float] = 4.0


async def retrieve_vectors_for_embedding(
    *,
    file_table_cls: type[GrantApplicationFile | OrganizationFile],
    application_id: str | None = None,
    organization_id: str | None = None,
    embedding: list[float],
    limit: int = MAX_RESULTS,
) -> list[TextVector]:
    """Retrieve vectors from the vector store based on the given embedding.

    Args:
        file_table_cls: The file table class.
        application_id: The application ID, required if organization_id is not provided.
        organization_id: The organization ID, required if application_id is not provided.
        embedding: The embedding to compare against.
        limit: The maximum number of results to return.

    Returns:
        The retrieved vectors.
    """
    session_maker = get_session_maker()

    async with session_maker() as session:
        return list(
            await session.scalars(
                select(TextVector)
                .join(RagFile, TextVector.rag_file_id == RagFile.id)
                .join(file_table_cls, RagFile.id == file_table_cls.rag_file_id)
                .where(
                    file_table_cls.grant_application_id == application_id
                    if hasattr(file_table_cls, "grant_application_id")
                    else file_table_cls.funding_organization_id == organization_id
                )
                .order_by(TextVector.embedding.cosine_distance(embedding))
                .limit(limit)
            )
        )


async def retrieve_documents(
    *,
    application_id: str | None = None,
    max_results: int = MAX_RESULTS,
    organization_id: str | None = None,
    user_prompt: str | PromptTemplate | None = None,
    skip_reranking: bool = False,
    **kwargs: Any,
) -> list[DocumentDTO]:
    """Retrieve documents from the vector store.

    Args:
        application_id: The application ID, required if organization_id is not provided.
        max_results: The maximum number of results to return.
        organization_id: The organization ID, required if application_id is not provided.
        user_prompt: The task description.
        skip_reranking: Skip the reranking step if True.
        **kwargs: Any additional args

    Raises:
        ValueError: If neither application_id nor organization_id is provided or if neither search_queries nor
            user_prompt is provided.

    Returns:
        The retrieved and optionally reranked documents.
    """
    if not application_id and not organization_id:
        raise ValueError("Either application_id or organization_id must be provided.")
    if not user_prompt:
        raise ValueError("Either search_queries or user_prompt must be provided.")

    search_queries = await handle_create_search_queries(user_prompt=user_prompt, **kwargs)
    query_embeddings = await generate_embeddings(search_queries, TaskType.RetrievalQuery)

    file_table_cls = GrantApplicationFile if application_id else OrganizationFile
    limit = int(max_results * INITIAL_RETRIEVAL_MULTIPLIER) if not skip_reranking else max_results

    vectors = list(
        chain(
            *(
                await gather(
                    *[
                        retrieve_vectors_for_embedding(
                            file_table_cls=file_table_cls,
                            application_id=application_id,
                            organization_id=organization_id,
                            embedding=query_embedding,
                            limit=limit,
                        )
                        for query_embedding in query_embeddings
                    ]
                )
            )
        )
    )

    if not skip_reranking and vectors:
        vectors = await rerank_vectors(vectors, str(user_prompt))
        vectors = vectors[:max_results]

    documents = [
        cast(DocumentDTO, {k: v for k, v in vector.chunk.items() if k in DocumentDTO.__annotations__ and v is not None})
        for vector in vectors[:max_results]
    ]

    logger.info(
        "Successfully retrieved and processed documents",
        organization_id=organization_id,
        application_id=application_id,
        reranking_applied=not skip_reranking,
        initial_docs=len(vectors),
        final_docs=len(documents),
    )

    return documents
