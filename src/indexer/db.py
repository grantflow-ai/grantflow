import logging
from typing import Final, TypedDict

from pgvector.asyncpg import register_vector
from sqlalchemy import MetaData, Table
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

from src.data_types import SectionName
from src.db.connection import get_async_engine, get_session_maker
from src.utils.ref import Ref

logger = logging.getLogger(__name__)

TABLE_NAME: Final[str] = "application_vectors"
table_ref = Ref[Table]()


class VectorDTO(TypedDict):
    """DTO for embeddings and metadata"""

    chunk_index: int
    """The index of the chunk."""
    content: str
    """The text content of the document."""
    element_type: str | None
    """The type of element the content belongs to."""
    embeddings: list[float]
    """The embeddings of the content."""
    filename: str
    """The name of the file from which the content was extracted."""
    keywords: list[str]
    """The keywords extracted from the content."""
    labels: list[str]
    """The labels extracted from the content."""
    page_number: int | None
    """The page number of the document."""
    section_name: SectionName


async def get_table() -> Table:
    """Get the generation_results table.

    Returns:
        The generation_results table.
    """
    if table_ref.value is None:
        async with get_async_engine().begin() as connection:
            table_ref.value = await connection.run_sync(
                lambda conn: Table(TABLE_NAME, MetaData(), autoload_with=conn, schema="public")
            )

    return table_ref.value


async def insert_application_vectors(
    *,
    vectors: list[VectorDTO],
    application_id: str,
) -> None:
    """Insert or update application vectors in the database.

    Args:
        vectors: A list of VectorDTO objects containing vector data.
        application_id: The ID of the application the vectors belong to.
    """
    application_vectors = await get_table()
    session_maker = get_session_maker()

    async with session_maker() as session:
        await register_vector(session)
        try:
            async with session.begin():
                insert_stmt = insert(application_vectors).values(
                    [
                        {
                            "application_id": application_id,
                            "chunk_index": vector["chunk_index"],
                            "content": vector["content"],
                            "element_type": vector["element_type"],
                            "embeddings": vector["embeddings"],
                            "filename": vector["filename"],
                            "keywords": vector["keywords"],
                            "labels": vector["labels"],
                            "page_number": vector["page_number"],
                            "section_name": vector["section_name"],
                        }
                        for vector in vectors
                    ]
                )

                upsert_stmt = insert_stmt.on_conflict_do_update(
                    index_elements=["application_id", "filename", "chunk_index"],
                    set_={
                        "content": insert_stmt.excluded.content,
                        "element_type": insert_stmt.excluded.element_type,
                        "embeddings": insert_stmt.excluded.embeddings,
                        "filename": insert_stmt.excluded.filename,
                        "keywords": insert_stmt.excluded.keywords,
                        "labels": insert_stmt.excluded.labels,
                        "page_number": insert_stmt.excluded.page_number,
                        "section_name": insert_stmt.excluded.section_name,
                    },
                )

                # Execute upsert
                await session.execute(upsert_stmt)
                await session.commit()
                logger.info("Successfully inserted application vectors for application_id: %s", application_id)

        except SQLAlchemyError:
            logger.exception("Failed to upsert application vectors")
            await session.rollback()
