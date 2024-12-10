import logging
import sys
from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse
from sqlalchemy import insert

from src.api.api_types import APIRequest
from src.api.utils import verify_workspace_access
from src.db.tables import ApplicationFile, FileIndexingStatusEnum
from src.dto import APIError
from src.indexer.dto import FileDTO
from src.indexer.tasks import parse_and_index_file
from src.utils.serialization import serialize

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
logger = logging.getLogger(__name__)


async def handle_upload_application_files(
    request: APIRequest, workspace_id: UUID, application_id: UUID
) -> HTTPResponse:
    """Route handler for uploading file_dtos to the indexer.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    file_dtos: list[FileDTO] = [
        FileDTO.from_file(filename=filename, file=files_list)
        for filename, files_list in dict(request.files).items()  # type: ignore[arg-type]
        if files_list
    ]

    if not file_dtos:
        logger.error("No file_dtos provided")
        return HTTPResponse(status=HTTPStatus.BAD_REQUEST, body=serialize(APIError(message="No file_dtos provided")))

    async with request.ctx.session_maker() as session, session.begin():
        insert_stmt = (
            insert(ApplicationFile)
            .values(
                {
                    "application_id": application_id,
                    "name": file_dto.filename,
                    "type": file_dto.mime_type,
                    "size": file_dto.content.__sizeof__(),
                    "status": FileIndexingStatusEnum.INDEXING,
                }
                for file_dto in file_dtos
            )
            .returning(ApplicationFile.id)
        )
        file_ids = await session.scalars(insert_stmt)
        await session.commit()

    for file_dto, file_id in zip(file_dtos, file_ids, strict=False):
        request.app.add_task(
            parse_and_index_file(
                app=request.app,
                application_id=str(application_id),
                file=file_dto,
                file_id=str(file_id),
            ),
            name=file_dto.filename,
        )

    return HTTPResponse(status=HTTPStatus.OK)
