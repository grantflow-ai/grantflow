import logging

from sanic import HTTPResponse, json

from src.api_types import APIRequest, LoginRequestBody, LoginResponse
from src.utils.firebase import verify_id_token
from src.utils.jwt import create_jwt
from src.utils.serialization import deserialize

logger = logging.getLogger(__name__)


async def handle_login(request: APIRequest) -> HTTPResponse:
    """Route handler for logging in a user.

    Args:
        request: The request object.

    Returns:
        The response object.
    """
    request_body = deserialize(request.body, LoginRequestBody)
    decoded_token = await verify_id_token(request_body["id_token"])
    jwt = create_jwt(decoded_token["uid"])
    return json(LoginResponse(jwt_token=jwt))
