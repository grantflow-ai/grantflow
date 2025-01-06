from datetime import timedelta

from sanic import HTTPResponse, json

from src.api_types import APIRequest, OTPResponse
from src.utils.jwt import create_jwt


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
