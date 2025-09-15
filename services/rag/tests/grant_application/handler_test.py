from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from packages.db.src.json_objects import (
    GrantElement,
    GrantLongFormSection,
    ResearchObjective,
    ResearchTask,
)
from packages.shared_utils.src.constants import NotificationEvents

from services.rag.src.grant_application.dto import EnrichmentDataDTO
from services.rag.src.grant_application.enrich_research_objective import ObjectiveEnrichmentDTO
from services.rag.src.grant_application.handler import (
    generate_grant_section_texts,
    generate_work_plan_text,
)
from services.rag.src.grant_application.utils import is_grant_long_form_section


@pytest.fixture
def mock_research_objectives() -> list[ResearchObjective]:
    return [
        ResearchObjective(
            number=1,
            title="Develop novel biomarkers",
            research_tasks=[
                ResearchTask(number=1, title="Identify candidate biomarkers"),
                ResearchTask(number=2, title="Validate biomarkers"),
            ],
        ),
        ResearchObjective(
            number=2,
            title="Create ML model",
            research_tasks=[
                ResearchTask(number=1, title="Design algorithms"),
                ResearchTask(number=2, title="Train model"),
            ],
        ),
    ]


@pytest.fixture
def mock_enrichment_response() -> ObjectiveEnrichmentDTO:
    research_objective = EnrichmentDataDTO(
        enriched_objective="Develop novel biomarkers for early cancer detection",
        search_queries=[
            "cancer biomarkers proteomics",
            "early detection protein markers",
        ],
        core_scientific_terms=[
            "biomarkers",
            "proteomics",
            "mass spectrometry",
            "protein expression",
            "early detection",
        ],
        scientific_context="Cancer biomarker discovery using proteomics approaches",
        instructions="Focus on identifying protein-based biomarkers using advanced proteomics techniques",
        description="Develop novel biomarkers for early cancer detection through systematic proteomics analysis",
        guiding_questions=[
            "What biomarkers are most promising?",
            "How will validation be performed?",
        ],
    )

    research_task_1 = EnrichmentDataDTO(
        enriched_objective="Identify candidate biomarkers through proteomics",
        search_queries=["proteomics mass spectrometry cancer"],
        core_scientific_terms=["mass spectrometry", "protein expression", "differential expression"],
        scientific_context="Mass spectrometry-based proteomics for biomarker discovery",
        instructions="Use mass spectrometry to analyze protein expression patterns",
        description="Identify candidate biomarkers through comprehensive proteomics analysis",
        guiding_questions=["Which proteins show differential expression?"],
    )

    research_task_2 = EnrichmentDataDTO(
        enriched_objective="Validate biomarkers in clinical samples",
        search_queries=["biomarker validation clinical trials"],
        core_scientific_terms=["clinical validation", "sensitivity", "specificity"],
        scientific_context="Clinical validation of cancer biomarkers",
        instructions="Test identified markers in patient cohorts",
        description="Validate biomarkers in clinical samples to establish diagnostic utility",
        guiding_questions=["What is the sensitivity and specificity?"],
    )

    return ObjectiveEnrichmentDTO(
        research_objective=research_objective,
        research_tasks=[research_task_1, research_task_2],
    )


@pytest.fixture
def mock_relationships() -> dict[str, list[tuple[str, str, str]]]:
    return {
        "connections": [("Objective 1", "relates_to", "Objective 2")],
        "dependencies": [("Task 1", "depends_on", "Task 2")],
    }


@pytest.fixture
def mock_work_plan_component_text() -> str:
    return "This is a mocked work plan component text."


@pytest.fixture
def mock_grant_sections() -> list[GrantElement | GrantLongFormSection]:
    abstract_section: GrantLongFormSection = {
        "id": "abstract",
        "title": "Abstract",
        "order": 1,
        "parent_id": None,
        "keywords": ["summary"],
        "topics": ["overview"],
        "generation_instructions": "Write abstract",
        "depends_on": [],
        "max_words": 250,
        "search_queries": ["abstract"],
        "is_detailed_research_plan": False,
        "is_clinical_trial": None,
    }
    research_plan_section: GrantLongFormSection = {
        "id": "research_plan",
        "title": "Research Plan",
        "order": 2,
        "parent_id": None,
        "keywords": ["methodology"],
        "topics": ["methods"],
        "generation_instructions": "Describe methodology",
        "depends_on": [],
        "max_words": 1500,
        "search_queries": ["methodology"],
        "is_detailed_research_plan": True,
        "is_clinical_trial": None,
    }
    impact_section: GrantLongFormSection = {
        "id": "impact",
        "title": "Impact",
        "order": 3,
        "parent_id": None,
        "keywords": ["significance"],
        "topics": ["outcomes"],
        "generation_instructions": "Explain impact",
        "depends_on": ["research_plan"],
        "max_words": 500,
        "search_queries": ["impact"],
        "is_detailed_research_plan": False,
        "is_clinical_trial": None,
    }
    return [abstract_section, research_plan_section, impact_section]


@pytest.fixture
def mock_section_text() -> str:
    return "This is a mocked section text for testing."


async def test_generate_work_plan_text_with_mocked_llm(
    mock_research_objectives: list[ResearchObjective],
    mock_enrichment_response: ObjectiveEnrichmentDTO,
    mock_relationships: dict[str, list[tuple[str, str, str]]],
    mock_work_plan_component_text: str,
    mock_grant_sections: list[GrantElement | GrantLongFormSection],
) -> None:
    research_plan_section = next(
        s for s in mock_grant_sections if is_grant_long_form_section(s) and s.get("is_detailed_research_plan")
    )

    mock_job_manager = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()
    mock_job_manager.check_if_cancelled = AsyncMock(return_value=False)
    mock_job_manager.handle_cancellation = AsyncMock()

    mock_wikidata_enrichment = {
        "core_scientific_terms": ["biomarkers", "proteomics", "machine learning"],
        "scientific_context": "Cancer biomarker discovery using AI-driven proteomics",
    }

    with (
        patch(
            "services.rag.src.grant_application.handler.handle_extract_relationships",
            new_callable=AsyncMock,
            return_value=mock_relationships,
        ),
        patch(
            "services.rag.src.grant_application.handler.handle_batch_enrich_objectives",
            new_callable=AsyncMock,
            return_value=[mock_enrichment_response, mock_enrichment_response],
        ),
        patch(
            "services.rag.src.grant_application.handler.enrich_objective_with_wikidata",
            new_callable=AsyncMock,
            return_value=mock_wikidata_enrichment,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_work_plan_component_text",
            new_callable=AsyncMock,
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
    assert NotificationEvents.OBJECTIVE_COMPLETED in notification_events
    assert NotificationEvents.RESEARCH_PLAN_COMPLETED in notification_events


async def test_generate_grant_section_texts_with_mocked_llm(
    mock_research_objectives: list[ResearchObjective],
    mock_grant_sections: list[GrantElement | GrantLongFormSection],
    mock_section_text: str,
) -> None:
    mock_job_manager = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()
    mock_job_manager.check_if_cancelled = AsyncMock(return_value=False)
    mock_job_manager.handle_cancellation = AsyncMock()

    with (
        patch(
            "services.rag.src.grant_application.handler.generate_work_plan_text",
            return_value="Mocked work plan text.",
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_section_text",
            return_value={
                "abstract": mock_section_text,
                "research_plan": mock_section_text,
                "impact": mock_section_text,
            },
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


async def test_generate_work_plan_text_normalizes_markdown(
    mock_research_objectives: list[ResearchObjective],
    mock_enrichment_response: ObjectiveEnrichmentDTO,
    mock_relationships: dict[str, list[tuple[str, str, str]]],
    mock_grant_sections: list[GrantElement | GrantLongFormSection],
) -> None:
    research_plan_section = next(
        s for s in mock_grant_sections if is_grant_long_form_section(s) and s.get("is_detailed_research_plan")
    )

    mock_work_plan_text = """# Work Plan

## Objective 1: Research Goal
Some text with **bold** and *italic* formatting.

### Task 1.1: Subtask
- Bullet point 1
- Bullet point 2

### Task 1.2: Another Subtask
More text with formatting."""

    mock_job_manager = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()
    mock_job_manager.check_if_cancelled = AsyncMock(return_value=False)
    mock_job_manager.handle_cancellation = AsyncMock()

    mock_wikidata_enrichment = {
        "core_scientific_terms": ["biomarkers", "proteomics", "machine learning"],
        "scientific_context": "Cancer biomarker discovery using AI-driven proteomics",
    }

    with (
        patch(
            "services.rag.src.grant_application.handler.handle_extract_relationships",
            new_callable=AsyncMock,
            return_value=mock_relationships,
        ),
        patch(
            "services.rag.src.grant_application.handler.handle_batch_enrich_objectives",
            new_callable=AsyncMock,
            return_value=[mock_enrichment_response, mock_enrichment_response],
        ),
        patch(
            "services.rag.src.grant_application.handler.enrich_objective_with_wikidata",
            new_callable=AsyncMock,
            return_value=mock_wikidata_enrichment,
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_work_plan_component_text",
            new_callable=AsyncMock,
            return_value=mock_work_plan_text,
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

    assert "Work Plan" in result
    assert "Objective 1" in result
    assert "Task 1.1" in result
    assert "Task 1.2" in result
