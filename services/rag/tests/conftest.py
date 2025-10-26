import logging
from collections.abc import Callable
from typing import Any, cast
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from dotenv import load_dotenv
from packages.db.src.enums import GrantType
from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive, ResearchObjective, ResearchTask
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationSource,
    GrantingInstitution,
    GrantTemplate,
    GrantTemplateSource,
    Project,
    RagSource,
)
from pytest_mock import MockerFixture
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER
from testing.factories import GrantSectionFactory
from testing.scenarios.base import BaseScenario, list_available_scenarios, load_scenario
from testing.utils import create_grant_application_data, process_granting_institution

from services.rag.src.utils.lengths import create_word_constraint

load_dotenv()

pytest_plugins = ["testing.base_test_plugin", "testing.db_test_plugin", "testing.pubsub_test_plugin"]


@pytest.fixture(scope="session", autouse=True)
def preload_models() -> None:
    import logging
    import time

    logger = logging.getLogger(__name__)
    logger.info("Preloading ML models for RAG tests...")
    start_time = time.time()

    try:
        from packages.shared_utils.src.embeddings import get_embedding_model

        model = get_embedding_model()
        logger.info("Successfully preloaded embedding model: %s", type(model).__name__)

        warmup_text = ["test sentence for model warmup"]
        _ = model.encode(warmup_text, convert_to_tensor=True)
        logger.info("Embedding model warmup completed")

        from packages.shared_utils.src.nlp import get_spacy_model

        nlp = get_spacy_model()
        logger.info("Successfully preloaded spaCy model: %s", nlp.meta.get("name", "unknown"))

        _ = nlp("Test sentence for spaCy warmup.")
        logger.info("spaCy model warmup completed")

    except (ImportError, OSError, RuntimeError) as e:
        logger.warning("Failed to preload some models: %s", e)

    elapsed_time = time.time() - start_time
    logger.info("Model preloading completed in %.2f seconds", elapsed_time)


@pytest.fixture
def available_scenarios() -> list[str]:
    return list_available_scenarios()


@pytest.fixture
def scenario_loader() -> Callable[[str], BaseScenario]:
    return load_scenario


GRANT_APPLICATION_ID = UUID("43b4aed5-8549-461f-9290-5ee9a630ac9a")
MELANOMA_APPLICATION_ID = "43b4aed5-8549-461f-9290-5ee9a630ac9a"
TEST_APPLICATIONS = {
    "melanoma_alliance": MELANOMA_APPLICATION_ID,
}


@pytest.fixture
def application_ids() -> dict[str, str]:
    return TEST_APPLICATIONS


@pytest.fixture
async def melanoma_application_data(async_session_maker: async_sessionmaker[Any]) -> dict[str, Any]:
    from packages.db.src.utils import retrieve_application

    async with async_session_maker() as session:
        application = await retrieve_application(application_id=MELANOMA_APPLICATION_ID, session=session)

        return {
            "application_id": MELANOMA_APPLICATION_ID,
            "application": application,
            "grant_template": application.grant_template,
            "research_objectives": application.research_objectives or {},
            "grant_sections": application.grant_template.grant_sections if application.grant_template else [],
            "organization_id": application.grant_template.granting_institution_id
            if application.grant_template
            else None,
        }


@pytest.fixture
def simple_test_objectives() -> list[dict[str, Any]]:
    return [
        {
            "id": "obj-1",
            "number": 1,
            "title": "Develop immunotherapy approach",
            "description": "Create and validate new CAR-T cell therapy",
            "research_tasks": [
                {
                    "id": "task-1-1",
                    "number": 1,
                    "title": "Design CAR construct",
                    "description": "Engineer CAR targeting melanoma antigens",
                },
                {
                    "id": "task-1-2",
                    "number": 2,
                    "title": "In vitro validation",
                    "description": "Test CAR-T cell efficacy in models",
                },
            ],
        },
        {
            "id": "obj-2",
            "number": 2,
            "title": "Evaluate treatment efficacy",
            "description": "Assess therapeutic potential in models",
            "research_tasks": [
                {
                    "id": "task-2-1",
                    "number": 1,
                    "title": "Mouse model studies",
                    "description": "Test therapy in xenograft models",
                },
                {
                    "id": "task-2-2",
                    "number": 2,
                    "title": "Biomarker analysis",
                    "description": "Identify predictive biomarkers",
                },
            ],
        },
        {
            "id": "obj-3",
            "number": 3,
            "title": "Optimize treatment protocol",
            "description": "Refine dosing and delivery methods",
            "research_tasks": [
                {
                    "id": "task-3-1",
                    "number": 1,
                    "title": "Dose optimization",
                    "description": "Determine optimal cell dose",
                }
            ],
        },
    ]


@pytest.fixture
def baseline_performance_targets() -> dict[str, float]:
    return {
        "total_time_limit": 900,
        "work_plan_time_limit": 300,
        "section_gen_time_limit": 600,
        "enrichment_time_limit": 180,
        "min_sections": 3,
        "min_characters": 1000,
    }


@pytest.fixture
def mock_job_manager() -> AsyncMock:
    manager = AsyncMock()
    manager.ensure_not_cancelled = AsyncMock(return_value=None)
    manager.add_notification = AsyncMock(return_value=None)
    manager.update_job_status = AsyncMock(return_value=None)

    async def mock_to_next_stage(dto: Any) -> None:
        if hasattr(manager, "current_stage") and hasattr(manager, "pipeline_stages"):
            current_index = manager.pipeline_stages.index(manager.current_stage)
            if current_index < len(manager.pipeline_stages) - 1:
                manager.current_stage = manager.pipeline_stages[current_index + 1]

    manager.to_next_job_stage = AsyncMock(side_effect=mock_to_next_stage)
    manager.get_or_create_job = AsyncMock()
    manager.job = None
    manager.job_id = None
    manager.current_stage = None
    manager.pipeline_stages = []
    return manager


@pytest.fixture
def mock_handle_completions_request(mocker: MockerFixture) -> AsyncMock:
    mock = mocker.patch("services.rag.src.utils.completion.handle_completions_request")
    mock.return_value = {
        "summary": "Mocked summary",
        "sections": [],
        "objectives": [],
        "content": "Mocked content",
    }
    return mock


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
            length_constraint=create_word_constraint(285, None),
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
            length_constraint=create_word_constraint(1806, None),
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
            length_constraint=create_word_constraint(361, None),
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
            length_constraint=create_word_constraint(361, None),
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
            length_constraint=create_word_constraint(361, None),
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
        "granting_institution_id": None,
        "submission_date": "2025-04-26",
    }


@pytest.fixture
async def nih_organization(
    async_session_maker: async_sessionmaker[Any],
) -> GrantingInstitution:
    return await process_granting_institution(async_session_maker, "NIH")


@pytest.fixture
async def erc_organization(
    async_session_maker: async_sessionmaker[Any],
) -> GrantingInstitution:
    return await process_granting_institution(async_session_maker, "ERC")


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
async def melanoma_alliance_full_application(
    project: Project,
    research_objectives: list[ResearchObjective],
    async_session_maker: async_sessionmaker[Any],
) -> GrantApplication:
    from uuid import UUID

    from packages.db.src.query_helpers import select_active
    from sqlalchemy.orm import selectinload

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
    application_id = await create_grant_application_data(
        project=project,
        research_objectives=research_objectives,
        form_inputs=form_inputs,
        async_session_maker=async_session_maker,
        fixture_id="43b4aed5-8549-461f-9290-5ee9a630ac9a",
        cfp_markdown_file_name="melanoma_alliance.md",
        source_file_names=["MRA-2023-2024-RFP-Final.pdf"],
    )

    async with async_session_maker() as session:
        grant_application: GrantApplication | None = await session.scalar(
            select_active(GrantApplication)
            .where(GrantApplication.id == UUID(application_id))
            .options(selectinload(GrantApplication.grant_template))
        )

        if not grant_application:
            raise ValueError(f"Grant application not found with ID: {application_id}")

        return grant_application


@pytest.fixture
async def grant_template_with_sections(
    grant_application: GrantApplication,
    grant_sections: list[GrantLongFormSection],
    async_session_maker: async_sessionmaker[Any],
) -> GrantTemplate:
    from testing.factories import GrantTemplateFactory

    async with async_session_maker() as session:
        template = GrantTemplateFactory.build(
            grant_application_id=grant_application.id,
            grant_sections=grant_sections,
            granting_institution_id=None,
        )
        session.add(template)
        await session.commit()

        application = await session.get(GrantApplication, grant_application.id)
        application.grant_template_id = template.id
        await session.commit()

        await session.refresh(template)
        return template


@pytest.fixture
async def template_rag_source(
    grant_template_with_sections: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
) -> RagSource:
    from testing.factories import RagUrlFactory

    async with async_session_maker() as session:
        source = RagUrlFactory.build(
            url="https://example.com/grant-template.pdf",
        )
        session.add(source)
        await session.flush()

        template_source = GrantTemplateSource(
            rag_source_id=source.id,
            grant_template_id=grant_template_with_sections.id,
        )
        session.add(template_source)

        await session.commit()
        await session.refresh(source)
        return cast("RagSource", source)


@pytest.fixture
async def application_rag_source(
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> RagSource:
    from testing.factories import RagUrlFactory

    async with async_session_maker() as session:
        source = RagUrlFactory.build(
            url="https://example.com/application-doc.pdf",
        )
        session.add(source)
        await session.flush()

        application_source = GrantApplicationSource(
            rag_source_id=source.id,
            grant_application_id=grant_application.id,
        )
        session.add(application_source)

        await session.commit()
        await session.refresh(source)
        return cast("RagSource", source)


@pytest.fixture
def sample_cfp_content() -> list[dict[str, Any]]:
    return [
        {"title": "Introduction", "subtitles": ["Background", "Purpose"]},
        {"title": "Research Plan", "subtitles": ["Methods", "Analysis"]},
        {"title": "Evaluation", "subtitles": ["Metrics", "Timeline"]},
    ]


@pytest.fixture
def cfp_subject() -> str:
    return "Test grant for researching innovative approaches to healthcare"


@pytest.fixture
def mock_research_objectives() -> list[dict[str, Any]]:
    return [
        {
            "id": "obj-1",
            "number": 1,
            "title": "Develop immunotherapy approach",
            "description": "Create and validate new CAR-T cell therapy",
            "research_tasks": [
                {
                    "id": "task-1-1",
                    "number": 1,
                    "title": "Design CAR construct",
                    "description": "Engineer CAR targeting melanoma antigens",
                }
            ],
        },
        {
            "id": "obj-2",
            "number": 2,
            "title": "Evaluate treatment efficacy",
            "description": "Assess therapeutic potential in models",
            "research_tasks": [
                {
                    "id": "task-2-1",
                    "number": 1,
                    "title": "Mouse model studies",
                    "description": "Test therapy in xenograft models",
                }
            ],
        },
    ]


@pytest.fixture
def mock_enrichment_response() -> dict[str, Any]:
    return {
        "enriched_objective": "Enhanced objective text",
        "search_queries": ["query1", "query2"],
        "core_scientific_terms": ["term1", "term2"],
        "scientific_context": "Test scientific context",
    }


@pytest.fixture
def mock_grant_sections() -> list[dict[str, Any]]:
    return [
        {
            "id": "section1",
            "title": "Research Plan",
            "is_detailed_research_plan": True,
            "type": "section",
            "order": 1,
        },
        {
            "id": "section2",
            "title": "Background",
            "is_detailed_research_plan": False,
            "type": "section",
            "order": 2,
        },
    ]


@pytest.fixture
def performance_context(request: pytest.FixtureRequest, logger: logging.Logger) -> Any:
    from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed

    execution_speed = TestExecutionSpeed.SMOKE
    domain = TestDomain.AI_EVALUATION

    for mark in request.node.iter_markers("performance_test"):
        if mark.kwargs:
            execution_speed = mark.kwargs.get("execution_speed", execution_speed)
            domain = mark.kwargs.get("domain", domain)

    return PerformanceTestContext(
        test_name=request.node.name,
        execution_speed=execution_speed,
        domain=domain,
        logger=logger,
    )


@pytest.fixture
async def test_application_with_template(async_session_maker: async_sessionmaker[Any]) -> GrantApplication:
    from packages.db.src.json_objects import ResearchObjective, ResearchTask
    from testing.factories import OrganizationFactory, ProjectFactory

    async with async_session_maker() as session:
        organization = OrganizationFactory.build()
        session.add(organization)
        await session.flush()

        project = ProjectFactory.build(organization_id=organization.id)
        session.add(project)
        await session.flush()

        application = GrantApplication(
            id=UUID("00000000-0000-0000-0000-000000000002"),
            title="Test Grant Application",
            project_id=project.id,
            research_objectives=[
                ResearchObjective(
                    number=1,
                    title="Test Objective 1",
                    research_tasks=[
                        ResearchTask(number=1, title="Task 1.1"),
                        ResearchTask(number=2, title="Task 1.2"),
                    ],
                ),
                ResearchObjective(
                    number=2,
                    title="Test Objective 2",
                    research_tasks=[
                        ResearchTask(number=1, title="Task 2.1"),
                        ResearchTask(number=2, title="Task 2.2"),
                    ],
                ),
            ],
        )
        session.add(application)
        await session.flush()

        template = GrantTemplate(
            id=UUID("00000000-0000-0000-0000-000000000001"),
            grant_application_id=application.id,
            granting_institution_id=None,
            grant_sections=[
                {
                    "id": "abstract",
                    "title": "Abstract",
                    "order": 1,
                    "parent_id": None,
                    "keywords": ["summary", "overview"],
                    "topics": ["project_overview"],
                    "generation_instructions": "Write a clear abstract.",
                    "depends_on": [],
                    "length_constraint": {"type": "words", "value": 250, "source": None},
                    "search_queries": ["project abstract"],
                    "is_detailed_research_plan": False,
                    "is_clinical_trial": False,
                },
                {
                    "id": "research_plan",
                    "title": "Research Plan",
                    "order": 2,
                    "parent_id": None,
                    "keywords": ["methodology", "design", "procedures"],
                    "topics": ["methods", "experimental_design"],
                    "generation_instructions": "Describe the detailed methodology for the research project.",
                    "depends_on": [],
                    "length_constraint": {"type": "words", "value": 1500, "source": None},
                    "search_queries": ["research methodology", "experimental design"],
                    "is_detailed_research_plan": True,
                    "is_clinical_trial": False,
                },
                {
                    "id": "impact",
                    "title": "Impact",
                    "order": 3,
                    "parent_id": None,
                    "keywords": ["outcomes", "benefits", "significance"],
                    "topics": ["project_impact", "societal_benefits"],
                    "generation_instructions": "Describe the potential impact and significance of this research.",
                    "depends_on": [],
                    "length_constraint": {"type": "words", "value": 500, "source": None},
                    "search_queries": ["research impact", "project significance"],
                    "is_detailed_research_plan": False,
                    "is_clinical_trial": False,
                },
                {
                    "id": "preliminary_results",
                    "title": "Preliminary Results",
                    "order": 4,
                    "parent_id": None,
                    "keywords": ["preliminary", "findings", "data"],
                    "topics": ["preliminary_data", "initial_results"],
                    "generation_instructions": "Present any preliminary data or results.",
                    "depends_on": [],
                    "length_constraint": {"type": "words", "value": 500, "source": None},
                    "search_queries": ["preliminary results", "initial findings"],
                    "is_detailed_research_plan": False,
                    "is_clinical_trial": False,
                },
                {
                    "id": "risks_and_mitigations",
                    "title": "Risks and Mitigations",
                    "order": 5,
                    "parent_id": None,
                    "keywords": ["risks", "challenges", "mitigation"],
                    "topics": ["project_risks", "risk_management"],
                    "generation_instructions": "Identify potential risks and describe mitigation strategies.",
                    "depends_on": [],
                    "length_constraint": {"type": "words", "value": 400, "source": None},
                    "search_queries": ["project risks", "risk mitigation"],
                    "is_detailed_research_plan": False,
                    "is_clinical_trial": False,
                },
            ],
            cfp_analysis={
                "cfp_analysis": {
                    "required_sections": [],
                    "length_constraints": [],
                    "evaluation_criteria": [],
                    "additional_requirements": [],
                    "sections_count": 0,
                    "length_constraints_found": 0,
                    "evaluation_criteria_count": 0,
                },
                "nlp_analysis": {
                    "money": [],
                    "date_time": [],
                    "writing_related": [],
                    "other_numbers": [],
                    "recommendations": [],
                    "orders": [],
                    "positive_instructions": [],
                    "negative_instructions": [],
                    "evaluation_criteria": [],
                },
                "analysis_metadata": {
                    "content_length": 100,
                    "categories_found": 0,
                    "total_sentences": 5,
                },
            },
            grant_type=GrantType.RESEARCH,
        )
        session.add(template)

        application.grant_template = template

        from packages.db.src.enums import SourceIndexingStatusEnum
        from packages.db.src.tables import GrantApplicationSource, RagFile, TextVector
        from packages.shared_utils.src.embeddings import generate_embeddings

        rag_file = RagFile(
            id=UUID("00000000-0000-0000-0000-000000000003"),
            filename="test_document.pdf",
            bucket_name="test-bucket",
            object_path="test/path/test_document.pdf",
            mime_type="application/pdf",
            size=1024,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            text_content="Sample research document content for testing.",
            document_metadata={
                "keywords": [{"keyword": "research"}],
                "entities": [{"text": "testing"}],
                "document_type": "research",
            },
        )
        session.add(rag_file)
        await session.flush()

        grant_app_source = GrantApplicationSource(
            grant_application_id=application.id,
            rag_source_id=rag_file.id,
        )
        session.add(grant_app_source)
        await session.flush()

        chunk_text = "Sample research methodology and experimental design for testing grant application generation."
        embeddings = await generate_embeddings([chunk_text])
        text_vector = TextVector(
            rag_source_id=rag_file.id,
            chunk={"content": chunk_text, "page_number": 1},
            embedding=embeddings[0],
        )
        session.add(text_vector)

        await session.commit()
        await session.refresh(application)

        return application


@pytest.fixture
def mock_grant_application_job_manager() -> AsyncMock:
    from services.rag.src.utils.job_manager import JobManager

    manager = AsyncMock(spec=JobManager)
    manager.job_id = UUID("12345678-1234-5678-9012-123456789012")
    manager.ensure_not_cancelled = AsyncMock(return_value=None)
    manager.add_notification = AsyncMock(return_value=None)
    manager.update_job_status = AsyncMock(return_value=None)
    return manager


@pytest.fixture
def mock_grant_template_job_manager() -> AsyncMock:
    from services.rag.src.utils.job_manager import JobManager

    manager = AsyncMock(spec=JobManager)
    manager.job_id = UUID("12345678-1234-5678-9012-123456789012")
    manager.ensure_not_cancelled = AsyncMock(return_value=None)
    manager.add_notification = AsyncMock(return_value=None)
    manager.update_job_status = AsyncMock(return_value=None)
    return manager
