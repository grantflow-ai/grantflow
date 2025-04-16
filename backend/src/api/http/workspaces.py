from typing import Any, NotRequired, TypedDict, cast
from uuid import UUID

from litestar import delete, get, patch, post
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from src.api.api_types import APIRequest, TableIdResponse
from src.db.enums import UserRoleEnum
from src.db.tables import Workspace, WorkspaceUser
from src.exceptions import DatabaseError
from src.utils.logger import get_logger

logger = get_logger(__name__)


class CreateWorkspaceRequestBody(TypedDict):
    """The request body for creating a workspace."""

    name: str
    """The name of the workspace."""
    description: str | None
    """The description of the workspace."""
    logo_url: NotRequired[str | None]
    """The URL of the workspace logo."""


class UpdateWorkspaceRequestBody(TypedDict):
    """The request body for updating a workspace."""

    name: NotRequired[str]
    """The name of the workspace."""
    description: NotRequired[str | None]
    """The description of the workspace."""
    logo_url: NotRequired[str | None]
    """The URL of the workspace logo."""


class WorkspaceBaseResponse(TableIdResponse):
    """Base response for retrieving workspaces."""

    name: str
    """The name of the workspace."""
    description: str | None
    """The description of the workspace."""
    logo_url: str | None
    """The URL of the workspace logo."""
    role: UserRoleEnum
    """The role of the user in the workspace."""


class WorkspaceResponse(WorkspaceBaseResponse):
    """Response for retrieving a workspace."""

    grant_applications: list["BaseApplicationResponse"]
    """The grant applications in the workspace"""


class BaseApplicationResponse(TableIdResponse):
    """Base response for retrieving applications."""

    title: str
    """The title of the grant application draft."""
    completed_at: str | None
    """The completed date of the grant application draft."""


@post("/workspaces", operation_id="CreateWorkspace")
async def handle_create_workspace(
    request: APIRequest, data: CreateWorkspaceRequestBody, session_maker: async_sessionmaker[Any]
) -> TableIdResponse:
    logger.info("Creating workspace by user", uid=request.auth)
    async with session_maker() as session, session.begin():
        try:
            workspace = await session.scalar(insert(Workspace).values(data).returning(Workspace))
            await session.execute(
                insert(WorkspaceUser).values(
                    {
                        "workspace_id": workspace.id,
                        "firebase_uid": request.auth,
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


@get("/workspaces", operation_id="ListWorkspaces")
async def handle_retrieve_workspaces(
    request: APIRequest, session_maker: async_sessionmaker[Any]
) -> list[WorkspaceBaseResponse]:
    logger.info("Retrieving workspaces for user", uid=request.auth)
    async with session_maker() as session:
        workspaces = list(
            await session.scalars(
                select(Workspace)
                .options(selectinload(Workspace.workspace_users))
                .join(WorkspaceUser)
                .where(WorkspaceUser.firebase_uid == request.auth)
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


@patch(
    "/workspaces/{workspace_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="UpdateWorkspace",
)
async def handle_update_workspace(
    request: APIRequest, data: UpdateWorkspaceRequestBody, workspace_id: UUID, session_maker: async_sessionmaker[Any]
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
        role=cast("UserRoleEnum", request.user),
    )


@get(
    "/workspaces/{workspace_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="GetWorkspace",
)
async def handle_retrieve_workspace(
    request: APIRequest, workspace_id: UUID, session_maker: async_sessionmaker[Any]
) -> WorkspaceResponse:
    logger.info("Retrieving workspace", workspace_id=workspace_id)
    async with session_maker() as session, session.begin():
        workspace = await session.scalar(
            select(Workspace).options(selectinload(Workspace.grant_applications)).where(Workspace.id == workspace_id)
        )

    return WorkspaceResponse(
        id=str(workspace.id),
        name=workspace.name,
        description=workspace.description,
        logo_url=workspace.logo_url,
        role=cast("UserRoleEnum", request.user),
        grant_applications=[
            BaseApplicationResponse(
                id=str(grant_application.id),
                title=grant_application.title,
                completed_at=grant_application.completed_at.isoformat() if grant_application.completed_at else None,
            )
            for grant_application in workspace.grant_applications
        ],
    )


@delete("/workspaces/{workspace_id:uuid}", allowed_roles=[UserRoleEnum.OWNER], operation_id="DeleteWorkspace")
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
