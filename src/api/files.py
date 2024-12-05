import logging
import sys
from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse

from src.api.api_types import APIRequest
from src.api.utils import verify_workspace_access
from src.dto import APIError
from src.indexer.dto import FileDTO
from src.indexer.tasks import parse_and_index_file
from src.utils.serialization import serialize

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
logger = logging.getLogger(__name__)


async def handle_upload_application_files(
    request: APIRequest, workspace_id: UUID, application_id: UUID
) -> HTTPResponse:
    """Route handler for uploading files to the indexer.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    files: list[FileDTO] = [
        FileDTO.from_file(filename=filename, file=files_list)
        for filename, files_list in dict(request.files).items()  # type: ignore[arg-type]
        if files_list
    ]

    if not files:
        logger.error("No files provided")
        return HTTPResponse(status=HTTPStatus.BAD_REQUEST, body=serialize(APIError(message="No files provided")))

    for file_dto in files:
        request.app.add_task(
            parse_and_index_file(
                file=file_dto,
                application_id=str(application_id),
                app=request.app,
            ),
            name=file_dto.filename,
        )

    return HTTPResponse(status=HTTPStatus.OK)
