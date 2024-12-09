import logging
from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse
from sqlalchemy import delete, insert, select, update

from src.api.api_types import (
    APIRequest,
    CreateWorkspaceRequestBody,
    UpdateWorkspaceRequestBody,
    WorkspaceResponse,
)
from src.api.utils import handle_deserialization_error, verify_workspace_access
from src.constants import CONTENT_TYPE_JSON
from src.db.tables import UserRoleEnum, Workspace, WorkspaceUser
from src.utils.exceptions import DeserializationError
from src.utils.serialization import deserialize, serialize

logger = logging.getLogger(__name__)


async def handle_create_workspace(request: APIRequest) -> HTTPResponse:
    """Route handler for creating a Workspace.

    Args:
        request: The sanic request object

    Returns:
        The response object.
    """
    logger.info("Creating workspace by user: %s", request.ctx.firebase_uid)
    try:
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

        return HTTPResponse(
            status=HTTPStatus.CREATED,
            body=serialize(
                WorkspaceResponse(
                    id=workspace.id,
                    name=workspace.name,
                    description=workspace.description,
                    logo_url=workspace.logo_url,
                )
            ),
            content_type=CONTENT_TYPE_JSON,
        )
    except DeserializationError as e:
        logger.error("Failed to deserialize the request body: %s", e)
        return handle_deserialization_error(e)


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
                select(Workspace).join(WorkspaceUser).where(WorkspaceUser.firebase_uid == request.ctx.firebase_uid)
            )
        )

    return HTTPResponse(
        status=HTTPStatus.OK,
        body=serialize(
            [
                WorkspaceResponse(
                    id=workspace.id, name=workspace.name, description=workspace.description, logo_url=workspace.logo_url
                )
                for workspace in workspaces
            ]
        ),
        content_type=CONTENT_TYPE_JSON,
    )


async def handle_update_workspace(request: APIRequest, workspace_id: UUID) -> HTTPResponse:
    """Route handler for updating a Workspace.

    Args:
        request: The sanic request object
        workspace_id: The ID of the workspace to update

    Returns:
        The response object.
    """
    await verify_workspace_access(
        request=request, workspace_id=workspace_id, allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN]
    )

    logger.info("Updating workspace: %s", workspace_id)
    try:
        request_body = deserialize(request.body, UpdateWorkspaceRequestBody)
        async with request.ctx.session_maker() as session, session.begin():
            workspace = await session.scalar(
                update(Workspace).where(Workspace.id == workspace_id).values(request_body).returning(Workspace)
            )
            await session.commit()

        return HTTPResponse(
            status=HTTPStatus.OK,
            body=serialize(
                WorkspaceResponse(
                    id=workspace.id, name=workspace.name, description=workspace.description, logo_url=workspace.logo_url
                )
            ),
            content_type=CONTENT_TYPE_JSON,
        )
    except DeserializationError as e:
        logger.error("Failed to deserialize the request body: %s", e)
        return handle_deserialization_error(e)


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

    return HTTPResponse(status=HTTPStatus.NO_CONTENT)
