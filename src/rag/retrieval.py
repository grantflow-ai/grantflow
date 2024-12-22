from typing import Final

from sqlalchemy import select

from src.db.connection import get_session_maker
from src.db.tables import ApplicationFile, ApplicationVector
from src.rag.dto import DocumentDTO
from src.utils.embeddings import TaskType, generate_embeddings
from src.utils.logging import get_logger

logger = get_logger(__name__)

MAX_RESULTS: Final[int] = 25


async def retrieve_documents(
    *,
    application_id: str,
    search_queries: list[str],
) -> list[DocumentDTO]:
    """Retrieve documents from the vector store.

    Args:
        application_id: The application ID.
        search_queries: The search queries.

    Returns:
        list[dict[str, str]]: The retrieved documents.
    """
    query_embeddings = await generate_embeddings(",".join(search_queries), TaskType.RetrievalQuery)

    session_maker = get_session_maker()
    async with session_maker() as session, session.begin():
        stmt = (
            select(ApplicationVector)
            .join(ApplicationFile, ApplicationVector.file_id == ApplicationFile.id)
            .where(ApplicationFile.application_id == application_id)
            .order_by(ApplicationVector.embedding.cosine_distance(query_embeddings))
            .limit(MAX_RESULTS)
        )

        result = await session.scalars(stmt)

    output: list[DocumentDTO] = [
        DocumentDTO(source=row.file_id, content=row.content, element_type=row.element_type, page_number=row.page_number)
        for row in result
    ]

    logger.info("Successfully retrieved documents from vector store")
    return output
