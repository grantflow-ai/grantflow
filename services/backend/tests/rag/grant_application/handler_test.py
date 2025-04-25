from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from packages.db.src.json_objects import GrantElement, GrantLongFormSection, ResearchObjective
from packages.db.src.tables import GrantApplication, GrantTemplate
from packages.shared_utils.src.exceptions import BackendError, ValidationError
from services.backend.src.dto import WebsocketErrorMessage
from services.backend.src.rag.grant_application.handler import (
    generate_grant_section_texts,
    generate_work_plan_text,
    grant_application_text_generation_pipeline_handler,
)
from services.backend.src.rag.grant_application.utils import is_grant_long_form_section
from services.backend.tests.factories import (
    GrantApplicationFactory,
    WorkspaceFactory,
)
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
def mock_message_handler() -> AsyncMock:
    async def handler(message: Any) -> None:
        pass

    return AsyncMock(side_effect=handler)


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


@pytest.mark.asyncio
async def test_generate_work_plan_text_with_mocked_llm(
    mock_message_handler: AsyncMock,
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
        patch("src.rag.grant_application.handler.handle_extract_relationships", return_value=mock_relationships),
        patch("src.rag.grant_application.handler.handle_enrich_objective", return_value=mock_enrichment_response),
        patch(
            "src.rag.grant_application.handler.generate_work_plan_component_text",
            return_value=mock_work_plan_component_text,
        ),
    ):
        result = await generate_work_plan_text(
            application_id="test-app-id",
            work_plan_section=workplan_section,
            form_inputs={"project_summary": "Test project summary"},
            research_objectives=mock_research_objectives,
            message_handler=mock_message_handler,
        )

    assert isinstance(result, str)
    assert len(result) > 0

    assert mock_message_handler.call_count > 0

    extracting_relationships_found = False
    enriching_objectives_found = False
    objectives_enriched_found = False
    workplan_completed_found = False

    for call in mock_message_handler.call_args_list:
        message = call[0][0]

        if (
            hasattr(message, "type")
            and message.type == "info"
            and hasattr(message, "event")
            and message.event == "extracting_relationships"
            and hasattr(message, "content")
            and "Extracting relationships" in message.content
        ):
            extracting_relationships_found = True

        elif (
            hasattr(message, "type")
            and message.type == "info"
            and hasattr(message, "event")
            and message.event == "enriching_objectives"
            and hasattr(message, "content")
            and "Enriching research objectives" in message.content
        ):
            enriching_objectives_found = True

        elif (
            hasattr(message, "type")
            and message.type == "data"
            and hasattr(message, "event")
            and message.event == "objectives_enriched"
            and hasattr(message, "content")
            and isinstance(message.content, dict)
        ):
            objectives_enriched_found = True

        elif (
            hasattr(message, "type")
            and message.type == "data"
            and hasattr(message, "event")
            and message.event == "workplan_completed"
            and hasattr(message, "content")
            and isinstance(message.content, dict)
        ):
            workplan_completed_found = True

    assert extracting_relationships_found, "Extracting relationships message not found"
    assert enriching_objectives_found, "Enriching objectives message not found"
    assert objectives_enriched_found, "Objectives enriched data message not found"
    assert workplan_completed_found, "Workplan completed data message not found"


@pytest.mark.asyncio
async def test_generate_grant_section_texts_with_mocked_llm(
    mock_message_handler: AsyncMock,
    mock_research_objectives: list[ResearchObjective],
    mock_grant_sections: list[GrantElement | GrantLongFormSection],
    mock_section_text: str,
) -> None:
    with (
        patch("src.rag.grant_application.handler.generate_work_plan_text", return_value=mock_section_text),
        patch("src.rag.grant_application.handler.generate_section_text", return_value=mock_section_text),
    ):
        result = await generate_grant_section_texts(
            application_id="test-app-id",
            form_inputs={"project_summary": "Test project summary"},
            grant_sections=mock_grant_sections,
            research_objectives=mock_research_objectives,
            message_handler=mock_message_handler,
        )

    assert isinstance(result, dict)
    assert len(result) == len(mock_grant_sections)

    for section in mock_grant_sections:
        assert section["id"] in result
        assert isinstance(result[section["id"]], str)
        assert len(result[section["id"]]) > 0


@pytest.mark.asyncio
async def test_grant_application_text_generation_pipeline_handler_with_mocked_llm(
    mock_message_handler: AsyncMock,
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
        patch("src.rag.grant_application.handler.generate_grant_section_texts", return_value=section_texts),
        patch("src.rag.grant_application.handler.generate_application_text", return_value=application_text),
    ):
        result_text, result_sections = await grant_application_text_generation_pipeline_handler(
            application_id=str(test_application.id),
            message_handler=mock_message_handler,
        )

    assert result_text == application_text
    assert result_sections == section_texts

    assert mock_message_handler.call_count > 0

    async with async_session_maker() as session:
        updated_application = await session.get(GrantApplication, test_application.id)
        assert updated_application.text == application_text


@pytest.mark.asyncio
async def test_pipeline_handler_validation_error(
    mock_message_handler: AsyncMock,
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
        application_id = str(application.id)

    with pytest.raises(ValidationError):
        await grant_application_text_generation_pipeline_handler(
            application_id=application_id,
            message_handler=mock_message_handler,
        )

    assert mock_message_handler.call_count > 0

    error_message_found = False
    for call in mock_message_handler.call_args_list:
        message = call[0][0]
        if (
            hasattr(message, "type")
            and message.type == "error"
            and hasattr(message, "event")
            and message.event == "validation_error"
            and hasattr(message, "content")
            and isinstance(message.content, str)
        ):
            error_message_found = True
            break

    assert error_message_found, "Validation error message not found"


@pytest.mark.asyncio
async def test_pipeline_handler_backend_error(
    mock_message_handler: AsyncMock,
    test_application: GrantApplication,
) -> None:
    error_message = "Test backend error"
    with (
        patch(
            "src.rag.grant_application.handler.generate_grant_section_texts",
            side_effect=BackendError(error_message, context={"test": "context"}),
        ),
        pytest.raises(BackendError),
    ):
        await grant_application_text_generation_pipeline_handler(
            application_id=str(test_application.id),
            message_handler=mock_message_handler,
        )

    assert mock_message_handler.call_count > 0

    error_message_found = False
    for call in mock_message_handler.call_args_list:
        message = call[0][0]
        if (
            hasattr(message, "type")
            and message.type == "error"
            and hasattr(message, "event")
            and message.event == "generation_error"
            and hasattr(message, "content")
            and isinstance(message.content, str)
            and "Failed to generate" in message.content
        ):
            error_message_found = True
            break

    assert error_message_found, "Backend error message not found"


@pytest.mark.asyncio
async def test_pipeline_handler_database_error(
    mock_message_handler: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    error_message = WebsocketErrorMessage(
        type="error",
        event="database_error",
        content="Failed to update grant application text.",
        context={"error": "Database error"},
    )

    await mock_message_handler(error_message)

    assert mock_message_handler.call_count > 0

    database_error_found = False
    for call in mock_message_handler.call_args_list:
        message = call[0][0]
        if (
            hasattr(message, "type")
            and message.type == "error"
            and hasattr(message, "event")
            and message.event == "database_error"
            and hasattr(message, "content")
            and "Failed to update" in message.content
        ):
            database_error_found = True
            break

    assert database_error_found, "Database error message not found"
