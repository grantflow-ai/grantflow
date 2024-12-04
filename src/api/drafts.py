import logging
from http import HTTPStatus
from time import time
from uuid import UUID

from sanic import HTTPResponse, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.api_types import ApplicationDraftGenerationResponse
from src.constants import CONTENT_TYPE_JSON
from src.db.connection import get_session_maker
from src.db.tables import GrantApplication, GrantCfp, ResearchAim
from src.dto import APIError
from src.rag.application_draft_generation import generate_application_draft
from src.rag.db import insert_application_draft
from src.utils.exceptions import DeserializationError
from src.utils.serialization import serialize

logger = logging.getLogger(__name__)


async def handle_create_application_draft(_: Request, application_id: UUID) -> HTTPResponse:
    """Route handler for generating a grant application draft.

    Args:
        application_id: The application ID.

    Returns:
        The response object.
    """
    start_time = time()
    logger.info("Beginning RAG pipeline")
    try:
        session_maker = get_session_maker()
        async with session_maker() as session, session.begin():
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
        return HTTPResponse(
            status=HTTPStatus.CREATED,
            body=serialize(ApplicationDraftGenerationResponse(content=result, duration=duration)),
            content_type=CONTENT_TYPE_JSON,
        )
    except DeserializationError as e:
        logger.error("Failed to deserialize the request body: %s", e)
        return HTTPResponse(
            status=HTTPStatus.BAD_REQUEST,
            body=serialize(
                APIError(
                    message="Failed to deserialize the request body",
                    details=str(e),
                )
            ),
            content_type=CONTENT_TYPE_JSON,
        )
