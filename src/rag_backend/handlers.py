import logging
import sys
from http import HTTPStatus

from azure.functions import HttpRequest, HttpResponse

from src.constants import CONTENT_TYPE_JSON
from src.rag_backend.application_draft_generation import generate_application_draft
from src.rag_backend.dto import (
    APIError,
    DraftGenerationRequest,
)
from src.utils.exceptions import DeserializationError
from src.utils.serialization import deserialize, serialize

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
logger = logging.getLogger(__name__)


async def handle_section_generation_request(req: HttpRequest) -> HttpResponse:
    """Handle a request to generate a section of a grant application.

    Args:
        req: An Azure Function HttpRequest object.

    Returns:
        An Azure Function HttpResponse object.
    """
    logger.info("Beginning RAG pipeline")

    try:
        request_body = deserialize(req.get_body(), DraftGenerationRequest)
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
        logger.info("RAG pipeline completed successfully")
        return HttpResponse(
            body=serialize({"grant_application_draft": result}),
            status_code=HTTPStatus.CREATED,
            mimetype=CONTENT_TYPE_JSON,
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
