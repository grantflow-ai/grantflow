from http import HTTPStatus
from typing import cast
from uuid import UUID

from sanic import BadRequest, HTTPResponse, empty, json
from sanic.request import File as RequestFile
from sanic.response import JSONResponse
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import selectinload

from src.api.utils import verify_workspace_access
from src.api_types import (
    APIRequest,
    ApplicationDraftCompleteResponse,
    ApplicationDraftProcessingResponse,
    CreateApplicationRequestBody,
    TableIdResponse,
    UpdateApplicationRequestBody,
)
from src.db.tables import GrantApplication
from src.dto import FileDTO
from src.exceptions import DatabaseError
from src.utils.db import retrieve_application
from src.utils.logger import get_logger
from src.utils.serialization import deserialize

logger = get_logger(__name__)

PROCESSING_SLEEP_INTERVAL = 15  # seconds


async def _get_cfp_content(request: APIRequest, request_body: CreateApplicationRequestBody) -> str:
    from src.utils.extraction import extract_file_content, extract_webpage_content

    if request.files and (cfp_file_upload := cast(RequestFile | None, request.files.get("cfp_file"))):
        file = FileDTO.from_file(filename=cfp_file_upload.name, file=cfp_file_upload)
        output, _ = await extract_file_content(
            content=file.content,
            mime_type=file.mime_type,
        )
        return output if isinstance(output, str) else output["content"]
    if cfp_url := request_body.get("cfp_url"):
        return await extract_webpage_content(url=cfp_url)
    raise BadRequest("Either one file or a CFP URL is required")


async def handle_create_application(request: APIRequest, workspace_id: UUID) -> JSONResponse:
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
        raise BadRequest("data is required")

    request_body = deserialize(data, CreateApplicationRequestBody)
    cfp_content = await _get_cfp_content(request=request, request_body=request_body)

    async with request.ctx.session_maker() as session, session.begin():
        try:
            application_id = await session.scalar(
                insert(GrantApplication)
                .values({"workspace_id": workspace_id, "title": request_body["title"]})
                .returning(GrantApplication.id)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating application", exc_info=e)
            raise DatabaseError("Error creating application", context=str(e)) from e

    await request.app.dispatch(
        "handle_generate_grant_template",
        context={
            "application_id": application_id,
            "cfp_content": cfp_content,
        },
    )

    return json(
        TableIdResponse(id=str(application_id)),
        status=HTTPStatus.CREATED,
    )


async def handle_retrieve_application(request: APIRequest, workspace_id: UUID, application_id: UUID) -> JSONResponse:
    """Route handler for retrieving an Application.

    Args:
        request: The request object
        workspace_id: The workspace ID.
        application_id: The application ID.

    Returns:
        The response object.
    """
    logger.info("Retrieving applications for workspace", workspace_id=workspace_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    return json(retrieve_application(session_maker=request.ctx.session_maker, application_id=application_id))


async def handle_update_application(request: APIRequest, workspace_id: UUID, application_id: UUID) -> JSONResponse:
    """Route handler for updating an Application.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Raises:
        BadRequest: If the request body is empty.
        DatabaseError: If there was an issue updating the application in the database.

    Returns:
        The response object
    """
    logger.info("Updating application", application_id=application_id)
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    request_body = deserialize(request.body, UpdateApplicationRequestBody)
    if not request_body:
        raise BadRequest("An empty request body is not allowed")

    async with request.ctx.session_maker() as session, session.begin():
        try:
            await session.execute(
                update(GrantApplication)
                .where(GrantApplication.id == application_id)
                .values(request_body)
                .returning(GrantApplication)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating application", exc_info=e)
            raise DatabaseError("Error updating application", context=str(e)) from e

    return json(await retrieve_application(session_maker=request.ctx.session_maker, application_id=application_id))


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
            await session.execute(delete(GrantApplication).where(GrantApplication.id == application_id))
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting application", exc_info=e)
            raise DatabaseError("Error deleting application", context=str(e)) from e

    return empty()


async def handle_retrieve_application_text(
    request: APIRequest, workspace_id: UUID, application_id: UUID
) -> JSONResponse:
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
        grant_application: GrantApplication = await session.scalar(
            select(GrantApplication)
            .options(selectinload(GrantApplication.grant_template))
            .where(GrantApplication.id == application_id)
            .where(GrantApplication.completed_at.is_not(None))
            .where(GrantApplication.text_generation_results.isnot(None))
        )

    if grant_application and grant_application.text_generation_results and grant_application.grant_template:
        application_text = grant_application.grant_template.template
        for result in grant_application.text_generation_results:
            application_text = application_text.replace(result["type"], result["content"])

        application_text = application_text.replace("{", "").replace("}", "")

        return json(
            ApplicationDraftCompleteResponse(id=str(application_id), status="complete", text=application_text),
            status=HTTPStatus.OK,
        )

    return json(
        ApplicationDraftProcessingResponse(id=str(application_id), status="generating"),
        status=HTTPStatus.OK,
    )
