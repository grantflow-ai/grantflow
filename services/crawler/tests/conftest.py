import logging
import os
from collections.abc import AsyncGenerator
from typing import Any

import pytest
from litestar.testing import AsyncTestClient
from services.crawler.src.main import app
from sqlalchemy.ext.asyncio import async_sessionmaker

pytest_plugins = ["testing.base_test_plugin", "testing.db_test_plugin", "testing.gcs_test_plugin"]

# Configure logging for the test session
logging.basicConfig(level=logging.DEBUG)


@pytest.fixture
async def test_client(
    async_session_maker: async_sessionmaker[Any],
    gcs_emulator_host: str,
) -> AsyncGenerator[AsyncTestClient[Any], None]:
    os.environ.setdefault("STORAGE_EMULATOR_HOST", gcs_emulator_host)
    app.state.session_maker = async_session_maker
    # Enable debug mode for the app
    app.debug = True

    async with AsyncTestClient(app=app, raise_server_exceptions=True) as client:
        yield client
