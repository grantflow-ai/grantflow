import logging
from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse, empty, json
from sqlalchemy import delete, insert, select, update
from sqlalchemy.orm import selectinload

from src.api.utils import verify_workspace_access
from src.api_types import (
    APIRequest,
    ApplicationFileResponse,
    CfpResponse,
    CreateGrantApplicationRequestBody,
    GrantApplicationDetailResponse,
    GrantApplicationResponse,
    ResearchAimResponse,
    ResearchTaskResponse,
    UpdateApplicationRequestBody,
)
from src.db.tables import GrantApplication, GrantCfp, ResearchAim
from src.utils.serialization import deserialize

logger = logging.getLogger(__name__)


async def handle_create_application(request: APIRequest, workspace_id: UUID) -> HTTPResponse:
    """Route handler for creating an Application.

    Args:
        request: The request object.
        workspace_id: The workspace ID.

    Returns:
        The response object.
    """
    logger.info("Creating application for workspace %s", workspace_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    request_body = deserialize(request.body, CreateGrantApplicationRequestBody)
    async with request.ctx.session_maker() as session, session.begin():
        application = await session.scalar(
            insert(GrantApplication).values({"workspace_id": workspace_id, **request_body}).returning(GrantApplication)
        )

    return json(
        GrantApplicationResponse(
            id=application.id,
            title=application.title,
            cfp_id=application.cfp_id,
            significance=application.significance,
            innovation=application.innovation,
        ),
        status=HTTPStatus.CREATED,
    )


async def handle_retrieve_applications(request: APIRequest, workspace_id: UUID) -> HTTPResponse:
    """Route handler for creating an Application.

    Args:
        request: The request object
        workspace_id: The workspace ID.

    Returns:
        The response object.
    """
    logger.info("Retrieving applications for workspace %s", workspace_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    async with request.ctx.session_maker() as session, session.begin():
        applications = await session.scalars(
            select(GrantApplication).where(GrantApplication.workspace_id == workspace_id)
        )

    return json(
        [
            GrantApplicationResponse(
                id=application.id,
                title=application.title,
                cfp_id=application.cfp_id,
                significance=application.significance,
                innovation=application.innovation,
            )
            for application in applications
        ]
    )


async def handle_retrieve_application_detail(
    request: APIRequest, workspace_id: UUID, application_id: UUID
) -> HTTPResponse:
    """Route handler for creating an Application.

    Args:
        request: The request object
        workspace_id: The workspace ID.
        application_id: The application ID.

    Returns:
        The response object.
    """
    logger.info("Retrieving applications for workspace %s", workspace_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

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

    return json(
        GrantApplicationDetailResponse(
            id=str(grant_application.id),
            title=grant_application.title,
            significance=grant_application.significance,
            innovation=grant_application.innovation,
            cfp=CfpResponse(
                id=str(grant_application.cfp.id),
                allow_clinical_trials=grant_application.cfp.allow_clinical_trials,
                allow_resubmissions=grant_application.cfp.allow_resubmissions,
                category=grant_application.cfp.category,
                code=grant_application.cfp.code,
                description=grant_application.cfp.description,
                title=grant_application.cfp.title,
                url=grant_application.cfp.url,
                funding_organization_id=str(grant_application.cfp.funding_organization_id),
                funding_organization_name=grant_application.cfp.funding_organization.name,
            ),
            research_aims=[
                ResearchAimResponse(
                    id=str(research_aim.id),
                    aim_number=research_aim.aim_number,
                    title=research_aim.title,
                    description=research_aim.description,
                    requires_clinical_trials=research_aim.requires_clinical_trials,
                    research_tasks=[
                        ResearchTaskResponse(
                            id=str(research_task.id),
                            task_number=research_task.task_number,
                            title=research_task.title,
                            description=research_task.description,
                        )
                        for research_task in research_aim.research_tasks
                    ],
                )
                for research_aim in grant_application.research_aims
            ],
            application_files=[
                ApplicationFileResponse(
                    id=str(application_file.id),
                    name=application_file.name,
                    type=application_file.type,
                    size=application_file.size,
                )
                for application_file in grant_application.application_files
            ],
        )
    )


async def handle_update_application(request: APIRequest, workspace_id: UUID, application_id: UUID) -> HTTPResponse:
    """Route handler for updating an Application.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Returns:
        The response object
    """
    logger.info("Updating application %s", application_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    request_body = deserialize(request.body, UpdateApplicationRequestBody)
    async with request.ctx.session_maker() as session, session.begin():
        application = await session.scalar(
            update(GrantApplication)
            .where(GrantApplication.id == application_id)
            .values(request_body)
            .returning(GrantApplication)
        )
        await session.commit()

    return json(
        GrantApplicationResponse(
            id=application.id,
            title=application.title,
            cfp_id=application.cfp_id,
            significance=application.significance,
            innovation=application.innovation,
        )
    )


async def handle_delete_application(request: APIRequest, workspace_id: UUID, application_id: UUID) -> HTTPResponse:
    """Route handler for deleting an Application.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Returns:
        The response object.
    """
    logger.info("Deleting application %s", application_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    async with request.ctx.session_maker() as session, session.begin():
        await session.execute(delete(GrantApplication).where(GrantApplication.id == application_id))
        await session.commit()

    return empty()
