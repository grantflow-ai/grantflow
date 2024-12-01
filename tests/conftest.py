import os
from collections.abc import AsyncGenerator
from logging import Logger, getLogger
from textwrap import dedent
from typing import Any

import pytest
from anyio import Path
from asyncpg import connect
from dotenv import load_dotenv
from pytest_asyncio import is_async_test
from sanic_testing.testing import SanicASGITestClient
from sqlalchemy.ext.asyncio import async_sessionmaker  # type: ignore[attr-defined]
from testcontainers.postgres import PostgresContainer

from src.db.connection import engine_ref, get_session_maker
from src.db.tables import (
    ApplicationFile,
    FundingOrganization,
    GrantApplication,
    GrantCfp,
    ResearchAim,
    Workspace,
)
from tests.factories import (
    ApplicationFileFactory,
    FundingOrganizationFactory,
    GrantApplicationFactory,
    GrantCfpFactory,
    ResearchAimFactory,
    WorkspaceFactory,
)

load_dotenv()


def pytest_collection_modifyitems(items: list[Any]) -> None:
    pytest_asyncio_tests = (item for item in items if is_async_test(item))
    session_scope_marker = pytest.mark.asyncio(loop_scope="session")
    for async_test in pytest_asyncio_tests:
        async_test.add_marker(session_scope_marker, append=False)


INPUT_TEXT = """
# BREAKING: Scientists Discover Talking Plant in Amazon Rainforest

In a startling development, researchers from the University of Brazil have reportedly discovered a species of plant
capable of human speech. The plant, found deep in the Amazon rainforest, was observed engaging in conversations with
local wildlife.Dr. Maria Silva, lead botanist on the expedition, claims the plant asked about the weather and expressed
concerns about deforestation. Experts worldwide are scrambling to verify this unprecedented finding, which could
revolutionize our understanding of plant intelligence.
"""


def pytest_logger_config(logger_config: Any) -> None:
    logger_config.add_loggers(["e2e"], stdout_level="info")
    logger_config.set_log_option_default("e2e")


@pytest.fixture(scope="session")
def logger() -> Logger:
    return getLogger("e2e")


@pytest.fixture(scope="session")
async def db_connection_string() -> AsyncGenerator[str, None]:
    container = PostgresContainer("pgvector/pgvector:pg17", driver=None)
    container.start()
    connection_string = container.get_connection_url()
    connection = await connect(connection_string)
    await connection.execute(
        dedent("""
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS vector;
    """)
    )
    async for file in (Path(__file__).parent.parent / "migrations").glob("*.sql"):
        sql = await file.read_text()
        await connection.execute(sql)
    await connection.close()
    yield connection_string
    container.stop()


@pytest.fixture(scope="session")
async def async_session_maker(db_connection_string: str) -> async_sessionmaker[Any]:
    os.environ.update(
        {"DATABASE_CONNECTION_STRING": db_connection_string.replace("postgresql://", "postgresql+asyncpg://")}
    )
    engine_ref.value = None
    return get_session_maker()


@pytest.fixture
async def workspace(async_session_maker: async_sessionmaker[Any]) -> Workspace:
    workspace_data = WorkspaceFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(workspace_data)
        await session.commit()
    return workspace_data


@pytest.fixture
async def org(async_session_maker: async_sessionmaker[Any]) -> FundingOrganization:
    org_data = FundingOrganizationFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(org_data)
        await session.commit()
    return org_data


@pytest.fixture
async def cfp(async_session_maker: async_sessionmaker[Any], org: FundingOrganization) -> GrantCfp:
    cfp_data = GrantCfpFactory.build(funding_organization_id=org.id)
    async with async_session_maker() as session, session.begin():
        session.add(cfp_data)
        await session.commit()
    return cfp_data


@pytest.fixture
async def application(
    async_session_maker: async_sessionmaker[Any], workspace: Workspace, cfp: GrantCfp
) -> GrantApplication:
    application_data = GrantApplicationFactory.build(workspace_id=workspace.id, cfp_id=cfp.id)
    async with async_session_maker() as session, session.begin():
        session.add(application_data)
        await session.commit()
    return application_data


@pytest.fixture
async def application_file(
    async_session_maker: async_sessionmaker[Any], application: GrantApplication
) -> ApplicationFile:
    file_data = ApplicationFileFactory.build(application_id=application.id)
    async with async_session_maker() as session, session.begin():
        session.add(file_data)
        await session.commit()
    return file_data


@pytest.fixture
async def research_aim(async_session_maker: async_sessionmaker[Any], application: GrantApplication) -> ResearchAim:
    aim_data = ResearchAimFactory.build(application_id=application.id)
    async with async_session_maker() as session, session.begin():
        session.add(aim_data)
        await session.commit()
    return aim_data


@pytest.fixture(scope="session")
def asgi_client() -> SanicASGITestClient:
    from src.main import app

    return app.asgi_client
