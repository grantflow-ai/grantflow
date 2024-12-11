from datetime import timedelta
from http import HTTPStatus

from sanic import HTTPResponse

from src.api.api_types import APIRequest, OTPResponse
from src.constants import CONTENT_TYPE_JSON
from src.utils.jwt import create_jwt
from src.utils.serialization import serialize


async def handle_create_otp(request: APIRequest) -> HTTPResponse:
    """Route handler for creating an OTP.

    Args:
        request: The request object.

    Returns:
        The response object.
    """
    # TODO: we need to add a second layer of security here
    otp = create_jwt(firebase_uid=request.ctx.firebase_uid, ttl=timedelta(hours=1))
    return HTTPResponse(status=HTTPStatus.OK, body=serialize(OTPResponse(otp=otp)), content_type=CONTENT_TYPE_JSON)
