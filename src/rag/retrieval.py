from typing import Final, overload

from sqlalchemy import select

from src.db.connection import get_session_maker
from src.db.tables import ApplicationFile, ApplicationVector, GrantFormatFile, GrantFormatVector
from src.rag.dto import DocumentDTO
from src.utils.embeddings import TaskType, generate_embeddings
from src.utils.logging import get_logger

logger = get_logger(__name__)

MAX_RESULTS: Final[int] = 25


@overload
async def retrieve_documents(
    *,
    application_id: str,
    search_queries: list[str],
    max_results: int = MAX_RESULTS,
) -> list[DocumentDTO]: ...
@overload
async def retrieve_documents(
    *,
    format_id: str,
    search_queries: list[str],
    max_results: int = MAX_RESULTS,
) -> list[DocumentDTO]: ...


async def retrieve_documents(
    *,
    application_id: str | None = None,
    format_id: str | None = None,
    max_results: int = MAX_RESULTS,
    search_queries: list[str],
) -> list[DocumentDTO]:
    """Retrieve documents from the vector store.

    Args:
        application_id: The application ID, required if format_id is not provided.
        format_id: The format ID, required if application_id is not provided.
        max_results: The maximum number of results to return.
        search_queries: The search queries.

    Raises:
        ValueError: If neither application_id nor format_id is provided.

    Returns:
        list[dict[str, str]]: The retrieved documents.
    """
    if not application_id and not format_id:
        raise ValueError("Either application_id or format_id must be provided.")

    file_table_cls = ApplicationFile if application_id else GrantFormatFile
    vector_table_cls = ApplicationVector if application_id else GrantFormatVector

    query_embeddings = await generate_embeddings(",".join(search_queries), TaskType.RetrievalQuery)

    session_maker = get_session_maker()
    async with session_maker() as session, session.begin():
        stmt = (
            select(vector_table_cls)
            .join(file_table_cls, vector_table_cls.file_id == file_table_cls.id)
            .where(
                file_table_cls.application_id == application_id
                if hasattr(file_table_cls, "application_id")
                else file_table_cls.format_id == format_id
            )
            .order_by(vector_table_cls.embedding.cosine_distance(query_embeddings))
            .limit(max_results)
        )

        result = await session.scalars(stmt)

    output: list[DocumentDTO] = [
        DocumentDTO(source=row.file_id, content=row.content, element_type=row.element_type, page_number=row.page_number)
        for row in result
    ]

    logger.info(
        "Successfully retrieved documents from vector store", format_id=format_id, application_id=application_id
    )
    return output
