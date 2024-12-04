from http import HTTPStatus

from sanic import HTTPResponse

from src.constants import CONTENT_TYPE_JSON
from src.dto import APIError
from src.utils.exceptions import DeserializationError
from src.utils.serialization import serialize


def handle_deserialization_error(e: DeserializationError) -> HTTPResponse:
    """Handle a deserialization error.

    Args:
        e: The deserialization error.

    Returns:
        The HTTP response.
    """
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
