import logging
from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse, empty, json
from sqlalchemy import delete, insert, select, update
from sqlalchemy.orm import selectinload

from src.api.utils import verify_workspace_access
from src.api_types import (
    APIRequest,
    ApplicationDraftCompleteResponse,
    ApplicationDraftProcessingResponse,
    ApplicationFileResponse,
    CfpResponse,
    CreateGrantApplicationRequestBody,
    GrantApplicationDetailResponse,
    GrantApplicationResponse,
    ResearchAimResponse,
    ResearchTaskResponse,
    UpdateApplicationRequestBody,
)
from src.db.tables import Application, GrantCfp, ResearchAim
from src.utils.serialization import deserialize

logger = logging.getLogger(__name__)

PROCESSING_SLEEP_INTERVAL = 15  # seconds


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
            insert(Application).values({"workspace_id": workspace_id, **request_body}).returning(Application)
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
        applications = await session.scalars(select(Application).where(Application.workspace_id == workspace_id))

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
            select(Application)
            .options(
                selectinload(Application.cfp).selectinload(GrantCfp.funding_organization),
                selectinload(Application.files),
                selectinload(Application.research_aims).selectinload(ResearchAim.research_tasks),
            )
            .where(Application.id == application_id)
        )

        application: Application = (await session.execute(stmt)).scalar_one()

    return json(
        GrantApplicationDetailResponse(
            id=str(application.id),
            title=application.title,
            significance=application.significance,
            innovation=application.innovation,
            cfp=CfpResponse(
                id=str(application.cfp.id),
                allow_clinical_trials=application.cfp.allow_clinical_trials,
                allow_resubmissions=application.cfp.allow_resubmissions,
                category=application.cfp.category,
                code=application.cfp.code,
                description=application.cfp.description,
                title=application.cfp.title,
                url=application.cfp.url,
                funding_organization_id=str(application.cfp.funding_organization_id),
                funding_organization_name=application.cfp.funding_organization.name,
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
                for research_aim in application.research_aims
            ],
            application_files=[
                ApplicationFileResponse(
                    id=str(application_file.id),
                    name=application_file.name,
                    type=application_file.type,
                    size=application_file.size,
                )
                for application_file in application.files
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
            update(Application).where(Application.id == application_id).values(request_body).returning(Application)
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
        await session.execute(delete(Application).where(Application.id == application_id))
        await session.commit()

    return empty()


async def handle_start_rag_pipeline(request: APIRequest, workspace_id: UUID, application_id: UUID) -> HTTPResponse:
    """Route handler for creating an Application Draft.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    logger.info("Creating application draft for application %s", application_id)

    logger.info("Dispatching signal to generate application draft")
    await request.app.dispatch(
        "generate_application_draft",
        context={"application_id": application_id},
    )

    return empty()


async def handle_retrieve_application_text(
    request: APIRequest, workspace_id: UUID, application_id: UUID
) -> HTTPResponse:
    """Route handler for polling for the result of the RAG pipeline.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    logger.info("handling polling request for application: %s", application_id)
    async with request.ctx.session_maker() as session:
        application = await session.scalar(select(Application).where(Application.id == application_id))

    if application.completed_at is not None and application.text:
        return json(
            ApplicationDraftCompleteResponse(id=str(application_id), status="complete", text=application.text),
            status=HTTPStatus.OK,
        )

    return json(
        ApplicationDraftProcessingResponse(id=str(application_id), status="generating"),
        status=HTTPStatus.OK,
    )
