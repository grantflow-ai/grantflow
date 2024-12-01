import logging

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

from src.db.connection import get_session_maker
from src.db.tables import ApplicationFile, ApplicationVector
from src.indexer.dto import FileDTO, VectorDTO
from src.utils.exceptions import DatabaseError

logger = logging.getLogger(__name__)


async def upsert_application_vectors(
    *,
    vectors: list[VectorDTO],
    application_id: str,
) -> None:
    """Insert or update application vectors in the database.

    Args:
        vectors: A list of VectorDTO objects containing vector data.
        application_id: The ID of the application the vectors belong to.

    Raises:
        DatabaseError: If an error occurs during the upsert operation.

    Returns:
        None
    """
    session_maker = get_session_maker()

    async with session_maker() as session, session.begin():
        try:
            insert_stmt = insert(ApplicationVector).values(
                [
                    {
                        "application_id": application_id,
                        "file_id": vector["file_id"],
                        "chunk_index": vector["chunk_index"],
                        "content": vector["content"],
                        "element_type": vector["element_type"],
                        "embedding": vector["embedding"],
                        "page_number": vector["page_number"],
                    }
                    for vector in vectors
                ]
            )

            upsert_stmt = insert_stmt.on_conflict_do_update(
                index_elements=["application_id", "file_id", "chunk_index"],
                set_={
                    "content": insert_stmt.excluded.content,
                    "element_type": insert_stmt.excluded.element_type,
                    "embedding": insert_stmt.excluded.embedding,
                    "page_number": insert_stmt.excluded.page_number,
                },
            )

            upsert_stmt.returning(ApplicationVector)
            await session.execute(upsert_stmt)
            await session.commit()
            logger.info("Successfully inserted application vectors for application_id: %s", application_id)
        except SQLAlchemyError as e:
            logger.error("Error upserting application vectors: %s", e)
            await session.rollback()
            raise DatabaseError("Error upserting application vectors", context=str(e)) from e


async def insert_application_file(*, file: FileDTO, mime_type: str, application_id: str) -> str:
    """Insert an application files in the database.

    Args:
        file: The file object.
        mime_type: The MIME type of the file.
        application_id: The ID of the application the file belongs to.

    Raises:
        DatabaseError: If an error occurs during the upsert operation.

    Returns:
        The ID of the inserted file
    """
    insert_stmt = (
        insert(ApplicationFile)
        .values(
            {
                "application_id": application_id,
                "name": file["filename"],
                "type": mime_type,
                "size": file["content"].__sizeof__(),
            }
        )
        .returning(ApplicationFile.id)
    )

    session_maker = get_session_maker()

    async with session_maker() as session, session.begin():
        try:
            result = await session.execute(insert_stmt)
            await session.commit()
            return str(result.scalar())
        except SQLAlchemyError as e:
            logger.error("Error upserting application files: %s", e)
            await session.rollback()
            raise DatabaseError("Error upserting application files", context=str(e)) from e
