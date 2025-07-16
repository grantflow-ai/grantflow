from collections.abc import AsyncGenerator, Generator
from typing import Any
from unittest.mock import Mock, patch

import pytest
from litestar import Litestar
from litestar.testing import AsyncTestClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.utils.firebase import firebase_app_ref
from services.backend.src.utils.jwt import create_jwt

pytest_plugins = ["testing.base_test_plugin", "testing.db_test_plugin"]

TestingClientType = AsyncTestClient[Litestar]


@pytest.fixture
def otp_code(firebase_uid: str) -> str:
    return create_jwt(firebase_uid)


@pytest.fixture
def mock_admin_code(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_ACCESS_CODE", "test-admin-code")


@pytest.fixture
def firebase_uid() -> str:
    return "a" * 128


@pytest.fixture(scope="session")
async def test_client(
    async_session_maker: async_sessionmaker[Any],
) -> AsyncGenerator[TestingClientType]:
    firebase_uid = "a" * 128

    firebase_app_ref.value = Mock()

    # JWT_SECRET is already set to "abc123" in base_test_plugin.py ~keep

    
    async def mock_get_users(uids: list[str]) -> dict[str, dict[str, Any]]:
        return {
            uid: {
                "uid": uid,
                "email": f"test-{uid}@example.com",
                "displayName": f"Test User {uid}",
                "photoURL": f"https://example.com/photo-{uid}.jpg",
                "phoneNumber": None,
                "emailVerified": True,
                "disabled": False,
                "customClaims": {},
                "tenantId": None,
                "providerData": [],
            }
            for uid in uids
        }

    
    class MockResult:
        def __init__(self, users: list[Any]) -> None:
            self.users = users

    class MockUser:
        def __init__(self, uid: str) -> None:
            self.uid = uid
            self.email = f"test-{uid}@example.com"
            self.display_name = f"Test User {uid}"
            self.photo_url = f"https://example.com/photo-{uid}.jpg"
            self.phone_number = None
            self.email_verified = True
            self.disabled = False
            self.custom_claims = {}
            self.tenant_id = None
            self.provider_data = []

    async def mock_firebase_get_users(identifiers: list[Any], app: Any = None) -> MockResult:
        users = [MockUser(identifier.uid) for identifier in identifiers]
        return MockResult(users)

    with (
        patch("services.backend.src.main.before_server_start"),
        patch("firebase_admin.auth.verify_id_token", return_value={"uid": firebase_uid}),
        patch("services.backend.src.utils.jwt.verify_jwt_token", return_value=firebase_uid),
        patch("services.backend.src.api.middleware.verify_jwt_token", return_value=firebase_uid),
        patch(
            "services.backend.src.utils.firebase.get_firebase_app",
            return_value=firebase_app_ref.value,
        ),
        patch("services.backend.src.utils.firebase.as_async_callable", return_value=mock_firebase_get_users),
        patch("services.backend.src.utils.firebase.UidIdentifier", side_effect=lambda uid: Mock(uid=uid)),
        patch("firebase_admin.initialize_app", return_value=Mock()),
    ):
        from services.backend.src.main import app

        # this is usually happening in the `before_server_start` hook, which we are patching above ~keep
        app.state.session_maker = async_session_maker
        app.debug = True

        async with AsyncTestClient(app=app, raise_server_exceptions=True) as client:
            yield client


@pytest.fixture
def signal_dispatch_mock() -> Generator[Mock]:
    with patch("litestar.events.emitter.SimpleEventEmitter.emit") as mock:
        yield mock
