import logging
from http import HTTPStatus
from time import time
from typing import Final, TypedDict
from uuid import UUID

from sanic import HTTPResponse, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.constants import CONTENT_TYPE_JSON
from src.db.connection import get_session_maker
from src.db.tables import GrantApplication, GrantCfp, ResearchAim
from src.dto import APIError
from src.rag.application_draft_generation import generate_application_draft
from src.rag.db import insert_generation_result
from src.utils.exceptions import DeserializationError
from src.utils.serialization import serialize

logger = logging.getLogger(__name__)


class GenerationResultMessage(TypedDict):
    """The body of a message containing the result of generating a grant application draft."""

    application_id: str
    """The ID of the grant application."""
    content: str
    """The generated content."""


GENERATION_REQUESTS_QUEUE_NAME: Final[str] = "generation-requests"


async def handle_generate_draft_request(_: Request, application_id: UUID) -> HTTPResponse:
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
        logger.info(
            "RAG pipeline completed successfully. Total duration in seconds: %d",
            int(time() - start_time),
        )
        await insert_generation_result(
            generation_result=result,
            application_id=str(application_id),
        )
        return HTTPResponse(
            status=HTTPStatus.CREATED,
            body=serialize(
                GenerationResultMessage(
                    application_id=str(application_id),
                    content=result,
                )
            ),
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
