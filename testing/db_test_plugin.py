import logging
from collections.abc import AsyncGenerator, Generator
from socket import AF_INET, SOCK_STREAM, socket
from textwrap import dedent
from typing import Any
from unittest.mock import Mock, patch

import pytest
from anyio import run_process, sleep
from asyncpg import connect
from packages.db.src.connection import engine_ref, get_session_maker
from packages.db.src.tables import (
    Base,
)
from pytest_asyncio import is_async_test
from scripts.seed_db import seed_db
from services.backend.src.utils.ai import init_ref
from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from vertexai.generative_models import GenerativeModel

for logger_name in ["sqlalchemy.engine", "sqlalchemy.pool", "sqlalchemy.dialects", "sqlalchemy.orm"]:
    logging.getLogger(logger_name).setLevel(logging.WARNING)
    logging.getLogger(logger_name).propagate = False


def pytest_collection_modifyitems(items: list[Any]) -> None:
    pytest_asyncio_tests = (item for item in items if is_async_test(item))
    session_scope_marker = pytest.mark.asyncio(loop_scope="session")
    for async_test in pytest_asyncio_tests:
        async_test.add_marker(session_scope_marker, append=False)


@pytest.fixture
def mock_generative_model() -> Generator[Mock, Any, None]:
    init_ref.value = True
    with patch("vertexai.generative_models.GenerativeModel") as mock:
        mock_instance = Mock(spec=GenerativeModel)
        mock.return_value = mock_instance
        yield mock


@pytest.fixture(scope="session")
async def db_connection_string() -> AsyncGenerator[str, None]:
    container_name = "test_postgres_container"

    with socket(AF_INET, SOCK_STREAM) as s:
        s.bind(("", 0))
        local_port = s.getsockname()[1]

    await run_process(["docker", "rm", "-f", container_name], check=False)

    await run_process(
        [
            "docker",
            "run",
            "--name",
            container_name,
            "-e",
            "POSTGRES_USER=test_user",
            "-e",
            "POSTGRES_PASSWORD=test_password",
            "-e",
            "POSTGRES_DB=test_db",
            "-p",
            f"{local_port}:5432",
            "-d",
            "pgvector/pgvector:pg17",
        ]
    )

    await sleep(3)

    connection_string = f"postgresql://test_user:test_password@0.0.0.0:{local_port}/test_db"
    test_conn = await connect(connection_string)

    await test_conn.execute(
        dedent("""
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS vector;
        """)
    )

    await test_conn.close()

    yield connection_string.replace("postgresql://", "postgresql+asyncpg://")

    await run_process(["docker", "rm", "-f", container_name], check=False)


@pytest.fixture(scope="session")
async def async_db_engine(db_connection_string: str) -> AsyncEngine:
    engine_ref.value = create_async_engine(db_connection_string, echo=False, poolclass=NullPool)
    async with engine_ref.value.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return engine_ref.value


@pytest.fixture(scope="session")
async def async_session_maker(async_db_engine: AsyncEngine) -> async_sessionmaker[Any]:
    return get_session_maker()


@pytest.fixture(autouse=True)
async def seed_database(async_session_maker: async_sessionmaker[Any]) -> None:
    await seed_db()


@pytest.fixture(autouse=True)
async def cleanup_database(async_session_maker: async_sessionmaker[Any]) -> None:
    async with async_session_maker() as session:
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()
