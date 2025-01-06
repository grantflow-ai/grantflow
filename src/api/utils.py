from typing import cast
from uuid import UUID

from crawl4ai import AsyncWebCrawler
from sanic import Unauthorized
from sqlalchemy import select

from src.api_types import APIRequest
from src.db.enums import UserRoleEnum
from src.db.tables import WorkspaceUser
from src.exceptions import ExternalOperationError
from src.utils.logging import get_logger
from src.utils.retry import with_exponential_backoff_retry

logger = get_logger(__name__)


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
    async with request.ctx.session_maker() as session:
        stmt = (
            select(WorkspaceUser)
            .where(WorkspaceUser.firebase_uid == request.ctx.firebase_uid)
            .where(WorkspaceUser.workspace_id == workspace_id)
        )
        if allowed_roles is not None:
            stmt = stmt.where(WorkspaceUser.role.in_(allowed_roles))

        result = await session.execute(stmt)
        workspace_user = result.scalar_one_or_none()

    if workspace_user is None:
        raise Unauthorized("Unauthorized workspace access.")

    return cast(UserRoleEnum, workspace_user.role)


@with_exponential_backoff_retry(ExternalOperationError, max_retries=3)
async def extract_webpage_content(url: str) -> str:
    """Extract the content from a webpage as markdown.

    Args:
        url: The URL of the webpage to extract content from.

    Raises:
        ExternalOperationError: If the operation failed.

    Returns:
        The markdown content of the webpage.
    """
    try:
        async with AsyncWebCrawler(verbose=True) as crawler:
            result = await crawler.arun(url=url)
            return cast(str, result.markdown)
    except ValueError as e:
        raise ExternalOperationError("Failed to get markdown from URL") from e
