import logging
from collections.abc import Callable
from typing import Any, cast
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from dotenv import load_dotenv
from packages.db.src.enums import GrantType
from packages.db.src.json_objects import GrantLongFormSection, ResearchObjective, ResearchTask
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationSource,
    GrantTemplate,
    GrantTemplateSource,
    RagSource,
)
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.scenarios.base import BaseScenario, list_available_scenarios, load_scenario

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
