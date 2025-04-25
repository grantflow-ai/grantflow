import logging
import os
from collections.abc import AsyncGenerator, Generator
from logging import Logger, getLogger
from socket import AF_INET, SOCK_STREAM, socket
from textwrap import dedent
from typing import Any
from unittest.mock import AsyncMock, Mock, patch

import pytest
from anyio import run_process, sleep
from asyncpg import connect
from dotenv import load_dotenv
from faker import Faker
from litestar import Litestar
from litestar.testing import AsyncTestClient
from packages.db.src.connection import engine_ref, get_session_maker
from packages.db.src.enums import UserRoleEnum
from packages.db.src.json_objects import ResearchObjective, ResearchTask
from packages.db.src.tables import (
    Base,
    FundingOrganization,
    GrantApplication,
    GrantApplicationFile,
    GrantTemplate,
    RagFile,
    Workspace,
    WorkspaceUser,
)
from pytest_asyncio import is_async_test
from pytest_mock import MockerFixture
from scripts.seed_db import seed_db
from services.backend.src.utils.ai import init_ref
from services.backend.src.utils.firebase import firebase_app_ref
from services.backend.src.utils.jwt import create_jwt
from sqlalchemy import NullPool, select
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from structlog import configure
from structlog.testing import LogCapture
from vertexai.generative_models import GenerativeModel

from tests.factories import (
    FileFactory,
    FundingOrganizationFactory,
    GrantApplicationFactory,
    GrantApplicationFileFactory,
    GrantTemplateFactory,
    WorkspaceFactory,
    WorkspaceUserFactory,
)
from tests.test_utils import (
    FIXTURES_FOLDER,
    create_grant_application_data,
    process_funding_organization,
)

TestingClientType = AsyncTestClient[Litestar]

for logger_name in ["sqlalchemy.engine", "sqlalchemy.pool", "sqlalchemy.dialects", "sqlalchemy.orm"]:
    logging.getLogger(logger_name).setLevel(logging.WARNING)
    logging.getLogger(logger_name).propagate = False


def pytest_collection_modifyitems(items: list[Any]) -> None:
    pytest_asyncio_tests = (item for item in items if is_async_test(item))
    session_scope_marker = pytest.mark.asyncio(loop_scope="session")
    for async_test in pytest_asyncio_tests:
        async_test.add_marker(session_scope_marker, append=False)


@pytest.fixture(autouse=True)
def stub_env() -> None:
    load_dotenv()  # we use a real env file for E2E tests, but it's not always present ~keep
    os.environ["TOKENIZERS_PARALLELISM"] = (
        "false"  # we don't want to run tokenizers in parallel due to pytest limitations ~keep
    )

    mock_creds = '{"type":"service_account","project_id":"grantflow","private_key_id":"abc","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+0J+xaF97Kqhq\\naahY04lj7dO+xyZHMKt3NXy0FSvpNUscx9UB8UVh9D/QvJ0zgfRo9G0kfEpmKE86\\nRFd9tCW2ytnMbdi7XRF9eSVJXjpGh/5pXvhakb/6+BHJoFriYeYU/QHWesIDr0An\\nDG5H9pLGXBzGJ34rGfPmVseh3xKdnZzcPvdjNj6OMbNpwxkwFJupRB9I3pvYIjQw\\nEH1ca5JYrAYwm6jspO6liZKVQCuqTvkWQZdG8SEHtoaIXJyDgvT20vTmlV5Ktzxt\\n9F3MHDncqNFTmAIQvOe+Lq14gWkEznBhZ8y/tgmVEC//RZyHySI3GPSQZg8nQwKZ\\nlAq7p4UDAgMBAAECggEABxHVZS1iddLSV6PT1VMvXpROZRtBxzZ1atE4FiGVQbQm\\nKbh+hDh1TOvQjPiMX7E12KXsJeaJ5JFvqaHH+ZOsmyvrAp0kV1NfqMPiMULrpIKZ\\nzx0qvIBDOCh5kFWXwgxnFzgG0JkVXq2a6lG9FVGSZbKVLmDXFPCKpQgohL2A71Xl\\n25AfWXSYXX5WH3cE/UCtxwtBpVoYOopPgwJh1wN9TUKuOqzP6/3+SgQMBExNIT2s\\nDPzqJ49bjPpQiPBOZOxJWIYYTdUi/YpQVTZ3vGytpUAKgcKS0SMqEVCRWqMzOxqH\\no27pUcvCWUvB99v77HsJQUwWCrOSsKK5L7vDG/1aOQKBgQDu8RH6QMi9BnNYCc4E\\nRTbBQeNNZkRpD4h43PynIJM0YhBXULD+LE4h/27nAEOu+5iFW/LkwxoMcf30UhXN\\n3OjtjfMzR7FcLuTQQzGbIa0xEbvk0VE0JPu8/lZnzVeuehvC6mKqIQtv4jDGrpVU\\nkJB8axrLQTUMnbKTHdz+/UhxCQKBgQDMO5EMCUY9LMzTD1R+BK4r3qrFqKJGp1wd\\nLVcUvLZv5A3mzFKrHyeATw6NCMp4iSDcNCwQCuFUjYYYmmc68AE0GkU5JOSi3Xw9\\noOtRQKHpFN1p01FpuZ/h99qrnCLjQkF4ooJOa2ixrBGWfxCLSNAFrRJEYpSsKS+U\\nWKHRMWRiuwKBgDdfn0PChFhzQZjTVJPRwj+vc7jJcpnm2eSH4qb5KD3OB3/JTLZ6\\nxJ6w7mIPSADZGO4IX12O+FdEQeakiWKsR9VBBdRwQDnVEYqrcGqddIv27RTrBV3I\\nXJOSKyVQwGEVRITFbZXVwVDj2fIVndfng+RFBiQ+5pZ7KR0A9D+A1RhpAoGBAMSm\\nUjrDnaz6RiaRguBpWqS9QzJmFbhxcl7hRa7lrqWzBhHjvBwE9OkTqMJ7TYBw6bMc\\nxO3lXDxIhTqNw0Y7MsZZdO96NvuB3Z2FHH7Vw/CcPA0jzUgqqwJcyBZIkl8nx0HN\\nZ/qQ5jLIiCzI+ixoZsZJYpxkxZgcDTjGK7n45D/bAoGAB1ALGisNkA8OR35oMedk\\n9NwsnksdOz0DHcuHE7APDiCNkGVp2x0ZrGRBV6x+qy6hgYFLNB+kDxNtWvyDkiLO\\nDC5XUA4mPF4btHgvVG3/5NpVJZGU2r9M07zHYyCdFCBFX93+EKMNYFLtC75Cj3A+\\nrQVqm5nZC/+90P2uFCFnO5c=\\n-----END PRIVATE KEY-----\\n","client_email":"x@grantflow.iam.gserviceaccount.com","client_id":"1000000000","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"","universe_domain":"googleapis.com"}'
    os.environ.setdefault("FIREBASE_SERVICE_ACCOUNT_CREDENTIALS", mock_creds)
    os.environ.setdefault("LLM_SERVICE_ACCOUNT_CREDENTIALS", mock_creds)
    os.environ.setdefault("JWT_SECRET", "abc123")
    os.environ.setdefault("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT", "https://test.com")
    os.environ.setdefault("AZURE_DOCUMENT_INTELLIGENCE_KEY", "abc123")
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "grantflow")
    os.environ.setdefault("GOOGLE_CLOUD_REGION", "us-central1")
    os.environ.setdefault("ADMIN_ACCESS_CODE", "123456")
    os.environ.setdefault("ANTHROPIC_API_KEY", "sd-ant-api03-ABC123")


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


@pytest.fixture
def mock_generative_model() -> Generator[Mock, Any, None]:
    init_ref.value = True
    with patch("vertexai.generative_models.GenerativeModel") as mock:
        mock_instance = Mock(spec=GenerativeModel)
        mock.return_value = mock_instance
        yield mock


@pytest.fixture(scope="session")
async def test_client(
    async_session_maker: async_sessionmaker[Any], valkey_connection_string: str
) -> AsyncGenerator[TestingClientType, None]:
    firebase_uid = "a" * 128

    firebase_app_ref.value = Mock()

    init_ref.value = True

    os.environ["VALKEY_CONNECTION_STRING"] = valkey_connection_string

    with (
        patch("src.api.main.before_server_start"),
        patch("src.utils.ai.get_vertex_credentials", return_value=Mock()),
        patch("src.utils.ai.init", return_value=None),
        patch("firebase_admin.auth.verify_id_token", return_value={"uid": firebase_uid}),
        patch("jwt.decode", return_value={"sub": firebase_uid}),
        patch("src.utils.firebase.get_firebase_app", return_value=firebase_app_ref.value),
        patch("firebase_admin.initialize_app", return_value=Mock()),
    ):
        from services.backend.src.api.main import app

        # this is usually happening in the `before_server_start` hook, which we are patching above ~keep
        app.state.session_maker = async_session_maker

        async with AsyncTestClient(app=app) as client:
            yield client


@pytest.fixture
def otp_code(firebase_uid: str) -> str:
    return create_jwt(firebase_uid)


@pytest.fixture(scope="session")
def logger() -> Logger:
    return getLogger("e2e")


@pytest.fixture
def mock_admin_code(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_ACCESS_CODE", "test-admin-code")


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
async def valkey_connection_string() -> AsyncGenerator[str, None]:
    container_name = "test_valkey_container"

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
            "-p",
            f"{local_port}:6379",
            "-d",
            "valkey/valkey:latest",
        ]
    )

    await sleep(3)

    connection_string = f"redis://0.0.0.0:{local_port}/0"

    test_command = ["docker", "exec", container_name, "redis-cli", "ping"]
    process_result = await run_process(test_command)
    assert process_result.stdout.strip().decode("utf-8") == "PONG", "Valkey container is not responding to PING"

    yield connection_string

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
    cfp_content_file = FIXTURES_FOLDER / "cfps" / "nih.md"
    assert cfp_content_file.exists(), f"File {cfp_content_file} does not exist"

    contents = cfp_content_file.read_text()
    return mocker.patch("src.utils.extraction.extract_webpage_content", new_callable=AsyncMock, return_value=contents)


@pytest.fixture
def signal_dispatch_mock() -> Generator[Mock, None]:
    with patch("litestar.events.emitter.SimpleEventEmitter.emit") as mock:
        yield mock


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
async def melanoma_alliance_full_application_id(
    workspace: Workspace,
    research_objectives: list[ResearchObjective],
    async_session_maker: async_sessionmaker[Any],
) -> str:
    form_inputs: dict[str, str] = {
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
    return await create_grant_application_data(
        workspace=workspace,
        research_objectives=research_objectives,
        form_inputs=form_inputs,
        async_session_maker=async_session_maker,
        fixture_id="43b4aed5-8549-461f-9290-5ee9a630ac9a",
        cfp_markdown_file_name="melanoma_alliance.md",
        source_file_names=["MRA-2023-2024-RFP-Final.pdf"],
    )


@pytest.fixture
async def nih_organization(
    async_session_maker: async_sessionmaker[Any],
) -> FundingOrganization:
    return await process_funding_organization(async_session_maker, "NIH")


@pytest.fixture
async def erc_organization(
    async_session_maker: async_sessionmaker[Any],
) -> FundingOrganization:
    return await process_funding_organization(async_session_maker, "ERC")


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
