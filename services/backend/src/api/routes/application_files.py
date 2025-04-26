from typing import Any
from uuid import UUID

from litestar import delete, get
from litestar.exceptions import NotFoundException
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import GrantApplicationFile, RagFile
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from services.backend.src.common_types import TableIdResponse
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

logger = get_logger(__name__)


@get(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/files",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="ListApplicationFiles",
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
    operation_id="DeleteApplicationFile",
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
