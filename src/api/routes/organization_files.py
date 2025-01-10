from asyncio import gather
from http import HTTPStatus
from uuid import UUID

from sanic import BadRequest, HTTPResponse, NotFound, empty, json
from sanic.response import JSONResponse
from sqlalchemy import delete, insert, select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.orm import selectinload

from src.api_types import APIRequest
from src.db.enums import FileIndexingStatusEnum
from src.db.tables import OrganizationFile, RagFile
from src.dto import FileDTO
from src.exceptions import DatabaseError
from src.utils.logging import get_logger

logger = get_logger(__name__)


async def handle_organization_file_uploads(request: APIRequest, organization_id: UUID) -> JSONResponse:
    """Route handler for uploading files to an organization.

    Args:
        request: The request object.
        organization_id: The organization ID.

    Raises:
        DatabaseError: If there was an issue uploading the files to the organization.
        BadRequest: If no files were uploaded.

    Returns:
        The response object.
    """
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
            organization_files = list(
                await session.scalars(
                    insert(OrganizationFile)
                    .values(
                        [{"funding_organization_id": organization_id, "rag_file_id": file_id} for file_id in file_ids]
                    )
                    .returning(OrganizationFile)
                )
            )
        except SQLAlchemyError as e:
            logger.error("Error uploading organization files", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error uploading organization files", context=str(e)) from e

    await gather(
        *[
            request.app.dispatch("parse_and_index_file", context={"file_id": file_id, "file_dto": file_dto})
            for file_id, file_dto in zip(file_ids, file_dtos, strict=True)
        ]
    )

    return json(
        organization_files,
        status=HTTPStatus.CREATED,
    )


async def retrieve_organization_files(request: APIRequest, organization_id: UUID) -> JSONResponse:
    """Route handler for retrieving files from an organization.

    Args:
        request: The request object.
        organization_id: The organization ID.

    Returns:
        The response object.
    """
    async with request.ctx.session_maker() as session:
        organization_files = list(
            await session.scalars(
                select(OrganizationFile)
                .options(selectinload(OrganizationFile.rag_file))
                .where(OrganizationFile.funding_organization_id == organization_id)
            )
        )

    return json(organization_files)


async def handle_delete_organization_file(request: APIRequest, organization_id: UUID, file_id: UUID) -> HTTPResponse:
    """Route handler for deleting a file from an organization.

    Args:
        request: The request object.
        organization_id: The organization ID.
        file_id: The file ID.

    Raises:
        DatabaseError: If there was an issue deleting the file from the organization.
        NotFound: If the file was not found in the organization.

    Returns:
        The response object.
    """
    async with request.ctx.session_maker() as session, session.begin():
        try:
            result = await session.execute(
                select(OrganizationFile)
                .options(selectinload(OrganizationFile.rag_file))
                .where(
                    OrganizationFile.funding_organization_id == organization_id, OrganizationFile.rag_file_id == file_id
                )
            )
            result.scalar_one()
            await session.execute(delete(RagFile).where(RagFile.id == file_id))
            await session.commit()
        except NoResultFound as e:
            raise NotFound from e
        except SQLAlchemyError as e:
            logger.error("Error deleting organization file", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error deleting organization file", context=str(e)) from e

    return empty()
