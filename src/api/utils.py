from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse, Unauthorized
from sqlalchemy import select

from src.api.api_types import APIRequest
from src.constants import CONTENT_TYPE_JSON
from src.db.tables import UserRoleEnum, WorkspaceUser
from src.dto import APIError
from src.utils.exceptions import DeserializationError
from src.utils.serialization import serialize


def handle_deserialization_error(e: DeserializationError) -> HTTPResponse:
    """Handle a deserialization error.

    Args:
        e: The deserialization error.

    Returns:
        The HTTP response.
    """
    return HTTPResponse(
        status=HTTPStatus.BAD_REQUEST,
        body=serialize(
            APIError(
                message="Failed to deserialize the request body",
                details=str(e),
            )
        ),
        content_type=CONTENT_TYPE_JSON,
    )


async def verify_workspace_access(
    *, request: APIRequest, workspace_id: str | UUID, allowed_roles: list[UserRoleEnum] | None = None
) -> None:
    """Verify that the user has access to the workspace.

    Args:
        request: The request object.
        workspace_id: The ID of the workspace.
        allowed_roles: The allowed roles.

    Raises:
        Unauthorized: If the user does not have access to the workspace

    Returns:
        None
    """
    async with request.ctx.session_maker() as session, session.begin():
        stmt = (
            select(WorkspaceUser)
            .where(WorkspaceUser.firebase_uid == request.ctx.firebase_uid)
            .where(WorkspaceUser.workspace_id == workspace_id)
        )
        if allowed_roles is not None:
            stmt = stmt.where(WorkspaceUser.role.in_(allowed_roles))

        workspace_user = await session.scalar(stmt)

    if workspace_user is None:
        raise Unauthorized("Unauthorized workspace access.")
