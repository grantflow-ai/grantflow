from datetime import timedelta

from sanic import HTTPResponse, json

from src.api_types import APIRequest, LoginRequestBody, LoginResponse, OTPResponse
from src.utils.firebase import verify_id_token
from src.utils.jwt import create_jwt
from src.utils.logging import get_logger
from src.utils.serialization import deserialize

logger = get_logger(__name__)


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


async def handle_create_otp(request: APIRequest) -> HTTPResponse:
    """Route handler for creating an OTP.

    Args:
        request: The request object.

    Returns:
        The response object.
    """
    # TODO: we need to add a second layer of security here
    otp = create_jwt(firebase_uid=request.ctx.firebase_uid, ttl=timedelta(hours=1))
    return json(OTPResponse(otp=otp))
