from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from packages.db.src.json_objects import GrantElement, GrantLongFormSection, ResearchObjective
from packages.db.src.tables import GrantApplication, GrantTemplate
from packages.shared_utils.src.exceptions import BackendError, DatabaseError, ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import (
    GrantApplicationFactory,
    WorkspaceFactory,
)

from services.rag.src.grant_application.handler import (
    generate_grant_section_texts,
    generate_work_plan_text,
    grant_application_text_generation_pipeline_handler,
)
from services.rag.src.grant_application.utils import is_grant_long_form_section


@pytest.fixture
def mock_publish_notification() -> AsyncMock:
    return AsyncMock(return_value="message-id-123")


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
            "is_detailed_workplan": False,
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
            "is_detailed_workplan": True,
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
            "is_detailed_workplan": False,
            "is_clinical_trial": False,
        },
    ]


@pytest.fixture
async def test_application(async_session_maker: async_sessionmaker[Any]) -> GrantApplication:
    async with async_session_maker() as session:
        workspace = WorkspaceFactory.build()
        session.add(workspace)
        await session.flush()

        application = GrantApplicationFactory.build(
            title="Novel Biomarkers for Early Cancer Detection",
            workspace_id=workspace.id,
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
                    "is_detailed_workplan": False,
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
                    "is_detailed_workplan": True,
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
                    "is_detailed_workplan": False,
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
    mock_publish_notification: AsyncMock,
    mock_research_objectives: list[ResearchObjective],
    mock_enrichment_response: dict[str, Any],
    mock_relationships: dict[str, list[tuple[str, str, str]]],
    mock_work_plan_component_text: str,
    mock_grant_sections: list[GrantElement | GrantLongFormSection],
) -> None:
    workplan_section = next(
        s for s in mock_grant_sections if is_grant_long_form_section(s) and s.get("is_detailed_workplan")
    )

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
        patch(
            "services.rag.src.grant_application.handler.publish_notification",
            mock_publish_notification,
        ),
    ):
        result = await generate_work_plan_text(
            application_id=str(UUID("550e8400-e29b-41d4-a716-446655440000")),
            work_plan_section=workplan_section,
            form_inputs={"background_context": "Test project summary"},
            research_objectives=mock_research_objectives,
        )

    assert isinstance(result, str)
    assert len(result) > 0

    assert mock_publish_notification.call_count > 0

    notification_events = [
        call.kwargs["event"] for call in mock_publish_notification.call_args_list if "event" in call.kwargs
    ]

    assert "extracting_relationships" in notification_events
    assert "enriching_objectives" in notification_events
    assert "objectives_enriched" in notification_events
    assert "generating_workplan" in notification_events
    assert "generating_objective" in notification_events
    assert "generating_tasks" in notification_events
    assert "objective_completed" in notification_events
    assert "workplan_completed" in notification_events


async def test_generate_grant_section_texts_with_mocked_llm(
    mock_publish_notification: AsyncMock,
    mock_research_objectives: list[ResearchObjective],
    mock_grant_sections: list[GrantElement | GrantLongFormSection],
    mock_section_text: str,
) -> None:
    with (
        patch("services.rag.src.grant_application.handler.generate_work_plan_text", return_value=mock_section_text),
        patch("services.rag.src.grant_application.handler.generate_section_text", return_value=mock_section_text),
        patch(
            "services.rag.src.grant_application.handler.publish_notification",
            mock_publish_notification,
        ),
    ):
        result = await generate_grant_section_texts(
            application_id=str(UUID("550e8400-e29b-41d4-a716-446655440000")),
            form_inputs={"background_context": "Test project summary"},
            grant_sections=mock_grant_sections,
            research_objectives=mock_research_objectives,
        )

    assert isinstance(result, dict)
    assert len(result) == len(mock_grant_sections)

    for section in mock_grant_sections:
        assert section["id"] in result
        assert isinstance(result[section["id"]], str)
        assert len(result[section["id"]]) > 0


async def test_grant_application_text_generation_pipeline_handler_with_mocked_llm(
    mock_publish_notification: AsyncMock,
    test_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    section_texts = {
        "abstract": "This is the abstract text.",
        "research_plan": "This is the research plan text.",
        "impact": "This is the impact text.",
    }

    application_text = """
    # Novel Biomarkers for Early Cancer Detection

    ## Abstract
    This is the abstract text.

    ## Research Plan
    This is the research plan text.

    ## Impact
    This is the impact text.
    """

    with (
        patch(
            "services.rag.src.grant_application.handler.generate_grant_section_texts",
            return_value=section_texts,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_application_text",
            return_value=application_text,
        ),
        patch(
            "services.rag.src.grant_application.handler.publish_notification",
            mock_publish_notification,
        ),
    ):
        result_text, result_sections = await grant_application_text_generation_pipeline_handler(
            grant_application_id=test_application.id,
            session_maker=async_session_maker,
        )

    assert result_text == application_text
    assert result_sections == section_texts

    assert mock_publish_notification.call_count > 0

    notification_events = [
        call.kwargs["event"] for call in mock_publish_notification.call_args_list if "event" in call.kwargs
    ]

    assert "grant_application_generation_started" in notification_events
    assert "validating_template" in notification_events
    assert "template_validated" in notification_events
    assert "generating_section_texts" in notification_events
    assert "section_texts_generated" in notification_events
    assert "assembling_application" in notification_events
    assert "saving_application" in notification_events
    assert "application_saved" in notification_events
    assert "grant_application_generation_completed" in notification_events

    async with async_session_maker() as session:
        updated_application = await session.get(GrantApplication, test_application.id)
        assert updated_application.text == application_text


async def test_pipeline_handler_validation_error(
    mock_publish_notification: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session:
        workspace = WorkspaceFactory.build()
        session.add(workspace)
        await session.flush()

        application = GrantApplicationFactory.build(
            title="Incomplete Application",
            workspace_id=workspace.id,
        )
        session.add(application)
        await session.commit()
        application_id = application.id

    with (
        patch(
            "services.rag.src.grant_application.handler.publish_notification",
            mock_publish_notification,
        ),
        pytest.raises(ValidationError),
    ):
        await grant_application_text_generation_pipeline_handler(
            grant_application_id=application_id,
            session_maker=async_session_maker,
        )

    assert mock_publish_notification.call_count > 0

    error_calls = [
        call for call in mock_publish_notification.call_args_list if call.kwargs.get("event") == "validation_error"
    ]

    assert len(error_calls) > 0, "Validation error notification not found"


async def test_pipeline_handler_backend_error(
    mock_publish_notification: AsyncMock,
    test_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    error_message = "Test backend error"
    with (
        patch(
            "services.rag.src.grant_application.handler.generate_grant_section_texts",
            side_effect=BackendError(error_message, context={"test": "context"}),
        ),
        patch(
            "services.rag.src.grant_application.handler.publish_notification",
            mock_publish_notification,
        ),
        pytest.raises(BackendError),
    ):
        await grant_application_text_generation_pipeline_handler(
            grant_application_id=test_application.id,
            session_maker=async_session_maker,
        )

    assert mock_publish_notification.call_count > 0

    error_calls = [
        call for call in mock_publish_notification.call_args_list if call.kwargs.get("event") == "generation_error"
    ]

    assert len(error_calls) > 0, "Generation error notification not found"

    error_data = error_calls[0].kwargs["data"]
    assert isinstance(error_data, dict)
    assert "Failed to generate grant application text:" in error_data["message"]
    assert "data" in error_data
    assert error_data["data"].get("error_type") == "BackendError"
    assert error_data["data"].get("test") == "context"


async def test_pipeline_handler_database_error(
    mock_publish_notification: AsyncMock,
    test_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    section_texts = {
        "abstract": "This is the abstract text.",
        "research_plan": "This is the research plan text.",
        "impact": "This is the impact text.",
    }

    application_text = "# Test Application Text"

    with (
        patch(
            "services.rag.src.grant_application.handler.generate_grant_section_texts",
            return_value=section_texts,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_application_text",
            return_value=application_text,
        ),
        patch(
            "services.rag.src.grant_application.handler.publish_notification",
            mock_publish_notification,
        ),
        patch(
            "services.rag.src.grant_application.handler.update",
            side_effect=SQLAlchemyError("Test database error"),
        ),
        pytest.raises(DatabaseError),
    ):
        await grant_application_text_generation_pipeline_handler(
            grant_application_id=test_application.id,
            session_maker=async_session_maker,
        )

    assert mock_publish_notification.call_count > 0

    error_calls = [
        call for call in mock_publish_notification.call_args_list if call.kwargs.get("event") == "database_error"
    ]

    assert len(error_calls) > 0, "Database error notification not found"

    error_data = error_calls[0].kwargs["data"]
    assert isinstance(error_data, dict)
    assert "Failed to update grant application text." in error_data["message"]
