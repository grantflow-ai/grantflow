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
from packages.db.src.tables import OrganizationUser
from packages.db.src.enums import UserRoleEnum
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.tracing import start_span_with_trace_id
from sqlalchemy import select

from services.backend.src.common_types import APIRequestState
from services.backend.src.utils.jwt import verify_jwt_token

logger = get_logger(__name__)

PUBLIC_PATHS = {"login", "health", "schema"}
ADMIN_PATHS = {"organizations"}
DEV_BYPASS_PREFIX = "/dev/"


class AuthMiddleware(AbstractAuthenticationMiddleware):
    async def authenticate_request(
        self, connection: ASGIConnection[Any, Any, Any, APIRequestState]
    ) -> AuthenticationResult:
        if isinstance(connection, Request) and connection.method == "OPTIONS":
            return AuthenticationResult(user=None, auth=None)

        if any(connection.url.path == f"/{path}" for path in PUBLIC_PATHS):
            return AuthenticationResult(user=None, auth=None)

        if connection.url.path.startswith("/schema"):
            return AuthenticationResult(user=None, auth=None)

        if connection.url.path.startswith(DEV_BYPASS_PREFIX):
            if get_env("ENABLE_DEV_BYPASS", False):
                return AuthenticationResult(user=None, auth="dev-bypass-user")
            raise NotAuthorizedException("Dev bypass not enabled")

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
            # Try to get organization_id from path params (new structure)
            organization_id = connection.path_params.get("organization_id")
            project_id = connection.path_params.get("project_id")
            
            # For backward compatibility, if no organization_id but we have project_id,
            # we need to look up the organization through the project
            if not organization_id and project_id:
                # TODO: This is temporary backward compatibility - eventually all routes should have organization_id
                async with connection.app.state.session_maker() as session:
                    from packages.db.src.tables import Project
                    project = await session.get(Project, project_id)
                    if project:
                        organization_id = project.organization_id
            
            if not organization_id:
                raise NotAuthorizedException("Organization context required")

            if not firebase_uid:
                raise NotAuthorizedException

            async with connection.app.state.session_maker() as session:
                stmt = (
                    select(OrganizationUser)
                    .where(OrganizationUser.firebase_uid == firebase_uid)
                    .where(OrganizationUser.organization_id == organization_id)
                )
                if allowed_roles is not None:
                    stmt = stmt.where(OrganizationUser.role.in_(allowed_roles))

                result = await session.execute(stmt)
                organization_user = result.scalar_one_or_none()

                if organization_user:
                    # For COLLABORATOR role, check project-specific access if needed
                    if (organization_user.role == UserRoleEnum.COLLABORATOR and 
                        not organization_user.has_all_projects_access and 
                        project_id):
                        from packages.db.src.tables import ProjectAccess
                        project_access = await session.scalar(
                            select(ProjectAccess).where(
                                ProjectAccess.firebase_uid == firebase_uid,
                                ProjectAccess.organization_id == organization_id,
                                ProjectAccess.project_id == project_id
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
    """Middleware to extract or generate trace IDs for request tracing and OpenTelemetry integration."""

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
    """Get the trace ID from the request state."""
    return getattr(request.state, "trace_id", None)
