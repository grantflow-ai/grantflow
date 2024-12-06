import logging
from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse
from sqlalchemy import delete, insert, select, update

from src.api.api_types import (
    APIRequest,
    CreateGrantApplicationRequestBody,
    GrantApplicationResponse,
    UpdateApplicationRequestBody,
)
from src.api.utils import handle_deserialization_error, verify_workspace_access
from src.constants import CONTENT_TYPE_JSON
from src.db.tables import GrantApplication
from src.utils.exceptions import DeserializationError
from src.utils.serialization import deserialize, serialize

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

    try:
        request_body = deserialize(request.body, CreateGrantApplicationRequestBody)
        async with request.ctx.session_maker() as session, session.begin():
            application = await session.scalar(
                insert(GrantApplication)
                .values({"workspace_id": workspace_id, **request_body})
                .returning(GrantApplication)
            )

        return HTTPResponse(
            status=HTTPStatus.CREATED,
            body=serialize(
                GrantApplicationResponse(
                    id=application.id,
                    title=application.title,
                    cfp_id=application.cfp_id,
                    significance=application.significance,
                    innovation=application.innovation,
                )
            ),
            content_type=CONTENT_TYPE_JSON,
        )
    except DeserializationError as e:
        logger.error("Failed to deserialize the request body: %s", e)
        return handle_deserialization_error(e)


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

    return HTTPResponse(
        status=HTTPStatus.OK,
        body=serialize(
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
        ),
        content_type=CONTENT_TYPE_JSON,
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

    try:
        request_body = deserialize(request.body, UpdateApplicationRequestBody)
        async with request.ctx.session_maker() as session, session.begin():
            application = await session.scalar(
                update(GrantApplication)
                .where(GrantApplication.id == application_id)
                .values(request_body)
                .returning(GrantApplication)
            )
            await session.commit()

        return HTTPResponse(
            status=HTTPStatus.OK,
            body=serialize(
                GrantApplicationResponse(
                    id=application.id,
                    title=application.title,
                    cfp_id=application.cfp_id,
                    significance=application.significance,
                    innovation=application.innovation,
                )
            ),
            content_type=CONTENT_TYPE_JSON,
        )
    except DeserializationError as e:
        logger.error("Failed to deserialize the request body: %s", e)
        return handle_deserialization_error(e)


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

    return HTTPResponse(status=HTTPStatus.NO_CONTENT)
