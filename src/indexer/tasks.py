from typing import Any

from sanic import Sanic
from sqlalchemy import update

from src.db.connection import get_session_maker
from src.db.tables import ApplicationFile, FileIndexingStatusEnum
from src.exceptions import ExternalOperationError, FileParsingError, ValidationError
from src.indexer.chunking import chunk_text
from src.indexer.dto import FileDTO
from src.indexer.extraction import parse_file_data
from src.indexer.indexing import index_documents
from src.utils.logging import get_logger

logger = get_logger(__name__)


async def parse_and_index_file(
    *,
    app: Sanic[Any, Any],
    application_id: str,
    file: FileDTO,
    file_id: str,
) -> None:
    """Parse and index the given file.

    Args:
        app: The Sanic application.
        application_id: The application ID.
        file: The file to parse and index.
        file_id: The ID of the file in the database.


    Returns:
        None
    """
    session_maker = get_session_maker()
    try:
        extracted_text, mime_type = await parse_file_data(file)
        logger.info("Extracted text from file: %s", file.filename)

        chunks = chunk_text(text=extracted_text, mime_type=mime_type)
        await index_documents(
            chunks=chunks,
            file_id=file_id,
            application_id=application_id,
        )

        async with session_maker() as session, session.begin():
            await session.execute(
                update(ApplicationFile)
                .where(ApplicationFile.id == file_id)
                .values(status=FileIndexingStatusEnum.FINISHED)
            )
            await session.commit()

        logger.info("Successfully indexed file: %s", file.filename)

    except (FileParsingError, ExternalOperationError, ValidationError) as e:
        await app.cancel_task(file.filename)
        async with session_maker() as session, session.begin():
            await session.execute(
                update(ApplicationFile)
                .where(ApplicationFile.id == file_id)
                .values(status=FileIndexingStatusEnum.FAILED)
            )
            await session.commit()
        logger.error("Failed to parse file: %s", file.filename, exec_info=e)
    finally:
        logger.info("Task %s completed", file.filename)
