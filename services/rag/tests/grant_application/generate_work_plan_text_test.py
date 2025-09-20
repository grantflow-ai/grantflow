from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from services.rag.src.grant_application.generate_work_plan_text import generate_objective_with_tasks


@pytest.fixture
def sample_objective() -> dict[str, Any]:
    """Sample research objective for testing."""
    return {
        "number": "1",
        "title": "Develop novel biomarkers",
        "description": "Identify and validate protein biomarkers for early cancer detection",
        "instructions": "Use mass spectrometry-based proteomics approaches",
        "guiding_questions": [
            "Which proteins show differential expression in cancer?",
            "How can we validate biomarker specificity?",
        ],
        "search_queries": ["cancer biomarkers", "proteomics mass spectrometry"],
        "relationships": [("2", "provides_data_for", "Biomarkers will be used in ML model")],
        "max_words": 300,
        "type": "objective",
    }


@pytest.fixture
def sample_tasks() -> list[dict[str, Any]]:
    """Sample research tasks for testing."""
    return [
        {
            "number": "1.1",
            "title": "Identify candidate biomarkers",
            "description": "Screen protein expression patterns in patient samples",
            "instructions": "Use LC-MS/MS for comprehensive protein profiling",
            "guiding_questions": ["Which proteins are consistently dysregulated?"],
            "search_queries": ["protein expression cancer", "LC-MS proteomics"],
            "relationships": [("1.2", "precedes", "Identification precedes validation")],
            "max_words": 200,
            "type": "task",
        },
        {
            "number": "1.2",
            "title": "Validate biomarkers",
            "description": "Test biomarker performance in independent cohorts",
            "instructions": "Assess sensitivity, specificity, and clinical utility",
            "guiding_questions": ["What is the diagnostic accuracy?"],
            "search_queries": ["biomarker validation", "diagnostic accuracy"],
            "relationships": [("2.1", "informs", "Validation results inform algorithm design")],
            "max_words": 200,
            "type": "task",
        },
    ]


@pytest.fixture
def sample_form_inputs() -> dict[str, Any]:
    """Sample form inputs for testing."""
    return {
        "background_context": "This is a cancer research project focusing on early detection",
        "institution": "University Research Center",
        "duration": "3 years",
        "funding_amount": "$500,000",
    }


@patch("services.rag.src.grant_application.generate_work_plan_text.generate_work_plan_component_text")
async def test_generate_objective_with_tasks_success(
    mock_generate_component_text: AsyncMock,
    sample_objective: dict[str, Any],
    sample_tasks: list[dict[str, Any]],
    sample_form_inputs: dict[str, Any],
) -> None:
    """Test successful generation of objective with tasks."""
    # Setup mock responses
    mock_objective_text = """
    This objective focuses on developing novel biomarkers for early cancer detection
    through comprehensive proteomics analysis. We will utilize state-of-the-art
    mass spectrometry techniques to identify protein markers that can distinguish
    cancer patients from healthy controls with high accuracy.
    """

    mock_task_texts = [
        """
        Candidate biomarker identification will be performed using LC-MS/MS analysis
        of patient samples. We will screen for proteins with consistent differential
        expression patterns across multiple cancer types.
        """,
        """
        Biomarker validation will involve testing identified markers in independent
        patient cohorts to establish diagnostic performance metrics including
        sensitivity, specificity, and predictive value.
        """,
    ]

    # Setup mock to return different text for each call
    mock_generate_component_text.side_effect = [mock_objective_text, *mock_task_texts]

    # Generate test UUIDs
    test_app_id = str(uuid4())
    test_trace_id = str(uuid4())

    # Execute
    result = await generate_objective_with_tasks(
        application_id=test_app_id,
        form_inputs=sample_form_inputs,
        objective=sample_objective,
        tasks=sample_tasks,
        work_plan_text="",
        trace_id=test_trace_id,
    )

    # Verify result structure
    assert isinstance(result, tuple)
    assert len(result) == 3

    objective_returned, objective_text, task_results = result

    # Verify objective
    assert objective_returned == sample_objective
    assert objective_text == mock_objective_text

    # Verify task results
    assert isinstance(task_results, list)
    assert len(task_results) == 2

    task1_returned, task1_text = task_results[0]
    assert task1_returned == sample_tasks[0]
    assert task1_text == mock_task_texts[0]

    task2_returned, task2_text = task_results[1]
    assert task2_returned == sample_tasks[1]
    assert task2_text == mock_task_texts[1]

    # Verify service calls
    assert mock_generate_component_text.call_count == 3  # 1 objective + 2 tasks

    # Verify first call (objective)
    first_call = mock_generate_component_text.call_args_list[0]
    assert first_call.kwargs["application_id"] == test_app_id
    assert first_call.kwargs["form_inputs"] == sample_form_inputs
    assert first_call.kwargs["component"] == sample_objective
    assert first_call.kwargs["work_plan_text"] == ""
    assert first_call.kwargs["trace_id"] == test_trace_id

    # Verify second call (first task)
    second_call = mock_generate_component_text.call_args_list[1]
    assert second_call.kwargs["component"] == sample_tasks[0]

    # Verify third call (second task)
    third_call = mock_generate_component_text.call_args_list[2]
    assert third_call.kwargs["component"] == sample_tasks[1]


@patch("services.rag.src.grant_application.generate_work_plan_text.generate_work_plan_component_text")
async def test_generate_objective_with_tasks_no_tasks(
    mock_generate_component_text: AsyncMock,
    sample_objective: dict[str, Any],
    sample_form_inputs: dict[str, Any],
) -> None:
    """Test generation of objective with no tasks."""
    # Setup mock response for objective only
    mock_objective_text = "Standalone objective text without subtasks."
    mock_generate_component_text.return_value = mock_objective_text

    # Execute with empty tasks list
    result = await generate_objective_with_tasks(
        application_id=str(uuid4()),
        form_inputs=sample_form_inputs,
        objective=sample_objective,
        tasks=[],
        work_plan_text="",
        trace_id=str(uuid4()),
    )

    # Verify result structure
    objective_returned, objective_text, task_results = result

    assert objective_returned == sample_objective
    assert objective_text == mock_objective_text
    assert isinstance(task_results, list)
    assert len(task_results) == 0

    # Verify only one service call for objective
    mock_generate_component_text.assert_called_once()


@patch("services.rag.src.grant_application.generate_work_plan_text.generate_work_plan_component_text")
async def test_generate_objective_with_tasks_single_task(
    mock_generate_component_text: AsyncMock,
    sample_objective: dict[str, Any],
    sample_form_inputs: dict[str, Any],
) -> None:
    """Test generation of objective with single task."""
    # Single task
    single_task = [
        {
            "number": "1.1",
            "title": "Single task",
            "description": "Perform comprehensive analysis",
            "instructions": "Use appropriate methodology",
            "guiding_questions": ["How to achieve the goal?"],
            "search_queries": ["analysis methodology"],
            "relationships": [],
            "max_words": 150,
            "type": "task",
        }
    ]

    # Setup mock responses
    mock_objective_text = "Objective text for single task scenario."
    mock_task_text = "Single task implementation details."
    mock_generate_component_text.side_effect = [mock_objective_text, mock_task_text]

    # Execute
    result = await generate_objective_with_tasks(
        application_id=str(uuid4()),
        form_inputs=sample_form_inputs,
        objective=sample_objective,
        tasks=single_task,
        work_plan_text="",
        trace_id=str(uuid4()),
    )

    # Verify result
    objective_returned, objective_text, task_results = result

    assert objective_returned == sample_objective
    assert objective_text == mock_objective_text
    assert len(task_results) == 1

    task_returned, task_text = task_results[0]
    assert task_returned == single_task[0]
    assert task_text == mock_task_text

    # Verify service calls
    assert mock_generate_component_text.call_count == 2


@patch("services.rag.src.grant_application.generate_work_plan_text.generate_work_plan_component_text")
async def test_generate_objective_with_tasks_existing_work_plan_text(
    mock_generate_component_text: AsyncMock,
    sample_objective: dict[str, Any],
    sample_tasks: list[dict[str, Any]],
    sample_form_inputs: dict[str, Any],
) -> None:
    """Test generation with existing work plan text context."""
    # Existing work plan text
    existing_work_plan = """
    # Research Plan Overview

    This project aims to advance cancer diagnostics through innovative approaches.
    Previous objectives have established the foundation for biomarker discovery.
    """

    # Setup mock responses
    mock_objective_text = "Objective text building on existing work plan."
    mock_task_text = "Task text with context from previous objectives."
    mock_generate_component_text.side_effect = [mock_objective_text, mock_task_text, mock_task_text]

    # Execute
    result = await generate_objective_with_tasks(
        application_id=str(uuid4()),
        form_inputs=sample_form_inputs,
        objective=sample_objective,
        tasks=sample_tasks,
        work_plan_text=existing_work_plan,
        trace_id=str(uuid4()),
    )

    # Verify result
    _objective_returned, objective_text, task_results = result
    assert objective_text == mock_objective_text
    assert len(task_results) == 2

    # Verify service calls include existing work plan text
    first_call = mock_generate_component_text.call_args_list[0]
    assert first_call.kwargs["work_plan_text"] == existing_work_plan


@patch("services.rag.src.grant_application.generate_work_plan_text.generate_work_plan_component_text")
async def test_generate_objective_with_tasks_empty_form_inputs(
    mock_generate_component_text: AsyncMock,
    sample_objective: dict[str, Any],
    sample_tasks: list[dict[str, Any]],
) -> None:
    """Test generation with empty form inputs."""
    # Setup mock responses
    mock_objective_text = "Objective text without form context."
    mock_task_text = "Task text without form context."
    mock_generate_component_text.side_effect = [mock_objective_text, mock_task_text, mock_task_text]

    # Execute with empty form inputs
    result = await generate_objective_with_tasks(
        application_id=str(uuid4()),
        form_inputs={},
        objective=sample_objective,
        tasks=sample_tasks,
        work_plan_text="",
        trace_id=str(uuid4()),
    )

    # Verify result
    _objective_returned, objective_text, task_results = result
    assert objective_text == mock_objective_text
    assert len(task_results) == 2

    # Verify service calls with empty form inputs
    first_call = mock_generate_component_text.call_args_list[0]
    assert first_call.kwargs["form_inputs"] == {}


@patch("services.rag.src.grant_application.generate_work_plan_text.generate_work_plan_component_text")
async def test_generate_objective_with_tasks_error_handling(
    mock_generate_component_text: AsyncMock,
    sample_objective: dict[str, Any],
    sample_tasks: list[dict[str, Any]],
    sample_form_inputs: dict[str, Any],
) -> None:
    """Test error handling when component generation fails."""
    # Setup mock to raise exception on objective generation
    mock_generate_component_text.side_effect = Exception("Component generation service error")

    # Execute and verify exception is propagated
    with pytest.raises(Exception, match="Component generation service error"):
        await generate_objective_with_tasks(
            application_id=str(uuid4()),
            form_inputs=sample_form_inputs,
            objective=sample_objective,
            tasks=sample_tasks,
            work_plan_text="",
            trace_id=str(uuid4()),
        )

    # Verify service was called
    mock_generate_component_text.assert_called_once()


@patch("services.rag.src.grant_application.generate_work_plan_text.generate_work_plan_component_text")
async def test_generate_objective_with_tasks_task_generation_error(
    mock_generate_component_text: AsyncMock,
    sample_objective: dict[str, Any],
    sample_tasks: list[dict[str, Any]],
    sample_form_inputs: dict[str, Any],
) -> None:
    """Test error handling when task generation fails."""
    # Setup mock to succeed for objective but fail for first task
    mock_objective_text = "Successful objective generation."
    mock_generate_component_text.side_effect = [
        mock_objective_text,
        Exception("Task generation error"),
    ]

    # Execute and verify exception is propagated
    with pytest.raises(Exception, match="Task generation error"):
        await generate_objective_with_tasks(
            application_id=str(uuid4()),
            form_inputs=sample_form_inputs,
            objective=sample_objective,
            tasks=sample_tasks,
            work_plan_text="",
            trace_id=str(uuid4()),
        )

    # Verify service was called three times (objective + 2 tasks in parallel)
    assert mock_generate_component_text.call_count == 3
