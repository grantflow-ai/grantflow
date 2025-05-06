from typing import Any
from uuid import UUID

from litestar import delete, get
from litestar.exceptions import NotFoundException
from packages.db.src.tables import OrganizationRagSource, RagFile
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from services.backend.src.common_types import UploadedFileResponse
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

logger = get_logger(__name__)


@get("/organizations/{organization_id:uuid}/files", operation_id="ListOrganizationFiles")
async def retrieve_organization_files(
    organization_id: UUID,
    session_maker: async_sessionmaker[Any],
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
                .join(OrganizationRagSource)
                .where(OrganizationRagSource.funding_organization_id == organization_id)
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
                select(OrganizationRagSource)
                .options(selectinload(OrganizationRagSource.rag_source))
                .where(
                    OrganizationRagSource.funding_organization_id == organization_id,
                    OrganizationRagSource.rag_source_id == file_id,
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
