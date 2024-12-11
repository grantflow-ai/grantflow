import logging
from http import HTTPStatus

from sanic import HTTPResponse, Unauthorized

from src.api.api_types import APIRequest, LoginRequestBody, LoginResponse
from src.constants import CONTENT_TYPE_JSON
from src.utils.exceptions import DeserializationError
from src.utils.firebase import verify_id_token
from src.utils.jwt import create_jwt
from src.utils.serialization import deserialize, serialize

logger = logging.getLogger(__name__)


async def handle_login(request: APIRequest) -> HTTPResponse:
    """Route handler for logging in a user.

    Args:
        request: The request object.

    Raises:
        Unauthorized: If the request body

    Returns:
        The response object.
    """
    try:
        request_body = deserialize(request.body, LoginRequestBody)
        decoded_token = await verify_id_token(request_body["id_token"])
        jwt = create_jwt(decoded_token["uid"])
        return HTTPResponse(
            status=HTTPStatus.OK, body=serialize(LoginResponse(jwt_token=jwt)), content_type=CONTENT_TYPE_JSON
        )
    except DeserializationError as e:
        logger.error("Failed to deserialize the request body: %s", e)
        raise Unauthorized("Invalid login request") from e
