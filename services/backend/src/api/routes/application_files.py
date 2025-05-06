from typing import Any, TypedDict
from uuid import UUID

from litestar import delete, get, post
from litestar.exceptions import NotFoundException
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import GrantApplicationRagSource, RagFile
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.gcs import create_signed_upload_url
from packages.shared_utils.src.logger import get_logger
from services.backend.src.common_types import UploadedFileResponse
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

logger = get_logger(__name__)


class UploadUrlResponse(TypedDict):
    url: str


@get(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/files",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="ListApplicationFiles",
)
async def retrieve_application_files(
    application_id: UUID, session_maker: async_sessionmaker[Any]
) -> list[UploadedFileResponse]:
    async with session_maker() as session:
        return [
            UploadedFileResponse(
                id=str(rag_file.id),
                filename=rag_file.filename,
                size=rag_file.size,
                mime_type=rag_file.mime_type,
                indexing_status=rag_file.indexing_status,
                created_at=rag_file.created_at.isoformat(),
            )
            for rag_file in await session.scalars(
                select(RagFile)
                .join(GrantApplicationRagSource)
                .where(GrantApplicationRagSource.grant_application_id == application_id)
            )
        ]


@delete(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/files/{file_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="DeleteApplicationFile",
)
async def handle_delete_application_file(
    application_id: UUID, file_id: UUID, session_maker: async_sessionmaker[Any]
) -> None:
    async with session_maker() as session, session.begin():
        try:
            result = await session.execute(
                select(GrantApplicationRagSource)
                .options(selectinload(GrantApplicationRagSource.rag_source))
                .where(
                    GrantApplicationRagSource.grant_application_id == application_id,
                    GrantApplicationRagSource.rag_source_id == file_id,
                )
            )
            result.scalar_one()
            await session.execute(sa_delete(RagFile).where(RagFile.id == file_id))
            await session.commit()
        except NoResultFound as e:
            raise NotFoundException from e
        except SQLAlchemyError as e:
            logger.error("Error deleting application file", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error deleting application file", context=str(e)) from e


@post(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/files/upload-url",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="CreateUploadUrl",
)
async def handle_create_upload_url(
    workspace_id: UUID,
    application_id: UUID,
    blob_name: str,  # this is a query parameter ~keep
) -> UploadUrlResponse:
    url = await create_signed_upload_url(
        workspace_id=str(workspace_id),
        application_id=str(application_id),
        blob_name=blob_name,
    )
    return UploadUrlResponse(url=url)
