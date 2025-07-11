import logging
import os
from collections.abc import AsyncGenerator
from typing import Any

import pytest
from dotenv import load_dotenv
from litestar.testing import AsyncTestClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.crawler.src.main import app


load_dotenv()

pytest_plugins = [
    "testing.base_test_plugin",
    "testing.db_test_plugin",
    "testing.gcs_test_plugin",
]

logging.basicConfig(level=logging.DEBUG)


@pytest.fixture
async def test_client(
    async_session_maker: async_sessionmaker[Any],
    gcs_emulator_host: str,
) -> AsyncGenerator[AsyncTestClient[Any]]:
    os.environ.setdefault("STORAGE_EMULATOR_HOST", gcs_emulator_host)
    app.state.session_maker = async_session_maker
    app.debug = True

    async with AsyncTestClient(app=app, raise_server_exceptions=True) as client:
        yield client
