import logging
import sys
from http import HTTPStatus
from typing import cast
from uuid import UUID

from sanic import HTTPResponse, Request
from sanic.request import File

from src.data_types import SectionName
from src.dto import APIError
from src.indexer.chunking import chunk_text
from src.indexer.db import upsert_application_file
from src.indexer.extraction import parse_file_data
from src.indexer.indexing import index_documents
from src.utils.exceptions import ExternalOperationError, FileParsingError, ValidationError
from src.utils.serialization import serialize

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
logger = logging.getLogger(__name__)


async def handle_files_upload(application_id: UUID, request: Request, section_name: SectionName) -> HTTPResponse:
    """Route handler for uploading files to the indexer.

    Args:
        application_id: The application ID.
        request: The request object.
        section_name: The section name.

    Returns:
        The response object.
    """
    files_list: list[File] = cast(list[File], request.files.get("files") if request.files else [])

    if not files_list:
        logger.error("No files provided")
        return HTTPResponse(status=HTTPStatus.BAD_REQUEST, body=serialize(APIError(message="No files provided")))

    for file in files_list:
        await parse_and_index_file(file=file, application_id=str(application_id), section_name=section_name)

    return HTTPResponse(status=HTTPStatus.OK)


async def parse_and_index_file(
    *,
    file: File,
    application_id: str,
    section_name: SectionName,
) -> None:
    """Parse and index the given file.

    Args:
        file: The file to parse and index.
        application_id: The application ID.
        section_name: The section name


    Returns:
        None
    """
    try:
        extracted_text, mime_type = await parse_file_data(file_data=file.body, filename=file.name)
        logger.info("Extracted text from file: %s", file.name)
        file_id = await upsert_application_file(
            application_id=application_id,
            mime_type=mime_type,
            file=file,
        )
        chunks = chunk_text(text=extracted_text, mime_type=mime_type)
        await index_documents(
            chunks=chunks,
            file_id=file_id,
            application_id=application_id,
            section_name=section_name,
        )

    except FileParsingError as e:
        logger.error("Failed to parse file: %s, Error: %s", file.name, e)
        return

    try:
        logger.info("Successfully indexed file: %s", file.name)
    except (ExternalOperationError, ValidationError) as e:
        logger.error("Failed to parse file: %s, Error: %s", file.name, e)
