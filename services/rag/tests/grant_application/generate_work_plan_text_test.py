from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.json_objects import ResearchDeepDive

from services.rag.src.dto import ResearchComponentGenerationDTO
from services.rag.src.grant_application.generate_work_plan_text import generate_workplan_section


@pytest.fixture
def sample_objective() -> ResearchComponentGenerationDTO:
    return ResearchComponentGenerationDTO(
        number="1",
        title="Develop novel biomarkers",
        description="Identify and validate protein biomarkers for early cancer detection",
        instructions="Use mass spectrometry-based proteomics approaches",
        guiding_questions=[
            "Which proteins show differential expression in cancer?",
            "How can we validate biomarker specificity?",
        ],
        search_queries=["cancer biomarkers", "proteomics mass spectrometry"],
        relationships=[("2", "provides_data_for")],
        max_words=300,
        type="objective",
    )


@pytest.fixture
def sample_tasks() -> list[ResearchComponentGenerationDTO]:
    return [
        ResearchComponentGenerationDTO(
            number="1.1",
            title="Identify candidate biomarkers",
            description="Screen protein expression patterns in patient samples",
            instructions="Use LC-MS/MS for comprehensive protein profiling",
            guiding_questions=["Which proteins are consistently dysregulated?"],
            search_queries=["protein expression cancer", "LC-MS proteomics"],
            relationships=[("1.2", "precedes")],
            max_words=200,
            type="task",
        ),
        ResearchComponentGenerationDTO(
            number="1.2",
            title="Validate biomarkers",
            description="Test biomarker performance in independent cohorts",
            instructions="Assess sensitivity, specificity, and clinical utility",
            guiding_questions=["What is the diagnostic accuracy?"],
            search_queries=["biomarker validation", "diagnostic accuracy"],
            relationships=[("2.1", "informs")],
            max_words=200,
            type="task",
        ),
    ]


@pytest.fixture
def sample_form_inputs() -> ResearchDeepDive:
    return ResearchDeepDive(
        background_context="This is a cancer research project focusing on early detection",
        hypothesis="Early detection improves cancer outcomes",
        rationale="Proteomics provides sensitive biomarker detection",
    )


@patch("services.rag.src.grant_application.generate_work_plan_text.generate_work_plan_component_text")
async def test_generate_workplan_section_success(
    mock_generate_component_text: AsyncMock,
    mock_job_manager: AsyncMock,
    sample_objective: ResearchComponentGenerationDTO,
    sample_tasks: list[ResearchComponentGenerationDTO],
    sample_form_inputs: ResearchDeepDive,
) -> None:
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

    mock_generate_component_text.side_effect = [mock_objective_text, *mock_task_texts]

    test_app_id = str(uuid4())
    test_trace_id = str(uuid4())

    all_components = [sample_objective, *sample_tasks]

    result = await generate_workplan_section(
        application_id=test_app_id,
        form_inputs=sample_form_inputs,
        components=all_components,
        trace_id=test_trace_id,
        job_manager=mock_job_manager,
    )

    assert isinstance(result, str)
    assert "### Objective 1: Develop novel biomarkers" in result
    assert "#### 1.1: Identify candidate biomarkers" in result
    assert "#### 1.2: Validate biomarkers" in result

    assert mock_objective_text.strip() in result
    assert mock_task_texts[0].strip() in result
    assert mock_task_texts[1].strip() in result

    assert mock_generate_component_text.call_count == 3

    first_call = mock_generate_component_text.call_args_list[0]
    assert first_call.kwargs["application_id"] == test_app_id
    assert first_call.kwargs["form_inputs"] == sample_form_inputs
    assert first_call.kwargs["component"] == sample_objective
    assert first_call.kwargs["work_plan_text"] == ""
    assert first_call.kwargs["trace_id"] == test_trace_id

    second_call = mock_generate_component_text.call_args_list[1]
    assert second_call.kwargs["component"] == sample_tasks[0]

    third_call = mock_generate_component_text.call_args_list[2]
    assert third_call.kwargs["component"] == sample_tasks[1]
