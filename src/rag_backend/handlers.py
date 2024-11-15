import logging
import sys
from asyncio import gather
from http import HTTPStatus
from textwrap import dedent

from azure.functions import HttpRequest, HttpResponse

from src.constants import CONTENT_TYPE_JSON
from src.rag_backend.application_draft_generation.research_aims import generate_research_plan
from src.rag_backend.application_draft_generation.research_innovation import (
    generate_significance_and_innovation,
)
from src.rag_backend.dto import (
    APIError,
    DraftGenerationRequest,
    FormPrefillRequest,
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

        significance_and_innovation_section, research_plan_section = await gather(
            *[
                generate_significance_and_innovation(
                    application_id=request_body["application_id"],
                    application_title=request_body["application_title"],
                    cfp_title=request_body["cfp_title"],
                    grant_funding_organization=request_body["grant_funding_organization"],
                    innovation_description=request_body["innovation_description"],
                    innovation_id=request_body["innovation_id"],
                    significance_description=request_body["significance_description"],
                    significance_id=request_body["significance_id"],
                    workspace_id=request_body["workspace_id"],
                ),
                generate_research_plan(
                    application_id=request_body["application_id"],
                    workspace_id=request_body["workspace_id"],
                    research_aims=request_body["research_aims"],
                ),
            ]
        )
        logger.info("RAG pipeline completed successfully")
        return HttpResponse(
            body=serialize(
                {
                    "result": dedent(f"""
            {significance_and_innovation_section}

            {research_plan_section}
            """).strip()
                }
            ),
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


async def handle_application_form_prefill(req: HttpRequest) -> HttpResponse:
    """Handle a request to prefill an application form.

    Args:
        req: An Azure Function HttpRequest object.

    Returns:
        An Azure Function HttpResponse object.
    """
    logger.info("Beginning application form prefill")

    try:
        request_body = deserialize(req.get_body(), FormPrefillRequest)
        workspace_d = request_body["workspace_id"]
        application_id = request_body["application_id"]
        logger.info("Prefilling form for workspace %s and application %s", workspace_d, application_id)

        return HttpResponse(
            body=serialize(None),
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
