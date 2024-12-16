import logging
from http import HTTPStatus
from uuid import UUID

from sanic import HTTPResponse, json
from sqlalchemy import insert, select
from sqlalchemy.exc import SQLAlchemyError

from src.api.utils import verify_workspace_access
from src.api_types import (
    APIRequest,
    ApplicationDraftCompleteResponse,
    ApplicationDraftCreateResponse,
    ApplicationDraftProcessingResponse,
)
from src.db.tables import (
    ApplicationDraft,
)
from src.exceptions import DatabaseError
from src.rag.generate_draft import generate_application_draft

logger = logging.getLogger(__name__)

PROCESSING_SLEEP_INTERVAL = 15  # seconds


async def handle_create_application_draft(
    request: APIRequest, workspace_id: UUID, application_id: UUID
) -> HTTPResponse:
    """Route handler for creating an Application Draft.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Raises:
        DatabaseError: If there was an issue creating the application draft in the database.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    logger.info("Creating application draft for application %s", application_id)

    async with request.ctx.session_maker() as session, session.begin():
        try:
            application_draft_id = await session.scalar(
                insert(ApplicationDraft).values({"application_id": application_id}).returning(ApplicationDraft.id)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating application draft: %s", e)
            raise DatabaseError("Error creating application draft") from e

    request.app.add_task(
        generate_application_draft(
            application_id=application_id,
            application_draft_id=application_draft_id,
        ),
        name=str(application_draft_id),
    )

    return json(
        ApplicationDraftCreateResponse(id=str(application_draft_id)),
        status=HTTPStatus.CREATED,
    )


async def handle_retrieve_application_draft(
    request: APIRequest, workspace_id: UUID, application_id: UUID, application_draft_id: UUID
) -> HTTPResponse:
    """Route handler for polling and retrieving an Application Draft.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_draft_id: The application draft ID.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    logger.info("Retrieving application for application %s draft with id %s", application_id, application_draft_id)

    async with request.ctx.session_maker() as session:
        application_draft = await session.scalar(
            select(ApplicationDraft).where(ApplicationDraft.id == application_draft_id)
        )

    if application_draft.completed_at is not None and application_draft.text:
        return json(
            ApplicationDraftCompleteResponse(
                id=str(application_draft_id), status="complete", text=application_draft.text
            ),
            status=HTTPStatus.OK,
        )

    return json(
        ApplicationDraftProcessingResponse(id=str(application_draft_id), status="generating"),
        status=HTTPStatus.OK,
    )
