from sqlalchemy import insert, update
from sqlalchemy.exc import SQLAlchemyError

from src.db.connection import get_session_maker
from src.db.enums import FileIndexingStatusEnum
from src.db.tables import RagFile, TextVector
from src.dto import FileDTO
from src.exceptions import DatabaseError, ExternalOperationError, FileParsingError, ValidationError
from src.indexer.chunking import chunk_text
from src.indexer.indexing import index_documents, logger
from src.utils.extraction import (
    extract_file_content,
)
from src.utils.serialization import serialize


async def parse_and_index_file(
    *,
    file_dto: FileDTO,
    file_id: str,
) -> None:
    """Parse and index the given file.

    Args:
        file_dto: The file to parse and index.
        file_id: The ID of the file in the database.

    Raises:
        DatabaseError: If there was an issue inserting the vectors into the database.

    Returns:
        None
    """
    session_maker = get_session_maker()
    try:
        extracted_text, mime_type = await extract_file_content(
            content=file_dto.content,
            mime_type=file_dto.mime_type,
        )
        logger.info("Extracted text from file", filename=file_dto.filename)
        chunks = chunk_text(text=extracted_text, mime_type=mime_type)
        vectors = await index_documents(
            chunks=chunks,
            file_id=file_id,
        )
    except (FileParsingError, ExternalOperationError, ValidationError) as e:
        async with session_maker() as session, session.begin():
            await session.execute(
                update(RagFile).where(RagFile.id == file_id).values(status=FileIndexingStatusEnum.FAILED)
            )
            await session.commit()

        logger.error("Failed to parse file", filename=file_dto.filename, exec_info=e)
    else:
        async with session_maker() as session, session.begin():
            try:
                await session.execute(insert(TextVector).values(vectors))
                await session.execute(
                    update(RagFile)
                    .where(RagFile.id == file_id)
                    .values(
                        {
                            "status": FileIndexingStatusEnum.FINISHED,
                            "text_content": extracted_text
                            if isinstance(extracted_text, str)
                            else serialize(extracted_text).decode(),
                        }
                    )
                )
                await session.commit()
                logger.info("Successfully indexed file", filename=file_dto.filename)
            except SQLAlchemyError as e:
                logger.error(
                    "Error inserting vectors.",
                    exec_info=e,
                    filename=file_dto.filename,
                )
                await session.rollback()
                raise DatabaseError("Error inserting vectors", context=str(e)) from e
