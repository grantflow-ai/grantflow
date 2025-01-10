from asyncio import gather
from http import HTTPStatus
from uuid import UUID

from sanic import BadRequest, HTTPResponse, NotFound, empty, json
from sanic.response import JSONResponse
from sqlalchemy import delete, insert, select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.orm import selectinload

from src.api.utils import verify_workspace_access
from src.api_types import APIRequest
from src.db.enums import FileIndexingStatusEnum
from src.db.tables import GrantApplicationFile, RagFile
from src.dto import FileDTO
from src.exceptions import DatabaseError
from src.utils.logging import get_logger

logger = get_logger(__name__)


async def handle_application_file_uploads(
    request: APIRequest, workspace_id: UUID, application_id: UUID
) -> JSONResponse:
    """Route handler for uploading files to an application.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Raises:
        DatabaseError: If there was an issue uploading the files to the application.
        BadRequest: If no files were uploaded.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    if not request.files:
        raise BadRequest("No files were uploaded")

    file_dtos = [FileDTO.from_file(file, filename) for filename, file in request.files.items()]

    async with request.ctx.session_maker() as session, session.begin():
        try:
            file_ids = list(
                await session.scalars(
                    insert(RagFile)
                    .values(
                        [
                            {
                                "filename": file_dto.filename,
                                "mime_type": file_dto.mime_type,
                                "size": file_dto.size,
                                "indexing_status": FileIndexingStatusEnum.INDEXING,
                            }
                            for file_dto in file_dtos
                        ]
                    )
                    .returning(RagFile.id)
                )
            )
            application_files = list(
                await session.scalars(
                    insert(GrantApplicationFile)
                    .values([{"grant_application_id": application_id, "rag_file_id": file_id} for file_id in file_ids])
                    .returning(GrantApplicationFile)
                )
            )
        except SQLAlchemyError as e:
            logger.error("Error uploading application files", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error uploading application files", context=str(e)) from e

    await gather(
        *[
            request.app.dispatch("parse_and_index_file", context={"file_id": file_id, "file_dto": file_dto})
            for file_id, file_dto in zip(file_ids, file_dtos, strict=True)
        ]
    )

    return json(
        application_files,
        status=HTTPStatus.CREATED,
    )


async def retrieve_application_files(request: APIRequest, workspace_id: UUID, application_id: UUID) -> JSONResponse:
    """Route handler for retrieving files from an application.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)
    async with request.ctx.session_maker() as session:
        application_files = list(
            await session.scalars(
                select(GrantApplicationFile)
                .options(selectinload(GrantApplicationFile.rag_file))
                .where(GrantApplicationFile.grant_application_id == application_id)
            )
        )

    return json(application_files)


async def handle_delete_application_file(
    request: APIRequest, workspace_id: UUID, application_id: UUID, file_id: UUID
) -> HTTPResponse:
    """Route handler for deleting a file from an application.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.
        file_id: The file ID.

    Raises:
        DatabaseError: If there was an issue deleting the file from the application.
        NotFound: If the file was not found in the application.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)
    async with request.ctx.session_maker() as session, session.begin():
        try:
            result = await session.execute(
                select(GrantApplicationFile)
                .options(selectinload(GrantApplicationFile.rag_file))
                .where(
                    GrantApplicationFile.grant_application_id == application_id,
                    GrantApplicationFile.rag_file_id == file_id,
                )
            )
            result.scalar_one()
            await session.execute(delete(RagFile).where(RagFile.id == file_id))
            await session.commit()
        except NoResultFound as e:
            raise NotFound from e
        except SQLAlchemyError as e:
            logger.error("Error deleting application file", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error deleting application file", context=str(e)) from e

    return empty()
