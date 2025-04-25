from asyncio import gather
from typing import Annotated, Any
from uuid import UUID

from litestar import delete, get, post
from litestar.datastructures import UploadFile
from litestar.enums import RequestEncodingType
from litestar.exceptions import NotFoundException, ValidationException
from litestar.params import Body
from shared_utils.src.logger import get_logger
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from db.src.enums import FileIndexingStatusEnum
from db.src.tables import OrganizationFile, RagFile
from src.common_types import APIRequest, TableIdResponse
from src.exceptions import DatabaseError
from src.files import FileDTO

logger = get_logger(__name__)


@post("/organizations/{organization_id:uuid}/files", operation_id="UploadOrganizationFiles")
async def handle_organization_file_uploads(
    data: Annotated[dict[str, UploadFile], Body(media_type=RequestEncodingType.MULTI_PART)],
    organization_id: UUID,
    session_maker: async_sessionmaker[Any],
    request: APIRequest,
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
            organization_files = list(
                await session.scalars(
                    insert(OrganizationFile)
                    .values(
                        [{"funding_organization_id": organization_id, "rag_file_id": file_id} for file_id in file_ids]
                    )
                    .returning(OrganizationFile.rag_file_id)
                )
            )
        except SQLAlchemyError as e:
            logger.error("Error uploading organization files", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error uploading organization files", context=str(e)) from e

    for file_id, file_dto in zip(file_ids, file_dtos, strict=True):
        request.app.emit("parse_and_index_file", file_id=file_id, file_dto=file_dto)

    return [TableIdResponse(id=str(rag_file_id)) for rag_file_id in organization_files]


@get("/organizations/{organization_id:uuid}/files", operation_id="ListOrganizationFiles")
async def retrieve_organization_files(
    organization_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> list[TableIdResponse]:
    async with session_maker() as session:
        return [
            TableIdResponse(id=str(rag_file_id))
            for rag_file_id in await session.scalars(
                select(OrganizationFile.rag_file_id).where(OrganizationFile.funding_organization_id == organization_id)
            )
        ]


@delete("/organizations/{organization_id:uuid}/files/{file_id:uuid}", operation_id="DeleteOrganizationFile")
async def handle_delete_organization_file(
    organization_id: UUID,
    file_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> None:
    async with session_maker() as session, session.begin():
        try:
            result = await session.execute(
                select(OrganizationFile)
                .options(selectinload(OrganizationFile.rag_file))
                .where(
                    OrganizationFile.funding_organization_id == organization_id, OrganizationFile.rag_file_id == file_id
                )
            )
            result.scalar_one()
            await session.execute(sa_delete(RagFile).where(RagFile.id == file_id))
            await session.commit()
        except NoResultFound as e:
            raise NotFoundException from e
        except SQLAlchemyError as e:
            logger.error("Error deleting organization file", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error deleting organization file", context=str(e)) from e
