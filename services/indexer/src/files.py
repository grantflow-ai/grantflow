from packages.db.src.connection import get_session_maker
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import RagFile, TextVector
from packages.shared_utils.src.exceptions import (
    DatabaseError,
    ExternalOperationError,
    FileParsingError,
    ValidationError,
)
from packages.shared_utils.src.serialization import serialize
from services.indexer.src.chunking import chunk_text
from services.indexer.src.extraction import (
    extract_file_content,
)
from services.indexer.src.indexing import index_documents, logger
from sqlalchemy import insert, update
from sqlalchemy.exc import SQLAlchemyError


async def parse_and_index_file(
    *,
    content: bytes,
    file_id: str,
    filename: str,
    mime_type: str,
) -> None:
    session_maker = get_session_maker()
    try:
        extracted_text, mime_type = await extract_file_content(
            content=content,
            mime_type=mime_type,
        )
        logger.info("Extracted text from file", filename=filename)
        chunks = chunk_text(text=extracted_text, mime_type=mime_type)
        vectors = await index_documents(
            chunks=chunks,
            file_id=file_id,
        )
    except (FileParsingError, ExternalOperationError, ValidationError) as e:
        async with session_maker() as session, session.begin():
            await session.execute(
                update(RagFile).where(RagFile.id == file_id).values(indexing_status=FileIndexingStatusEnum.FAILED)
            )
            await session.commit()

        logger.error("Failed to parse file", filename=filename, exec_info=e)
    else:
        async with session_maker() as session, session.begin():
            try:
                await session.execute(insert(TextVector).values(vectors))
                await session.execute(
                    update(RagFile)
                    .where(RagFile.id == file_id)
                    .values(
                        {
                            "indexing_status": FileIndexingStatusEnum.FINISHED,
                            "text_content": extracted_text
                            if isinstance(extracted_text, str)
                            else serialize(extracted_text).decode(),
                        }
                    )
                )
                await session.commit()
                logger.info("Successfully indexed file", filename=filename)
            except SQLAlchemyError as e:
                logger.error(
                    "Error inserting vectors.",
                    exec_info=e,
                    filename=filename,
                )
                await session.rollback()
                raise DatabaseError("Error inserting vectors", context=str(e)) from e
