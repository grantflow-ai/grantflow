import os
from collections.abc import AsyncGenerator, Generator
from json import loads
from logging import Logger, getLogger
from mimetypes import guess_type
from pathlib import Path
from textwrap import dedent
from typing import Any, Final
from unittest.mock import AsyncMock, Mock, patch
from uuid import UUID, uuid4

import pytest
from anyio import Path as AsyncPath
from asyncpg import connect
from dotenv import load_dotenv
from pytest_asyncio import is_async_test
from pytest_mock import MockerFixture
from sanic_testing.testing import SanicASGITestClient
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import async_sessionmaker
from structlog import configure
from structlog.testing import LogCapture
from testcontainers.postgres import PostgresContainer
from vertexai.generative_models import GenerativeModel
from vertexai.language_models import TextEmbedding

from src.db.connection import engine_ref, get_session_maker
from src.db.tables import (
    Application,
    ApplicationFile,
    ApplicationVector,
    Base,
    FundingOrganization,
    GrantCfp,
    GrantFormat,
    GrantFormatFile,
    GrantFormatVector,
    GrantSection,
    ResearchAim,
    ResearchTask,
    SectionAspect,
    TextGenerationResult,
    Workspace,
    WorkspaceUser,
)
from src.utils.ai import embeddings_model, init_ref
from tests.factories import (
    ApplicationFactory,
    ApplicationFileFactory,
    ApplicationVectorFactory,
    FundingOrganizationFactory,
    GrantCfpFactory,
    GrantFormatFactory,
    GrantFormatFileFactory,
    GrantFormatVectorFactory,
    GrantSectionFactory,
    ResearchAimFactory,
    ResearchTaskFactory,
    SectionAspectsFactory,
    TextGenerationResultFactory,
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
async def org(async_session_maker: async_sessionmaker[Any]) -> FundingOrganization:
    org_data = FundingOrganizationFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(org_data)
        await session.commit()
    return org_data


@pytest.fixture
async def grant_format(async_session_maker: async_sessionmaker[Any], org: FundingOrganization) -> GrantFormat:
    format_data = GrantFormatFactory.build(name="NIH Research Grant", funding_organization_id=org.id)
    async with async_session_maker() as session, session.begin():
        session.add(format_data)
        await session.commit()
    return format_data


@pytest.fixture
async def grant_format_file(async_session_maker: async_sessionmaker[Any], grant_format: GrantFormat) -> GrantFormatFile:
    file_data = GrantFormatFileFactory.build(format_id=grant_format.id)
    async with async_session_maker() as session, session.begin():
        session.add(file_data)
        await session.commit()
    return file_data


@pytest.fixture
async def grant_section(async_session_maker: async_sessionmaker[Any], grant_format: GrantFormat) -> GrantSection:
    section_data = GrantSectionFactory.build(format_id=grant_format.id)
    async with async_session_maker() as session, session.begin():
        session.add(section_data)
        await session.commit()
    return section_data


@pytest.fixture
async def section_aspect(
    async_session_maker: async_sessionmaker[Any],
    grant_section: GrantSection,
) -> SectionAspect:
    aspect_data = SectionAspectsFactory.build(section_id=grant_section.id)
    async with async_session_maker() as session, session.begin():
        session.add(aspect_data)
        await session.commit()
    return aspect_data


@pytest.fixture
async def grant_format_vector(
    async_session_maker: async_sessionmaker[Any],
    grant_format: GrantFormat,
    grant_format_file: GrantFormatFile,
) -> GrantFormatVector:
    vector_data = GrantFormatVectorFactory.build(format_id=grant_format.id, file_id=grant_format_file.id)
    async with async_session_maker() as session, session.begin():
        session.add(vector_data)
        await session.commit()
    return vector_data


@pytest.fixture
async def cfp(
    async_session_maker: async_sessionmaker[Any],
    org: FundingOrganization,
    grant_format: GrantFormat,
) -> GrantCfp:
    cfp_data = GrantCfpFactory.build(funding_organization_id=org.id, format_id=grant_format.id)
    async with async_session_maker() as session, session.begin():
        session.add(cfp_data)
        await session.commit()
    return cfp_data


@pytest.fixture
async def application(async_session_maker: async_sessionmaker[Any], workspace: Workspace, cfp: GrantCfp) -> Application:
    application_data = ApplicationFactory.build(
        workspace_id=workspace.id,
        cfp_id=cfp.id,
    )
    async with async_session_maker() as session, session.begin():
        session.add(application_data)
        await session.commit()
    return application_data


@pytest.fixture
async def application_file(async_session_maker: async_sessionmaker[Any], application: Application) -> ApplicationFile:
    file_data = ApplicationFileFactory.build(application_id=application.id)
    async with async_session_maker() as session, session.begin():
        session.add(file_data)
        await session.commit()
    return file_data


@pytest.fixture
async def research_aim(async_session_maker: async_sessionmaker[Any], application: Application) -> ResearchAim:
    aim_data = ResearchAimFactory.build(application_id=application.id)
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
async def text_generation_result(
    async_session_maker: async_sessionmaker[Any], application: Application
) -> TextGenerationResult:
    result_data = TextGenerationResultFactory.build(application_id=application.id)
    async with async_session_maker() as session, session.begin():
        session.add(result_data)
        await session.commit()
    return result_data


@pytest.fixture
async def application_vector(
    async_session_maker: async_sessionmaker[Any],
    application: Application,
    application_file: ApplicationFile,
) -> ApplicationVector:
    vector_data = ApplicationVectorFactory.build(application_id=application.id, file_id=application_file.id)
    async with async_session_maker() as session, session.begin():
        session.add(vector_data)
        await session.commit()
    return vector_data


@pytest.fixture
async def full_application_id(
    workspace: Workspace, async_session_maker: async_sessionmaker[Any], cfp: GrantCfp
) -> UUID:
    application_id = uuid4()
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(Application).values(
                {
                    "id": application_id,
                    "workspace_id": workspace.id,
                    "cfp_id": cfp.id,
                    "title": "Developing AI tailored immunocytokines to target melanoma brain metastases",
                    "significance": None,
                    "innovation": None,
                }
            )
        )
        await session.commit()

    research_aims = [
        {
            "id": uuid4(),
            "aim_number": 1,
            "application_id": application_id,
            "title": "Developing BM TME models with holistic, multimodal AI-driven analysis",
            "description": "The purpose of this aim is to use our advanced single cell technologies to study the immune activity in the BM TME and identify targets for antibodies and cytokines to modulate the immune activity in the brain to more anti-tumor activity.",
        },
        {
            "id": uuid4(),
            "aim_number": 2,
            "application_id": application_id,
            "title": "Preclinical screening of cytokines in orthotopic immunocompetent BM models",
            "description": "The purpose of this aim is to use our advanced single cell technologies to study the immune activity in the BM TME and identify targets for antibodies and cytokines to modulate the immune activity in the brain to more anti-tumor activity.",
        },
        {
            "id": uuid4(),
            "aim_number": 3,
            "application_id": application_id,
            "title": "Design of tumor-targeting immunocytokines",
            "description": "The purpose of this aim is to use our advanced single cell technologies to study the immune activity in the BM TME and identify targets for antibodies and cytokines to modulate the immune activity in the brain to more anti-tumor activity.",
        },
    ]

    async with async_session_maker() as session, session.begin():
        await session.execute(insert(ResearchAim).values(research_aims))
        await session.commit()

    research_tasks = [
        {
            "id": uuid4(),
            "aim_id": research_aims[0]["id"],
            "task_number": "1.1",
            "title": "Temporal understanding of immune activity in BM TME",
            "description": "Research immune temporal changes using Zman-seq in the BM TME using our previous research adapting it from glioma to BM.",
        },
        {
            "id": uuid4(),
            "aim_id": research_aims[0]["id"],
            "task_number": "1.2",
            "title": "Immune cell-cell interaction in the BM TME",
            "description": "Use PIC-seq to measure immune cell interaction in the BM TME.",
        },
        {
            "id": uuid4(),
            "aim_id": research_aims[0]["id"],
            "task_number": "1.3",
            "title": "Immune spatial distribution in the BM TME",
            "description": "Use stereo-seq to study spatial distribution of immune cells in the BM TME.",
        },
        {
            "id": uuid4(),
            "aim_id": research_aims[1]["id"],
            "task_number": "2.1",
            "title": "Screening of cytokines in BM TME",
            "description": "Use our in-house cytokine library to screen for cytokines that modulate immune activity in the BM TME.",
        },
        {
            "id": uuid4(),
            "aim_id": research_aims[1]["id"],
            "task_number": "2.2",
            "title": "In-vitro validation of cytokines",
            "description": "Use in-vitro models to validate the cytokines identified in task 1.",
        },
        {
            "id": uuid4(),
            "aim_id": research_aims[1]["id"],
            "task_number": "2.3",
            "title": "In-vivo validation of cytokines",
            "description": "Single-cell analysis using in-vitro and in vivo functional screening system on myeloid, NK and T cell activity for trans-acting MiTEsUse",
        },
        {
            "id": uuid4(),
            "aim_id": research_aims[2]["id"],
            "task_number": "3.1",
            "title": "Design fusion proteins and cleavage site",
            "description": "We will develop the optimal structures for the fusion proteins of the top 3-5 mAb-cytokine combinations identified in Aim 2, using advanced techniques in protein design. The design process will include the selection of the most suitable peptide linkers, blocking moieties, TAM-specific cleavage sites and the computational optimization of protein structure and stability.",
        },
        {
            "id": uuid4(),
            "aim_id": research_aims[2]["id"],
            "task_number": "3.2",
            "title": "Produce fusion proteins",
            "description": "We will manufacture the 3-5 mAb-cytokine fusion proteins. The protein synthesis will be done by a contract research organization (CRO) selected based on our experience with leading CROs based on quality and punctual production. The production will include the selection of stable molecules with high protein expression and no aggregation.",
        },
        {
            "id": uuid4(),
            "aim_id": research_aims[2]["id"],
            "task_number": "3.3",
            "title": "In-vitro validation of immunocytokines",
            "description": "We will confirm the binding via SPR, ELISA, cell-based binding and reporter assays.We will validate immunocytokines' impact on interactions between myeloid and lymphoid cell activity using in-vitro assays of co-cultured huMDMs, NK or T cells. To assess the efficacy of the fusion proteins in inducing cytotoxic NK and T cell activity, assays of co-cultured huMDMs, NK, or T cells and tumor cells will be treated with the various mAb-cytokine chimeras.",
        },
    ]

    async with async_session_maker() as session, session.begin():
        await session.execute(insert(ResearchTask).values(research_tasks))

    file_data = [
        {
            "id": uuid4(),
            "application_id": application_id,
            "name": file_path.name,
            "type": guess_type(file_path)[0] or "application/octet-stream",
            "size": file_path.read_bytes().__sizeof__(),
        }
        for file_path in TEST_DATA_SOURCES
    ]

    async with async_session_maker() as session, session.begin():
        await session.execute(insert(ApplicationFile).values(file_data))
        await session.commit()

    async with async_session_maker() as session, session.begin():
        vector_sources = {
            test_result.name: loads(test_result.read_text())
            for test_result in TEST_DATA_RESULTS
            if test_result.name.endswith("_indexed_documents.json")
        }
        for file in file_data:
            vectors = vector_sources[f"parse_{file['name']}_indexed_documents.json"]
            assert vectors
            await session.execute(
                insert(ApplicationVector).values(
                    [
                        {
                            "application_id": application_id,
                            "file_id": file["id"],
                            "chunk_index": vector["chunk_index"],
                            "content": vector["content"],
                            "element_type": vector["element_type"],
                            "embedding": vector["embedding"],
                            "page_number": vector["page_number"],
                        }
                        for vector in vectors
                    ]
                )
            )
        await session.commit()

    return application_id
