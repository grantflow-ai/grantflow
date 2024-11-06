import logging
from http import HTTPStatus
from typing import cast

from azure.functions import HttpRequest, HttpResponse

from src.constants import CONTENT_TYPE_JSON
from src.rag.dto import APIError, RagRequest, RagResponse, ResearchAimDTO
from src.rag.executive_summary import generate_executive_summary
from src.rag.research_plan import generate_research_plan
from src.rag.significance_and_innovation import generate_significance_and_innovation
from src.utils.exceptions import DeserializationError
from src.utils.serialization import deserialize, serialize

logger = logging.getLogger(__name__)


async def handle_rag_request(req: HttpRequest) -> HttpResponse:
    """Handle a request to the RAG API.

    Args:
        req: An Azure Function HttpRequest object.

    Returns:
        An Azure Function HttpResponse object.
    """
    logger.info("Handling RAG request")

    try:
        request_body = deserialize(req.get_body(), RagRequest)
        data = request_body["data"]

        if isinstance(data, dict):
            result = await generate_significance_and_innovation(
                significance_description=data["significance_description"],
                significance_id=data["significance_id"],
                innovation_description=data["innovation_description"],
                innovation_id=data["innovation_id"],
                workspace_id=request_body["workspace_id"],
            )
        elif isinstance(data, list):
            result = await generate_research_plan(
                research_aims=cast(list[ResearchAimDTO], data),
                application_title=request_body["application_title"],
                workspace_id=request_body["workspace_id"],
            )
        else:
            result = await generate_executive_summary(
                application_title=request_body["application_title"],
                cfp_title=request_body["cfp_title"],
                grant_funding_organization=request_body["grant_funding_organization"],
                application_text=data,
                workspace_id=request_body["workspace_id"],
            )
        logger.info("Successfully generated a RAG response")
        return HttpResponse(
            body=serialize(RagResponse(text=result)),
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
