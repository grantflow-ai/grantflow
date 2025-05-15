from datetime import timedelta
from typing import Any, TypedDict

from litestar import get, post
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.enums import UserRoleEnum
from src.db.tables import Workspace, WorkspaceUser
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
async def handle_login(data: LoginRequestBody, session_maker: async_sessionmaker[Any]) -> LoginResponse:
    decoded_token = await verify_id_token(data["id_token"])
    firebase_uid = decoded_token["uid"]
    async with session_maker() as session, session.begin():
        workspace_user = await session.execute(select(WorkspaceUser).where(WorkspaceUser.firebase_uid == firebase_uid))
        if workspace_user is None:
            try:
                # Create default workspace only if user doesn't have one
                default_workspace = Workspace(name="default")
                session.add(default_workspace)

                # Create a WorkspaceUser instance to link the user to the default workspace
                workspace_user = WorkspaceUser(
                    workspace_id=default_workspace.id, firebase_uid=firebase_uid, role=UserRoleEnum.OWNER
                )
                session.add(workspace_user)
                await session.commit()
            except Exception as err:
                await session.rollback()
                raise Exception("Error creating default workspace") from err

    jwt = create_jwt(firebase_uid)
    return LoginResponse(jwt_token=jwt)


@get("/otp", operation_id="GenerateOtp")
async def handle_create_otp(auth: str) -> OTPResponse:
    # TODO: we need to add a second layer of security here
    otp = create_jwt(firebase_uid=auth, ttl=timedelta(hours=1))
    return OTPResponse(otp=otp)
