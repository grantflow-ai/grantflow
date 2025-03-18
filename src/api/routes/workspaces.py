from typing import Any, cast
from uuid import UUID

from litestar import delete, get, patch, post
from litestar.exceptions import NotFoundException
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from src.api_types import (
    CreateWorkspaceRequestBody,
    TableIdResponse,
    UpdateWorkspaceRequestBody,
    WorkspaceBaseResponse,
)
from src.db.enums import UserRoleEnum
from src.db.tables import Workspace, WorkspaceUser
from src.exceptions import DatabaseError
from src.utils.logger import get_logger

logger = get_logger(__name__)


@post("/workspaces")
async def handle_create_workspace(
    auth: str, data: CreateWorkspaceRequestBody, session_maker: async_sessionmaker[Any]
) -> TableIdResponse:
    logger.info("Creating workspace by user", uid=auth)
    async with session_maker() as session, session.begin():
        try:
            workspace = await session.scalar(insert(Workspace).values(data).returning(Workspace))
            await session.execute(
                insert(WorkspaceUser).values(
                    {
                        "workspace_id": workspace.id,
                        "firebase_uid": auth,
                        "role": UserRoleEnum.OWNER.value,
                    }
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating workspace", exc_info=e)
            raise DatabaseError("Error creating workspace", context=str(e)) from e

    return TableIdResponse(
        id=str(workspace.id),
    )


@get("/workspaces")
async def handle_retrieve_workspaces(auth: str, session_maker: async_sessionmaker[Any]) -> list[WorkspaceBaseResponse]:
    logger.info("Retrieving workspaces for user", uid=auth)
    async with session_maker() as session:
        workspaces = list(
            await session.scalars(
                select(Workspace)
                .options(selectinload(Workspace.workspace_users))
                .join(WorkspaceUser)
                .where(WorkspaceUser.firebase_uid == auth)
            )
        )

    return [
        WorkspaceBaseResponse(
            id=str(workspace.id),
            name=workspace.name,
            description=workspace.description,
            logo_url=workspace.logo_url,
            role=workspace.workspace_users[0].role,
        )
        for workspace in workspaces
    ]


@patch("/workspaces/{workspace_id:uuid}", allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN])
async def handle_update_workspace(
    data: UpdateWorkspaceRequestBody, user: UserRoleEnum, workspace_id: UUID, session_maker: async_sessionmaker[Any]
) -> WorkspaceBaseResponse:
    logger.info("Updating workspace", workspace_id=workspace_id)
    async with session_maker() as session, session.begin():
        try:
            workspace = await session.scalar(
                update(Workspace).where(Workspace.id == workspace_id).values(data).returning(Workspace)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating workspace", exc_info=e)
            raise DatabaseError("Error updating workspace", context=str(e)) from e

    return WorkspaceBaseResponse(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description,
        logo_url=workspace.logo_url,
        role=user,
    )


@get("/workspaces/{workspace_id:uuid}", allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER])
async def handle_retrieve_workspace(workspace_id: UUID, session_maker: async_sessionmaker[Any]) -> Workspace:
    logger.info("Retrieving workspace", workspace_id=workspace_id)
    async with session_maker() as session, session.begin():
        try:
            result = await session.scalar(
                select(Workspace)
                .options(selectinload(Workspace.grant_applications))
                .where(Workspace.id == workspace_id)
            )
            return cast("Workspace", result)
        except SQLAlchemyError as e:
            logger.error("Error retrieving workspace", exc_info=e)
            raise NotFoundException from e


@delete("/workspaces/{workspace_id:uuid}", allowed_roles=[UserRoleEnum.OWNER])
async def handle_delete_workspace(workspace_id: UUID, session_maker: async_sessionmaker[Any]) -> None:
    logger.info("Deleting workspace", workspace_id=workspace_id)
    async with session_maker() as session, session.begin():
        try:
            await session.execute(sa_delete(Workspace).where(Workspace.id == workspace_id))
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting workspace", exc_info=e)
            raise DatabaseError("Error deleting workspace", context=str(e)) from e
