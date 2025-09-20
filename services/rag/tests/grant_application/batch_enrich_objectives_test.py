from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.json_objects import ResearchObjective, ResearchTask

from services.rag.src.grant_application.batch_enrich_objectives import handle_batch_enrich_objectives


@pytest.fixture
def sample_research_objectives() -> list[ResearchObjective]:
    """Sample research objectives for testing."""
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
def sample_grant_section() -> dict[str, Any]:
    """Sample grant section for testing."""
    return {
        "id": "research_plan",
        "title": "Research Plan",
        "order": 3,
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


@pytest.fixture
def sample_form_inputs() -> dict[str, str]:
    """Sample form inputs for testing."""
    return {
        "background_context": "This is a cancer research project",
        "institution": "University of Research",
        "duration": "3 years",
    }


@patch("services.rag.src.grant_application.batch_enrich_objectives.handle_enrich_objective")
@patch("services.rag.src.grant_application.batch_enrich_objectives.batched_gather")
async def test_handle_batch_enrich_objectives_success(
    mock_batched_gather: AsyncMock,
    mock_handle_enrich_objective: AsyncMock,
    sample_research_objectives: list[ResearchObjective],
    sample_grant_section: dict[str, Any],
    sample_form_inputs: dict[str, str],
) -> None:
    """Test successful batch enrichment of objectives."""
    # Setup mock responses
    mock_enrichment_responses = [
        {
            "research_objective": {
                "description": "Enhanced objective 1 description",
                "instructions": "Detailed instructions for objective 1",
                "guiding_questions": ["Question 1 for objective 1", "Question 2 for objective 1"],
                "search_queries": ["query1 objective1", "query2 objective1"],
            },
            "research_tasks": [
                {
                    "description": "Enhanced task 1.1 description",
                    "instructions": "Task 1.1 instructions",
                    "guiding_questions": ["Task 1.1 question"],
                    "search_queries": ["task 1.1 query"],
                },
                {
                    "description": "Enhanced task 1.2 description",
                    "instructions": "Task 1.2 instructions",
                    "guiding_questions": ["Task 1.2 question"],
                    "search_queries": ["task 1.2 query"],
                },
            ],
        },
        {
            "research_objective": {
                "description": "Enhanced objective 2 description",
                "instructions": "Detailed instructions for objective 2",
                "guiding_questions": ["Question 1 for objective 2"],
                "search_queries": ["query1 objective2"],
            },
            "research_tasks": [
                {
                    "description": "Enhanced task 2.1 description",
                    "instructions": "Task 2.1 instructions",
                    "guiding_questions": ["Task 2.1 question"],
                    "search_queries": ["task 2.1 query"],
                },
                {
                    "description": "Enhanced task 2.2 description",
                    "instructions": "Task 2.2 instructions",
                    "guiding_questions": ["Task 2.2 question"],
                    "search_queries": ["task 2.2 query"],
                },
            ],
        },
    ]
    mock_batched_gather.return_value = mock_enrichment_responses

    # Execute
    result = await handle_batch_enrich_objectives(
        research_objectives=sample_research_objectives,
        grant_section=sample_grant_section,
        application_id=str(uuid4()),
        form_inputs=sample_form_inputs,
        trace_id=str(uuid4()),
    )

    # Verify result structure
    assert isinstance(result, list)
    assert len(result) == 2

    # Verify first enrichment response
    first_response = result[0]
    assert "research_objective" in first_response
    assert "research_tasks" in first_response
    assert first_response["research_objective"]["description"] == "Enhanced objective 1 description"
    assert len(first_response["research_tasks"]) == 2

    # Verify second enrichment response
    second_response = result[1]
    assert "research_objective" in second_response
    assert "research_tasks" in second_response
    assert second_response["research_objective"]["description"] == "Enhanced objective 2 description"
    assert len(second_response["research_tasks"]) == 2

    # Verify batched_gather was called with correct batch size
    mock_batched_gather.assert_called_once()
    call_args = mock_batched_gather.call_args
    assert len(call_args[0]) == 2  # Two coroutines for two objectives
    assert call_args[1]["batch_size"] == 2  # min(3, len(batch_coroutines)) = min(3, 2) = 2


@patch("services.rag.src.grant_application.batch_enrich_objectives.handle_enrich_objective")
@patch("services.rag.src.grant_application.batch_enrich_objectives.batched_gather")
async def test_handle_batch_enrich_objectives_empty_list(
    mock_batched_gather: AsyncMock,
    mock_handle_enrich_objective: AsyncMock,
    sample_grant_section: dict[str, Any],
    sample_form_inputs: dict[str, str],
) -> None:
    """Test batch enrichment with empty objectives list."""
    # Execute with empty objectives
    result = await handle_batch_enrich_objectives(
        research_objectives=[],
        grant_section=sample_grant_section,
        application_id=str(uuid4()),
        form_inputs=sample_form_inputs,
        trace_id=str(uuid4()),
    )

    # Verify result
    assert isinstance(result, list)
    assert len(result) == 0

    # Should not call batched_gather for empty list
    mock_batched_gather.assert_not_called()


@patch("services.rag.src.grant_application.batch_enrich_objectives.handle_enrich_objective")
@patch("services.rag.src.grant_application.batch_enrich_objectives.batched_gather")
async def test_handle_batch_enrich_objectives_single_objective(
    mock_batched_gather: AsyncMock,
    mock_handle_enrich_objective: AsyncMock,
    sample_grant_section: dict[str, Any],
    sample_form_inputs: dict[str, str],
) -> None:
    """Test batch enrichment with single objective."""
    # Single objective
    single_objective = [
        ResearchObjective(
            number=1,
            title="Single objective",
            research_tasks=[
                ResearchTask(number=1, title="Single task"),
            ],
        )
    ]

    # Setup mock response
    mock_enrichment_response = [
        {
            "research_objective": {
                "description": "Enhanced single objective",
                "instructions": "Single objective instructions",
                "guiding_questions": ["Single question"],
                "search_queries": ["single query"],
            },
            "research_tasks": [
                {
                    "description": "Enhanced single task",
                    "instructions": "Single task instructions",
                    "guiding_questions": ["Single task question"],
                    "search_queries": ["single task query"],
                }
            ],
        }
    ]
    mock_batched_gather.return_value = mock_enrichment_response

    # Execute
    result = await handle_batch_enrich_objectives(
        research_objectives=single_objective,
        grant_section=sample_grant_section,
        application_id=str(uuid4()),
        form_inputs=sample_form_inputs,
        trace_id=str(uuid4()),
    )

    # Verify result
    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0]["research_objective"]["description"] == "Enhanced single objective"
    assert len(result[0]["research_tasks"]) == 1


@patch("services.rag.src.grant_application.batch_enrich_objectives.handle_enrich_objective")
@patch("services.rag.src.grant_application.batch_enrich_objectives.batched_gather")
async def test_handle_batch_enrich_objectives_error_propagation(
    mock_batched_gather: AsyncMock,
    mock_handle_enrich_objective: AsyncMock,
    sample_research_objectives: list[ResearchObjective],
    sample_grant_section: dict[str, Any],
    sample_form_inputs: dict[str, str],
) -> None:
    """Test error propagation from batch enrichment."""
    # Setup mock to raise exception
    mock_batched_gather.side_effect = Exception("Enrichment service error")

    # Execute and verify exception is propagated
    with pytest.raises(Exception, match="Enrichment service error"):
        await handle_batch_enrich_objectives(
            research_objectives=sample_research_objectives,
            grant_section=sample_grant_section,
            application_id=str(uuid4()),
            form_inputs=sample_form_inputs,
            trace_id=str(uuid4()),
        )

    # Verify service was called
    mock_batched_gather.assert_called_once()


@patch("services.rag.src.grant_application.batch_enrich_objectives.perform_shared_retrieval")
@patch("services.rag.src.grant_application.batch_enrich_objectives.handle_enrich_objective")
@patch("services.rag.src.grant_application.batch_enrich_objectives.batched_gather")
async def test_handle_batch_enrich_objectives_calls_shared_retrieval(
    mock_batched_gather: AsyncMock,
    mock_handle_enrich_objective: AsyncMock,
    mock_perform_shared_retrieval: AsyncMock,
    sample_research_objectives: list[ResearchObjective],
    sample_grant_section: dict[str, Any],
    sample_form_inputs: dict[str, str],
) -> None:
    """Test that shared retrieval is called correctly."""
    # Setup mocks
    mock_perform_shared_retrieval.return_value = "Shared context from retrieval"
    mock_batched_gather.return_value = [{"research_objective": {}, "research_tasks": []}] * 2

    # Test IDs
    test_app_id = str(uuid4())
    test_trace_id = str(uuid4())

    # Execute
    await handle_batch_enrich_objectives(
        research_objectives=sample_research_objectives,
        grant_section=sample_grant_section,
        application_id=test_app_id,
        form_inputs=sample_form_inputs,
        trace_id=test_trace_id,
    )

    # Verify shared retrieval was called with correct parameters
    mock_perform_shared_retrieval.assert_called_once_with(sample_research_objectives, sample_grant_section, test_app_id)

    # Verify batched_gather was called
    mock_batched_gather.assert_called_once()
    call_args = mock_batched_gather.call_args
    assert len(call_args[0]) == 2  # Two coroutines for two objectives
