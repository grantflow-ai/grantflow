from datetime import timedelta
from typing import TypedDict

from litestar import get, post

from src.utils.firebase import verify_id_token
from src.utils.jwt import create_jwt
from src.utils.logger import get_logger

logger = get_logger(__name__)


class OTPResponse(TypedDict):
    otp: str


class LoginRequestBody(TypedDict):
    id_token: str


class LoginResponse(TypedDict):
    jwt_token: str


@post("/login", operation_id="Login")
async def handle_login(data: LoginRequestBody) -> LoginResponse:
    decoded_token = await verify_id_token(data["id_token"])
    jwt = create_jwt(decoded_token["uid"])
    return LoginResponse(jwt_token=jwt)


@get("/otp", operation_id="GenerateOtp")
async def handle_create_otp(auth: str) -> OTPResponse:
    # TODO: we need to add a second layer of security here
    otp = create_jwt(firebase_uid=auth, ttl=timedelta(hours=1))
    return OTPResponse(otp=otp)
