import logging
from collections.abc import AsyncGenerator
from socket import AF_INET, SOCK_STREAM, socket
from textwrap import dedent
from typing import Any

import pytest
from anyio import run_process, sleep
from asyncpg import connect
from packages.db.src.connection import engine_ref, get_session_maker
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import (
    Base,
    FundingOrganization,
    FundingOrganizationRagSource,
    GrantApplication,
    GrantApplicationRagSource,
    GrantTemplate,
    GrantTemplateRagSource,
    RagFile,
    RagUrl,
    Workspace,
    WorkspaceUser,
)
from pytest_asyncio import is_async_test
from scripts.seed_db import seed_db
from sqlalchemy import NullPool, select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine

from testing.factories import (
    FundingOrganizationFactory,
    FundingOrganizationSourceFactory,
    GrantApplicationFactory,
    GrantApplicationSourceFactory,
    GrantTemplateFactory,
    GrantTemplateSourceFactory,
    RagFileFactory,
    RagUrlFactory,
    WorkspaceFactory,
    WorkspaceUserFactory,
)

for logger_name in ["sqlalchemy.engine", "sqlalchemy.pool", "sqlalchemy.dialects", "sqlalchemy.orm"]:
    logging.getLogger(logger_name).setLevel(logging.WARNING)
    logging.getLogger(logger_name).propagate = False


def pytest_collection_modifyitems(items: list[Any]) -> None:
    pytest_asyncio_tests = (item for item in items if is_async_test(item))
    session_scope_marker = pytest.mark.asyncio(loop_scope="session")
    for async_test in pytest_asyncio_tests:
        async_test.add_marker(session_scope_marker, append=False)


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


@pytest.fixture
async def workspace(async_session_maker: async_sessionmaker[Any]) -> Workspace:
    workspace_data = WorkspaceFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(workspace_data)
        await session.commit()
    return workspace_data


@pytest.fixture
async def workspace_user(async_session_maker: async_sessionmaker[Any], workspace: Workspace) -> WorkspaceUser:
    user_data = WorkspaceUserFactory.build(workspace_id=workspace.id)
    async with async_session_maker() as session, session.begin():
        session.add(user_data)
        await session.commit()
    return user_data


@pytest.fixture
async def workspace_member_user(
    async_session_maker: async_sessionmaker[Any], firebase_uid: str, workspace: Workspace
) -> None:
    async with async_session_maker() as session, session.begin():
        workspace_user = WorkspaceUser(workspace_id=workspace.id, firebase_uid=firebase_uid, role=UserRoleEnum.MEMBER)
        session.add(workspace_user)
        await session.commit()


@pytest.fixture
async def workspace_admin_user(
    async_session_maker: async_sessionmaker[Any], firebase_uid: str, workspace: Workspace
) -> None:
    async with async_session_maker() as session, session.begin():
        workspace_user = WorkspaceUser(workspace_id=workspace.id, firebase_uid=firebase_uid, role=UserRoleEnum.ADMIN)
        session.add(workspace_user)
        await session.commit()


@pytest.fixture
async def workspace_owner_user(
    async_session_maker: async_sessionmaker[Any], firebase_uid: str, workspace: Workspace
) -> None:
    async with async_session_maker() as session, session.begin():
        workspace_user = WorkspaceUser(workspace_id=workspace.id, firebase_uid=firebase_uid, role=UserRoleEnum.OWNER)
        session.add(workspace_user)
        await session.commit()


@pytest.fixture
async def rag_file(async_session_maker: async_sessionmaker[Any]) -> RagFile:
    file_data = RagFileFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(file_data)
        await session.commit()
    return file_data


@pytest.fixture
async def rag_url(async_session_maker: async_sessionmaker[Any]) -> RagUrl:
    url_data = RagUrlFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(url_data)
        await session.commit()
    return url_data


@pytest.fixture
async def funding_organization(async_session_maker: async_sessionmaker[Any]) -> FundingOrganization:
    org_data = FundingOrganizationFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(org_data)
        await session.commit()
    return org_data


@pytest.fixture
async def funding_organization_file(
    async_session_maker: async_sessionmaker[Any], funding_organization: FundingOrganization, rag_file: RagFile
) -> FundingOrganizationRagSource:
    data = FundingOrganizationSourceFactory.build(
        funding_organization_id=funding_organization.id, rag_source_id=rag_file.id
    )
    async with async_session_maker() as session, session.begin():
        session.add(data)
        await session.commit()
    return data


@pytest.fixture
async def funding_organization_url(
    async_session_maker: async_sessionmaker[Any], funding_organization: FundingOrganization, rag_url: RagUrl
) -> FundingOrganizationRagSource:
    data = FundingOrganizationSourceFactory.build(
        funding_organization_id=funding_organization.id, rag_source_id=rag_url.id
    )
    async with async_session_maker() as session, session.begin():
        session.add(data)
        await session.commit()
    return data


@pytest.fixture
async def grant_application(async_session_maker: async_sessionmaker[Any], workspace: Workspace) -> GrantApplication:
    application_data = GrantApplicationFactory.build(
        workspace_id=workspace.id,
    )
    async with async_session_maker() as session, session.begin():
        session.add(application_data)
        await session.commit()
    return application_data


@pytest.fixture
async def grant_application_file(
    async_session_maker: async_sessionmaker[Any], grant_application: GrantApplication, rag_file: RagFile
) -> GrantApplicationRagSource:
    file_data = GrantApplicationSourceFactory.build(
        grant_application_id=grant_application.id, rag_source_id=rag_file.id
    )
    async with async_session_maker() as session, session.begin():
        session.add(file_data)
        await session.commit()
    return file_data


@pytest.fixture
async def grant_application_url(
    async_session_maker: async_sessionmaker[Any], grant_application: GrantApplication, rag_url: RagUrl
) -> GrantApplicationRagSource:
    file_data = GrantApplicationSourceFactory.build(grant_application_id=grant_application.id, rag_source_id=rag_url.id)
    async with async_session_maker() as session, session.begin():
        session.add(file_data)
        await session.commit()
    return file_data


@pytest.fixture
async def grant_template(
    async_session_maker: async_sessionmaker[Any], grant_application: GrantApplication
) -> GrantTemplate:
    async with async_session_maker() as session:
        result = await session.execute(select(FundingOrganization.id).where(FundingOrganization.abbreviation == "NIH"))
        funding_organization_id = result.scalar_one()

    grant_template_data = GrantTemplateFactory.build(
        grant_application_id=grant_application.id,
        funding_organization_id=funding_organization_id,
        grant_sections=[
            {
                "title": "Executive Summary",
                "description": "A brief overview of the research proposal",
                "topics": [
                    {"type": "BACKGROUND_CONTEXT", "weight": 0.8},
                    {"type": "IMPACT", "weight": 0.7},
                    {"type": "RATIONALE", "weight": 0.5},
                ],
                "search_queries": [
                    "current state of inner ear imaging",
                    "limitations of current imaging techniques",
                    "clinical needs in inner ear diagnosis",
                    "rationale for improved imaging",
                    "potential impact on patient care",
                ],
                "max_words": 400,
                "type": "section",
                "is_research_plan": False,
                "order": 1,
            },
            {
                "title": "Research Significance",
                "description": "The importance and potential impact of the research",
                "topics": [
                    {"type": "IMPACT", "weight": 0.9},
                    {"type": "RATIONALE", "weight": 0.8},
                    {"type": "BACKGROUND_CONTEXT", "weight": 0.5},
                ],
                "search_queries": [
                    "importance of inner ear imaging",
                    "clinical significance of improved resolution",
                    "impact of inner ear pathology diagnosis",
                    "current unmet needs in diagnosis and treatment",
                    "clinical justification",
                ],
                "max_words": 600,
                "type": "section",
                "is_research_plan": False,
                "order": 2,
            },
            {
                "title": "Research Innovation",
                "description": "Novel aspects and innovative approaches of the research",
                "topics": [
                    {"type": "NOVELTY_AND_INNOVATION", "weight": 1.0},
                    {"type": "RESEARCH_FEASIBILITY", "weight": 0.7},
                    {"type": "BACKGROUND_CONTEXT", "weight": 0.4},
                ],
                "search_queries": [
                    "novel imaging approaches for inner ear",
                    "innovative aspects of proposed technology",
                    "feasibility of achieving resolution increase",
                    "comparison to existing methods",
                    "technological advancements in imaging",
                ],
                "max_words": 600,
                "type": "section",
                "is_research_plan": False,
                "order": 3,
            },
            {
                "title": "Research Plan",
                "description": "Detailed methodology and implementation plan",
                "topics": [
                    {"type": "MILESTONES_AND_TIMELINE", "weight": 0.9},
                    {"type": "RESEARCH_FEASIBILITY", "weight": 0.8},
                    {"type": "RISKS_AND_MITIGATIONS", "weight": 0.6},
                ],
                "search_queries": [
                    "timeline for technology development",
                    "plan for clinical translation",
                    "steps for non-invasive application",
                    "limitations of technology",
                    "alternative paths for clinical use",
                    "risk assessment in imaging technology",
                ],
                "max_words": 1000,
                "type": "section",
                "is_research_plan": True,
                "order": 4,
            },
            {
                "title": "Expected Outcomes",
                "description": "Anticipated results and impact of the research",
                "topics": [{"type": "IMPACT", "weight": 1.0}, {"type": "RATIONALE", "weight": 0.7}],
                "search_queries": [
                    "impact on clinical decision making",
                    "improved diagnosis of inner ear pathologies",
                    "clinical settings for proposed use",
                    "treatments enabled by improved diagnosis",
                    "benefits of increased imaging resolution",
                ],
                "max_words": 500,
                "type": "section",
                "is_research_plan": False,
                "order": 5,
            },
        ],
    )
    async with async_session_maker() as session, session.begin():
        session.add(grant_template_data)
        await session.commit()

    return grant_template_data


@pytest.fixture
async def grant_template_file(
    async_session_maker: async_sessionmaker[Any], grant_template: GrantTemplate, rag_file: RagFile
) -> GrantTemplateRagSource:
    data = GrantTemplateSourceFactory.build(grant_template_id=grant_template.id, rag_source_id=rag_file.id)
    async with async_session_maker() as session, session.begin():
        session.add(data)
        await session.commit()
    return data


@pytest.fixture
async def grant_template_url(
    async_session_maker: async_sessionmaker[Any], grant_template: GrantTemplate, rag_url: RagUrl
) -> GrantTemplateRagSource:
    data = GrantTemplateSourceFactory.build(grant_template_id=grant_template.id, rag_source_id=rag_url.id)
    async with async_session_maker() as session, session.begin():
        session.add(data)
        await session.commit()
    return data
