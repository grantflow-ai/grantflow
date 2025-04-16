from typing import Any

from litestar import Request
from litestar.connection import ASGIConnection
from litestar.exceptions import NotAuthorizedException
from litestar.middleware import AbstractAuthenticationMiddleware, AuthenticationResult
from sqlalchemy import select

from src.common_types import APIRequestState
from src.db.tables import WorkspaceUser
from src.utils.env import get_env
from src.utils.jwt import verify_jwt_token
from src.utils.logger import get_logger

logger = get_logger(__name__)

PUBLIC_PATHS = {"login", "health"}
ADMIN_PATHS = {"organizations"}


class AuthMiddleware(AbstractAuthenticationMiddleware):
    async def authenticate_request(
        self, connection: ASGIConnection[Any, Any, Any, APIRequestState]
    ) -> AuthenticationResult:
        if (isinstance(ASGIConnection, Request) and connection.method == "OPTIONS") or any(
            connection.url.path == f"/{path}" for path in PUBLIC_PATHS
        ):
            return AuthenticationResult(user=None, auth=None)

        auth_header = connection.headers.get("Authorization", "").strip()

        if any(connection.url.path.startswith(f"/{path}") for path in ADMIN_PATHS):
            access_code = get_env("ADMIN_ACCESS_CODE")
            if auth_header and auth_header == access_code:
                return AuthenticationResult(user=None, auth=None)
            raise NotAuthorizedException

        firebase_uid: str | None = None
        if bearer_token := (auth_header.removeprefix("Bearer").strip() if auth_header.startswith("Bearer") else None):
            firebase_uid = verify_jwt_token(bearer_token)

        if otp := connection.query_params.get("otp"):
            firebase_uid = verify_jwt_token(otp)

        if allowed_roles := connection.route_handler.opt.get("allowed_roles"):
            workspace_id = connection.path_params.get("workspace_id")
            if not workspace_id:
                raise NotAuthorizedException

            if not firebase_uid:
                raise NotAuthorizedException

            async with connection.app.state.session_maker() as session:
                stmt = (
                    select(WorkspaceUser)
                    .where(WorkspaceUser.firebase_uid == firebase_uid)
                    .where(WorkspaceUser.workspace_id == workspace_id)
                )
                if allowed_roles is not None:
                    stmt = stmt.where(WorkspaceUser.role.in_(allowed_roles))

                result = await session.execute(stmt)

            if workspace_user := result.scalar_one_or_none():
                return AuthenticationResult(user=workspace_user.role, auth=firebase_uid)
            raise NotAuthorizedException

        if firebase_uid:
            return AuthenticationResult(user=None, auth=firebase_uid)

        raise NotAuthorizedException
