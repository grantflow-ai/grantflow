from collections.abc import Generator
from typing import TYPE_CHECKING, Any, cast
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from litestar.app import Litestar
from litestar.connection import ASGIConnection
from litestar.exceptions import NotAuthorizedException
from packages.db.src.enums import UserRoleEnum

from services.backend.src.api.middleware import (
    PUBLIC_PATHS,
    AuthMiddleware,
    TraceIdMiddleware,
)

if TYPE_CHECKING:
    from litestar.middleware import AuthenticationResult
    from litestar.types import HTTPScope, Scope


class MockASGIConnection(MagicMock):
    def __init__(
        self,
        *,
        url_path: str = "",
        headers: dict[str, str] | None = None,
        query_params: dict[str, str] | None = None,
        path_params: dict[str, str] | None = None,
        has_route_handler: bool = True,
        route_handler_opt: dict[str, Any] | None = None,
        app: Litestar | None = None,
        method: str = "GET",
    ) -> None:
        super().__init__(spec=ASGIConnection)
        self.url = MagicMock()
        self.url.path = url_path
        self.headers = headers or {}
        self.query_params = query_params or {}
        self.path_params = path_params or {}
        self.method = method

        if has_route_handler:
            self.route_handler: Any = MagicMock()
            self.route_handler.opt = route_handler_opt or {}
        else:
            self.route_handler = None

        if app:
            self.app = app
        else:
            app_mock = MagicMock(spec=Litestar)
            app_mock.state = MagicMock()
            app_mock.state.session_maker = MagicMock()
            self.app = app_mock


@pytest.fixture
def app() -> MagicMock:
    app = MagicMock(spec=Litestar)
    app.state = MagicMock()
    app.state.session_maker = MagicMock()
    return app


@pytest.fixture
def mock_verify_jwt_token() -> Generator[MagicMock]:
    with patch("services.backend.src.api.middleware.verify_jwt_token") as mock:
        yield mock


@pytest.fixture
def mock_get_env() -> Generator[MagicMock]:
    with patch("services.backend.src.api.middleware.get_env") as mock:
        mock.return_value = "test-admin-code"
        yield mock


async def test_authenticate_public_path(app: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)

    for path in PUBLIC_PATHS:
        connection = MockASGIConnection(url_path=f"/{path}", app=app)

        result: AuthenticationResult = await middleware.authenticate_request(connection)

        assert result.user is None
        assert result.auth is None


async def test_authenticate_with_bearer_token(app: MagicMock, mock_verify_jwt_token: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)
    mock_verify_jwt_token.return_value = "test-uid"

    connection = MockASGIConnection(url_path="/some-path", headers={"Authorization": "Bearer test-token"}, app=app)

    result: AuthenticationResult = await middleware.authenticate_request(connection)

    assert result.auth == "test-uid"
    mock_verify_jwt_token.assert_called_once_with("test-token")


async def test_authenticate_with_otp(app: MagicMock, mock_verify_jwt_token: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)
    mock_verify_jwt_token.return_value = "test-uid"

    connection = MockASGIConnection(url_path="/some-path", query_params={"otp": "test-otp"}, app=app)

    result: AuthenticationResult = await middleware.authenticate_request(connection)

    assert result.auth == "test-uid"
    mock_verify_jwt_token.assert_called_once_with("test-otp")


async def test_authenticate_with_allowed_roles(app: MagicMock, mock_verify_jwt_token: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)
    mock_verify_jwt_token.return_value = "test-uid"

    organization_user: MagicMock = MagicMock()
    organization_user.role = UserRoleEnum.ADMIN

    session_result = MagicMock()
    session_result.scalar_one_or_none.return_value = organization_user

    session = AsyncMock()
    session.execute.return_value = session_result

    session_ctx = AsyncMock()
    session_ctx.__aenter__.return_value = session

    session_maker = MagicMock()
    session_maker.return_value = session_ctx
    app.state.session_maker = session_maker

    connection = MockASGIConnection(
        url_path="/organizations/test-org-id/projects/test-project-id/something",
        headers={"Authorization": "Bearer test-token"},
        path_params={"organization_id": "test-org-id", "project_id": "test-project-id"},
        route_handler_opt={"allowed_roles": [UserRoleEnum.ADMIN, UserRoleEnum.OWNER]},
        app=app,
    )

    result: AuthenticationResult = await middleware.authenticate_request(connection)

    assert result.user == UserRoleEnum.ADMIN
    assert result.auth == "test-uid"
    mock_verify_jwt_token.assert_called_once_with("test-token")
    session.execute.assert_called_once()


async def test_authenticate_with_allowed_roles_no_project_id(app: MagicMock, mock_verify_jwt_token: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)
    mock_verify_jwt_token.return_value = "test-uid"

    connection = MockASGIConnection(
        url_path="/some-path",
        headers={"Authorization": "Bearer test-token"},
        route_handler_opt={"allowed_roles": [UserRoleEnum.ADMIN]},
        app=app,
    )

    with pytest.raises(NotAuthorizedException):
        await middleware.authenticate_request(connection)


async def test_authenticate_with_allowed_roles_no_firebase_uid(
    app: MagicMock, mock_verify_jwt_token: MagicMock
) -> None:
    middleware = AuthMiddleware(app=app)
    mock_verify_jwt_token.side_effect = NotAuthorizedException("Invalid token")

    connection = MockASGIConnection(
        url_path="/projects/test-project-id/something",
        headers={"Authorization": "Bearer invalid-token"},
        path_params={"project_id": "test-project-id"},
        route_handler_opt={"allowed_roles": [UserRoleEnum.ADMIN]},
        app=app,
    )

    with pytest.raises(NotAuthorizedException):
        await middleware.authenticate_request(connection)


async def test_authenticate_with_allowed_roles_user_not_found(app: MagicMock, mock_verify_jwt_token: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)
    mock_verify_jwt_token.return_value = "test-uid"

    session_result = MagicMock()
    session_result.scalar_one_or_none.return_value = None

    session = AsyncMock()
    session.execute.return_value = session_result

    session_ctx = AsyncMock()
    session_ctx.__aenter__.return_value = session

    session_maker = MagicMock()
    session_maker.return_value = session_ctx
    app.state.session_maker = session_maker

    connection = MockASGIConnection(
        url_path="/projects/test-project-id/something",
        headers={"Authorization": "Bearer test-token"},
        path_params={"project_id": "test-project-id"},
        route_handler_opt={"allowed_roles": [UserRoleEnum.ADMIN]},
        app=app,
    )

    with pytest.raises(NotAuthorizedException):
        await middleware.authenticate_request(connection)


async def test_authenticate_no_auth(app: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)

    connection = MockASGIConnection(url_path="/some-path", app=app)

    with pytest.raises(NotAuthorizedException):
        await middleware.authenticate_request(connection)


async def test_authenticate_options_method(app: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)

    from litestar import Request

    scope = cast(
        "HTTPScope",
        {
            "type": "http",
            "method": "OPTIONS",
            "url": {"path": "/any-path"},
            "headers": [],
            "app": app,
        },
    )
    connection: Request[Any, Any, Any] = Request(scope)

    result: AuthenticationResult = await middleware.authenticate_request(connection)

    assert result.user is None
    assert result.auth is None


async def test_authenticate_schema_endpoints(app: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)

    test_paths = ["/schema", "/schema/openapi.json", "/schema/swagger"]

    for path in test_paths:
        connection = MockASGIConnection(url_path=path, app=app)

        result: AuthenticationResult = await middleware.authenticate_request(connection)

        assert result.user is None
        assert result.auth is None


async def test_authenticate_organizations_endpoint_with_auth(app: MagicMock, mock_verify_jwt_token: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)
    mock_verify_jwt_token.return_value = "test-uid"

    connection = MockASGIConnection(url_path="/organizations", headers={"Authorization": "Bearer test-token"}, app=app)

    result: AuthenticationResult = await middleware.authenticate_request(connection)

    assert result.auth == "test-uid"
    assert result.user is None
    mock_verify_jwt_token.assert_called_once_with("test-token")


async def test_authenticate_organizations_endpoint_no_auth(app: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)

    connection = MockASGIConnection(url_path="/organizations", app=app)

    with pytest.raises(NotAuthorizedException):
        await middleware.authenticate_request(connection)


async def test_authenticate_collaborator_with_project_access(app: MagicMock, mock_verify_jwt_token: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)
    mock_verify_jwt_token.return_value = "test-uid"

    organization_user: MagicMock = MagicMock()
    organization_user.role = UserRoleEnum.COLLABORATOR
    organization_user.has_all_projects_access = False

    project_access: MagicMock = MagicMock()

    session_result = MagicMock()
    session_result.scalar_one_or_none.return_value = organization_user

    session = AsyncMock()
    session.execute.return_value = session_result
    session.scalar.return_value = project_access

    session_ctx = AsyncMock()
    session_ctx.__aenter__.return_value = session

    session_maker = MagicMock()
    session_maker.return_value = session_ctx
    app.state.session_maker = session_maker

    connection = MockASGIConnection(
        url_path="/organizations/test-org-id/projects/test-project-id/something",
        headers={"Authorization": "Bearer test-token"},
        path_params={"organization_id": "test-org-id", "project_id": "test-project-id"},
        route_handler_opt={"allowed_roles": [UserRoleEnum.COLLABORATOR]},
        app=app,
    )

    result: AuthenticationResult = await middleware.authenticate_request(connection)

    assert result.user == UserRoleEnum.COLLABORATOR
    assert result.auth == "test-uid"
    session.scalar.assert_called_once()


async def test_authenticate_collaborator_without_project_access(
    app: MagicMock, mock_verify_jwt_token: MagicMock
) -> None:
    middleware = AuthMiddleware(app=app)
    mock_verify_jwt_token.return_value = "test-uid"

    organization_user: MagicMock = MagicMock()
    organization_user.role = UserRoleEnum.COLLABORATOR
    organization_user.has_all_projects_access = False

    session_result = MagicMock()
    session_result.scalar_one_or_none.return_value = organization_user

    session = AsyncMock()
    session.execute.return_value = session_result
    session.scalar.return_value = None

    session_ctx = AsyncMock()
    session_ctx.__aenter__.return_value = session

    session_maker = MagicMock()
    session_maker.return_value = session_ctx
    app.state.session_maker = session_maker

    connection = MockASGIConnection(
        url_path="/organizations/test-org-id/projects/test-project-id/something",
        headers={"Authorization": "Bearer test-token"},
        path_params={"organization_id": "test-org-id", "project_id": "test-project-id"},
        route_handler_opt={"allowed_roles": [UserRoleEnum.COLLABORATOR]},
        app=app,
    )

    with pytest.raises(NotAuthorizedException, match="Project access required"):
        await middleware.authenticate_request(connection)


async def test_authenticate_collaborator_with_all_projects_access(
    app: MagicMock, mock_verify_jwt_token: MagicMock
) -> None:
    middleware = AuthMiddleware(app=app)
    mock_verify_jwt_token.return_value = "test-uid"

    organization_user: MagicMock = MagicMock()
    organization_user.role = UserRoleEnum.COLLABORATOR
    organization_user.has_all_projects_access = True

    session_result = MagicMock()
    session_result.scalar_one_or_none.return_value = organization_user

    session = AsyncMock()
    session.execute.return_value = session_result

    session_ctx = AsyncMock()
    session_ctx.__aenter__.return_value = session

    session_maker = MagicMock()
    session_maker.return_value = session_ctx
    app.state.session_maker = session_maker

    connection = MockASGIConnection(
        url_path="/organizations/test-org-id/projects/test-project-id/something",
        headers={"Authorization": "Bearer test-token"},
        path_params={"organization_id": "test-org-id", "project_id": "test-project-id"},
        route_handler_opt={"allowed_roles": [UserRoleEnum.COLLABORATOR]},
        app=app,
    )

    result: AuthenticationResult = await middleware.authenticate_request(connection)

    assert result.user == UserRoleEnum.COLLABORATOR
    assert result.auth == "test-uid"
    session.scalar.assert_not_called()


async def test_trace_id_middleware_http_request() -> None:
    app = AsyncMock()
    middleware = TraceIdMiddleware()

    trace_id = "test-trace-id-123"
    scope = cast(
        "HTTPScope",
        {
            "type": "http",
            "method": "GET",
            "path": "/test",
            "headers": [(b"x-trace-id", trace_id.encode())],
            "state": {},
            "scheme": "https",
        },
    )

    receive = AsyncMock()
    send = AsyncMock()

    with patch("services.backend.src.api.middleware.start_span_with_trace_id") as mock_span:
        mock_span.return_value.__enter__ = MagicMock()
        mock_span.return_value.__exit__ = MagicMock()

        await middleware.handle(scope, receive, send, app)

        assert scope["state"]["trace_id"] == trace_id
        app.assert_called_once_with(scope, receive, send)
        mock_span.assert_called_once_with(
            span_name="GET /test",
            trace_id=trace_id,
            tracer_name="backend.middleware",
            http_method="GET",
            http_url="/test",
            http_scheme="https",
        )


async def test_trace_id_middleware_generates_trace_id() -> None:
    app = AsyncMock()
    middleware = TraceIdMiddleware()

    scope = cast(
        "HTTPScope",
        {
            "type": "http",
            "method": "POST",
            "path": "/api/test",
            "headers": [],
            "state": {},
            "scheme": "http",
        },
    )

    receive = AsyncMock()
    send = AsyncMock()

    with patch("services.backend.src.api.middleware.uuid4") as mock_uuid:
        mock_uuid.return_value = "generated-uuid"

        with patch("services.backend.src.api.middleware.start_span_with_trace_id") as mock_span:
            mock_span.return_value.__enter__ = MagicMock()
            mock_span.return_value.__exit__ = MagicMock()

            await middleware.handle(scope, receive, send, app)

            assert scope["state"]["trace_id"] == "generated-uuid"
            app.assert_called_once_with(scope, receive, send)


async def test_trace_id_middleware_non_http_request() -> None:
    app = AsyncMock()
    middleware = TraceIdMiddleware()

    scope = cast(
        "Scope",
        {
            "type": "websocket",
        },
    )

    receive = AsyncMock()
    send = AsyncMock()

    await middleware.handle(scope, receive, send, app)

    app.assert_called_once_with(scope, receive, send)
