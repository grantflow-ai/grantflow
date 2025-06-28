from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import pytest
from packages.db.src.json_objects import GrantElement, GrantLongFormSection, ResearchObjective
from packages.db.src.tables import GrantApplication, GrantTemplate
from packages.shared_utils.src.exceptions import BackendError, DatabaseError, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload
from testing.factories import (
    GrantApplicationFactory,
    ProjectFactory,
)

from services.rag.src.constants import NotificationEvents
from services.rag.src.grant_application.handler import (
    generate_grant_section_texts,
    generate_work_plan_text,
    grant_application_text_generation_pipeline_handler,
)
from services.rag.src.grant_application.utils import is_grant_long_form_section


def create_mock_job_manager() -> MagicMock:
    """Create a mock JobManager for testing."""
    mock_job = AsyncMock()
    mock_job.id = UUID("00000000-0000-0000-0000-000000000002")

    mock_job_manager = MagicMock()
    mock_job_manager.create_grant_application_job = AsyncMock(return_value=mock_job)
    mock_job_manager.update_job_status = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()

    return mock_job_manager


@pytest.fixture
def mock_research_objectives() -> list[ResearchObjective]:
    return [
        {
            "number": 1,
            "title": "Develop novel biomarkers for early cancer detection",
            "research_tasks": [
                {
                    "number": 1,
                    "title": "Identify candidate biomarkers through proteomics",
                },
                {
                    "number": 2,
                    "title": "Validate biomarkers in clinical samples",
                },
            ],
        },
        {
            "number": 2,
            "title": "Create a machine learning model for biomarker analysis",
            "research_tasks": [
                {
                    "number": 1,
                    "title": "Design feature extraction algorithms",
                },
                {
                    "number": 2,
                    "title": "Train and validate the model on patient data",
                },
            ],
        },
    ]


@pytest.fixture
def mock_enrichment_response() -> dict[str, Any]:
    return {
        "research_objective": {
            "description": "This objective focuses on developing novel biomarkers for early cancer detection.",
            "instructions": "Describe the approach to biomarker discovery and validation.",
            "guiding_questions": ["What technologies will be used?", "How will specificity be ensured?"],
            "search_queries": ["novel cancer biomarkers", "early detection proteomics"],
        },
        "research_tasks": [
            {
                "description": "This task involves identifying candidate biomarkers through proteomics analysis.",
                "instructions": "Detail the proteomics methods and analysis pipeline.",
                "guiding_questions": ["What mass spectrometry approaches will be used?"],
                "search_queries": ["proteomics cancer biomarkers", "mass spectrometry analysis"],
            },
            {
                "description": "This task involves validating the identified biomarkers in clinical samples.",
                "instructions": "Describe the validation cohort and statistical methods.",
                "guiding_questions": ["What patient populations will be included?"],
                "search_queries": ["biomarker clinical validation", "cancer diagnostic specificity"],
            },
        ],
    }


@pytest.fixture
def mock_relationships() -> dict[str, list[tuple[str, str, str]]]:
    return {
        "1": [
            (
                "1",
                "2",
                "Objective 1 provides the biomarkers that will be analyzed by the machine learning model in Objective 2.",
            ),
        ],
        "1.1": [
            ("1.1", "1.2", "The candidate biomarkers identified in Task 1.1 will be validated in Task 1.2."),
        ],
        "2.1": [
            (
                "2.1",
                "2.2",
                "The feature extraction algorithms developed in Task 2.1 will be used in the model training in Task 2.2.",
            ),
        ],
    }


@pytest.fixture
def mock_work_plan_component_text() -> str:
    return """
    This research component will focus on developing novel biomarkers for early cancer detection.
    We will employ cutting-edge proteomics approaches to identify candidate biomarkers that
    demonstrate high sensitivity and specificity for early-stage cancers. The biomarkers will
    be validated using a large cohort of clinical samples representing diverse patient populations.
    """


@pytest.fixture
def mock_section_text() -> str:
    return """
    # Research Plan

    This research plan outlines our approach to developing and validating novel biomarkers
    for early cancer detection, combined with advanced machine learning techniques for analysis.

    ## Methodology

    Our methodology combines proteomics, clinical validation, and machine learning in an
    integrated workflow designed to maximize biomarker effectiveness.
    """


@pytest.fixture
def mock_grant_sections() -> list[GrantElement | GrantLongFormSection]:
    return [
        {  # type: ignore[typeddict-unknown-key]
            "id": "abstract",
            "title": "Abstract",
            "order": 1,
            "parent_id": None,
            "keywords": ["overview", "summary"],
            "topics": ["project_summary"],
            "generation_instructions": "Write a concise summary of the research project.",
            "depends_on": [],
            "max_words": 300,
            "search_queries": ["research summary", "project overview"],
            "is_detailed_research_plan": False,
            "is_clinical_trial": False,
        },
        {  # type: ignore[typeddict-unknown-key]
            "id": "research_plan",
            "title": "Research Plan",
            "order": 2,
            "parent_id": None,
            "keywords": ["methodology", "design", "procedures"],
            "topics": ["methods", "experimental_design"],
            "generation_instructions": "Describe the detailed methodology for the research project.",
            "depends_on": [],
            "max_words": 1500,
            "search_queries": ["research methodology", "experimental design"],
            "is_detailed_research_plan": True,
            "is_clinical_trial": False,
        },
        {  # type: ignore[typeddict-unknown-key]
            "id": "impact",
            "title": "Impact",
            "order": 3,
            "parent_id": None,
            "keywords": ["significance", "outcomes"],
            "topics": ["expected_outcomes", "potential_impact"],
            "generation_instructions": "Explain the potential impact and significance of the research.",
            "depends_on": ["research_plan"],
            "max_words": 500,
            "search_queries": ["research impact", "project significance"],
            "is_detailed_research_plan": False,
            "is_clinical_trial": False,
        },
    ]


@pytest.fixture
async def test_application(async_session_maker: async_sessionmaker[Any]) -> GrantApplication:
    async with async_session_maker() as session:
        project = ProjectFactory.build()
        session.add(project)
        await session.flush()

        application = GrantApplicationFactory.build(
            title="Novel Biomarkers for Early Cancer Detection",
            project_id=project.id,
            form_inputs={
                "project_summary": "This project aims to develop novel biomarkers for early cancer detection.",
                "principal_investigator": "Dr. Jane Smith",
                "institution": "Research University",
            },
        )
        session.add(application)
        await session.flush()

        template = GrantTemplate(
            grant_application_id=application.id,
            grant_sections=[
                {
                    "id": "abstract",
                    "title": "Abstract",
                    "order": 1,
                    "parent_id": None,
                    "keywords": ["overview", "summary"],
                    "topics": ["project_summary"],
                    "generation_instructions": "Write a concise summary of the research project.",
                    "depends_on": [],
                    "max_words": 300,
                    "search_queries": ["research summary", "project overview"],
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
                    "max_words": 1500,
                    "search_queries": ["research methodology", "experimental design"],
                    "is_detailed_research_plan": True,
                    "is_clinical_trial": False,
                },
                {
                    "id": "impact",
                    "title": "Impact",
                    "order": 3,
                    "parent_id": None,
                    "keywords": ["significance", "outcomes"],
                    "topics": ["expected_outcomes", "potential_impact"],
                    "generation_instructions": "Explain the potential impact and significance of the research.",
                    "depends_on": ["research_plan"],
                    "max_words": 500,
                    "search_queries": ["research impact", "project significance"],
                    "is_detailed_research_plan": False,
                    "is_clinical_trial": False,
                },
            ],
        )
        session.add(template)

        application.research_objectives = [
            {
                "number": 1,
                "title": "Develop novel biomarkers for early cancer detection",
                "research_tasks": [
                    {
                        "number": 1,
                        "title": "Identify candidate biomarkers through proteomics",
                    },
                    {
                        "number": 2,
                        "title": "Validate biomarkers in clinical samples",
                    },
                ],
            },
            {
                "number": 2,
                "title": "Create a machine learning model for biomarker analysis",
                "research_tasks": [
                    {
                        "number": 1,
                        "title": "Design feature extraction algorithms",
                    },
                    {
                        "number": 2,
                        "title": "Train and validate the model on patient data",
                    },
                ],
            },
        ]

        await session.commit()
        await session.refresh(application)
        return application


async def test_generate_work_plan_text_with_mocked_llm(
    mock_research_objectives: list[ResearchObjective],
    mock_enrichment_response: dict[str, Any],
    mock_relationships: dict[str, list[tuple[str, str, str]]],
    mock_work_plan_component_text: str,
    mock_grant_sections: list[GrantElement | GrantLongFormSection],
) -> None:
    research_plan_section = next(
        s for s in mock_grant_sections if is_grant_long_form_section(s) and s.get("is_detailed_research_plan")
    )

    mock_job_manager = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()

    with (
        patch(
            "services.rag.src.grant_application.handler.handle_extract_relationships",
            return_value=mock_relationships,
        ),
        patch(
            "services.rag.src.grant_application.handler.handle_enrich_objective",
            return_value=mock_enrichment_response,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_work_plan_component_text",
            return_value=mock_work_plan_component_text,
        ),
    ):
        result = await generate_work_plan_text(
            application_id=str(UUID("550e8400-e29b-41d4-a716-446655440000")),
            work_plan_section=research_plan_section,
            form_inputs={"background_context": "Test project summary"},
            research_objectives=mock_research_objectives,
            job_manager=mock_job_manager,
        )

    assert isinstance(result, str)
    assert len(result) > 0

    assert mock_job_manager.add_notification.call_count > 0

    notification_events = [
        call.kwargs["event"] for call in mock_job_manager.add_notification.call_args_list if "event" in call.kwargs
    ]

    assert NotificationEvents.EXTRACTING_RELATIONSHIPS in notification_events
    assert NotificationEvents.ENRICHING_OBJECTIVES in notification_events
    assert NotificationEvents.OBJECTIVES_ENRICHED in notification_events
    assert NotificationEvents.GENERATING_RESEARCH_PLAN in notification_events
    assert NotificationEvents.GENERATING_OBJECTIVE in notification_events
    assert NotificationEvents.GENERATING_TASKS in notification_events
    assert NotificationEvents.OBJECTIVE_COMPLETED in notification_events
    assert NotificationEvents.RESEARCH_PLAN_COMPLETED in notification_events


async def test_generate_grant_section_texts_with_mocked_llm(
    mock_research_objectives: list[ResearchObjective],
    mock_grant_sections: list[GrantElement | GrantLongFormSection],
    mock_section_text: str,
) -> None:
    mock_job_manager = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()

    with (
        patch(
            "services.rag.src.grant_application.handler.generate_work_plan_text",
            return_value="Mocked work plan text.",
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_section_text",
            return_value=mock_section_text,
        ),
    ):
        result = await generate_grant_section_texts(
            application_id=str(UUID("550e8400-e29b-41d4-a716-446655440000")),
            form_inputs={"background_context": "Test project summary"},
            grant_sections=mock_grant_sections,
            research_objectives=mock_research_objectives,
            job_manager=mock_job_manager,
        )

    assert isinstance(result, dict)
    assert "research_plan" in result
    assert "abstract" in result
    assert "impact" in result

    for text in result.values():
        assert isinstance(text, str)
        assert len(text) > 0


async def test_grant_application_text_generation_pipeline_handler_with_mocked_llm(
    test_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    mocked_section_texts = {
        "abstract": "This is the abstract text.",
        "research_plan": "This is the research plan text.",
        "impact": "This is the impact text.",
    }

    mock_job_manager = create_mock_job_manager()

    with (
        patch(
            "services.rag.src.grant_application.handler.verify_rag_sources_indexed",
            return_value=None,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_grant_section_texts",
            return_value=mocked_section_texts,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_application_text",
            return_value="Complete application text",
        ),
    ):
        result_text, section_texts = await grant_application_text_generation_pipeline_handler(
            grant_application_id=test_application.id,
            session_maker=async_session_maker,
            job_manager=mock_job_manager,
        )

    assert mock_job_manager.add_notification.call_count > 0

    assert result_text == "Complete application text"
    assert section_texts == mocked_section_texts

    async with async_session_maker() as session:
        app = await session.get(GrantApplication, test_application.id)
        assert app is not None
        assert app.text == "Complete application text"


async def test_pipeline_missing_grant_template(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session:
        project = ProjectFactory.build()
        session.add(project)
        await session.flush()

        application = GrantApplicationFactory.build(
            title="Test Application",
            project_id=project.id,
            research_objectives=[{"number": 1, "title": "Test Objective", "research_tasks": []}],
        )
        session.add(application)
        await session.commit()

    with pytest.raises(ValidationError) as exc_info:
        await grant_application_text_generation_pipeline_handler(
            grant_application_id=application.id,
            session_maker=async_session_maker,
            job_manager=create_mock_job_manager(),
        )

    assert "grant template" in str(exc_info.value).lower()


async def test_pipeline_missing_research_objectives(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session:
        project = ProjectFactory.build()
        session.add(project)
        await session.flush()

        application = GrantApplicationFactory.build(
            title="Test Application",
            project_id=project.id,
            research_objectives=None,
        )
        session.add(application)
        await session.flush()

        template = GrantTemplate(
            grant_application_id=application.id,
            grant_sections=[{"id": "test", "title": "Test", "order": 1}],
        )
        session.add(template)
        await session.commit()

    with pytest.raises(ValidationError) as exc_info:
        await grant_application_text_generation_pipeline_handler(
            grant_application_id=application.id,
            session_maker=async_session_maker,
            job_manager=create_mock_job_manager(),
        )

    assert "research objectives" in str(exc_info.value).lower()


async def test_pipeline_missing_work_plan_section(
    test_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    with (
        patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        patch("services.rag.src.grant_application.handler.verify_rag_sources_indexed", new_callable=AsyncMock),
    ):
        async with async_session_maker() as session:
            result = await session.execute(
                select(GrantApplication)
                .where(GrantApplication.id == test_application.id)
                .options(selectinload(GrantApplication.grant_template))
            )
            app = result.scalar_one()
            assert app is not None
            assert app.grant_template is not None
            app.grant_template.grant_sections = [
                s for s in app.grant_template.grant_sections if not s.get("is_detailed_research_plan")
            ]
            await session.commit()

        with pytest.raises(ValidationError) as exc_info:
            await grant_application_text_generation_pipeline_handler(
                grant_application_id=test_application.id,
                session_maker=async_session_maker,
                job_manager=create_mock_job_manager(),
            )

        assert "work plan section" in str(exc_info.value).lower()


async def test_pipeline_database_error_during_save(
    test_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    mocked_section_texts = {
        "abstract": "This is the abstract text.",
        "research_plan": "This is the research plan text.",
        "impact": "This is the impact text.",
    }

    mock_job_manager = create_mock_job_manager()

    with (
        patch(
            "services.rag.src.grant_application.handler.verify_rag_sources_indexed",
            return_value=None,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_grant_section_texts",
            return_value=mocked_section_texts,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_application_text",
            return_value="Complete application text",
        ),
        patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        patch(
            "services.rag.src.grant_application.handler.update",
            side_effect=SQLAlchemyError("Database connection failed"),
        ),
    ):
        with pytest.raises(DatabaseError) as exc_info:
            await grant_application_text_generation_pipeline_handler(
                grant_application_id=test_application.id,
                session_maker=async_session_maker,
                job_manager=mock_job_manager,
            )

        assert "failed to update grant application text" in str(exc_info.value).lower()


async def test_pipeline_backend_error_during_generation(
    test_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    mock_job_manager = create_mock_job_manager()

    with (
        patch(
            "services.rag.src.grant_application.handler.verify_rag_sources_indexed",
            return_value=None,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_grant_section_texts",
            side_effect=BackendError("Insufficient context for generation"),
        ),
    ):
        with pytest.raises(BackendError) as exc_info:
            await grant_application_text_generation_pipeline_handler(
                grant_application_id=test_application.id,
                session_maker=async_session_maker,
                job_manager=mock_job_manager,
            )

        assert "insufficient context" in str(exc_info.value).lower()


async def test_generate_work_plan_text_normalizes_markdown(
    mock_research_objectives: list[ResearchObjective],
    mock_enrichment_response: dict[str, Any],
    mock_relationships: dict[str, list[tuple[str, str, str]]],
    mock_grant_sections: list[GrantElement | GrantLongFormSection],
) -> None:
    research_plan_section = next(
        s for s in mock_grant_sections if is_grant_long_form_section(s) and s.get("is_detailed_research_plan")
    )

    messy_text = """


    This text has    multiple    spaces.

    And too many


    newlines.


    """

    mock_job_manager = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()

    with (
        patch(
            "services.rag.src.grant_application.handler.handle_extract_relationships",
            return_value=mock_relationships,
        ),
        patch(
            "services.rag.src.grant_application.handler.handle_enrich_objective",
            return_value=mock_enrichment_response,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_work_plan_component_text",
            return_value=messy_text,
        ),
    ):
        result = await generate_work_plan_text(
            application_id=str(UUID("550e8400-e29b-41d4-a716-446655440000")),
            work_plan_section=research_plan_section,
            form_inputs={"background_context": "Test project summary"},
            research_objectives=mock_research_objectives,
            job_manager=mock_job_manager,
        )

    assert "    " not in result
    assert "\n\n\n" not in result
    assert result.strip() == result
