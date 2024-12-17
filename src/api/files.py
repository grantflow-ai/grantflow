from asyncio import gather
from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse, empty, json
from sqlalchemy import insert

from src.api.utils import verify_workspace_access
from src.api_types import APIRequest, CreateUploadUrlsRequestBody, FileUploadUrlResponse
from src.db.tables import ApplicationFile, FileIndexingStatusEnum
from src.dto import APIError
from src.indexer.dto import FileDTO
from src.indexer.tasks import parse_and_index_file
from src.utils.buckets import create_signed_upload_url
from src.utils.env import get_env
from src.utils.logging import get_logger
from src.utils.serialization import deserialize, serialize

logger = get_logger(__name__)


async def handle_create_upload_urls(request: APIRequest, workspace_id: UUID, application_id: UUID) -> HTTPResponse:
    """Route handler for creating signed upload URLs for files.


    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    request_body = deserialize(request.body, CreateUploadUrlsRequestBody)

    signed_urls = await gather(
        *[
            create_signed_upload_url(
                bucket_name=get_env("DOCUMENTS_BUCKET_NAME"),
                blob_name=f"{workspace_id}/{application_id}/{file_name}",
            )
            for file_name in request_body["file_names"]
        ]
    )

    return json(
        [
            FileUploadUrlResponse(file_name=file_name, upload_url=signed_url)
            for file_name, signed_url in zip(request_body["file_names"], signed_urls, strict=False)
        ],
        status=HTTPStatus.CREATED,
    )


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
                [
                    {
                        "application_id": application_id,
                        "name": file_dto.filename,
                        "type": file_dto.mime_type,
                        "size": file_dto.content.__sizeof__(),
                        "status": FileIndexingStatusEnum.INDEXING,
                    }
                    for file_dto in file_dtos
                ]
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

    return empty()
