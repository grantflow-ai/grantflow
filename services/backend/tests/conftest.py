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

    with (
        patch("services.backend.src.main.before_server_start"),
        patch(
            "firebase_admin.auth.verify_id_token", return_value={"uid": firebase_uid}
        ),
        patch("jwt.decode", return_value={"sub": firebase_uid}),
        patch(
            "services.backend.src.utils.firebase.get_firebase_app",
            return_value=firebase_app_ref.value,
        ),
        patch("firebase_admin.initialize_app", return_value=Mock()),
    ):
        from services.backend.src.main import app

        # this is usually happening in the `before_server_start` hook, which we are patching above ~keep
        app.state.session_maker = async_session_maker

        async with AsyncTestClient(app=app) as client:
            yield client


@pytest.fixture
def signal_dispatch_mock() -> Generator[Mock]:
    with patch("litestar.events.emitter.SimpleEventEmitter.emit") as mock:
        yield mock
