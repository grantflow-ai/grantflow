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
    logger.error("Failed to deserialize the request body: %s, error: %s", request.body, exception)

    status = HTTPStatus.BAD_REQUEST if isinstance(exception, DeserializationError) else HTTPStatus.INTERNAL_SERVER_ERROR
    return json(
        APIError(
            message="Failed to deserialize the request body",
            details=str(exception),
        ),
        status=status,
    )
