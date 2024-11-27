import logging
import sys
from http import HTTPStatus
from time import time
from typing import Final, TypedDict
from uuid import uuid4

from sanic import HTTPResponse, Request

from src.constants import CONTENT_TYPE_JSON
from src.dto import APIError
from src.rag_backend.application_draft_generation import generate_application_draft
from src.rag_backend.db import insert_generation_result
from src.rag_backend.dto import (
    DraftGenerationRequest,
)
from src.utils.exceptions import DeserializationError
from src.utils.serialization import deserialize, serialize

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
logger = logging.getLogger(__name__)


class GenerationResultMessage(TypedDict):
    """The body of a message containing the result of generating a grant application draft."""

    application_id: str
    """The ID of the grant application."""
    content: str
    """The generated content."""
    ticket_id: str
    """The ticket ID."""


GENERATION_REQUESTS_QUEUE_NAME: Final[str] = "generation-requests"


async def handle_generate_draft_request(request: Request) -> HTTPResponse:
    """Route handler for generating a grant application draft.

    Args:
        request: The request object.

    Returns:
        The response object.
    """
    ticket_id = str(uuid4())
    start_time = time()
    logger.info("Beginning RAG pipeline, ticket ID: %s", ticket_id)
    try:
        request_body = deserialize(request.body, DraftGenerationRequest)
        logger.info("Beginning RAG pipeline for ticket ID: %s", ticket_id)
        result = await generate_application_draft(
            application_id=request_body["application_id"],
            application_title=request_body["application_title"],
            cfp_title=request_body["cfp_title"],
            grant_funding_organization=request_body["grant_funding_organization"],
            innovation_description=request_body["innovation_description"],
            research_aims=request_body["research_aims"],
            significance_description=request_body["significance_description"],
            ticket_id=ticket_id,
            workspace_id=request_body["workspace_id"],
        )
        logger.info(
            "RAG pipeline completed successfully for ticket ID: %s, total duration in seconds: %d",
            ticket_id,
            int(time() - start_time),
        )
        await insert_generation_result(
            generation_result=result,
            application_id=request_body["application_id"],
            ticket_id=ticket_id,
        )
        return HTTPResponse(
            status=HTTPStatus.CREATED,
            body=serialize(
                GenerationResultMessage(
                    application_id=request_body["application_id"],
                    content=result,
                    ticket_id=ticket_id,
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
