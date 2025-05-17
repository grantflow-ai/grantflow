from datetime import timedelta
from typing import Any, TypedDict

from litestar import get, post
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Workspace, WorkspaceUser
from packages.shared_utils.src.logger import get_logger
from services.backend.src.utils.firebase import verify_id_token
from services.backend.src.utils.jwt import create_jwt
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class OTPResponse(TypedDict):
    otp: str


class LoginRequestBody(TypedDict):
    id_token: str


class LoginResponse(TypedDict):
    jwt_token: str


@post("/login", operation_id="Login")
async def handle_login(data: LoginRequestBody, session_maker: async_sessionmaker[Any]) -> LoginResponse:
    decoded_token = await verify_id_token(data["id_token"])
    firebase_uid = decoded_token["uid"]

    async with session_maker() as session:
        try:
            result = await session.execute(select(WorkspaceUser).where(WorkspaceUser.firebase_uid == firebase_uid))
            workspace_user = result.one_or_none()

            if workspace_user is None:
                default_workspace = Workspace(name="default")
                session.add(default_workspace)
                await session.flush()

                workspace_user = WorkspaceUser(
                    workspace_id=default_workspace.id, firebase_uid=firebase_uid, role=UserRoleEnum.OWNER
                )
                session.add(workspace_user)
                await session.commit()
        except SQLAlchemyError as err:
            await session.rollback()
            raise Exception("Error creating default workspace") from err

    jwt = create_jwt(firebase_uid)
    return LoginResponse(jwt_token=jwt)


@get("/otp", operation_id="GenerateOtp")
async def handle_create_otp(auth: str) -> OTPResponse:
    # TODO: we need to add a second layer of security here
    otp = create_jwt(firebase_uid=auth, ttl=timedelta(hours=1))
    return OTPResponse(otp=otp)
