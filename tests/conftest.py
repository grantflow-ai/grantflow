import os
from collections.abc import AsyncGenerator, Generator
from logging import Logger, getLogger
from pathlib import Path
from textwrap import dedent
from typing import Any, Final
from unittest.mock import AsyncMock, Mock, patch

import pytest
from anyio import Path as AsyncPath
from asyncpg import connect
from dotenv import load_dotenv
from pytest_asyncio import is_async_test
from pytest_mock import MockerFixture
from sanic_testing.testing import SanicASGITestClient
from sqlalchemy.ext.asyncio import async_sessionmaker
from structlog import configure
from structlog.testing import LogCapture
from testcontainers.postgres import PostgresContainer
from vertexai.generative_models import GenerativeModel
from vertexai.language_models import TextEmbedding

from src.db.base import Base
from src.db.connection import engine_ref, get_session_maker
from src.db.tables import (
    File,
    FundingOrganization,
    GenerationResult,
    GrantApplication,
    GrantApplicationFile,
    GrantSection,
    GrantTemplate,
    OrganizationFile,
    ResearchAim,
    ResearchTask,
    SectionTopic,
    TextVector,
    Workspace,
    WorkspaceUser,
)
from src.utils.ai import embeddings_model, init_ref
from tests.factories import (
    FileFactory,
    FundingOrganizationFactory,
    GenerationResultFactory,
    GrantApplicationFactory,
    GrantApplicationFileFactory,
    GrantSectionFactory,
    GrantTemplateFactory,
    OrganizationFileFactory,
    ResearchAimFactory,
    ResearchTaskFactory,
    SectionAspectsFactory,
    TextVectorFactory,
    WorkspaceFactory,
    WorkspaceUserFactory,
)

load_dotenv()


def _file_path_generator(folder: Path) -> Generator[Path, Any, Any]:
    for path in folder.glob("*"):
        if path.is_dir():
            yield from _file_path_generator(path)
        yield path


SOURCES_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "sources"
RESULTS_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "results"
TEST_DATA_SOURCES: Generator[Path, Any, Any] = _file_path_generator(SOURCES_FOLDER)
TEST_DATA_RESULTS: Generator[Path, Any, Any] = _file_path_generator(RESULTS_FOLDER)


def pytest_collection_modifyitems(items: list[Any]) -> None:
    """Ensure that all async tests are marked with the asyncio marker.

    Args:
        items: List of test

    Returns:
        None
    """
    pytest_asyncio_tests = (item for item in items if is_async_test(item))
    session_scope_marker = pytest.mark.asyncio(loop_scope="session")
    for async_test in pytest_asyncio_tests:
        async_test.add_marker(session_scope_marker, append=False)


def pytest_logger_config(logger_config: Any) -> None:
    """Configure the logger for the tests.

    Args:
        logger_config: Logger configuration

    Returns:
        None
    """
    logger_config.add_loggers(["e2e"], stdout_level="info")
    logger_config.set_log_option_default("e2e")


@pytest.fixture
def log_output() -> LogCapture:
    return LogCapture()


@pytest.fixture(autouse=True)
def configure_structlog(log_output: LogCapture) -> None:
    configure(processors=[log_output])


@pytest.fixture
def firebase_uid() -> str:
    return "a" * 128


@pytest.fixture(autouse=True)
def patch_firebase_auth(firebase_uid: str, mocker: MockerFixture) -> None:
    mocker.patch("firebase_admin.initialize_app")
    mocker.patch("firebase_admin.auth.verify_id_token", return_value={"uid": firebase_uid})
    mocker.patch("jwt.decode", return_value={"sub": firebase_uid})


@pytest.fixture
def mock_generative_model() -> Generator[Mock, Any, None]:
    init_ref.value = True
    with patch("vertexai.generative_models.GenerativeModel") as mock:
        mock_instance = Mock(spec=GenerativeModel)
        mock.return_value = mock_instance
        yield mock


@pytest.fixture
def mock_text_embedding_model() -> Generator[Mock, Any, None]:
    init_ref.value = True
    embeddings_model.value = None
    with patch("src.utils.ai.TextEmbeddingModel") as mock:
        mock.from_pretrained = Mock(
            return_value=Mock(get_embeddings_async=AsyncMock(return_value=[TextEmbedding(values=[1.0, 2.0, 3.0])]))
        )
        yield mock


@pytest.fixture(scope="session")
def asgi_client() -> SanicASGITestClient:
    from src.main import app

    return app.asgi_client


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

    sorted_files = sorted((Path(__file__).parent.parent / "migrations").glob("*.sql"))
    for file in sorted_files:
        sql = await AsyncPath(file).read_text()
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


@pytest.fixture(autouse=True)
async def cleanup_database(async_session_maker: async_sessionmaker[Any]) -> None:
    getLogger("sqlalchemy").setLevel("ERROR")
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
async def file(async_session_maker: async_sessionmaker[Any]) -> File:
    file_data = FileFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(file_data)
        await session.commit()
    return file_data


@pytest.fixture
async def text_vector(
    async_session_maker: async_sessionmaker[Any],
    file: File,
) -> TextVector:
    vector_data = TextVectorFactory.build(file_id=file.id)
    async with async_session_maker() as session, session.begin():
        session.add(vector_data)
        await session.commit()
    return vector_data


@pytest.fixture
async def funding_organization(async_session_maker: async_sessionmaker[Any]) -> FundingOrganization:
    org_data = FundingOrganizationFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(org_data)
        await session.commit()
    return org_data


@pytest.fixture
async def grant_template(
    async_session_maker: async_sessionmaker[Any], funding_organization: FundingOrganization
) -> GrantTemplate:
    format_data = GrantTemplateFactory.build(name="NIH Research Grant", funding_organization_id=funding_organization.id)
    async with async_session_maker() as session, session.begin():
        session.add(format_data)
        await session.commit()
    return format_data


@pytest.fixture
async def organization_file(
    async_session_maker: async_sessionmaker[Any], funding_organization: FundingOrganization, file: File
) -> OrganizationFile:
    file_data = OrganizationFileFactory.build(funding_organization_id=funding_organization.id, file=file.id)
    async with async_session_maker() as session, session.begin():
        session.add(file_data)
        await session.commit()
    return file_data


@pytest.fixture
async def grant_section(async_session_maker: async_sessionmaker[Any], grant_template: GrantTemplate) -> GrantSection:
    section_data = GrantSectionFactory.build(template_id=grant_template.id)
    async with async_session_maker() as session, session.begin():
        session.add(section_data)
        await session.commit()
    return section_data


@pytest.fixture
async def section_topic(
    async_session_maker: async_sessionmaker[Any],
    grant_section: GrantSection,
) -> SectionTopic:
    aspect_data = SectionAspectsFactory.build(section_id=grant_section.id)
    async with async_session_maker() as session, session.begin():
        session.add(aspect_data)
        await session.commit()
    return aspect_data


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
    async_session_maker: async_sessionmaker[Any], grant_application: GrantApplication, file: File
) -> GrantApplicationFile:
    file_data = GrantApplicationFileFactory.build(grant_application_id=grant_application.id, file_id=file.id)
    async with async_session_maker() as session, session.begin():
        session.add(file_data)
        await session.commit()
    return file_data


@pytest.fixture
async def research_aim(
    async_session_maker: async_sessionmaker[Any], grant_application: GrantApplication
) -> ResearchAim:
    aim_data = ResearchAimFactory.build(application_id=grant_application.id)
    async with async_session_maker() as session, session.begin():
        session.add(aim_data)
        await session.commit()
    return aim_data


@pytest.fixture
async def research_task(async_session_maker: async_sessionmaker[Any], research_aim: ResearchAim) -> ResearchTask:
    task_data = ResearchTaskFactory.build(aim_id=research_aim.id)
    async with async_session_maker() as session, session.begin():
        session.add(task_data)
        await session.commit()
    return task_data


@pytest.fixture
async def generation_result(
    async_session_maker: async_sessionmaker[Any], grant_application: GrantApplication
) -> GenerationResult:
    result_data = GenerationResultFactory.build(application_id=grant_application.id)
    async with async_session_maker() as session, session.begin():
        session.add(result_data)
        await session.commit()
    return result_data


@pytest.fixture
def signal_dispatch_mock(mocker: MockerFixture) -> AsyncMock:
    return mocker.patch("sanic.app.Sanic.dispatch", new_callable=AsyncMock)
