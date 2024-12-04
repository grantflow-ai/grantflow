import logging
from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse, Request
from sqlalchemy import delete, insert, select, update

from src.api.api_types import (
    CreateWorkspaceRequestBody,
    CreateWorkspaceResponse,
    RetrieveWorkspaceBaseResponse,
    UpdateWorkspaceRequestBody,
)
from src.api.utils import handle_deserialization_error
from src.constants import CONTENT_TYPE_JSON
from src.db.connection import get_session_maker
from src.db.tables import UserRoleEnum, Workspace, WorkspaceUser
from src.utils.exceptions import DeserializationError
from src.utils.serialization import deserialize, serialize

logger = logging.getLogger(__name__)


async def handle_create_workspace(request: Request, user_id: UUID) -> HTTPResponse:
    """Route handler for creating a workspace.

    Args:
        request: The sanic request object
        user_id: The ID of the user making the request

    Returns:
        The response object.
    """
    logger.info("Creating workspace by user: %s", user_id)
    session_maker = get_session_maker()
    try:
        request_body = deserialize(request.body, CreateWorkspaceRequestBody)
        async with session_maker() as session, session.begin():
            workspace_id = (
                await session.execute(insert(Workspace).values(request_body).returning(Workspace.id))
            ).scalar_one()

            await session.execute(
                insert(WorkspaceUser).values(
                    {"workspace_id": workspace_id, "user_id": user_id, "role": UserRoleEnum.OWNER.value}
                )
            )
            await session.commit()

        return HTTPResponse(
            status=HTTPStatus.CREATED,
            body=serialize(CreateWorkspaceResponse(workspace_id=workspace_id)),
            content_type=CONTENT_TYPE_JSON,
        )
    except DeserializationError as e:
        logger.error("Failed to deserialize the request body: %s", e)
        return handle_deserialization_error(e)


async def handle_retrieve_workspaces(_: Request, user_id: UUID) -> HTTPResponse:
    """Route handler for retrieving workspaces for a user.

    Args:
        user_id: The ID of the user making the request

    Returns:
        The response object.
    """
    logger.info("Retrieving workspaces for user: %s", user_id)
    session_maker = get_session_maker()

    async with session_maker() as session, session.begin():
        workspaces = list(
            await session.scalars(select(Workspace).join(WorkspaceUser).where(WorkspaceUser.user_id == user_id))
        )

    return HTTPResponse(
        status=HTTPStatus.OK,
        body=serialize(
            [
                RetrieveWorkspaceBaseResponse(
                    id=workspace.id, name=workspace.name, description=workspace.description, logo_url=workspace.logo_url
                )
                for workspace in workspaces
            ]
        ),
        content_type=CONTENT_TYPE_JSON,
    )


async def handle_update_workspace(request: Request, user_id: UUID, workspace_id: UUID) -> HTTPResponse:
    """Route handler for updating a workspace.

    Args:
        request: The sanic request object
        user_id: The ID of the user making the request
        workspace_id: The ID of the workspace to update

    Returns:
        The response object.
    """
    logger.info("Updating workspace: %s", workspace_id)
    session_maker = get_session_maker()
    try:
        request_body = deserialize(request.body, UpdateWorkspaceRequestBody)
        async with session_maker() as session, session.begin():
            workspace = await session.scalar(
                select(Workspace)
                .join(WorkspaceUser)
                .where(Workspace.id == workspace_id)
                .where(WorkspaceUser.user_id == user_id)
                .where(WorkspaceUser.role.in_([UserRoleEnum.OWNER, UserRoleEnum.ADMIN]))
            )

        if workspace is None:
            return HTTPResponse(status=HTTPStatus.UNAUTHORIZED)

        if (
            ("name" in request_body and request_body["name"] != workspace.name)
            or ("description" in request_body and request_body["description"] != workspace.description)
            or ("logo_url" in request_body and request_body["logo_url"] != workspace.logo_url)
        ):
            await session.execute(update(Workspace).where(Workspace.id == workspace.id).values(request_body))
            await session.commit()
            return HTTPResponse(status=HTTPStatus.OK)

        return HTTPResponse(status=HTTPStatus.BAD_REQUEST, body="The request body does not include changed values")
    except DeserializationError as e:
        logger.error("Failed to deserialize the request body: %s", e)
        return handle_deserialization_error(e)


async def handle_delete_workspace(_: Request, user_id: UUID, workspace_id: UUID) -> HTTPResponse:
    """Route handler for deleting a workspace.

    Args:
        user_id: The ID of the user making the request
        workspace_id: The ID of the workspace to delete

    Returns:
        The response object.
    """
    logger.info("Deleting workspace: %s", workspace_id)
    session_maker = get_session_maker()
    async with session_maker() as session, session.begin():
        workspace = await session.scalar(
            select(Workspace)
            .join(WorkspaceUser)
            .where(Workspace.id == workspace_id)
            .where(WorkspaceUser.user_id == user_id)
            .where(WorkspaceUser.role == UserRoleEnum.OWNER)
        )

    if workspace is None:
        return HTTPResponse(status=HTTPStatus.UNAUTHORIZED)

    await session.execute(delete(Workspace).where(Workspace.id == workspace.id))
    await session.commit()
    return HTTPResponse(status=HTTPStatus.NO_CONTENT)
