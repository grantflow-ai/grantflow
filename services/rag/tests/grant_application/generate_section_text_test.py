from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from packages.db.src.json_objects import ResearchObjective, ResearchTask

from services.rag.src.grant_application.generate_section_text import handle_generate_section_text


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
        "id": "abstract",
        "title": "Abstract",
        "order": 1,
        "parent_id": None,
        "keywords": ["summary", "overview"],
        "topics": ["project summary", "objectives"],
        "generation_instructions": "Write a comprehensive abstract summarizing the project objectives, methods, and expected outcomes",
        "depends_on": [],
        "max_words": 250,
        "search_queries": ["abstract", "project summary", "research overview"],
        "is_detailed_research_plan": False,
        "is_clinical_trial": None,
    }


@pytest.fixture
def sample_shared_context() -> str:
    """Sample shared context for testing."""
    return """
    Recent advances in cancer biomarker discovery have shown that proteomics-based approaches
    can identify novel diagnostic markers. Machine learning models have proven effective at
    analyzing complex biological data. Clinical validation studies are essential for
    translating research findings into clinical practice.
    """


@pytest.fixture
def sample_cfp_analysis() -> dict[str, Any]:
    """Sample CFP analysis for testing."""
    return {
        "sections_count": 5,
        "length_constraints_found": 3,
        "evaluation_criteria_count": 4,
        "section_requirements": [
            {
                "section": "Abstract",
                "requirements": [
                    {"requirement": "Summarize project goals", "quote": "Provide a clear summary of objectives"}
                ]
            }
        ],
        "length_constraints": [
            {"description": "Abstract section", "quote": "Maximum 250 words for abstract"},
            {"description": "Research Plan section", "quote": "Maximum 2000 words for research plan"},
        ],
        "evaluation_criteria": [
            {"criterion": "Innovation and significance", "quote": "Evaluate innovation"},
            {"criterion": "Technical approach", "quote": "Assess technical merit"},
        ],
    }


@patch("services.rag.src.grant_application.generate_section_text.handle_source_validation")
@patch("services.rag.src.grant_application.generate_section_text.with_prompt_evaluation")
async def test_handle_generate_section_text_success(
    mock_with_prompt_evaluation: AsyncMock,
    mock_handle_source_validation: AsyncMock,
    sample_grant_section: dict[str, Any],
    sample_research_objectives: list[ResearchObjective],
    sample_shared_context: str,
    sample_cfp_analysis: dict[str, Any],
) -> None:
    """Test successful section text generation."""
    # Setup mock response
    mock_section_text = """
    This project aims to develop novel biomarkers for early cancer detection through
    innovative proteomics approaches. We will identify and validate candidate biomarkers
    using mass spectrometry techniques, followed by the development of machine learning
    models to enhance diagnostic accuracy. The research combines cutting-edge technology
    with clinical validation to translate findings into practical diagnostic tools.
    """
    mock_with_prompt_evaluation.return_value = mock_section_text
    mock_handle_source_validation.return_value = None  # No validation error

    # Execute
    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_deep_dives=sample_research_objectives,
        shared_context=sample_shared_context,
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    # Verify result
    assert isinstance(result, str)
    assert result == mock_section_text
    assert len(result.strip()) > 0

    # Verify service call
    mock_with_prompt_evaluation.assert_called_once()
    mock_handle_source_validation.assert_called_once()


@patch("services.rag.src.grant_application.generate_section_text.handle_source_validation")
@patch("services.rag.src.grant_application.generate_section_text.with_prompt_evaluation")
async def test_handle_generate_section_text_empty_research_objectives(
    mock_with_prompt_evaluation: AsyncMock,
    mock_handle_source_validation: AsyncMock,
    sample_grant_section: dict[str, Any],
    sample_shared_context: str,
    sample_cfp_analysis: dict[str, Any],
) -> None:
    """Test section text generation with empty research objectives."""
    # Setup mock response
    mock_section_text = "General project abstract without specific research objectives."
    mock_with_prompt_evaluation.return_value = mock_section_text
    mock_handle_source_validation.return_value = None

    # Execute with empty research objectives
    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_deep_dives=[],
        shared_context=sample_shared_context,
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    # Verify result
    assert isinstance(result, str)
    assert result == mock_section_text

    # Verify service calls
    mock_with_prompt_evaluation.assert_called_once()
    mock_handle_source_validation.assert_called_once()


@patch("services.rag.src.grant_application.generate_section_text.handle_source_validation")
@patch("services.rag.src.grant_application.generate_section_text.with_prompt_evaluation")
async def test_handle_generate_section_text_validation_error(
    mock_with_prompt_evaluation: AsyncMock,
    mock_handle_source_validation: AsyncMock,
    sample_grant_section: dict[str, Any],
    sample_research_objectives: list[ResearchObjective],
    sample_shared_context: str,
    sample_cfp_analysis: dict[str, Any],
) -> None:
    """Test section text generation when source validation fails."""
    # Setup mock to return validation error
    mock_handle_source_validation.return_value = "Insufficient context for reliable generation"

    # Execute
    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_deep_dives=sample_research_objectives,
        shared_context=sample_shared_context,
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    # Verify result is empty when validation fails
    assert result == ""

    # Verify validation was called but prompt evaluation was not
    mock_handle_source_validation.assert_called_once()
    mock_with_prompt_evaluation.assert_not_called()


@patch("services.rag.src.grant_application.generate_section_text.handle_source_validation")
@patch("services.rag.src.grant_application.generate_section_text.with_prompt_evaluation")
async def test_handle_generate_section_text_error_handling(
    mock_with_prompt_evaluation: AsyncMock,
    mock_handle_source_validation: AsyncMock,
    sample_grant_section: dict[str, Any],
    sample_research_objectives: list[ResearchObjective],
    sample_shared_context: str,
    sample_cfp_analysis: dict[str, Any],
) -> None:
    """Test error handling when section text generation fails."""
    # Setup mock to raise exception
    mock_with_prompt_evaluation.side_effect = Exception("Section generation service error")
    mock_handle_source_validation.return_value = None

    # Execute and verify exception is propagated
    with pytest.raises(Exception, match="Section generation service error"):
        await handle_generate_section_text(
            section=sample_grant_section,
            research_deep_dives=sample_research_objectives,
            shared_context=sample_shared_context,
            cfp_analysis=sample_cfp_analysis,
            trace_id=str(uuid4()),
        )

    # Verify services were called
    mock_handle_source_validation.assert_called_once()
    mock_with_prompt_evaluation.assert_called_once()


@patch("services.rag.src.grant_application.generate_section_text.handle_source_validation")
@patch("services.rag.src.grant_application.generate_section_text.with_prompt_evaluation")
async def test_handle_generate_section_text_single_research_objective(
    mock_with_prompt_evaluation: AsyncMock,
    mock_handle_source_validation: AsyncMock,
    sample_grant_section: dict[str, Any],
    sample_shared_context: str,
    sample_cfp_analysis: dict[str, Any],
) -> None:
    """Test section text generation with single research objective."""
    # Single research objective
    single_objective = [
        ResearchObjective(
            number=1,
            title="Develop biomarker assay",
            research_tasks=[
                ResearchTask(number=1, title="Design assay protocol"),
                ResearchTask(number=2, title="Validate assay performance"),
            ],
        )
    ]

    mock_section_text = """
    This project focuses on developing a novel biomarker assay for clinical diagnostics.
    The research will design and validate a robust assay protocol that can be implemented
    in clinical laboratories for routine diagnostic use.
    """
    mock_with_prompt_evaluation.return_value = mock_section_text
    mock_handle_source_validation.return_value = None

    # Execute
    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_deep_dives=single_objective,
        shared_context=sample_shared_context,
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    # Verify result
    assert isinstance(result, str)
    assert result == mock_section_text

    # Verify service calls
    mock_with_prompt_evaluation.assert_called_once()
    mock_handle_source_validation.assert_called_once()
