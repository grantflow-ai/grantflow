import os
from collections.abc import AsyncGenerator, Generator
from typing import Any
from unittest.mock import AsyncMock, Mock, patch

import pytest
from litestar import Litestar
from litestar.testing import AsyncTestClient
from packages.db.src.json_objects import ResearchDeepDive, ResearchObjective, ResearchTask
from packages.db.src.tables import (
    FundingOrganization,
    Workspace,
)
from packages.shared_utils.src.ai import init_ref
from pytest_mock import MockerFixture
from services.backend.src.utils.firebase import firebase_app_ref
from services.backend.src.utils.jwt import create_jwt
from services.backend.tests.test_utils import (
    create_grant_application_data,
    process_funding_organization,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER
from vertexai.generative_models import GenerativeModel

pytest_plugins = ["testing.base_test_plugin", "testing.db_test_plugin", "testing.valkey_test_plugin"]

TestingClientType = AsyncTestClient[Litestar]


@pytest.fixture
def otp_code(firebase_uid: str) -> str:
    return create_jwt(firebase_uid)


@pytest.fixture
def mock_admin_code(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_ACCESS_CODE", "test-admin-code")


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
        patch("services.backend.src.main.before_server_start"),
        patch("packages.shared_utils.src.ai.get_vertex_credentials", return_value=Mock()),
        patch("packages.shared_utils.src.ai.init", return_value=None),
        patch("firebase_admin.auth.verify_id_token", return_value={"uid": firebase_uid}),
        patch("jwt.decode", return_value={"sub": firebase_uid}),
        patch("services.backend.src.utils.firebase.get_firebase_app", return_value=firebase_app_ref.value),
        patch("firebase_admin.initialize_app", return_value=Mock()),
    ):
        from services.backend.src.main import app

        # this is usually happening in the `before_server_start` hook, which we are patching above ~keep
        app.state.session_maker = async_session_maker

        async with AsyncTestClient(app=app) as client:
            yield client


@pytest.fixture
async def mock_extract_webpage_content(mocker: MockerFixture) -> AsyncMock:
    cfp_content_file = FIXTURES_FOLDER / "cfps" / "nih.md"
    assert cfp_content_file.exists(), f"File {cfp_content_file} does not exist"

    contents = cfp_content_file.read_text()
    return mocker.patch(
        "services.indexer.src.extraction.extract_webpage_content", new_callable=AsyncMock, return_value=contents
    )


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
    form_inputs: ResearchDeepDive = {
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
