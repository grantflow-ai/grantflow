import logging
from typing import Any

from sanic import Sanic

from src.indexer.chunking import chunk_text
from src.indexer.db import insert_application_file
from src.indexer.dto import FileDTO
from src.indexer.extraction import parse_file_data
from src.indexer.indexing import index_documents
from src.utils.exceptions import ExternalOperationError, FileParsingError, ValidationError

logger = logging.getLogger(__name__)


async def parse_and_index_file(
    *,
    app: Sanic[Any, Any],
    application_id: str,
    file: FileDTO,
) -> None:
    """Parse and index the given file.

    Args:
        app: The Sanic application.
        application_id: The application ID.
        file: The file to parse and index.


    Returns:
        None
    """
    try:
        extracted_text, mime_type = await parse_file_data(file)
        logger.info("Extracted text from file: %s", file["filename"])
        file_id = await insert_application_file(
            application_id=application_id,
            mime_type="any",
            file=file,
        )

        chunks = chunk_text(text=extracted_text, mime_type=mime_type)
        await index_documents(
            chunks=chunks,
            file_id=file_id,
            application_id=application_id,
        )
        logger.info("Successfully indexed file: %s", file["filename"])
    except (FileParsingError, ExternalOperationError, ValidationError) as e:
        await app.cancel_task(file["filename"])
        logger.error("Failed to parse file: %s, Error: %s", file["filename"], e)
    finally:
        logger.info("Task %s completed", file["filename"])
