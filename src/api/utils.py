import logging
from time import time
from typing import cast
from uuid import UUID

from sanic import Unauthorized
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.api_types import APIRequest, ApplicationDraftGenerationResponse
from src.db.tables import GrantApplication, GrantCfp, ResearchAim, UserRoleEnum, WorkspaceUser
from src.rag.application_draft_generation import generate_application_draft
from src.rag.db import insert_application_draft

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


async def create_application_draft(request: APIRequest, application_id: UUID) -> ApplicationDraftGenerationResponse:
    """Create an application draft.

    Args:
        request: The request object.
        application_id: The application ID.

    Returns:
        The application draft generation response.
    """
    start_time = time()
    logger.info("Beginning RAG pipeline")
    async with request.ctx.session_maker() as session, session.begin():
        stmt = (
            select(GrantApplication)
            .options(
                selectinload(GrantApplication.cfp).selectinload(GrantCfp.funding_organization),
                selectinload(GrantApplication.application_files),
                selectinload(GrantApplication.research_aims).selectinload(ResearchAim.research_tasks),
            )
            .where(GrantApplication.id == application_id)
        )

        grant_application: GrantApplication = (await session.execute(stmt)).scalar_one()

    result = await generate_application_draft(grant_application=grant_application)
    duration = int(time() - start_time)
    logger.info(
        "RAG pipeline completed successfully. Total duration in seconds: %d",
        duration,
    )
    await insert_application_draft(
        content=result,
        duration=duration,
        application_id=str(application_id),
    )

    return ApplicationDraftGenerationResponse(content=result, duration=duration)
