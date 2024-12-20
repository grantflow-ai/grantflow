from asyncio import gather
from http import HTTPStatus
from typing import cast
from uuid import UUID

from sanic import BadRequest, HTTPResponse, NotFound, empty, json
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload

from src.api.utils import verify_workspace_access
from src.api_types import (
    APIRequest,
    ApplicationDraftCompleteResponse,
    ApplicationDraftProcessingResponse,
    ApplicationFileResponse,
    ApplicationFullResponse,
    ApplicationIdResponse,
    CfpResponse,
    CreateApplicationRequestBody,
    ResearchAimResponse,
    ResearchTaskResponse,
    UpdateApplicationRequestBody,
)
from src.db.tables import Application, ApplicationFile, FileIndexingStatusEnum, GrantCfp, ResearchAim, ResearchTask
from src.exceptions import DatabaseError
from src.indexer.dto import FileDTO
from src.utils.logging import get_logger
from src.utils.serialization import deserialize

logger = get_logger(__name__)

PROCESSING_SLEEP_INTERVAL = 15  # seconds


async def handle_create_application(request: APIRequest, workspace_id: UUID) -> HTTPResponse:
    """Route handler for creating an Application.

    Args:
        request: The request object.
        workspace_id: The workspace ID.

    Raises:
        DatabaseError: If there was an issue creating the application in the database.
        BadRequest: If the request is not a multipart request.

    Returns:
        The response object.
    """
    logger.info("Creating application for workspace", workspace_id=workspace_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    data = cast(str | None, (request.form or {}).get("data"))  # type: ignore[call-overload]

    if not data:
        raise BadRequest("Application creation requires a multipart request")

    request_body = deserialize(data, CreateApplicationRequestBody)

    uploaded_files: list[FileDTO] = [
        FileDTO.from_file(filename=filename, file=files_list)
        for filename, files_list in dict(request.files or {}).items()
        if files_list
    ]

    async with request.ctx.session_maker() as session, session.begin():
        try:
            result = await session.execute(
                insert(Application)
                .values(
                    {
                        "workspace_id": workspace_id,
                        "title": request_body["title"],
                        "cfp_id": request_body["cfp_id"],
                        "significance": request_body["significance"],
                        "innovation": request_body["innovation"],
                    }
                )
                .returning(Application.id)
            )
            application_id = result.scalar_one()

            for research_aim_data in sorted(request_body["research_aims"], key=lambda x: x["aim_number"]):
                result = await session.execute(
                    insert(ResearchAim)
                    .values(
                        {
                            "aim_number": research_aim_data["aim_number"],
                            "application_id": application_id,
                            "title": research_aim_data["title"],
                            "description": research_aim_data.get("description", None),
                            "requires_clinical_trials": research_aim_data.get("requires_clinical_trials", False),
                        }
                    )
                    .returning(ResearchAim.id)
                )
                research_aim_id = result.scalar_one()

                await session.execute(
                    insert(ResearchTask).values(
                        [
                            {
                                "aim_id": research_aim_id,
                                "task_number": research_task["task_number"],
                                "title": research_task["title"],
                                "description": research_task.get("description"),
                            }
                            for research_task in sorted(
                                research_aim_data["research_tasks"], key=lambda x: x["task_number"]
                            )
                        ]
                    )
                )
            file_ids = (
                (
                    await session.scalars(
                        insert(ApplicationFile)
                        .values(
                            [
                                {
                                    "application_id": application_id,
                                    "name": file_dto.filename,
                                    "type": file_dto.mime_type,
                                    "size": file_dto.content.__sizeof__(),
                                    "status": FileIndexingStatusEnum.INDEXING,
                                }
                                for file_dto in uploaded_files
                            ]
                        )
                        .returning(ApplicationFile.id)
                    )
                )
                if uploaded_files
                else []
            )

            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating application", exc_info=e)
            raise DatabaseError("Error creating application", context=str(e)) from e

        logger.info("Dispatching signal to parse and index files")
        await gather(
            *[
                request.app.dispatch(
                    "parse_and_index_file",
                    context={
                        "application_id": application_id,
                        "file_id": file_id,
                        "file_dto": file_dto,
                    },
                )
                for file_dto, file_id in zip(uploaded_files, file_ids, strict=False)
            ]
        )

    logger.info("Dispatching signal to generate application draft")
    await request.app.dispatch(
        "generate_application_draft",
        context={"application_id": application_id},
    )

    return json(
        ApplicationIdResponse(
            id=str(application_id),
        ),
        status=HTTPStatus.CREATED,
    )


async def handle_retrieve_application(request: APIRequest, workspace_id: UUID, application_id: UUID) -> HTTPResponse:
    """Route handler for retrieving an Application.

    Args:
        request: The request object
        workspace_id: The workspace ID.
        application_id: The application ID.

    Raises:
        NotFound: If the application was not found.

    Returns:
        The response object.
    """
    logger.info("Retrieving applications for workspace", workspace_id=workspace_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    async with request.ctx.session_maker() as session:
        try:
            result = await session.execute(
                select(Application)
                .options(
                    selectinload(Application.cfp).selectinload(GrantCfp.funding_organization),
                    selectinload(Application.files),
                    selectinload(Application.research_aims).selectinload(ResearchAim.research_tasks),
                )
                .where(Application.id == application_id)
            )
            application = result.scalar_one()
        except SQLAlchemyError as e:
            logger.error("Error retrieving application", exc_info=e)
            raise NotFound from e

    return json(
        ApplicationFullResponse(
            id=str(application.id),
            title=application.title,
            significance=application.significance,
            innovation=application.innovation,
            text=application.text,
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
                    preliminary_results=research_aim.preliminary_results,
                    risks_and_alternatives=research_aim.risks_and_alternatives,
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
            files=[
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

    Raises:
        DatabaseError: If there was an issue updating the application in the database.

    Returns:
        The response object
    """
    logger.info("Updating application", application_id=application_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    request_body = deserialize(request.body, UpdateApplicationRequestBody)
    async with request.ctx.session_maker() as session, session.begin():
        try:
            await session.execute(
                update(Application).where(Application.id == application_id).values(request_body).returning(Application)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating application", exc_info=e)
            raise DatabaseError("Error updating application", context=str(e)) from e

    return empty()


async def handle_delete_application(request: APIRequest, workspace_id: UUID, application_id: UUID) -> HTTPResponse:
    """Route handler for deleting an Application.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Raises:
        DatabaseError: If there was an issue deleting the application in the database.

    Returns:
        The response object.
    """
    logger.info("Deleting application", application_id=application_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    async with request.ctx.session_maker() as session, session.begin():
        try:
            await session.execute(delete(Application).where(Application.id == application_id))
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting application", exc_info=e)
            raise DatabaseError("Error deleting application", context=str(e)) from e

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

    logger.info("handling polling request for application", application_id=application_id)
    async with request.ctx.session_maker() as session:
        result = await session.execute(
            select(Application.text)
            .where(Application.id == application_id)
            .where(Application.completed_at.is_not(None))
            .where(Application.text.isnot(None))
        )
        application_text = result.scalar_one_or_none()

    if application_text:
        return json(
            ApplicationDraftCompleteResponse(id=str(application_id), status="complete", text=application_text),
            status=HTTPStatus.OK,
        )

    return json(
        ApplicationDraftProcessingResponse(id=str(application_id), status="generating"),
        status=HTTPStatus.OK,
    )
