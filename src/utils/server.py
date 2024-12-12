import logging
from http import HTTPStatus

from sanic import HTTPResponse, json

from src.api.api_types import APIRequest
from src.dto import APIError
from src.exceptions import BackendError, DeserializationError

logger = logging.getLogger(__name__)


def handle_backend_error(request: APIRequest, exception: BackendError) -> HTTPResponse:
    """Handle a backend error.

    Args:
        request: The request object.
        exception: The exception.

    Returns:
        The HTTP response.
    """
    if isinstance(exception, DeserializationError):
        logger.error("Failed to deserialize the request body: %s, error: %s", request.body, exception)
        message = "Failed to deserialize the request body"
        status = HTTPStatus.BAD_REQUEST
    else:
        logger.error("An unexpected backend error occurred: %s", exception)
        message = "An unexpected backend error occurred"
        status = HTTPStatus.INTERNAL_SERVER_ERROR

    return json(
        APIError(
            message=message,
            details=str(exception),
        ),
        status=status,
    )
