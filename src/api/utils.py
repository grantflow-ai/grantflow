import logging
from typing import cast
from uuid import UUID

from sanic import Unauthorized
from sqlalchemy import select

from src.api_types import APIRequest
from src.db.tables import UserRoleEnum, WorkspaceUser

logger = logging.getLogger(__name__)


async def verify_workspace_access(
    *, request: APIRequest, workspace_id: str | UUID, allowed_roles: list[UserRoleEnum] | None = None
) -> UserRoleEnum:
    """Verify that the user has access to the workspace.

    Args:
        request: The request object.
        workspace_id: The ID of the workspace.
        allowed_roles: The allowed roles.

    Raises:
        Unauthorized: If the user does not have access to the workspace

    Returns:
        The role of the user in the workspace.
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

    return cast(UserRoleEnum, workspace_user.role)
