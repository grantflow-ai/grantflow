import logging
from json import dumps

from sanic import HTTPResponse, json

from src.api.api_types import APIRequest, LoginResponse
from src.utils.firebase import verify_id_token
from src.utils.jwt import create_jwt

logger = logging.getLogger(__name__)


async def handle_login(request: APIRequest) -> HTTPResponse:
    """Route handler for logging in a user.

    Args:
        request: The request object.

    Returns:
        The response object.
    """
    try:
        request_body = request.json
        logger.debug("Logging in user: %s", dumps(request_body))
        decoded_token = await verify_id_token(request_body["id_token"])
        jwt = create_jwt(decoded_token["uid"])
        return json(LoginResponse(jwt_token=jwt))
    except Exception as e:
        logger.error("Error logging in user: %s, %s", type(e), e)
        raise
