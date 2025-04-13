from typing import Any, Literal, NotRequired, TypedDict
from uuid import UUID

from litestar import delete, patch
from litestar.datastructures import UploadFile
from litestar.exceptions import ValidationException
from sqlalchemy import delete as sa_delete
from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api.api_types import TableIdResponse
from src.api.http.funding_organizations import FundingOrganizationResponse
from src.db.enums import UserRoleEnum
from src.db.json_objects import GrantElement, GrantLongFormSection, ResearchObjective
from src.db.tables import GrantApplication
from src.exceptions import DatabaseError
from src.utils.db import retrieve_application
from src.utils.logger import get_logger

logger = get_logger(__name__)

PROCESSING_SLEEP_INTERVAL = 15  # seconds ~keep


class CreateApplicationRequestBody(TypedDict):
    """The request body for creating an application."""

    title: str
    """The title of the application."""
    cfp_url: NotRequired[str]
    """Grant CFP URL."""
    cfp_file: NotRequired[UploadFile]
    """Grant CFP file."""


class UpdateApplicationRequestBody(TypedDict):
    """The request body for updating an application."""

    title: NotRequired[str]
    """The title of the application."""
    research_objectives: NotRequired[list[ResearchObjective]]
    """The research objectives of the application."""


class ApplicationDraftProcessingResponse(TypedDict):
    """The response schema for an application draft in processing state."""

    id: str
    """The ID of the grant application draft."""
    status: Literal["generating"]
    """The status of the grant application draft."""


class ApplicationDraftCompleteResponse(TypedDict):
    """The response schema for a completed application draft."""

    id: str
    """The ID of the grant application draft."""
    status: Literal["complete"]
    """The status of the grant application draft."""
    text: str


class BaseApplicationResponse(TableIdResponse):
    """Base response for retrieving applications."""

    title: str
    """The title of the grant application draft."""
    completed_at: str | None
    """The completed date of the grant application draft."""


class GrantTemplateResponse(TypedDict):
    """Response for retrieving a grant template."""

    grant_sections: list[GrantLongFormSection | GrantElement]
    """The name of the grant template."""
    funding_organization: FundingOrganizationResponse | None
    """The funding organization of the grant template."""


class ApplicationResponse(BaseApplicationResponse):
    """Response for retrieving an application."""

    form_inputs: dict[str, str] | None
    """The form inputs of the application."""
    research_objectives: list[ResearchObjective] | None
    """The research objectives of the application."""
    text: str | None
    """The text content of the application."""
    grant_template: GrantTemplateResponse | None


@patch(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="UpdateApplication",
)
async def handle_update_application(
    data: UpdateApplicationRequestBody, application_id: UUID, session_maker: async_sessionmaker[Any]
) -> BaseApplicationResponse:
    logger.info("Updating application", application_id=application_id)

    if not data:
        raise ValidationException("Request body cannot be empty")

    async with session_maker() as session, session.begin():
        try:
            update_values = dict(data)
            await session.execute(
                update(GrantApplication).where(GrantApplication.id == application_id).values(update_values)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating application", exc_info=e)
            raise DatabaseError("Error updating application", context=str(e)) from e

    application = await retrieve_application(session_maker=session_maker, application_id=application_id)
    return BaseApplicationResponse(
        id=str(application.id),
        title=application.title,
        completed_at=application.completed_at.isoformat() if application.completed_at else None,
    )


@delete(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="DeleteApplication",
)
async def handle_delete_application(application_id: UUID, session_maker: async_sessionmaker[Any]) -> None:
    logger.info("Deleting application", application_id=application_id)

    async with session_maker() as session, session.begin():
        try:
            await session.execute(sa_delete(GrantApplication).where(GrantApplication.id == application_id))
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting application", exc_info=e)
            raise DatabaseError("Error deleting application", context=str(e)) from e
