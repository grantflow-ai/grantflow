import logging
import os
from asyncio import gather
from collections.abc import AsyncGenerator, Generator
from logging import Logger, getLogger
from pathlib import Path
from textwrap import dedent
from typing import Any, Final, cast
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
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload
from structlog import configure
from structlog.testing import LogCapture
from testcontainers.postgres import PostgresContainer
from vertexai.generative_models import GenerativeModel

from src.db.base import Base
from src.db.connection import engine_ref, get_session_maker
from src.db.enums import FileIndexingStatusEnum
from src.db.json_objects import ResearchObjective, ResearchTask
from src.db.tables import (
    FundingOrganization,
    GrantApplication,
    GrantApplicationFile,
    GrantTemplate,
    OrganizationFile,
    RagFile,
    TextVector,
    Workspace,
    WorkspaceUser,
)
from src.files import FileDTO
from src.indexer.files import parse_and_index_file
from src.rag.grant_template.handler import grant_template_generation_pipeline_handler
from src.utils.ai import init_ref
from src.utils.extraction import extract_file_content
from src.utils.serialization import deserialize, serialize
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
SYNTHETHIC_DATA_FOLDER: Final[Path] = Path(__file__).parent / "test_data" / "synthethic"
TEST_DATA_SOURCES: Generator[Path, Any, Any] = _file_path_generator(SOURCES_FOLDER / "application_sources")
TEST_DATA_RESULTS: Generator[Path, Any, Any] = _file_path_generator(RESULTS_FOLDER)
CFP_FIXTURES: Generator[Path, Any, Any] = _file_path_generator(FIXTURES_FOLDER / "cfps")


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
    async with async_session_maker() as session:
        result = await session.execute(select(FundingOrganization.id).where(FundingOrganization.abbreviation == "NIH"))
        funding_organization_id = result.scalar_one()

    grant_template_data = GrantTemplateFactory.build(
        grant_application_id=grant_application.id,
        funding_organization_id=funding_organization_id,
        grant_sections=[
            {
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
                "type": "EXECUTIVE_SUMMARY",
            },
            {
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
                "type": "RESEARCH_SIGNIFICANCE",
            },
            {
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
                "type": "RESEARCH_INNOVATION",
            },
            {
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
                "type": "RESEARCH_PLAN",
            },
            {
                "topics": [{"type": "IMPACT", "weight": 1.0}, {"type": "RATIONALE", "weight": 0.7}],
                "search_queries": [
                    "impact on clinical decision making",
                    "improved diagnosis of inner ear pathologies",
                    "clinical settings for proposed use",
                    "treatments enabled by improved diagnosis",
                    "benefits of increased imaging resolution",
                ],
                "max_words": 500,
                "type": "EXPECTED_OUTCOMES",
            },
        ],
        name="Inner Ear Imaging Technology Grant",
        template="# Executive Summary\n\n{{EXECUTIVE_SUMMARY}}\n\n## Research Significance\n\n{{RESEARCH_SIGNIFICANCE}}\n\n## Research Innovation\n\n{{RESEARCH_INNOVATION}}\n\n## Research Plan\n\n{{RESEARCH_PLAN}}\n\n## Expected Outcomes\n\n{{EXPECTED_OUTCOMES}}",
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
    cfp_content_file = RESULTS_FOLDER / "nih.md"
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
def form_inputs() -> dict[str, str]:
    return {
        "background_context": "Brain metastases (BMs) occur in almost 50% of patients with metastatic melanoma, resulting in a dismal prognosis with a poor overall survival for most patients. Immunotherapy has revolutionized treatment for melanoma patients, extending median survival from 6 months to nearly 6 years for patients in advanced disease stages. However, many patients still face early relapse or do not respond to treatments. Particularly in BMs, the milieu of the brain creates a highly immunosuppressive tumor microenvironment (TME). Single-cell technologies together with machine learning have emerged as powerful tools to decipher complex interactions between cells in the TME, enabling development of data driven designs of immunotherapies. Using our advanced technologies to study cells in the tumor microenvironment at a single-cell resolution, we identified a subtype of immune cell which is a central part of the TME coined regulatory (TREM2+) macrophages. These cells play a crucial role in suppressing the body's ability to fight cancer, especially in subsets of immunotherapy-resistant tumors such as melanoma. We have already developed an antibody that blocks the suppressive action of these cells.",
        "hypothesis": "Our hypothesis is that using our advanced single cell technologies, including cell temporal tracking (ZMAN-seq, differentiation flows), cell-cell interactions (PIC-seq), and improved strategies for AI analysis of spatial transcriptomics with Stereo-seq, we can to get an in-depth understanding of the BM TME and identify cytokines capable of remodulating the TME towards anti-tumor activity. This understanding will enable us to design novel immunocytokines combining the most promising cytokines with our antiTREM2 antibody to modulate both the myeloid and T and NK cell compartments. Our hypothesis is that our single cell and AI analysis will also enable us to identify biomarkers to design masking strategies to increase the specificity of the immunocytokine to the BM TME.",
        "rationale": "Our rationale is that the advances in single cell technologies enable an in depth understanding of the immune environment of BMs and identifying novel approaches for activating the immune system to eliminate the BMs. Our rationale is also that simultaneously modulating different immune cell compartments (macrophages, T cells, NK cells) can induce unprecedented anti-tumor immune response.",
        "novelty_and_innovation": "Our research is innovative in the utilization of state-of-the-art single cell technologies including ZMAN-seq, PIC-seq and STEREO-seq, in combination with generative AI tools. It is also highly innovative in its goal to develop first-in-its-class therapeutic modality simultaneously modulating different immune cell compartments (macrophages, T cells, NK cells). Our innovative approach also includes the use of masking techniques to increase the molecule's specificity to the BM TME.",
        "team_excellence": "Our team of world leaders in immunology, brain tumors and computer science research is ideally suited to deliver this disruptive proposal. Our lab is a pioneer and leader in the development and utilization of advanced single cell technologies for the study of immunology. We have a track record of innovation and groundbreaking discovery. We have already identified TREM2 as a pathway of immunosuppresive macrophages in the TME and developed a successful antibody blocking this pathway. We have also made significant advances in studying and developing anti-TREM2 immunocytokines.",
        "preliminary_data": "As part of our previous research, we demonstrated the synergistic potential of an anti-TREM2 antibody combined with cytokines through the induction of strong pro-inflammatory macrophage activity in vitro. We have also tested the feasibility of producing TREM2 immunocytokines and developed preliminary model molecules, including an IL-2-anti-TREM2 fusion protein. We have also designed a masking strategy for the cytokine arm using blocking moieties responsive only to TAM-specific proteases and tested them in vivo.",
        "research_feasibility": "We plan to systematically analyse the BM TME using our advanced single cell and AI technologies, rely on melanoma BM tumor models and our expertise in antibody design.Our background and capabilities, as well as preliminary ensure our goals are ambitious yet feasible and could be completed as part of this project.",
        "impact": "Brain metastases (BMs) occur in almost 50% of patients with metastatic melanoma, resulting in a dismal prognosis with a poor overall survival for most patients. Development of effective novel therapies for melanoma BMs could significantly increase life expectancy and not less important - life quality of metastatic melanoma patients.",
        "scientific_infrastructure": "Our lab is equipped with the state-of-the-art single cell and molecular biology technologies and is supported by the vast scientific infrastructure of the Weizmann Institute of Science.",
    }


async def parse_source_file(
    *,
    application_id: str | None = None,
    organization_id: str | None = None,
    source_file: Path,
    async_session_maker: async_sessionmaker[Any],
    target_folder: Path,
) -> None:
    if not application_id and not organization_id:
        raise ValueError("Either application_id or organization_id must be provided")

    file_content = await AsyncPath(source_file).read_bytes()
    file_dto = FileDTO(
        content=file_content,
        filename=source_file.name,
        mime_type="application/pdf"
        if source_file.suffix == ".pdf"
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )

    async with async_session_maker() as session:
        file_id = await session.scalar(
            insert(RagFile)
            .values(
                {
                    "filename": file_dto.filename,
                    "mime_type": file_dto.mime_type,
                    "size": file_dto.size,
                    "indexing_status": FileIndexingStatusEnum.FINISHED,
                }
            )
            .returning(RagFile.id)
        )
        await session.execute(
            insert(GrantApplicationFile).values([{"grant_application_id": application_id, "rag_file_id": file_id}])
            if application_id
            else insert(OrganizationFile).values([{"funding_organization_id": organization_id, "rag_file_id": file_id}])
        )
        await session.commit()

    await parse_and_index_file(file_dto=file_dto, file_id=str(file_id))

    async with async_session_maker() as session:
        if application_id:
            stmt = (
                select(GrantApplicationFile)
                .options(selectinload(GrantApplicationFile.rag_file).selectinload(RagFile.text_vectors))
                .where(GrantApplicationFile.rag_file_id == file_id)
                .where(GrantApplicationFile.grant_application_id == application_id)
            )
        else:
            stmt = (
                select(OrganizationFile)  # type: ignore[assignment]
                .options(selectinload(OrganizationFile.rag_file).selectinload(RagFile.text_vectors))
                .where(OrganizationFile.rag_file_id == file_id)
                .where(OrganizationFile.funding_organization_id == organization_id)
            )

        file_datum = await session.scalar(stmt)
        assert file_datum is not None, f"File {source_file} not found in the database"

    await AsyncPath(target_folder).mkdir(parents=True, exist_ok=True)

    filename = source_file.name.replace("pdf", "json").replace("docx", "json")
    await AsyncPath(target_folder / filename).write_bytes(serialize(file_datum))


@pytest.fixture
async def full_application_id(
    workspace: Workspace,
    research_objectives: list[ResearchObjective],
    form_inputs: dict[str, str],
    async_session_maker: async_sessionmaker[Any],
) -> str:
    fixture_id = "43b4aed5-8549-461f-9290-5ee9a630ac9a"
    async with async_session_maker() as session:
        application_id = await session.scalar(
            insert(GrantApplication)
            .values(
                {
                    "id": fixture_id,
                    "workspace_id": workspace.id,
                    "title": "Developing AI tailored immunocytokines to target melanoma brain metastases",
                    "research_objectives": research_objectives,
                    "form_inputs": form_inputs,
                }
            )
            .returning(GrantApplication.id)
        )
        await session.commit()

    cfp_content_file = FIXTURES_FOLDER / "cfps" / "melanoma_alliance_cfp.md"
    if not cfp_content_file.exists():
        cfp_file = SOURCES_FOLDER / "cfps" / "MRA-2023-2024-RFP-Final.pdf"

        output, _ = await extract_file_content(
            content=cfp_file.read_bytes(),
            mime_type="application/pdf",
        )
        content = output if isinstance(output, str) else output["content"]
        cfp_content_file.write_text(content)

    data_fixture_folder = FIXTURES_FOLDER / fixture_id
    if not data_fixture_folder.exists():
        data_fixture_folder.mkdir(parents=True)

    grant_template_file = data_fixture_folder / "grant_template.json"
    if not grant_template_file.exists():
        await grant_template_generation_pipeline_handler(
            cfp_content=cfp_content_file.read_text(), application_id=application_id
        )

        async with async_session_maker() as session:
            grant_template = await session.scalar(
                select(GrantTemplate).where(GrantTemplate.grant_application_id == application_id)
            )

        grant_template_file.write_bytes(serialize(grant_template))
    else:
        data = deserialize(grant_template_file.read_text(), dict[str, Any])

        async with async_session_maker() as session:
            await session.execute(
                insert(GrantTemplate).values(
                    {k: v for k, v in data.items() if v is not None and k not in {"created_at", "updated_at"}}
                )
            )
            await session.commit()

    application_files_fixtures_dir = data_fixture_folder / "files"
    if not application_files_fixtures_dir.exists():
        application_files_fixtures_dir.mkdir(parents=True)

    if not list(application_files_fixtures_dir.glob("*.json")):
        await gather(
            *[
                parse_source_file(
                    application_id=str(application_id),
                    source_file=source_file,
                    async_session_maker=async_session_maker,
                    target_folder=application_files_fixtures_dir,
                )
                for source_file in TEST_DATA_SOURCES
            ]
        )
    async with async_session_maker() as session, session.begin():
        for application_file in application_files_fixtures_dir.glob("*.json"):
            data = deserialize(application_file.read_bytes(), dict[str, Any])
            rag_file_data = data.pop("rag_file")
            rag_file_id = data.pop("rag_file_id")
            text_vectors: list[dict[str, Any]] = rag_file_data.pop("text_vectors")

            await session.execute(
                insert(RagFile)
                .values(
                    {
                        "id": rag_file_id,
                        **{
                            k: v
                            for k, v in rag_file_data.items()
                            if v is not None and k not in {"created_at", "updated_at"}
                        },
                    }
                )
                .on_conflict_do_nothing(index_elements=["id"])
            )
            await session.execute(
                insert(GrantApplicationFile)
                .values(
                    {
                        "grant_application_id": application_id,
                        "rag_file_id": rag_file_id,
                    }
                )
                .on_conflict_do_nothing(index_elements=["grant_application_id", "rag_file_id"])
            )
            await session.execute(
                insert(TextVector).values(
                    [
                        {
                            k: v
                            for k, v in text_vector.items()
                            if v is not None and k not in {"created_at", "updated_at"}
                        }
                        for text_vector in text_vectors
                    ]
                )
            )
        await session.commit()

    return str(application_id)


@pytest.fixture
async def nih_organization(
    async_session_maker: async_sessionmaker[Any],
) -> FundingOrganization:
    async with async_session_maker() as session:
        result = await session.execute(select(FundingOrganization).where(FundingOrganization.abbreviation == "NIH"))
        funding_organization = result.scalar_one()

    data_fixture_folder = FIXTURES_FOLDER / "organization_files" / "nih" / "files"

    if not data_fixture_folder.exists():
        data_fixture_folder.mkdir(parents=True)

    organization_files = list(data_fixture_folder.glob("*.json"))

    if not list(organization_files):
        source_folder = SOURCES_FOLDER / "guidelines" / "nih"
        assert source_folder.exists(), f"Source folder {source_folder} does not exist"

        sources = list(source_folder.glob("*.pdf"))
        if not sources:
            raise FileNotFoundError(f"No nih guidelines found in {source_folder}")

        await gather(
            *[
                parse_source_file(
                    organization_id=str(funding_organization.id),
                    source_file=source_file,
                    async_session_maker=async_session_maker,
                    target_folder=data_fixture_folder,
                )
                for source_file in source_folder.glob("*.pdf")
            ]
        )

    async with async_session_maker() as session, session.begin():
        for organization_file in data_fixture_folder.glob("*.json"):
            data = deserialize(organization_file.read_bytes(), dict[str, Any])
            rag_file_data = data.pop("rag_file")
            rag_file_id = data.pop("rag_file_id")
            text_vectors: list[dict[str, Any]] = rag_file_data.pop("text_vectors")

            await session.execute(
                insert(RagFile)
                .values(
                    {
                        "id": rag_file_id,
                        **{
                            k: v
                            for k, v in rag_file_data.items()
                            if v is not None and k not in {"created_at", "updated_at"}
                        },
                    }
                )
                .on_conflict_do_nothing(index_elements=["id"])
            )
            await session.execute(
                insert(OrganizationFile)
                .values(
                    {
                        "funding_organization_id": funding_organization.id,
                        "rag_file_id": rag_file_id,
                    }
                )
                .on_conflict_do_nothing(index_elements=["funding_organization_id", "rag_file_id"])
            )
            await session.execute(
                insert(TextVector)
                .values(
                    [
                        {
                            k: v
                            for k, v in text_vector.items()
                            if v is not None and k not in {"created_at", "updated_at"}
                        }
                        for text_vector in text_vectors
                    ]
                )
                .on_conflict_do_nothing(index_elements=["id"])
            )
        await session.commit()

    return cast(FundingOrganization, funding_organization)


@pytest.fixture
async def organization_mapping(async_session_maker: async_sessionmaker[Any]) -> dict[str, dict[str, str]]:
    async with async_session_maker() as session:
        organizations = await session.scalars(select(FundingOrganization).order_by(FundingOrganization.full_name.asc()))
        return {
            str(org.id): {
                "full_name": org.full_name,
                "abbreviation": org.abbreviation,
            }
            for org in organizations
        }
