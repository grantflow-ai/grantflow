import contextlib
import logging
import os
from collections.abc import AsyncGenerator
from textwrap import dedent
from typing import Any
from urllib.parse import urlparse, urlunparse

import pytest
from asyncpg import connect
from packages.db.src.connection import engine_ref, get_session_maker
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import (
    Base,
    GrantApplication,
    GrantApplicationSource,
    GrantingInstitution,
    GrantingInstitutionSource,
    GrantTemplate,
    GrantTemplateSource,
    Organization,
    OrganizationUser,
    Project,
    RagFile,
    RagUrl,
)
from pytest_asyncio import is_async_test
from scripts.seed_db import seed_db
from sqlalchemy import NullPool, select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine

from testing.factories import (
    GrantApplicationFactory,
    GrantApplicationSourceFactory,
    GrantingInstitutionFactory,
    GrantingInstitutionSourceFactory,
    GrantTemplateFactory,
    GrantTemplateSourceFactory,
    OrganizationFactory,
    OrganizationUserFactory,
    ProjectFactory,
    RagFileFactory,
    RagUrlFactory,
)

for logger_name in ["sqlalchemy.engine", "sqlalchemy.pool", "sqlalchemy.dialects", "sqlalchemy.orm"]:
    logging.getLogger(logger_name).setLevel(logging.WARNING)
    logging.getLogger(logger_name).propagate = False


@pytest.fixture(scope="session")
def worker_id(request: Any) -> str:
    """Get the xdist worker id, or 'master' if not running under xdist."""
    workerinput = getattr(request.config, "workerinput", {})
    return workerinput.get("workerid", "master") if workerinput else "master"


def pytest_collection_modifyitems(items: list[Any]) -> None:
    pytest_asyncio_tests = (item for item in items if is_async_test(item))
    session_scope_marker = pytest.mark.asyncio(loop_scope="session")
    for async_test in pytest_asyncio_tests:
        async_test.add_marker(session_scope_marker, append=False)


@pytest.fixture(scope="session")
async def db_connection_string(worker_id: str) -> AsyncGenerator[str]:
    """Create a unique test database for each worker process."""

    base_connection_string = (
        os.getenv("DATABASE_URL") or f"postgresql://{os.getenv('USER', 'postgres')}@localhost:5432/postgres"
    )

    process_id = os.getpid()
    test_db_name = f"grantflow_test_{worker_id}_{process_id}"

    parsed = urlparse(base_connection_string)
    admin_connection_string = urlunparse(parsed._replace(path="/postgres"))

    try:
        admin_conn = await connect(admin_connection_string)

        with contextlib.suppress(Exception):
            await admin_conn.execute(f'DROP DATABASE IF EXISTS "{test_db_name}"')

        await admin_conn.execute(f'CREATE DATABASE "{test_db_name}"')
        await admin_conn.close()

        test_connection_string = urlunparse(parsed._replace(path=f"/{test_db_name}"))

        test_conn = await connect(test_connection_string)

        await test_conn.execute(
            dedent("""
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            CREATE EXTENSION IF NOT EXISTS vector;
            """)
        )

        await test_conn.close()

        yield test_connection_string.replace("postgresql://", "postgresql+asyncpg://")

    finally:
        try:
            admin_conn = await connect(admin_connection_string)

            template_db_name = f"{test_db_name}_template"

            for db_name in [test_db_name, template_db_name]:
                await admin_conn.execute(f"""
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = '{db_name}' AND pid <> pg_backend_pid()
                """)
                await admin_conn.execute(f'DROP DATABASE IF EXISTS "{db_name}"')

            await admin_conn.close()
        except Exception:
            pass


@pytest.fixture(scope="session")
async def async_db_engine(db_connection_string: str) -> AsyncEngine:
    engine_ref.value = create_async_engine(
        db_connection_string,
        echo=False,
        poolclass=NullPool,
        pool_pre_ping=True,
    )
    async with engine_ref.value.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return engine_ref.value


@pytest.fixture(scope="session")
async def async_session_maker(async_db_engine: AsyncEngine) -> async_sessionmaker[Any]:
    return get_session_maker()


@pytest.fixture(scope="session")
async def database_snapshot(db_connection_string: str, async_session_maker: async_sessionmaker[Any]) -> str:
    """Create a database snapshot after seeding for fast test isolation."""

    await seed_db()

    f"test_snapshot_{os.getpid()}"

    parsed = urlparse(db_connection_string.replace("postgresql+asyncpg://", "postgresql://"))
    admin_connection_string = urlunparse(parsed._replace(path="/postgres"))

    admin_conn = await connect(admin_connection_string)

    try:
        db_name = parsed.path.lstrip("/")
        template_db_name = f"{db_name}_template"

        await admin_conn.execute(f"""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '{db_name}' AND pid <> pg_backend_pid()
        """)

        with contextlib.suppress(Exception):
            await admin_conn.execute(f'DROP DATABASE IF EXISTS "{template_db_name}"')

        await admin_conn.execute(f'CREATE DATABASE "{template_db_name}" WITH TEMPLATE "{db_name}"')

        return template_db_name

    finally:
        await admin_conn.close()


@pytest.fixture(autouse=True)
async def restore_database_snapshot(
    database_snapshot: str, db_connection_string: str, request: pytest.FixtureRequest
) -> AsyncGenerator[None]:
    """Restore database to clean snapshot state before each test."""

    if "no_cleanup" in request.keywords:
        yield
        return

    await _restore_from_snapshot(database_snapshot, db_connection_string)

    yield


async def _restore_from_snapshot(template_db_name: str, db_connection_string: str) -> None:
    """Restore database from template snapshot."""
    parsed = urlparse(db_connection_string.replace("postgresql+asyncpg://", "postgresql://"))
    admin_connection_string = urlunparse(parsed._replace(path="/postgres"))
    db_name = parsed.path.lstrip("/")

    admin_conn = await connect(admin_connection_string)

    try:
        await admin_conn.execute(f"""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '{db_name}' AND pid <> pg_backend_pid()
        """)

        await admin_conn.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
        await admin_conn.execute(f'CREATE DATABASE "{db_name}" WITH TEMPLATE "{template_db_name}"')

    finally:
        await admin_conn.close()


@pytest.fixture
async def organization(async_session_maker: async_sessionmaker[Any]) -> Organization:
    organization_data = OrganizationFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(organization_data)
        await session.commit()
    return organization_data


@pytest.fixture
async def project(async_session_maker: async_sessionmaker[Any], organization: Organization) -> Project:
    project_data = ProjectFactory.build(organization_id=organization.id)
    async with async_session_maker() as session, session.begin():
        session.add(project_data)
        await session.commit()
    return project_data


@pytest.fixture
async def project_user(async_session_maker: async_sessionmaker[Any], organization: Organization) -> OrganizationUser:
    user_data = OrganizationUserFactory.build(organization_id=organization.id)
    async with async_session_maker() as session, session.begin():
        session.add(user_data)
        await session.commit()
    return user_data


@pytest.fixture
async def project_member_user(
    async_session_maker: async_sessionmaker[Any], firebase_uid: str, organization: Organization
) -> OrganizationUser:
    organization_user = OrganizationUser(
        organization_id=organization.id,
        firebase_uid=firebase_uid,
        role=UserRoleEnum.COLLABORATOR,
        has_all_projects_access=True,
    )
    async with async_session_maker() as session, session.begin():
        session.add(organization_user)
        await session.commit()
    return organization_user


@pytest.fixture
async def project_admin_user(
    async_session_maker: async_sessionmaker[Any], firebase_uid: str, organization: Organization
) -> OrganizationUser:
    organization_user = OrganizationUser(
        organization_id=organization.id,
        firebase_uid=firebase_uid,
        role=UserRoleEnum.ADMIN,
        has_all_projects_access=True,
    )
    async with async_session_maker() as session, session.begin():
        session.add(organization_user)
        await session.commit()
    return organization_user


@pytest.fixture
async def project_owner_user(
    async_session_maker: async_sessionmaker[Any], firebase_uid: str, organization: Organization
) -> OrganizationUser:
    organization_user = OrganizationUser(
        organization_id=organization.id,
        firebase_uid=firebase_uid,
        role=UserRoleEnum.OWNER,
        has_all_projects_access=True,
    )
    async with async_session_maker() as session, session.begin():
        session.add(organization_user)
        await session.commit()
    return organization_user


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
async def granting_institution(async_session_maker: async_sessionmaker[Any]) -> GrantingInstitution:
    org_data = GrantingInstitutionFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(org_data)
        await session.commit()
    return org_data


@pytest.fixture
async def granting_institution_file(
    async_session_maker: async_sessionmaker[Any], granting_institution: GrantingInstitution, rag_file: RagFile
) -> GrantingInstitutionSource:
    data = GrantingInstitutionSourceFactory.build(
        granting_institution_id=granting_institution.id, rag_source_id=rag_file.id
    )
    async with async_session_maker() as session, session.begin():
        session.add(data)
        await session.commit()
    return data


@pytest.fixture
async def granting_institution_url(
    async_session_maker: async_sessionmaker[Any], granting_institution: GrantingInstitution, rag_url: RagUrl
) -> GrantingInstitutionSource:
    data = GrantingInstitutionSourceFactory.build(
        granting_institution_id=granting_institution.id, rag_source_id=rag_url.id
    )
    async with async_session_maker() as session, session.begin():
        session.add(data)
        await session.commit()
    return data


@pytest.fixture
async def grant_application(async_session_maker: async_sessionmaker[Any], project: Project) -> GrantApplication:
    application_data = GrantApplicationFactory.build(
        project_id=project.id,
        deleted_at=None,
    )
    async with async_session_maker() as session, session.begin():
        session.add(application_data)
        await session.commit()
    return application_data


@pytest.fixture
async def grant_application_file(
    async_session_maker: async_sessionmaker[Any], grant_application: GrantApplication, rag_file: RagFile
) -> GrantApplicationSource:
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
) -> GrantApplicationSource:
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
        result = await session.execute(select(GrantingInstitution.id).where(GrantingInstitution.abbreviation == "NIH"))
        granting_institution_id = result.scalar_one()

        grant_template_data = GrantTemplateFactory.build(
            grant_application_id=grant_application.id,
            granting_institution_id=granting_institution_id,
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
) -> GrantTemplateSource:
    data = GrantTemplateSourceFactory.build(grant_template_id=grant_template.id, rag_source_id=rag_file.id)
    async with async_session_maker() as session, session.begin():
        session.add(data)
        await session.commit()
    return data


@pytest.fixture
async def grant_template_url(
    async_session_maker: async_sessionmaker[Any], grant_template: GrantTemplate, rag_url: RagUrl
) -> GrantTemplateSource:
    data = GrantTemplateSourceFactory.build(grant_template_id=grant_template.id, rag_source_id=rag_url.id)
    async with async_session_maker() as session, session.begin():
        session.add(data)
        await session.commit()
    return data
