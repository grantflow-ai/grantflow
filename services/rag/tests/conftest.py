from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from dotenv import load_dotenv
from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective, ResearchTask
from packages.db.src.tables import FundingOrganization, Workspace
from pytest_mock import MockerFixture
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER
from testing.factories import GrantSectionFactory
from testing.test_utils import create_grant_application_data, process_funding_organization

rag_env_file = Path(__file__).parent.parent / ".env"
if rag_env_file.exists():
    load_dotenv(rag_env_file)

pytest_plugins = ["testing.base_test_plugin", "testing.db_test_plugin"]


@pytest.fixture(scope="session", autouse=True)
def preload_models() -> None:
    """Preload ML models during test setup to avoid timeouts during execution."""
    import logging

    logger = logging.getLogger(__name__)
    logger.info("Preloading ML models for RAG tests...")

    try:
        # Preload embedding model (SentenceTransformer)
        from packages.shared_utils.src.embeddings import get_embedding_model

        model = get_embedding_model()
        logger.info("Successfully preloaded embedding model: %s", type(model).__name__)

        # Preload spaCy model
        from packages.shared_utils.src.nlp import get_spacy_model

        nlp = get_spacy_model()
        logger.info("Successfully preloaded spaCy model: %s", nlp.meta.get("name", "unknown"))

    except (ImportError, OSError, RuntimeError) as e:
        logger.warning("Failed to preload some models: %s", e)

    logger.info("Model preloading completed")


GRANT_APPLICATION_ID = UUID("43b4aed5-8549-461f-9290-5ee9a630ac9a")


@pytest.fixture
def organization_mapping() -> dict[str, dict[str, str]]:
    return {
        "e8e8b0df-d6d9-4a27-bb1a-7b8e5a5b8c8e": {"name": "Melanoma Research Alliance", "abbreviation": "MRA"},
        "123e4567-e89b-12d3-a456-426614174000": {"name": "National Institutes of Health", "abbreviation": "NIH"},
        "987fcdeb-51a2-4b3d-8f9e-123456789abc": {"name": "European Research Council", "abbreviation": "ERC"},
        "456789ab-cdef-1234-5678-90abcdef1234": {"name": "Standard Awards Foundation", "abbreviation": "SAF"},
        "789abcde-f012-3456-789a-bcdef0123456": {"name": "Innovation in Cancer Screening", "abbreviation": "ICS"},
    }


@pytest.fixture
def grant_sections() -> list[GrantLongFormSection]:
    return [
        GrantSectionFactory.build(
            name="abstract",
            title="Abstract",
            order=1,
            is_research_plan=False,
            keywords=[
                "research goals",
                "objectives",
                "impact",
                "melanoma",
                "treatment",
                "diagnosis",
                "prevention",
            ],
            topics=["project_summary", "technical_abstract"],
            generation_instructions="Provide a concise summary of the proposed research project, including the project's goals, objectives, and significance. The abstract should be written in a clear and accessible style, as it will be read by a broad audience of scientists and administrators.",
            depends_on=["research_strategy"],
            max_words=285,
            search_queries=[
                "melanoma research objectives methodology impact",
                "project goals innovation significance melanoma",
                "technical approach outcomes melanoma research",
                "melanoma detection diagnosis treatment",
                "melanoma prevention research",
                "melanoma immunotherapy",
                "melanoma biomarker discovery",
                "melanoma clinical trials",
            ],
        ),
        GrantSectionFactory.build(
            name="research_strategy",
            title="Research Strategy",
            parent_id="narrative",
            order=2,
            is_research_plan=True,
            keywords=[
                "methodology",
                "experimental design",
                "data analysis",
                "melanoma",
                "immunotherapy",
                "targeted therapy",
                "biomarkers",
            ],
            topics=[
                "background_context",
                "hypothesis",
                "methodology",
                "expected_outcomes",
                "research_objectives",
            ],
            generation_instructions="Describe the overall research strategy, methodology, and analyses to be used to accomplish the specific aims of the project. Discuss potential problems and alternative strategies.",
            depends_on=[],
            max_words=1806,
            search_queries=[
                "melanoma research methodology experimental design protocols",
                "data collection analysis methods melanoma",
                "melanoma experimental approach techniques",
                "research strategy implementation melanoma",
                "melanoma immunotherapy research",
                "melanoma targeted therapy research",
                "melanoma biomarker discovery research",
                "melanoma clinical trial design",
            ],
        ),
        GrantSectionFactory.build(
            name="preliminary_results",
            title="Preliminary Results",
            parent_id="research_strategy",
            order=1,
            is_research_plan=False,
            keywords=[
                "data",
                "analysis",
                "interpretation",
                "melanoma",
                "research",
                "findings",
            ],
            topics=["preliminary_data", "research_feasibility"],
            generation_instructions="Present any preliminary data that is relevant to the proposed research project. Discuss the significance of the data and how it supports the feasibility of the project.",
            depends_on=["research_strategy"],
            max_words=361,
            search_queries=[
                "melanoma preliminary data results analysis",
                "research feasibility interpretation melanoma",
                "data significance relevance melanoma",
                "melanoma research findings",
                "melanoma preliminary experimental data",
            ],
        ),
        GrantSectionFactory.build(
            name="risks_and_mitigations",
            title="Risks and Mitigations",
            parent_id="narrative",
            order=3,
            is_research_plan=False,
            keywords=[
                "risk assessment",
                "contingency plan",
                "mitigation strategies",
                "melanoma",
                "research",
            ],
            topics=["risks_and_mitigations", "research_feasibility"],
            generation_instructions="Describe potential risks associated with the proposed research project, and explain the proposed mitigation strategies to address these risks.",
            depends_on=["research_strategy"],
            max_words=361,
            search_queries=[
                "melanoma research risks assessment",
                "contingency planning research melanoma",
                "mitigation strategies in melanoma research",
                "challenges in melanoma research",
                "feasibility of melanoma research",
            ],
        ),
        GrantSectionFactory.build(
            name="impact",
            title="Potential Impact",
            parent_id="narrative",
            order=4,
            is_research_plan=False,
            keywords=[
                "clinical impact",
                "translational research",
                "melanoma",
                "treatment",
                "diagnosis",
                "prevention",
            ],
            topics=["impact", "knowledge_translation"],
            generation_instructions="Describe the potential clinical and translational impact of the proposed research project. Explain how the project could improve the lives of patients with melanoma.",
            depends_on=["research_strategy"],
            max_words=361,
            search_queries=[
                "melanoma clinical impact research",
                "translational research in melanoma",
                "melanoma treatment improvements",
                "melanoma diagnosis and detection",
                "melanoma prevention strategies",
            ],
        ),
    ]


@pytest.fixture
def grant_template_data(grant_sections: list[GrantLongFormSection]) -> dict[str, Any]:
    return {
        "grant_sections": grant_sections,
        "grant_application_id": str(GRANT_APPLICATION_ID),
        "funding_organization_id": None,
        "submission_date": "2025-04-26",
    }


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
async def mock_extract_webpage_content(mocker: MockerFixture) -> AsyncMock:
    cfp_content_file = FIXTURES_FOLDER / "cfps" / "nih.md"
    assert cfp_content_file.exists(), f"File {cfp_content_file} does not exist"

    contents = cfp_content_file.read_text()
    return mocker.patch(
        "services.indexer.src.extraction.extract_webpage_content", new_callable=AsyncMock, return_value=contents
    )


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
