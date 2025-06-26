from datetime import timedelta
from typing import Any, TypedDict

from litestar import get, post
from litestar.exceptions import NotAuthorizedException
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Project, ProjectUser
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.common_types import APIRequest
from services.backend.src.utils.firebase import verify_id_token
from services.backend.src.utils.jwt import create_jwt

logger = get_logger(__name__)


class OTPResponse(TypedDict):
    otp: str


class LoginRequestBody(TypedDict):
    id_token: str


class LoginResponse(TypedDict):
    jwt_token: str


@post("/login", operation_id="Login")
async def handle_login(
    data: LoginRequestBody, session_maker: async_sessionmaker[Any]
) -> LoginResponse:
    decoded_token = await verify_id_token(data["id_token"])
    firebase_uid = decoded_token["uid"]

    async with session_maker() as session, session.begin():
        result = await session.execute(
            select(ProjectUser).where(ProjectUser.firebase_uid == firebase_uid)
        )
        project_user = result.scalars().first()

        if project_user is None:
            default_project = Project(name="default")
            session.add(default_project)
            await session.flush()

            project_user = ProjectUser(
                project_id=default_project.id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.OWNER,
            )
            session.add(project_user)

    jwt = create_jwt(firebase_uid)
    return LoginResponse(jwt_token=jwt)


@get("/otp", operation_id="GenerateOtp")
async def handle_create_otp(request: APIRequest) -> OTPResponse:
    # TODO: we need to add a second layer of security here
    if request.auth is None:
        raise NotAuthorizedException("Authentication required")
    otp = create_jwt(firebase_uid=request.auth, ttl=timedelta(hours=1))
    return OTPResponse(otp=otp)
