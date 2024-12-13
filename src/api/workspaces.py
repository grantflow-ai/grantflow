import logging
from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse, empty, json
from sqlalchemy import delete, insert, select, update
from sqlalchemy.orm import selectinload

from src.api.utils import verify_workspace_access
from src.api_types import (
    APIRequest,
    CreateWorkspaceRequestBody,
    UpdateWorkspaceRequestBody,
    WorkspaceResponse,
)
from src.db.tables import UserRoleEnum, Workspace, WorkspaceUser
from src.utils.serialization import deserialize

logger = logging.getLogger(__name__)


async def handle_create_workspace(request: APIRequest) -> HTTPResponse:
    """Route handler for creating a Workspace.

    Args:
        request: The sanic request object

    Returns:
        The response object.
    """
    logger.info("Creating workspace by user: %s", request.ctx.firebase_uid)
    request_body = deserialize(request.body, CreateWorkspaceRequestBody)
    async with request.ctx.session_maker() as session, session.begin():
        workspace = await session.scalar(insert(Workspace).values(request_body).returning(Workspace))

        await session.execute(
            insert(WorkspaceUser).values(
                {
                    "workspace_id": workspace.id,
                    "firebase_uid": request.ctx.firebase_uid,
                    "role": UserRoleEnum.OWNER.value,
                }
            )
        )
        await session.commit()

    return json(
        WorkspaceResponse(
            id=workspace.id,
            name=workspace.name,
            description=workspace.description,
            logo_url=workspace.logo_url,
            role=UserRoleEnum.OWNER,
        ),
        status=HTTPStatus.CREATED,
    )


async def handle_retrieve_workspaces(request: APIRequest) -> HTTPResponse:
    """Route handler for retrieving Workspaces the user can access.

    Args:
        request: The request object

    Returns:
        The response object.
    """
    logger.info("Retrieving workspaces for user: %s", request.ctx.firebase_uid)

    async with request.ctx.session_maker() as session:
        workspaces = list(
            await session.scalars(
                select(Workspace)
                .options(selectinload(Workspace.users))
                .join(WorkspaceUser)
                .where(WorkspaceUser.firebase_uid == request.ctx.firebase_uid)
            )
        )

    return json(
        [
            WorkspaceResponse(
                id=workspace.id,
                name=workspace.name,
                description=workspace.description,
                logo_url=workspace.logo_url,
                role=workspace.users[0].role,
            )
            for workspace in workspaces
        ]
    )


async def handle_update_workspace(request: APIRequest, workspace_id: UUID) -> HTTPResponse:
    """Route handler for updating a Workspace.

    Args:
        request: The sanic request object
        workspace_id: The ID of the workspace to update

    Returns:
        The response object.
    """
    user_role = await verify_workspace_access(
        request=request, workspace_id=workspace_id, allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN]
    )

    logger.info("Updating workspace: %s", workspace_id)
    request_body = deserialize(request.body, UpdateWorkspaceRequestBody)
    async with request.ctx.session_maker() as session, session.begin():
        workspace = await session.scalar(
            update(Workspace).where(Workspace.id == workspace_id).values(request_body).returning(Workspace)
        )
        await session.commit()

    return json(
        WorkspaceResponse(
            id=workspace.id,
            name=workspace.name,
            description=workspace.description,
            logo_url=workspace.logo_url,
            role=user_role,
        )
    )


async def handle_retrieve_workspace(request: APIRequest, workspace_id: UUID) -> HTTPResponse:
    """Route handler for retrieving a Workspace.

    Args:
        request: The sanic request object
        workspace_id: The ID of the workspace to update

    Returns:
        The response object.
    """
    user_role = await verify_workspace_access(request=request, workspace_id=workspace_id)

    logger.info("Retrieving workspace: %s", workspace_id)
    async with request.ctx.session_maker() as session, session.begin():
        workspace = await session.scalar(select(Workspace).where(Workspace.id == workspace_id))

    return json(
        WorkspaceResponse(
            id=workspace.id,
            name=workspace.name,
            description=workspace.description,
            logo_url=workspace.logo_url,
            role=user_role,
        )
    )


async def handle_delete_workspace(request: APIRequest, workspace_id: UUID) -> HTTPResponse:
    """Route handler for deleting a Workspace.

    Args:
        request: The request object
        workspace_id: The ID of the workspace to delete

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id, allowed_roles=[UserRoleEnum.OWNER])

    logger.info("Deleting workspace: %s", workspace_id)
    async with request.ctx.session_maker() as session, session.begin():
        await session.execute(delete(Workspace).where(Workspace.id == workspace_id))
        await session.commit()

    return empty()
