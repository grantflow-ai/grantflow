import logging
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
from faker import Faker
from pytest_asyncio import is_async_test
from pytest_mock import MockerFixture
from sanic_testing.testing import SanicASGITestClient
from scripts.seed_db import seed_db
from sqlalchemy.ext.asyncio import async_sessionmaker
from structlog import configure
from structlog.testing import LogCapture
from testcontainers.postgres import PostgresContainer
from vertexai.generative_models import GenerativeModel
from vertexai.language_models import TextEmbedding

from src.db.base import Base
from src.db.connection import engine_ref, get_session_maker
from src.db.json_objects import ApplicationDetails, ResearchObjective, ResearchTask
from src.db.tables import (
    FundingOrganization,
    GrantApplication,
    GrantApplicationFile,
    GrantTemplate,
    RagFile,
    Workspace,
    WorkspaceUser,
)
from src.utils.ai import embeddings_model, init_ref
from tests.factories import (
    FileFactory,
    FundingOrganizationFactory,
    GrantApplicationFactory,
    GrantApplicationFileFactory,
    GrantTemplateFactory,
    WorkspaceFactory,
    WorkspaceUserFactory,
)

load_dotenv()

logging.getLogger("sqlalchemy.engine.Engine").disabled = True  # otherwise we are spammed with logs


def _file_path_generator(folder: Path) -> Generator[Path, Any, Any]:
    for path in folder.glob("*"):
        if path.is_dir():
            yield from _file_path_generator(path)
        yield path


SOURCES_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "sources"
RESULTS_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "results"
FIXTURES_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "fixtures"
TEST_DATA_SOURCES: Generator[Path, Any, Any] = _file_path_generator(SOURCES_FOLDER / "application_sources")
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
    getLogger("sqlalchemy").setLevel("ERROR")

    logger_config.add_loggers(["e2e"], stdout_level="info")
    logger_config.set_log_option_default("e2e")


@pytest.fixture(scope="session")
def faker() -> Faker:
    return Faker()


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


@pytest.fixture
def mock_admin_code(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_ACCESS_CODE", "test-admin-code")


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
async def file(async_session_maker: async_sessionmaker[Any]) -> RagFile:
    file_data = FileFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(file_data)
        await session.commit()
    return file_data


@pytest.fixture
async def funding_organization(async_session_maker: async_sessionmaker[Any]) -> FundingOrganization:
    org_data = FundingOrganizationFactory.build()
    async with async_session_maker() as session, session.begin():
        session.add(org_data)
        await session.commit()
    return org_data


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
async def grant_template(
    async_session_maker: async_sessionmaker[Any], grant_application: GrantApplication
) -> GrantTemplate:
    grant_template_data = GrantTemplateFactory.build(
        grant_application_id=grant_application.id, funding_organization_id=None
    )
    async with async_session_maker() as session, session.begin():
        session.add(grant_template_data)
        await session.commit()
    return grant_template_data


@pytest.fixture
async def grant_application_file(
    async_session_maker: async_sessionmaker[Any], grant_application: GrantApplication, file: RagFile
) -> GrantApplicationFile:
    file_data = GrantApplicationFileFactory.build(grant_application_id=grant_application.id, rag_file_id=file.id)
    async with async_session_maker() as session, session.begin():
        session.add(file_data)
        await session.commit()
    return file_data


@pytest.fixture
async def mock_extract_webpage_content(mocker: MockerFixture) -> AsyncMock:
    cfp_content_file = RESULTS_FOLDER / "extracted_cfp_content.md"
    assert cfp_content_file.exists(), f"File {cfp_content_file} does not exist"

    contents = cfp_content_file.read_text()
    return mocker.patch("src.utils.extraction.extract_webpage_content", new_callable=AsyncMock, return_value=contents)


@pytest.fixture
def signal_dispatch_mock(mocker: MockerFixture) -> AsyncMock:
    return mocker.patch("sanic.app.Sanic.dispatch", new_callable=AsyncMock)


@pytest.fixture
def research_objectives() -> list[ResearchObjective]:
    return [
        ResearchObjective(
            number=1,
            title="Developing BM TME models with holistic, multimodal AI-driven analysis",
            description="The purpose of this aim is to use our advanced single cell technologies to study the immune activity in the BM TME and identify targets for antibodies and cytokines to modulate the immune activity in the brain to more anti-tumor activity.",
            research_tasks=[
                ResearchTask(
                    number=1,
                    title="Temporal understanding of immune activity in BM TME",
                    description="Research immune temporal changes using Zman-seq in the BM TME using our previous research adapting it from glioma to BM.",
                ),
                ResearchTask(
                    number=2,
                    title="Immune cell-cell interaction in the BM TME",
                    description="Use PIC-seq to measure immune cell interaction in the BM TME.",
                ),
                ResearchTask(
                    number=3,
                    title="Immune spatial distribution in the BM TME",
                    description="Use stereo-seq to study spatial distribution of immune cells in the BM TME.",
                ),
            ],
        ),
        ResearchObjective(
            number=2,
            title="Preclinical screening of cytokines in orthotopic immunocompetent BM models",
            description="The purpose of this aim is to use our advanced single cell technologies to study the immune activity in the BM TME and identify targets for antibodies and cytokines to modulate the immune activity in the brain to more anti-tumor activity.",
            research_tasks=[
                ResearchTask(
                    number=1,
                    title="Screening of cytokines in BM TME",
                    description="Use our in-house cytokine library to screen for cytokines that modulate immune activity in the BM TME.",
                ),
                ResearchTask(
                    number=2,
                    title="In-vitro validation of cytokines",
                    description="Use in-vitro models to validate the cytokines identified in task 1.",
                ),
                ResearchTask(
                    number=3,
                    title="In-vivo validation of cytokines",
                    description="Single-cell analysis using in-vitro and in vivo functional screening system on myeloid, NK and T cell activity for trans-acting MiTEs.",
                ),
            ],
        ),
        ResearchObjective(
            number=3,
            title="Design of tumor-targeting immunocytokines",
            description="The purpose of this aim is to use our advanced single cell technologies to study the immune activity in the BM TME and identify targets for antibodies and cytokines to modulate the immune activity in the brain to more anti-tumor activity.",
            research_tasks=[
                ResearchTask(
                    number=1,
                    title="Design fusion proteins and cleavage site",
                    description="We will develop the optimal structures for the fusion proteins of the top 3-5 mAb-cytokine combinations identified in Aim 2, using advanced techniques in protein design. The design process will include the selection of the most suitable peptide linkers, blocking moieties, TAM-specific cleavage sites and the computational optimization of protein structure and stability.",
                ),
                ResearchTask(
                    number=2,
                    title="Produce fusion proteins",
                    description="We will manufacture the 3-5 mAb-cytokine fusion proteins. The protein synthesis will be done by a contract research organization (CRO) selected based on our experience with leading CROs based on quality and punctual production. The production will include the selection of stable molecules with high protein expression and no aggregation.",
                ),
                ResearchTask(
                    number=3,
                    title="In-vitro validation of immunocytokines",
                    description="We will confirm the binding via SPR, ELISA, cell-based binding and reporter assays. We will validate immunocytokines' impact on interactions between myeloid and lymphoid cell activity using in-vitro assays of co-cultured huMDMs, NK or T cells. To assess the efficacy of the fusion proteins in inducing cytotoxic NK and T cell activity, assays of co-cultured huMDMs, NK, or T cells and tumor cells will be treated with the various mAb-cytokine chimeras.",
                ),
            ],
        ),
    ]


@pytest.fixture
def application_details() -> ApplicationDetails:
    return ApplicationDetails(
        background_context="Brain metastases (BMs) occur in almost 50% of patients with metastatic melanoma, resulting in a dismal prognosis with a poor overall survival for most patients. Immunotherapy has revolutionized treatment for melanoma patients, extending median survival from 6 months to nearly 6 years for patients in advanced disease stages. However, many patients still face early relapse or do not respond to treatments. Particularly in BMs, the milieu of the brain creates a highly immunosuppressive tumor microenvironment (TME). Single-cell technologies together with machine learning have emerged as powerful tools to decipher complex interactions between cells in the TME, enabling development of data driven designs of immunotherapies. Using our advanced technologies to study cells in the tumor microenvironment at a single-cell resolution, we identified a subtype of immune cell which is a central part of the TME coined regulatory (TREM2+) macrophages. These cells play a crucial role in suppressing the body's ability to fight cancer, especially in subsets of immunotherapy-resistant tumors such as melanoma. We have already developed an antibody that blocks the suppressive action of these cells.",
        hypothesis="Our hypothesis is that using our advanced single cell technologies, including cell temporal tracking (ZMAN-seq, differentiation flows), cell-cell interactions (PIC-seq), and improved strategies for AI analysis of spatial transcriptomics with Stereo-seq, we can to get an in-depth understanding of the BM TME and identify cytokines capable of remodulating the TME towards anti-tumor activity. This understanding will enable us to design novel immunocytokines combining the most promising cytokines with our antiTREM2 antibody to modulate both the myeloid and T and NK cell compartments. Our hypothesis is that our single cell and AI analysis will also enable us to identify biomarkers to design masking strategies to increase the specificity of the immunocytokine to the BM TME.",
        rationale="Our rationale is that the advances in single cell technologies enable an in depth understanding of the immune environment of BMs and identifying novel approaches for activating the immune system to eliminate the BMs. Our rationale is also that simultaneously modulating different immune cell compartments (macrophages, T cells, NK cells) can induce unprecedented anti-tumor immune response.",
        novelty_and_innovation="Our research is innovative in the utilization of state-of-the-art single cell technologies including ZMAN-seq, PIC-seq and STEREO-seq, in combination with generative AI tools. It is also highly innovative in its goal to develop first-in-its-class therapeutic modality simultaneously modulating different immune cell compartments (macrophages, T cells, NK cells). Our innovative approach also includes the use of masking techniques to increase the molecule's specificity to the BM TME.",
        team_excellence="Our team of world leaders in immunology, brain tumors and computer science research is ideally suited to deliver this disruptive proposal. Our lab is a pioneer and leader in the development and utilization of advanced single cell technologies for the study of immunology. We have a track record of innovation and groundbreaking discovery. We have already identified TREM2 as a pathway of immunosuppresive macrophages in the TME and developed a successful antibody blocking this pathway. We have also made significant advances in studying and developing anti-TREM2 immunocytokines.",
        preliminary_data="As part of our previous research, we demonstrated the synergistic potential of an anti-TREM2 antibody combined with cytokines through the induction of strong pro-inflammatory macrophage activity in vitro. We have also tested the feasibility of producing TREM2 immunocytokines and developed preliminary model molecules, including an IL-2-anti-TREM2 fusion protein. We have also designed a masking strategy for the cytokine arm using blocking moieties responsive only to TAM-specific proteases and tested them in vivo.",
        research_feasibility="We plan to systematically analyse the BM TME using our advanced single cell and AI technologies, rely on melanoma BM tumor models and our expertise in antibody design.Our background and capabilities, as well as preliminary ensure our goals are ambitious yet feasible and could be completed as part of this project.",
        impact="Brain metastases (BMs) occur in almost 50% of patients with metastatic melanoma, resulting in a dismal prognosis with a poor overall survival for most patients. Development of effective novel therapies for melanoma BMs could significantly increase life expectancy and not less important - life quality of metastatic melanoma patients.",
        scientific_infrastructure="Our lab is equipped with the state-of-the-art single cell and molecular biology technologies and is supported by the vast scientific infrastructure of the Weizmann Institute of Science.",
    )
