from typing import Any
from uuid import uuid4

from litestar import Request
from litestar.connection import ASGIConnection
from litestar.exceptions import NotAuthorizedException
from litestar.middleware import (
    AbstractAuthenticationMiddleware,
    AbstractMiddleware,
    AuthenticationResult,
)
from litestar.types import Receive, Scope, Send
from packages.db.src.tables import ProjectUser
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.tracing import start_span_with_trace_id
from sqlalchemy import select

from services.backend.src.common_types import APIRequestState
from services.backend.src.utils.jwt import verify_jwt_token

logger = get_logger(__name__)

PUBLIC_PATHS = {"login", "health"}
ADMIN_PATHS = {"organizations"}


class AuthMiddleware(AbstractAuthenticationMiddleware):
    async def authenticate_request(
        self, connection: ASGIConnection[Any, Any, Any, APIRequestState]
    ) -> AuthenticationResult:
        if (
            isinstance(ASGIConnection, Request) and connection.method == "OPTIONS"
        ) or any(connection.url.path == f"/{path}" for path in PUBLIC_PATHS):
            return AuthenticationResult(user=None, auth=None)

        auth_header = connection.headers.get("Authorization", "").strip()

        if any(connection.url.path.startswith(f"/{path}") for path in ADMIN_PATHS):
            access_code = get_env("ADMIN_ACCESS_CODE")
            if auth_header and auth_header == access_code:
                return AuthenticationResult(user=None, auth=None)
            raise NotAuthorizedException

        firebase_uid: str | None = None
        if bearer_token := (
            auth_header.removeprefix("Bearer").strip()
            if auth_header.startswith("Bearer")
            else None
        ):
            firebase_uid = verify_jwt_token(bearer_token)

        if otp := connection.query_params.get("otp"):
            firebase_uid = verify_jwt_token(otp)

        if allowed_roles := connection.route_handler.opt.get("allowed_roles"):
            project_id = connection.path_params.get("project_id")
            if not project_id:
                raise NotAuthorizedException

            if not firebase_uid:
                raise NotAuthorizedException

            async with connection.app.state.session_maker() as session:
                stmt = (
                    select(ProjectUser)
                    .where(ProjectUser.firebase_uid == firebase_uid)
                    .where(ProjectUser.project_id == project_id)
                )
                if allowed_roles is not None:
                    stmt = stmt.where(ProjectUser.role.in_(allowed_roles))

                result = await session.execute(stmt)

            if project_user := result.scalar_one_or_none():
                return AuthenticationResult(user=project_user.role, auth=firebase_uid)
            raise NotAuthorizedException

        if firebase_uid:
            return AuthenticationResult(user=None, auth=firebase_uid)

        raise NotAuthorizedException


class TraceIdMiddleware(AbstractMiddleware):
    """Middleware to extract or generate trace IDs for request tracing and OpenTelemetry integration."""

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        scope_type = scope.get("type")
        if scope_type not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        trace_id = None
        for name, value in scope.get("headers", []):
            if name.lower() == b"x-trace-id":
                trace_id = value.decode("utf-8")
                break

        if not trace_id:
            trace_id = str(uuid4())

        if "state" not in scope:
            scope["state"] = {}
        scope["state"]["trace_id"] = trace_id

        logger.debug(
            "Request trace ID set",
            trace_id=trace_id,
            method=scope.get("method"),
            path=scope.get("path"),
        )

        method = scope.get("method", "UNKNOWN")
        path = scope.get("path", "/")
        span_name = f"{method} {path}"

        with start_span_with_trace_id(
            span_name=span_name,
            trace_id=trace_id,
            tracer_name="backend.middleware",
            http_method=method,
            http_url=path,
            http_scheme=scope.get("scheme", "http"),
        ):
            await self.app(scope, receive, send)


def get_trace_id(request: Request[Any, Any, APIRequestState]) -> str | None:
    """Get the trace ID from the request state."""
    return getattr(request.state, "trace_id", None)
