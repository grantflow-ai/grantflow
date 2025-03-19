from asyncio import gather
from typing import Annotated, Any
from uuid import UUID

from litestar import delete, get, post
from litestar.datastructures import UploadFile
from litestar.enums import RequestEncodingType
from litestar.exceptions import NotFoundException, ValidationException
from litestar.params import Body
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from src.api.api_types import APIRequest, TableIdResponse
from src.db.enums import FileIndexingStatusEnum, UserRoleEnum
from src.db.tables import GrantApplicationFile, RagFile
from src.exceptions import DatabaseError
from src.files import FileDTO
from src.utils.logger import get_logger

logger = get_logger(__name__)


@post(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/files",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
)
async def handle_application_file_uploads(
    request: APIRequest,
    data: Annotated[dict[str, UploadFile], Body(media_type=RequestEncodingType.MULTI_PART)],
    application_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> list[TableIdResponse]:
    if not data:
        raise ValidationException("No files were uploaded")

    file_dtos = await gather(*[FileDTO.from_file(file, filename) for filename, file in data.items()])

    async with session_maker() as session, session.begin():
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
                    .returning(GrantApplicationFile.rag_file_id)
                )
            )
        except SQLAlchemyError as e:
            logger.error("Error uploading application files", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error uploading application files", context=str(e)) from e

    for file_id, file_dto in zip(file_ids, file_dtos, strict=True):
        request.app.emit("parse_and_index_file", file_id=file_id, file_dto=file_dto)

    return [TableIdResponse(id=str(rag_file_id)) for rag_file_id in application_files]


@get(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/files",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
)
async def retrieve_application_files(
    application_id: UUID, session_maker: async_sessionmaker[Any]
) -> list[TableIdResponse]:
    async with session_maker() as session:
        return [
            TableIdResponse(id=str(rag_file_id))
            for rag_file_id in await session.scalars(
                select(GrantApplicationFile.rag_file_id).where(
                    GrantApplicationFile.grant_application_id == application_id
                )
            )
        ]


@delete(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/files/{file_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
)
async def handle_delete_application_file(
    application_id: UUID, file_id: UUID, session_maker: async_sessionmaker[Any]
) -> None:
    async with session_maker() as session, session.begin():
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
            await session.execute(sa_delete(RagFile).where(RagFile.id == file_id))
            await session.commit()
        except NoResultFound as e:
            raise NotFoundException from e
        except SQLAlchemyError as e:
            logger.error("Error deleting application file", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error deleting application file", context=str(e)) from e
