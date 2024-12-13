import logging
from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse, empty, json
from sqlalchemy import delete, insert, select, update
from sqlalchemy.orm import selectinload

from src.api.utils import verify_workspace_access
from src.api_types import (
    APIRequest,
    CreateResearchAimRequestBody,
    ResearchAimResponse,
    ResearchTaskResponse,
    UpdateResearchAimRequestBody,
    UpdateResearchTaskRequestBody,
)
from src.db.tables import ResearchAim, ResearchTask
from src.utils.serialization import deserialize

logger = logging.getLogger(__name__)


async def handle_create_research_aims(request: APIRequest, workspace_id: UUID, application_id: UUID) -> HTTPResponse:
    """Route handler for creating an Research Aim.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)
    logger.info("Creating research aims for application %s", application_id)

    request_body = deserialize(request.body, list[CreateResearchAimRequestBody])
    data: list[ResearchAimResponse] = []
    async with request.ctx.session_maker() as session, session.begin():
        for research_aim_data in sorted(request_body, key=lambda x: x["aim_number"]):
            research_aim = await session.scalar(
                insert(ResearchAim)
                .values(
                    {
                        "aim_number": research_aim_data["aim_number"],
                        "application_id": application_id,
                        "title": research_aim_data["title"],
                        "description": research_aim_data.get("description"),
                        "requires_clinical_trials": research_aim_data.get("requires_clinical_trials", False),
                    }
                )
                .returning(ResearchAim)
            )
            research_tasks = await session.scalars(
                insert(ResearchTask)
                .values(
                    [
                        {
                            "aim_id": research_aim.id,
                            "task_number": research_task["task_number"],
                            "title": research_task["title"],
                            "description": research_task.get("description"),
                        }
                        for research_task in sorted(research_aim_data["research_tasks"], key=lambda x: x["task_number"])
                    ]
                )
                .returning(ResearchTask)
            )
            data.append(
                ResearchAimResponse(
                    id=research_aim.id,
                    aim_number=research_aim.aim_number,
                    title=research_aim.title,
                    description=research_aim.description,
                    requires_clinical_trials=research_aim.requires_clinical_trials,
                    research_tasks=[
                        ResearchTaskResponse(
                            id=research_task.id,
                            task_number=research_task.task_number,
                            title=research_task.title,
                            description=research_task.description,
                        )
                        for research_task in research_tasks
                    ],
                )
            )

    return json(
        data,
        status=HTTPStatus.CREATED,
    )


async def handle_retrieve_research_aims(request: APIRequest, workspace_id: UUID, application_id: UUID) -> HTTPResponse:
    """Route handler for retrieving Research Aims.

    Args:
        request: The request object
        workspace_id: The workspace ID.
        application_id: The application ID.

    Returns:
        The response object.
    """
    logger.info("Retrieving research_aims for workspace %s", workspace_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    async with request.ctx.session_maker() as session, session.begin():
        research_aims = await session.scalars(
            select(ResearchAim)
            .options(selectinload(ResearchAim.research_tasks))
            .where(ResearchAim.application_id == application_id)
            .order_by(ResearchAim.aim_number)
        )

    return json(
        [
            ResearchAimResponse(
                id=research_aim.id,
                aim_number=research_aim.aim_number,
                title=research_aim.title,
                description=research_aim.description,
                requires_clinical_trials=research_aim.requires_clinical_trials,
                research_tasks=[
                    ResearchTaskResponse(
                        id=research_task.id,
                        task_number=research_task.task_number,
                        title=research_task.title,
                        description=research_task.description,
                    )
                    for research_task in research_aim.research_tasks
                ],
            )
            for research_aim in research_aims
        ]
    )


async def handle_update_research_aim(request: APIRequest, workspace_id: UUID, research_aim_id: UUID) -> HTTPResponse:
    """Route handler for updating an Research Aim.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        research_aim_id: The research_aim ID.

    Returns:
        The response object
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    logger.info("Updating research_aim %s", research_aim_id)
    request_body = deserialize(request.body, UpdateResearchAimRequestBody)
    async with request.ctx.session_maker() as session, session.begin():
        research_aim = await session.scalar(
            update(ResearchAim).where(ResearchAim.id == research_aim_id).values(request_body).returning(ResearchAim)
        )
        research_tasks = await session.scalars(
            select(ResearchTask).where(ResearchTask.aim_id == research_aim_id).order_by(ResearchTask.task_number)
        )
        await session.commit()

    return json(
        ResearchAimResponse(
            id=research_aim.id,
            aim_number=research_aim.aim_number,
            title=research_aim.title,
            description=research_aim.description,
            requires_clinical_trials=research_aim.requires_clinical_trials,
            research_tasks=[
                ResearchTaskResponse(
                    id=research_task.id,
                    task_number=research_task.task_number,
                    title=research_task.title,
                    description=research_task.description,
                )
                for research_task in research_tasks
            ],
        )
    )


async def handle_update_research_task(request: APIRequest, workspace_id: UUID, research_task_id: UUID) -> HTTPResponse:
    """Route handler for updating an Research Task.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        research_task_id: The research_task ID.

    Returns:
        The response object
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    logger.info("Updating research_task %s", research_task_id)
    request_body = deserialize(request.body, UpdateResearchTaskRequestBody)
    async with request.ctx.session_maker() as session, session.begin():
        research_task = await session.scalar(
            update(ResearchTask).where(ResearchTask.id == research_task_id).values(request_body).returning(ResearchTask)
        )
        await session.commit()

    return json(
        ResearchTaskResponse(
            id=research_task.id,
            task_number=research_task.task_number,
            title=research_task.title,
            description=research_task.description,
        )
    )


async def handle_delete_research_aim(request: APIRequest, workspace_id: UUID, research_aim_id: UUID) -> HTTPResponse:
    """Route handler for deleting an research_aim.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        research_aim_id: The research_aim ID.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    logger.info("Deleting research_aim %s", research_aim_id)
    async with request.ctx.session_maker() as session, session.begin():
        await session.execute(delete(ResearchAim).where(ResearchAim.id == research_aim_id))
        await session.commit()

    return empty()


async def handle_delete_research_task(request: APIRequest, workspace_id: UUID, research_task_id: UUID) -> HTTPResponse:
    """Route handler for deleting an research_task.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        research_task_id: The research task ID.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    logger.info("Deleting research task %s", research_task_id)
    async with request.ctx.session_maker() as session, session.begin():
        await session.execute(delete(ResearchTask).where(ResearchTask.id == research_task_id))
        await session.commit()

    return empty()
