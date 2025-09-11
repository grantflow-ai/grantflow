from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

from packages.db.src.json_objects import GrantElement, GrantLongFormSection, ResearchObjective

from services.rag.src.constants import NotificationEvents
from services.rag.src.grant_application.handler import (
    generate_grant_section_texts,
    generate_work_plan_text,
)
from services.rag.src.grant_application.utils import is_grant_long_form_section


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
            "services.rag.src.grant_application.handler.handle_batch_enrich_objectives",
            return_value=[mock_enrichment_response, mock_enrichment_response],
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
    mock_enrichment_response: dict[str, Any],
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

    with (
        patch(
            "services.rag.src.grant_application.handler.handle_extract_relationships",
            return_value=mock_relationships,
        ),
        patch(
            "services.rag.src.grant_application.handler.handle_batch_enrich_objectives",
            return_value=[mock_enrichment_response, mock_enrichment_response],
        ),
        patch(
            "services.rag.src.grant_application.handler.generate_work_plan_component_text",
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
