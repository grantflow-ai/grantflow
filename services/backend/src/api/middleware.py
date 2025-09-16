from typing import Any
from uuid import uuid4

from litestar import Request
from litestar.connection import ASGIConnection
from litestar.exceptions import NotAuthorizedException
from litestar.middleware import (
    AbstractAuthenticationMiddleware,
    ASGIMiddleware,
    AuthenticationResult,
)
from litestar.types import ASGIApp, Receive, Scope, Send
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import OrganizationUser, ProjectAccess
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.tracing import start_span_with_trace_id
from sqlalchemy import select

from services.backend.src.common_types import APIRequestState
from services.backend.src.utils.jwt import verify_jwt_token
from services.backend.src.utils.oidc_auth import verify_webhook_oidc_token

logger = get_logger(__name__)

PUBLIC_PATHS = {"login", "health", "schema", "grants"}
PUBLIC_PATH_PREFIXES: set[str] = set()
ADMIN_PATHS = {"granting-institutions"}
WEBHOOK_PATHS = {
    "/webhooks/pubsub/email-notifications",
    "/webhooks/scheduler/grant-matcher",
    "/webhooks/scheduler/entity-cleanup",
}
ADMIN_SOURCES_PATTERNS = [
    "/granting-institutions/{granting_institution_id}/sources",
    "/granting-institutions/{granting_institution_id}/sources/{source_id}",
    "/granting-institutions/{granting_institution_id}/sources/upload-url",
    "/granting-institutions/{granting_institution_id}/sources/crawl-url",
]


def _matches_source_pattern(path: str, pattern: str) -> bool:
    pattern_parts = pattern.split("/")
    path_parts = path.split("/")

    if len(pattern_parts) != len(path_parts):
        return False

    return all(
        pattern_part == path_part or (pattern_part.startswith("{") and pattern_part.endswith("}"))
        for pattern_part, path_part in zip(pattern_parts, path_parts, strict=False)
    )


class AuthMiddleware(AbstractAuthenticationMiddleware):
    def _is_public_path(self, path: str) -> bool:
        if any(path == f"/{public_path}" for public_path in PUBLIC_PATHS) or path.startswith("/schema"):
            return True
        if path.startswith("/grants"):
            return True
        return any(path.startswith(prefix) for prefix in PUBLIC_PATH_PREFIXES)

    def _is_admin_path(self, path: str) -> bool:
        if any(
            path == f"/{admin_path}" or (path.startswith(f"/{admin_path}/") and len(path.split("/")) <= 3)
            for admin_path in ADMIN_PATHS
        ):
            return True

        return any(_matches_source_pattern(path, pattern) for pattern in ADMIN_SOURCES_PATTERNS)

    def _is_webhook_path(self, path: str) -> bool:
        return path in WEBHOOK_PATHS

    async def authenticate_request(
        self, connection: ASGIConnection[Any, Any, Any, APIRequestState]
    ) -> AuthenticationResult:
        if isinstance(connection, Request) and connection.method == "OPTIONS":
            return AuthenticationResult(user=None, auth=None)

        path = connection.url.path
        auth_header = connection.headers.get("Authorization", "").strip()

        if self._is_public_path(path):
            return AuthenticationResult(user=None, auth=None)

        if self._is_webhook_path(path):
            # All webhooks must use OIDC token authentication
            if not auth_header or not auth_header.startswith("Bearer "):
                raise NotAuthorizedException("Bearer token required for webhook authentication")

            token = auth_header.removeprefix("Bearer ").strip()
            expected_audience = f"{connection.url.scheme}://{connection.url.netloc}{path}"

            if verify_webhook_oidc_token(token, expected_audience):
                return AuthenticationResult(user=None, auth=None)

            raise NotAuthorizedException("Invalid OIDC token")

        if self._is_admin_path(path):
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
            organization_id = connection.path_params.get("organization_id")
            project_id = connection.path_params.get("project_id")

            if not organization_id:
                raise NotAuthorizedException("Organization context required")

            if not firebase_uid:
                raise NotAuthorizedException

            async with connection.app.state.session_maker() as session:
                stmt = select(OrganizationUser).where(
                    OrganizationUser.firebase_uid == firebase_uid,
                    OrganizationUser.organization_id == organization_id,
                    OrganizationUser.deleted_at.is_(None),
                )
                if allowed_roles is not None:
                    stmt = stmt.where(OrganizationUser.role.in_(allowed_roles))

                result = await session.execute(stmt)
                organization_user = result.scalar_one_or_none()

                if organization_user:
                    if (
                        organization_user.role == UserRoleEnum.COLLABORATOR
                        and not organization_user.has_all_projects_access
                        and project_id
                    ):
                        project_access = await session.scalar(
                            select(ProjectAccess).where(
                                ProjectAccess.firebase_uid == firebase_uid,
                                ProjectAccess.organization_id == organization_id,
                                ProjectAccess.project_id == project_id,
                            )
                        )
                        if not project_access:
                            raise NotAuthorizedException("Project access required")

                    return AuthenticationResult(user=organization_user.role, auth=firebase_uid)

            raise NotAuthorizedException

        if firebase_uid:
            return AuthenticationResult(user=None, auth=firebase_uid)

        raise NotAuthorizedException


class TraceIdMiddleware(ASGIMiddleware):
    async def handle(self, scope: Scope, receive: Receive, send: Send, next_app: ASGIApp) -> None:
        scope_type = scope.get("type")
        if scope_type not in ("http", "websocket"):
            await next_app(scope, receive, send)
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
            await next_app(scope, receive, send)


def get_trace_id(request: Request[Any, Any, APIRequestState]) -> str | None:
    return getattr(request.state, "trace_id", None)
