import logging
import sys
from http import HTTPStatus
from json import dumps
from uuid import UUID

from sanic import HTTPResponse, Request
from sanic.request import File

from src.data_types import SectionName
from src.dto import APIError
from src.indexer.chunking import chunk_text
from src.indexer.dto import FileMetadata
from src.indexer.extraction import parse_file_data
from src.utils.exceptions import RequestFailureError, ValidationError
from src.utils.serialization import serialize

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
logger = logging.getLogger(__name__)


async def handle_files_upload(
    request: Request,
    workspace_id: UUID,
    application_id: UUID,
    section_name: SectionName,
) -> HTTPResponse:
    """Route handler for uploading files to the indexer.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.
        section_name: The section name.

    Returns:
        The response object.
    """
    files_list: list[File] = request.files.get("files")

    if not files_list:
        logger.error("No files provided")
        return HTTPResponse(status=HTTPStatus.BAD_REQUEST, body=serialize(APIError(message="No files provided")))

    for file in files_list:
        file_metadata = FileMetadata(
            workspace_id=str(workspace_id),
            application_id=str(application_id),
            section_name=section_name,
            filename=file.name,
        )
        await extract_file_data(file_data=file.body, file_metadata=file_metadata)


async def extract_file_data(*, file_data: bytes, file_metadata: FileMetadata) -> None:
    try:
        extracted_data, mime_type = await parse_file_data(file_data=file_data, filename=file_metadata.filename)
        chunks = chunk_text(extracted_data=extracted_data, mime_type=mime_type)
        logger.info("Extracted text from file: %s", dumps(chunks))
    except (RequestFailureError, ValidationError) as e:
        logger.error("Failed to parse file: %s, Error: %s", file_metadata.filename, e)
