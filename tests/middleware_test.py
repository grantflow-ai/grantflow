from typing import Any
from unittest.mock import Mock, patch

import pytest
from sanic import Unauthorized
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.middleware import authenticate_request, set_session_maker
from tests.test_utils import create_test_request


@pytest.fixture
def mock_session_maker() -> Mock:
    return Mock(spec=async_sessionmaker[Any])


def test_set_session_maker(mock_session_maker: Mock) -> None:
    request = create_test_request()
    with patch("src.middleware.get_session_maker", return_value=mock_session_maker):
        set_session_maker(request)

    assert request.ctx.session_maker == mock_session_maker


@pytest.mark.parametrize(
    "path, method",
    [
        ("/login", "GET"),
        ("/health", "GET"),
        ("/any-path", "OPTIONS"),
    ],
)
async def test_authenticate_request_public_paths(path: str, method: str) -> None:
    request = create_test_request(url=path, method=method)
    await authenticate_request(request)


@pytest.mark.parametrize(
    "admin_code, should_pass",
    [
        ("correct-code", True),
        ("wrong-code", False),
        (" ", False),
    ],
)
async def test_authenticate_request_admin_paths(
    admin_code: str, should_pass: bool, monkeypatch: pytest.MonkeyPatch
) -> None:
    request = create_test_request(url="/organizations/test", headers={"Authorization": admin_code})
    monkeypatch.setenv("ADMIN_ACCESS_CODE", "correct-code")

    if should_pass:
        await authenticate_request(request)
    else:
        with pytest.raises(Unauthorized):
            await authenticate_request(request)


@pytest.mark.parametrize(
    "auth_header, expected_uid",
    [
        ("Bearer valid-token", "test-uid"),
        ("Bearer valid-token ", "test-uid"),
    ],
)
async def test_authenticate_request_valid_jwt(auth_header: str, expected_uid: str) -> None:
    request = create_test_request(url="/some-protected-path", headers={"Authorization": auth_header})

    with patch("src.middleware.verify_jwt_token", return_value=expected_uid):
        await authenticate_request(request)

    assert request.ctx.firebase_uid == expected_uid


@pytest.mark.parametrize(
    "auth_header",
    [
        "",
        "Bearer ",
        "invalid-format",
    ],
)
async def test_authenticate_request_invalid_auth(auth_header: str) -> None:
    request = create_test_request(url="/some-protected-path", headers={"Authorization": auth_header})

    with pytest.raises(Unauthorized):
        await authenticate_request(request)


async def test_authenticate_request_jwt_verification_error() -> None:
    request = create_test_request(url="/some-protected-path", headers={"Authorization": "Bearer invalid-token"})

    with patch("src.middleware.verify_jwt_token", side_effect=Unauthorized), pytest.raises(Unauthorized):
        await authenticate_request(request)


async def test_authenticate_request_with_otp() -> None:
    request = create_test_request(url="/some-protected-path?otp=valid-otp")

    with patch("src.middleware.verify_jwt_token", return_value="test-uid"):
        await authenticate_request(request)

    assert request.ctx.firebase_uid == "test-uid"
