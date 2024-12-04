import logging
from http import HTTPStatus
from typing import NotRequired
from uuid import UUID

from mypy.build import TypedDict
from sanic import HTTPResponse, Request
from sqlalchemy import insert, select

from src.api.utils import handle_deserialization_error
from src.constants import CONTENT_TYPE_JSON
from src.db.connection import get_session_maker
from src.db.tables import GrantApplication, WorkspaceUser
from src.utils.exceptions import DeserializationError
from src.utils.serialization import deserialize, serialize

logger = logging.getLogger(__name__)


class CreateApplicationRequestBody(TypedDict):
    """The request body for creating an application."""

    title: str
    """The title of the application."""
    cfp_id: str
    """The ID of the CFP."""
    significance: NotRequired[str | None]
    """The significance of the innovation."""
    innovation: NotRequired[str | None]
    """The innovation."""


class CreateApplicationResponse(TypedDict):
    """The response body for creating an application."""

    application_id: str
    """The ID of the application."""


class UpdateApplicationRequestBody(TypedDict):
    """The request body for updating an application."""

    title: NotRequired[str]
    """The title of the application."""
    cfp_id: NotRequired[str]
    """The ID of the CFP."""
    significance: NotRequired[str | None]
    """The significance of the innovation."""
    innovation: NotRequired[str | None]
    """The innovation."""


class RetrieveApplicationBaseResponseBody(TypedDict):
    """The base response body for retrieving an application."""

    title: str
    """The title of the application."""
    cfp_id: str
    """The ID of the CFP."""
    significance: str | None
    """The significance of the innovation."""
    innovation: str | None
    """The innovation."""


async def handle_create_application(request: Request, user_id: UUID, workspace_id: UUID) -> HTTPResponse:
    """Route handler for creating an application.

    Args:
        request: The request object.
        user_id: The user ID.
        workspace_id: The workspace ID.

    Returns:
        The response object.
    """
    logger.info("Creating application for workspace %s", workspace_id)
    session_maker = get_session_maker()
    async with session_maker() as session, session.begin():
        workspace_user = await session.scalar(
            select(WorkspaceUser)
            .where(WorkspaceUser.user_id == user_id)
            .where(WorkspaceUser.workspace_id == workspace_id)
        )

    if workspace_user is None:
        return HTTPResponse(status=HTTPStatus.UNAUTHORIZED)

    try:
        request_body = deserialize(request.body, CreateApplicationRequestBody)

        async with session_maker() as session, session.begin():
            application_id = await session.scalar(
                insert(GrantApplication)
                .values({"workspace_id": workspace_id, **request_body})
                .returning(GrantApplication.id)
            )

        return HTTPResponse(
            status=HTTPStatus.CREATED,
            body=serialize(CreateApplicationResponse(application_id=application_id)),
            content_type=CONTENT_TYPE_JSON,
        )
    except DeserializationError as e:
        logger.error("Failed to deserialize the request body: %s", e)
        return handle_deserialization_error(e)


async def handle_retrieve_applications(request: Request, user_id: UUID, workspace_id: UUID) -> HTTPResponse:
    """Route handler for creating an application.

    Args:
        request: The request object.
        user_id: The user ID.
        workspace_id: The workspace ID.

    Returns:
        The response object.
    """


async def handle_update_application(request: Request, user_id: UUID, application_id: UUID) -> HTTPResponse:
    """Route handler for updating an application.

    Args:
        request: The request object.
        user_id: The user ID.
        application_id: The application ID.

    Returns:
        The response object
    """


async def handle_delete_application(request: Request, user_id: UUID, application_id: UUID) -> HTTPResponse:
    """Route handler for deleting an application.

    Args:
        request: The request object.
        user_id: The user ID.
        application_id: The application ID.

    Returns:
        The response object.
    """
