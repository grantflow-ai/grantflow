from unittest.mock import AsyncMock, Mock, patch

import pytest
from litestar.connection import ASGIConnection
from litestar.exceptions import NotAuthorizedException
from litestar.middleware import AuthenticationResult

from src.db.enums import UserRoleEnum
from src.db.tables import WorkspaceUser
from src.middleware import AuthMiddleware


@pytest.fixture
def auth_middleware() -> AuthMiddleware:
    mock_app = Mock()
    return AuthMiddleware(app=mock_app)


@pytest.fixture
def mock_connection() -> Mock:
    connection = Mock(spec=ASGIConnection)
    connection.url = Mock()
    connection.headers = {}
    connection.query_params = {}
    connection.path_params = {}
    connection.route_handler = Mock()
    connection.route_handler.opt = {}
    connection.method = "GET"
    return connection


@pytest.mark.parametrize(
    "path, method, expected_result",
    [
        ("/login", "GET", AuthenticationResult(user=None, auth=None)),
        ("/health", "GET", AuthenticationResult(user=None, auth=None)),
        ("/any-path", "OPTIONS", AuthenticationResult(user=None, auth=None)),
    ],
)
async def test_authenticate_request_public_paths(
    auth_middleware: AuthMiddleware,
    mock_connection: Mock,
    path: str,
    method: str,
    expected_result: AuthenticationResult,
) -> None:
    mock_connection.url.path = path
    mock_connection.method = method

    result = await auth_middleware.authenticate_request(mock_connection)

    assert result.user == expected_result.user
    assert result.auth == expected_result.auth


@pytest.mark.parametrize(
    "admin_code, should_pass",
    [
        ("correct-code", True),
        ("wrong-code", False),
        (" ", False),
    ],
)
async def test_authenticate_request_admin_paths(
    auth_middleware: AuthMiddleware,
    mock_connection: Mock,
    admin_code: str,
    should_pass: bool,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mock_connection.url.path = "/organizations/test"
    mock_connection.headers = {"Authorization": admin_code}
    monkeypatch.setenv("ADMIN_ACCESS_CODE", "correct-code")

    if should_pass:
        result = await auth_middleware.authenticate_request(mock_connection)
        assert result.user is None
        assert result.auth is None
    else:
        with pytest.raises(NotAuthorizedException):
            await auth_middleware.authenticate_request(mock_connection)


@pytest.mark.parametrize(
    "auth_header, expected_uid",
    [
        ("Bearer valid-token", "test-uid"),
        ("Bearer valid-token ", "test-uid"),
    ],
)
async def test_authenticate_request_valid_jwt(
    auth_middleware: AuthMiddleware,
    mock_connection: Mock,
    auth_header: str,
    expected_uid: str,
) -> None:
    mock_connection.url.path = "/some-protected-path"
    mock_connection.headers = {"Authorization": auth_header}

    with patch("src.middleware.verify_jwt_token", return_value=expected_uid):
        result = await auth_middleware.authenticate_request(mock_connection)

    assert result.auth == expected_uid


async def test_authenticate_request_with_otp(
    auth_middleware: AuthMiddleware,
    mock_connection: Mock,
) -> None:
    mock_connection.url.path = "/some-protected-path"
    mock_connection.query_params = {"otp": "valid-otp"}

    with patch("src.middleware.verify_jwt_token", return_value="test-uid"):
        result = await auth_middleware.authenticate_request(mock_connection)

    assert result.auth == "test-uid"


async def test_authenticate_request_with_allowed_roles(
    auth_middleware: AuthMiddleware,
    mock_connection: Mock,
) -> None:
    mock_connection.url.path = "/workspaces/123/some-path"
    mock_connection.headers = {"Authorization": "Bearer valid-token"}
    mock_connection.route_handler.opt = {"allowed_roles": [UserRoleEnum.ADMIN, UserRoleEnum.OWNER]}
    mock_connection.path_params = {"workspace_id": "123"}

    workspace_user = Mock(spec=WorkspaceUser)
    workspace_user.role = UserRoleEnum.ADMIN

    mock_session = AsyncMock()
    mock_result = AsyncMock()
    mock_result.scalar_one_or_none.return_value = workspace_user
    mock_session.execute.return_value = mock_result
    mock_session.__aenter__.return_value = mock_session

    with (
        patch("src.middleware.verify_jwt_token", return_value="test-uid"),
        patch("src.middleware.get_session_maker", return_value=lambda: mock_session),
    ):
        result = await auth_middleware.authenticate_request(mock_connection)

    assert result.user == UserRoleEnum.ADMIN
    assert result.auth == "test-uid"


async def test_authenticate_request_with_allowed_roles_no_workspace_user(
    auth_middleware: AuthMiddleware,
    mock_connection: Mock,
) -> None:
    mock_connection.url.path = "/workspaces/123/some-path"
    mock_connection.headers = {"Authorization": "Bearer valid-token"}
    mock_connection.route_handler.opt = {"allowed_roles": [UserRoleEnum.ADMIN, UserRoleEnum.OWNER]}
    mock_connection.path_params = {"workspace_id": "123"}

    mock_session = AsyncMock()
    mock_result = AsyncMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result
    mock_session.__aenter__.return_value = mock_session

    with (
        patch("src.middleware.verify_jwt_token", return_value="test-uid"),
        patch("src.middleware.get_session_maker", return_value=lambda: mock_session),
        pytest.raises(NotAuthorizedException),
    ):
        await auth_middleware.authenticate_request(mock_connection)


async def test_authenticate_request_with_allowed_roles_no_workspace_id(
    auth_middleware: AuthMiddleware,
    mock_connection: Mock,
) -> None:
    mock_connection.url.path = "/some-path-without-workspace-id"
    mock_connection.headers = {"Authorization": "Bearer valid-token"}
    mock_connection.route_handler.opt = {"allowed_roles": [UserRoleEnum.ADMIN, UserRoleEnum.OWNER]}
    mock_connection.path_params = {}

    with (
        patch("src.middleware.verify_jwt_token", return_value="test-uid"),
        pytest.raises(NotAuthorizedException),
    ):
        await auth_middleware.authenticate_request(mock_connection)


async def test_authenticate_request_jwt_verification_error(
    auth_middleware: AuthMiddleware,
    mock_connection: Mock,
) -> None:
    mock_connection.url.path = "/some-protected-path"
    mock_connection.headers = {"Authorization": "Bearer invalid-token"}

    with (
        patch("src.middleware.verify_jwt_token", side_effect=NotAuthorizedException),
        pytest.raises(NotAuthorizedException),
    ):
        await auth_middleware.authenticate_request(mock_connection)
