import logging
from http import HTTPStatus

from azure.functions import HttpRequest, HttpResponse

from src.constants import CONTENT_TYPE_JSON
from src.rag.dto import APIError, RagRequest, RagResponse
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

        logger.info("Successfully generated a RAG response")
        return HttpResponse(
            body=serialize(RagResponse(data="")),
            status_code=HTTPStatus.CREATED,
            mimetype=CONTENT_TYPE_JSON,
        )
    except DeserializationError as e:
        logger.error("Failed to deserialize the request body due to an exception: %s", e)
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
