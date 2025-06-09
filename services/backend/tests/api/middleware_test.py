from collections.abc import Generator
from typing import TYPE_CHECKING, Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from litestar.app import Litestar
from litestar.connection import ASGIConnection
from litestar.exceptions import NotAuthorizedException
from packages.db.src.enums import UserRoleEnum
from services.backend.src.api.middleware import ADMIN_PATHS, PUBLIC_PATHS, AuthMiddleware

if TYPE_CHECKING:
    from litestar.middleware import AuthenticationResult


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


async def test_authenticate_admin_path_with_valid_code(app: MagicMock, mock_get_env: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)

    for path in ADMIN_PATHS:
        connection = MockASGIConnection(url_path=f"/{path}", headers={"Authorization": "test-admin-code"}, app=app)

        result: AuthenticationResult = await middleware.authenticate_request(connection)

        assert result.user is None
        assert result.auth is None


async def test_authenticate_admin_path_with_invalid_code(app: MagicMock, mock_get_env: MagicMock) -> None:
    middleware = AuthMiddleware(app=app)

    for path in ADMIN_PATHS:
        connection = MockASGIConnection(url_path=f"/{path}", headers={"Authorization": "invalid-code"}, app=app)

        with pytest.raises(NotAuthorizedException):
            await middleware.authenticate_request(connection)


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

    workspace_user: MagicMock = MagicMock()
    workspace_user.role = UserRoleEnum.ADMIN

    session_result = MagicMock()
    session_result.scalar_one_or_none.return_value = workspace_user

    session = AsyncMock()
    session.execute.return_value = session_result

    session_ctx = AsyncMock()
    session_ctx.__aenter__.return_value = session

    session_maker = MagicMock()
    session_maker.return_value = session_ctx
    app.state.session_maker = session_maker

    connection = MockASGIConnection(
        url_path="/workspaces/test-workspace-id/something",
        headers={"Authorization": "Bearer test-token"},
        path_params={"workspace_id": "test-workspace-id"},
        route_handler_opt={"allowed_roles": [UserRoleEnum.ADMIN, UserRoleEnum.OWNER]},
        app=app,
    )

    result: AuthenticationResult = await middleware.authenticate_request(connection)

    assert result.user == UserRoleEnum.ADMIN
    assert result.auth == "test-uid"
    mock_verify_jwt_token.assert_called_once_with("test-token")
    session.execute.assert_called_once()


async def test_authenticate_with_allowed_roles_no_workspace_id(
    app: MagicMock, mock_verify_jwt_token: MagicMock
) -> None:
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
        url_path="/workspaces/test-workspace-id/something",
        headers={"Authorization": "Bearer invalid-token"},
        path_params={"workspace_id": "test-workspace-id"},
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
        url_path="/workspaces/test-workspace-id/something",
        headers={"Authorization": "Bearer test-token"},
        path_params={"workspace_id": "test-workspace-id"},
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
