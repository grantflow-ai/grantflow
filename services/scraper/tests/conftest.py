import logging
import os
from collections.abc import AsyncGenerator, Generator
from typing import Any

import pytest
from dotenv import load_dotenv
from litestar.testing import AsyncTestClient
from services.scraper.src.main import app

load_dotenv()

pytest_plugins = [
    "testing.base_test_plugin",
]

logging.basicConfig(level=logging.DEBUG)


def pytest_sessionstart(session: pytest.Session) -> None:
    if os.getenv("E2E_TESTS") == "1":
        from services.scraper.tests.setup_emulator import ensure_firestore_emulator

        ensure_firestore_emulator()

        os.environ.update(
            {
                "ENVIRONMENT": "test",
                "DISCORD_WEBHOOK_URL": "",
            }
        )


@pytest.fixture
async def test_client() -> AsyncGenerator[AsyncTestClient[Any]]:
    os.environ.setdefault("FIRESTORE_EMULATOR_HOST", "localhost:8080")
    os.environ.setdefault("GCP_PROJECT_ID", "grantflow-test")
    os.environ.setdefault("ENVIRONMENT", "test")

    app.debug = True

    async with AsyncTestClient(app=app, raise_server_exceptions=True) as client:
        yield client


@pytest.fixture
def clean_firestore_environment() -> Generator[None]:
    original_project = os.environ.get("GCP_PROJECT_ID")

    os.environ.update(
        {
            "FIRESTORE_EMULATOR_HOST": "localhost:8080",
            "GCP_PROJECT_ID": "grantflow-test-isolated",
            "ENVIRONMENT": "test",
        }
    )

    yield

    if original_project:
        os.environ["GCP_PROJECT_ID"] = original_project
    else:
        os.environ.pop("GCP_PROJECT_ID", None)
