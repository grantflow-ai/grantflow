import logging
from typing import Final

from sqlalchemy import select

from src.db.connection import get_session_maker
from src.db.tables import ApplicationFile, ApplicationVector
from src.rag.dto import DocumentDTO
from src.utils.embeddings import TaskType, generate_embeddings

logger = logging.getLogger(__name__)

MAX_RESULTS: Final[int] = 10


async def retrieve_documents(
    *,
    application_id: str,
    search_queries: list[str],
) -> list[DocumentDTO]:
    """Retrieve documents from Azure Search using the given query vectors.

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
            select(ApplicationVector, ApplicationFile)
            .join(ApplicationFile, ApplicationVector.file_id == ApplicationFile.id)
            .order_by(ApplicationVector.embedding.cosine_distance(query_embeddings))
            .filter_by(application_id=application_id)
            .limit(MAX_RESULTS)
        )

        result = await session.scalars(stmt)

    output: list[DocumentDTO] = [
        DocumentDTO(source=row.file_id, content=row.content, element_type=row.element_type, page_number=row.page_number)
        for row in result
    ]

    logger.info("Successfully retrieved documents from Azure Search")
    return output
