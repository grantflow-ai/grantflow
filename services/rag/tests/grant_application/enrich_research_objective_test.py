from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from packages.db.src.json_objects import ResearchObjective, ResearchTask
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_application.enrich_research_objective import (
    enrich_objective_generation,
    handle_enrich_objective,
    validate_enrichment_response,
)


@pytest.fixture
def sample_research_objective() -> ResearchObjective:
    """Sample research objective for testing."""
    return ResearchObjective(
        number=1,
        title="Develop novel biomarkers",
        research_tasks=[
            ResearchTask(number=1, title="Identify candidate biomarkers"),
            ResearchTask(number=2, title="Validate biomarkers"),
        ],
    )


@pytest.fixture
def valid_enrichment_response() -> dict[str, Any]:
    """Valid enrichment response for testing."""
    return {
        "research_objective": {
            "core_scientific_terms": ["biomarkers", "proteomics", "mass spectrometry", "validation", "specificity"],
            "instructions": "Write a comprehensive description focusing on scientific rigor and methodological precision. Emphasize the innovative approach and potential impact on cancer research. Use formal academic tone with technical detail appropriate for grant reviewers.",
            "description": "This research objective aims to discover and validate novel protein biomarkers for early cancer detection using advanced proteomics techniques. The methodology involves mass spectrometry analysis of patient samples to identify differentially expressed proteins.",
            "guiding_questions": [
                "What biomarkers show the highest specificity for early detection?",
                "How can we ensure reproducibility across different patient populations?",
                "What validation strategies will provide the strongest evidence?",
            ],
            "search_queries": [
                "cancer biomarker discovery",
                "proteomics mass spectrometry",
                "biomarker validation methods",
            ],
        },
        "research_tasks": [
            {
                "core_scientific_terms": [
                    "proteomics",
                    "mass spectrometry",
                    "differential expression",
                    "protein analysis",
                    "biomarker discovery",
                ],
                "instructions": "Focus on technical methodology and experimental design for biomarker identification. Emphasize innovative proteomics approaches and data analysis techniques.",
                "description": "Systematic identification of candidate biomarkers through comprehensive proteomics analysis using mass spectrometry techniques to detect differentially expressed proteins in cancer versus control samples.",
                "guiding_questions": [
                    "Which proteomics platform provides optimal sensitivity?",
                    "How do we control for biological variability?",
                    "What statistical methods best identify significant differences?",
                ],
                "search_queries": [
                    "proteomics biomarker identification",
                    "mass spectrometry cancer",
                    "differential protein expression",
                ],
            },
            {
                "core_scientific_terms": [
                    "biomarker validation",
                    "clinical sensitivity",
                    "specificity",
                    "assay development",
                    "clinical trials",
                ],
                "instructions": "Emphasize clinical validation methodology and regulatory considerations. Focus on translational aspects and clinical utility of identified biomarkers.",
                "description": "Comprehensive validation of identified biomarkers through clinical studies to establish sensitivity, specificity, and clinical utility for cancer detection in diverse patient populations.",
                "guiding_questions": [
                    "What sample size ensures adequate statistical power?",
                    "How do we address population diversity in validation?",
                    "What regulatory requirements must be considered?",
                ],
                "search_queries": [
                    "biomarker clinical validation",
                    "diagnostic test sensitivity",
                    "clinical trial design",
                ],
            },
        ],
    }


@pytest.fixture
def sample_dto_input() -> dict[str, Any]:
    """Sample DTO input for testing."""
    return {
        "research_objective": ResearchObjective(
            number=1,
            title="Develop novel biomarkers",
            research_tasks=[
                ResearchTask(number=1, title="Identify candidate biomarkers"),
                ResearchTask(number=2, title="Validate biomarkers"),
            ],
        ),
        "keywords": ["biomarkers", "cancer", "detection"],
        "topics": ["proteomics", "clinical validation"],
        "form_inputs": {"background_context": "Cancer research project"},
        "retrieval_context": "Retrieved context about biomarker research methods and validation techniques.",
    }


async def test_validate_enrichment_response_valid_data(
    valid_enrichment_response: dict[str, Any], sample_research_objective: ResearchObjective
) -> None:
    """Test validation with valid enrichment response."""
    # Should not raise any exception
    validate_enrichment_response(valid_enrichment_response, input_objective=sample_research_objective)


async def test_validate_enrichment_response_missing_objective() -> None:
    """Test validation with missing research objective."""
    invalid_response = {"research_tasks": []}

    with pytest.raises(ValidationError, match="Missing objective in response"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_invalid_objective_type() -> None:
    """Test validation with invalid objective type."""
    invalid_response = {"research_objective": "not a dict", "research_tasks": []}

    with pytest.raises(ValidationError, match="Objective must be a dictionary"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_missing_objective_fields() -> None:
    """Test validation with missing objective fields."""
    invalid_response = {
        "research_objective": {
            "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
            # Missing other required fields
        },
        "research_tasks": [],
    }

    with pytest.raises(ValidationError, match="Missing instructions in objective"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_wrong_terms_count() -> None:
    """Test validation with wrong number of core scientific terms."""
    invalid_response = {
        "research_objective": {
            "core_scientific_terms": ["term1", "term2"],  # Only 2 terms instead of 5
            "instructions": "Test instructions that are longer than fifty characters",
            "description": "Test description that is longer than fifty characters",
            "guiding_questions": ["Q1", "Q2", "Q3"],
            "search_queries": ["Q1", "Q2", "Q3"],
        },
        "research_tasks": [],
    }

    with pytest.raises(ValidationError, match="Objective must have exactly 5 core scientific terms"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_insufficient_questions() -> None:
    """Test validation with insufficient guiding questions."""
    invalid_response = {
        "research_objective": {
            "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
            "instructions": "Test instructions that are longer than fifty characters",
            "description": "Test description that is longer than fifty characters",
            "guiding_questions": ["Q1", "Q2"],  # Only 2 questions instead of minimum 3
            "search_queries": ["Q1", "Q2", "Q3"],
        },
        "research_tasks": [],
    }

    with pytest.raises(ValidationError, match="Objective must have at least 3 guiding questions"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_insufficient_queries() -> None:
    """Test validation with insufficient search queries."""
    invalid_response = {
        "research_objective": {
            "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
            "instructions": "Test instructions that are longer than fifty characters",
            "description": "Test description that is longer than fifty characters",
            "guiding_questions": ["Q1", "Q2", "Q3"],
            "search_queries": ["Q1", "Q2"],  # Only 2 queries instead of minimum 3
        },
        "research_tasks": [],
    }

    with pytest.raises(ValidationError, match="Objective must have at least 3 search queries"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_short_instructions() -> None:
    """Test validation with too short instructions."""
    invalid_response = {
        "research_objective": {
            "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
            "instructions": "Short",  # Too short
            "description": "Test description that is longer than fifty characters",
            "guiding_questions": ["Q1", "Q2", "Q3"],
            "search_queries": ["Q1", "Q2", "Q3"],
        },
        "research_tasks": [],
    }

    with pytest.raises(ValidationError, match="Objective instructions too short"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_short_description() -> None:
    """Test validation with too short description."""
    invalid_response = {
        "research_objective": {
            "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
            "instructions": "Test instructions that are longer than fifty characters",
            "description": "Short",  # Too short
            "guiding_questions": ["Q1", "Q2", "Q3"],
            "search_queries": ["Q1", "Q2", "Q3"],
        },
        "research_tasks": [],
    }

    with pytest.raises(ValidationError, match="Objective description too short"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_missing_tasks() -> None:
    """Test validation with missing research tasks."""
    invalid_response = {
        "research_objective": {
            "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
            "instructions": "Test instructions that are longer than fifty characters",
            "description": "Test description that is longer than fifty characters",
            "guiding_questions": ["Q1", "Q2", "Q3"],
            "search_queries": ["Q1", "Q2", "Q3"],
        }
        # Missing research_tasks
    }

    with pytest.raises(ValidationError, match="Missing tasks in response"):
        validate_enrichment_response(invalid_response, input_objective=None)


async def test_validate_enrichment_response_mismatched_task_count(sample_research_objective: ResearchObjective) -> None:
    """Test validation with mismatched task count."""
    invalid_response = {
        "research_objective": {
            "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
            "instructions": "Test instructions that are longer than fifty characters",
            "description": "Test description that is longer than fifty characters",
            "guiding_questions": ["Q1", "Q2", "Q3"],
            "search_queries": ["Q1", "Q2", "Q3"],
        },
        "research_tasks": [
            {
                "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
                "instructions": "Test instructions that are longer than fifty characters",
                "description": "Test description that is longer than fifty characters",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["Q1", "Q2", "Q3"],
            }
            # Only 1 task, but sample_research_objective has 2 tasks
        ],
    }

    with pytest.raises(ValidationError, match="Number of enriched tasks doesn't match input objective tasks"):
        validate_enrichment_response(invalid_response, input_objective=sample_research_objective)


async def test_validate_enrichment_response_invalid_task_fields() -> None:
    """Test validation with invalid task fields."""
    invalid_response = {
        "research_objective": {
            "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
            "instructions": "Test instructions that are longer than fifty characters",
            "description": "Test description that is longer than fifty characters",
            "guiding_questions": ["Q1", "Q2", "Q3"],
            "search_queries": ["Q1", "Q2", "Q3"],
        },
        "research_tasks": [
            {
                "core_scientific_terms": ["term1", "term2"],  # Wrong count
                "instructions": "Test instructions that are longer than fifty characters",
                "description": "Test description that is longer than fifty characters",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["Q1", "Q2", "Q3"],
            }
        ],
    }

    with pytest.raises(ValidationError, match="Task at index 0 must have exactly 5 core scientific terms"):
        validate_enrichment_response(invalid_response, input_objective=None)


@patch("services.rag.src.grant_application.enrich_research_objective.handle_completions_request")
async def test_enrich_objective_generation_success(
    mock_handle_completions_request: AsyncMock, valid_enrichment_response: dict[str, Any]
) -> None:
    """Test successful objective enrichment generation."""
    mock_handle_completions_request.return_value = valid_enrichment_response

    result = await enrich_objective_generation(
        "Test task description with research objectives and tasks", input_objective=None
    )

    assert result == valid_enrichment_response
    mock_handle_completions_request.assert_called_once()


@patch("services.rag.src.grant_application.enrich_research_objective.with_prompt_evaluation")
async def test_handle_enrich_objective_success(
    mock_with_prompt_evaluation: AsyncMock, sample_dto_input: dict[str, Any], valid_enrichment_response: dict[str, Any]
) -> None:
    """Test successful objective enrichment handling."""
    mock_with_prompt_evaluation.return_value = valid_enrichment_response

    result = await handle_enrich_objective(sample_dto_input)

    assert result == valid_enrichment_response

    # Verify with_prompt_evaluation was called with correct parameters
    mock_with_prompt_evaluation.assert_called_once()
    call_args = mock_with_prompt_evaluation.call_args
    assert call_args.kwargs["prompt_identifier"] == "enrich_objective"
    assert call_args.kwargs["passing_score"] == 80
    assert call_args.kwargs["increment"] == 10
    assert "criteria" in call_args.kwargs


@patch("services.rag.src.grant_application.enrich_research_objective.with_prompt_evaluation")
async def test_handle_enrich_objective_error_handling(
    mock_with_prompt_evaluation: AsyncMock, sample_dto_input: dict[str, Any]
) -> None:
    """Test error handling in objective enrichment."""
    mock_with_prompt_evaluation.side_effect = Exception("Enrichment service error")

    with pytest.raises(Exception, match="Enrichment service error"):
        await handle_enrich_objective(sample_dto_input)

    mock_with_prompt_evaluation.assert_called_once()


async def test_validation_with_empty_research_objective() -> None:
    """Test validation with research objective but empty tasks."""
    response_with_empty_tasks = {
        "research_objective": {
            "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
            "instructions": "Test instructions that are longer than fifty characters",
            "description": "Test description that is longer than fifty characters",
            "guiding_questions": ["Q1", "Q2", "Q3"],
            "search_queries": ["Q1", "Q2", "Q3"],
        },
        "research_tasks": [],
    }

    objective_with_no_tasks = ResearchObjective(number=1, title="Test objective", research_tasks=[])

    # Should not raise exception when both have no tasks
    validate_enrichment_response(response_with_empty_tasks, input_objective=objective_with_no_tasks)


async def test_validation_comprehensive_task_validation() -> None:
    """Test comprehensive validation of task fields."""
    response_with_invalid_task = {
        "research_objective": {
            "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
            "instructions": "Test instructions that are longer than fifty characters",
            "description": "Test description that is longer than fifty characters",
            "guiding_questions": ["Q1", "Q2", "Q3"],
            "search_queries": ["Q1", "Q2", "Q3"],
        },
        "research_tasks": [
            {
                "core_scientific_terms": ["term1", "term2", "term3", "term4", "term5"],
                "instructions": "Short",  # Too short
                "description": "Test description that is longer than fifty characters",
                "guiding_questions": ["Q1", "Q2", "Q3"],
                "search_queries": ["Q1", "Q2", "Q3"],
            }
        ],
    }

    with pytest.raises(ValidationError, match="Task at index 0 instructions too short"):
        validate_enrichment_response(response_with_invalid_task, input_objective=None)
