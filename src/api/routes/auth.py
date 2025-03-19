from datetime import timedelta

from litestar import get, post

from src.api.api_types import LoginRequestBody, LoginResponse, OTPResponse
from src.utils.firebase import verify_id_token
from src.utils.jwt import create_jwt
from src.utils.logger import get_logger

logger = get_logger(__name__)


@post("/login")
async def handle_login(data: LoginRequestBody) -> LoginResponse:
    decoded_token = await verify_id_token(data["id_token"])
    jwt = create_jwt(decoded_token["uid"])
    return LoginResponse(jwt_token=jwt)


@get("/otp")
async def handle_create_otp(auth: str) -> OTPResponse:
    # TODO: we need to add a second layer of security here
    otp = create_jwt(firebase_uid=auth, ttl=timedelta(hours=1))
    return OTPResponse(otp=otp)
