import logging
import sys
from http import HTTPStatus
from typing import Final, TypedDict
from uuid import uuid4

from azure.functions import HttpRequest, HttpResponse, ServiceBusMessage
from azure.servicebus._common.message import ServiceBusMessage as SenderServiceBusMessage

from src.constants import CONTENT_TYPE_JSON
from src.rag_backend.application_draft_generation import generate_application_draft
from src.rag_backend.db import insert_generation_result
from src.rag_backend.dto import (
    APIError,
    DraftGenerationRequest,
)
from src.utils.exceptions import DeserializationError
from src.utils.serialization import deserialize, serialize
from src.utils.service_bus import get_queue_sender

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
logger = logging.getLogger(__name__)


class GenerationMessageBody(TypedDict):
    """The body of a message to generate a grant application draft."""

    request: DraftGenerationRequest
    """The request to generate a grant application draft."""
    ticket_id: str
    """The ticket ID."""


class GenerationResultMessage(TypedDict):
    """The body of a message containing the result of generating a grant application draft."""

    application_id: str
    """The ID of the grant application."""
    content: str
    """The generated content."""
    result_id: str
    """The ID of the generation result."""
    ticket_id: str
    """The ticket ID."""


GENERATION_RESULTS_QUEUE_NAME: Final[str] = "generation-results"
GENERATION_REQUESTS_QUEUE_NAME: Final[str] = "generation-requests"


async def handle_generation_init(req: HttpRequest) -> HttpResponse:
    """Handle a request to generate a grant application draft.
        The http request initiates the RAG pipeline by enqueuing a message to the Service Bus.
        The result is returned as a ticket ID.

    Args:
        req: An Azure Function HttpRequest object.

    Returns:
        An Azure Function HttpResponse object.
    """
    logger.info("Beginning RAG pipeline")
    sender = get_queue_sender(GENERATION_REQUESTS_QUEUE_NAME)
    try:
        request_body = deserialize(req.get_body(), DraftGenerationRequest)
        ticket_id = str(uuid4())
        logger.info("Enqueuing generation message with ticket ID: %s", ticket_id)
        await sender.send_messages(
            SenderServiceBusMessage(
                body=serialize(
                    GenerationMessageBody(
                        request=request_body,
                        ticket_id=ticket_id,
                    )
                )
            )
        )
        return HttpResponse(
            body=serialize(
                {
                    "ticket_id": ticket_id,
                }
            ),
            mimetype=CONTENT_TYPE_JSON,
            status_code=HTTPStatus.CREATED,
        )
    except DeserializationError as e:
        logger.error("Failed to deserialize the request body: %s", e)
        return HttpResponse(
            status_code=HTTPStatus.BAD_REQUEST,
            body=serialize(
                APIError(
                    message="Failed to deserialize the request body",
                    details=str(e),
                )
            ),
            mimetype=CONTENT_TYPE_JSON,
        )


async def handle_generation_queue_msg(msg: ServiceBusMessage) -> None:
    """Handle a message from the Service Bus queue to generate a grant application draft.

    Args:
        msg: An Azure Function ServiceBusMessage object.
    """
    logger.info("Received Service Bus Request")

    sender = get_queue_sender(GENERATION_RESULTS_QUEUE_NAME)
    try:
        generation_message = deserialize(msg.get_body(), GenerationMessageBody)
        request_body = generation_message["request"]
        ticket_id = generation_message["ticket_id"]
        logger.info("Beginning RAG pipeline for ticket ID: %s", ticket_id)
        result = await generate_application_draft(
            application_id=request_body["application_id"],
            application_title=request_body["application_title"],
            cfp_title=request_body["cfp_title"],
            grant_funding_organization=request_body["grant_funding_organization"],
            innovation_description=request_body["innovation_description"],
            innovation_id=request_body["innovation_id"],
            research_aims=request_body["research_aims"],
            significance_description=request_body["significance_description"],
            significance_id=request_body["significance_id"],
            workspace_id=request_body["workspace_id"],
        )
        logger.info("RAG pipeline completed successfully for ticket ID: %s", ticket_id)
        db_result = await insert_generation_result(
            generation_result=result,
            application_id=request_body["application_id"],
        )
        logger.info("Generation result inserted into the database")
        await sender.send_messages(
            SenderServiceBusMessage(
                body=serialize(
                    GenerationResultMessage(
                        application_id=request_body["application_id"],
                        content=db_result["text"],
                        result_id=db_result["id"],
                        ticket_id=ticket_id,
                    )
                )
            )
        )

    except DeserializationError as e:
        logger.error("Failed to deserialize the request body: %s", e)
