from unittest.mock import patch
from uuid import uuid4

import pytest
from packages.db.src.json_objects import ResearchObjective, ResearchTask

from services.rag.src.grant_application.generate_section_text import handle_generate_section_text


@pytest.fixture
def sample_research_objectives():
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
def sample_grant_section():
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
def sample_shared_context():
    """Sample shared context for testing."""
    return """
    Recent advances in cancer biomarker discovery have shown that proteomics-based approaches
    can identify novel diagnostic markers. Machine learning models have proven effective at
    analyzing complex biological data. Clinical validation studies are essential for
    translating research findings into clinical practice.
    """


@pytest.fixture
def sample_cfp_analysis():
    """Sample CFP analysis for testing."""
    return {
        "sections_count": 5,
        "length_constraints_found": 3,
        "evaluation_criteria_count": 4,
        "required_sections": ["Abstract", "Research Plan", "Budget"],
        "length_constraints": [
            {"section": "Abstract", "max_words": 250},
            {"section": "Research Plan", "max_words": 2000},
        ],
        "evaluation_criteria": [
            "Innovation and significance",
            "Technical approach",
            "Feasibility",
            "Team qualifications",
        ],
    }


@patch("services.rag.src.grant_application.generate_section_text.generate_section_text")
async def test_handle_generate_section_text_success(
    mock_generate_section_text,
    sample_grant_section,
    sample_research_objectives,
    sample_shared_context,
    sample_cfp_analysis,
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
    mock_generate_section_text.return_value = mock_section_text

    # Execute
    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_objectives=sample_research_objectives,
        shared_context=sample_shared_context,
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    # Verify result
    assert isinstance(result, str)
    assert result == mock_section_text
    assert len(result.strip()) > 0

    # Verify service call
    mock_generate_section_text.assert_called_once()
    call_args = mock_generate_section_text.call_args
    assert call_args.kwargs["section"] == sample_grant_section
    assert call_args.kwargs["research_objectives"] == sample_research_objectives
    assert call_args.kwargs["shared_context"] == sample_shared_context
    assert call_args.kwargs["cfp_analysis"] == sample_cfp_analysis


@patch("services.rag.src.grant_application.generate_section_text.generate_section_text")
async def test_handle_generate_section_text_empty_research_objectives(
    mock_generate_section_text,
    sample_grant_section,
    sample_shared_context,
    sample_cfp_analysis,
) -> None:
    """Test section text generation with empty research objectives."""
    # Setup mock response
    mock_section_text = "General project abstract without specific research objectives."
    mock_generate_section_text.return_value = mock_section_text

    # Execute with empty research objectives
    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_objectives=[],
        shared_context=sample_shared_context,
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    # Verify result
    assert isinstance(result, str)
    assert result == mock_section_text

    # Verify service call with empty objectives
    mock_generate_section_text.assert_called_once()
    call_args = mock_generate_section_text.call_args
    assert call_args.kwargs["research_objectives"] == []


@patch("services.rag.src.grant_application.generate_section_text.generate_section_text")
async def test_handle_generate_section_text_different_section_types(
    mock_generate_section_text,
    sample_research_objectives,
    sample_shared_context,
    sample_cfp_analysis,
) -> None:
    """Test section text generation for different section types."""
    # Test with significance section
    significance_section = {
        "id": "significance",
        "title": "Significance and Innovation",
        "order": 2,
        "parent_id": None,
        "keywords": ["impact", "innovation", "importance"],
        "topics": ["clinical significance", "research impact"],
        "generation_instructions": "Explain the significance and innovative aspects of the research",
        "depends_on": ["abstract"],
        "max_words": 500,
        "search_queries": ["clinical significance", "research impact", "innovation"],
        "is_detailed_research_plan": False,
        "is_clinical_trial": None,
    }

    mock_significance_text = """
    This research addresses a critical need in early cancer detection by developing
    novel biomarkers that could significantly improve patient outcomes. The innovative
    combination of proteomics and machine learning represents a paradigm shift in
    diagnostic approaches. Clinical validation will ensure translational impact.
    """
    mock_generate_section_text.return_value = mock_significance_text

    # Execute
    result = await handle_generate_section_text(
        section=significance_section,
        research_objectives=sample_research_objectives,
        shared_context=sample_shared_context,
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    # Verify result
    assert isinstance(result, str)
    assert result == mock_significance_text

    # Verify service call with significance section
    mock_generate_section_text.assert_called_once()
    call_args = mock_generate_section_text.call_args
    assert call_args.kwargs["section"]["id"] == "significance"
    assert call_args.kwargs["section"]["title"] == "Significance and Innovation"


@patch("services.rag.src.grant_application.generate_section_text.generate_section_text")
async def test_handle_generate_section_text_minimal_context(
    mock_generate_section_text,
    sample_grant_section,
    sample_research_objectives,
    sample_cfp_analysis,
) -> None:
    """Test section text generation with minimal shared context."""
    # Setup mock response
    mock_section_text = "Abstract based on research objectives with limited context."
    mock_generate_section_text.return_value = mock_section_text

    # Execute with minimal context
    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_objectives=sample_research_objectives,
        shared_context="",  # Empty context
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    # Verify result
    assert isinstance(result, str)
    assert result == mock_section_text

    # Verify service call with empty context
    mock_generate_section_text.assert_called_once()
    call_args = mock_generate_section_text.call_args
    assert call_args.kwargs["shared_context"] == ""


@patch("services.rag.src.grant_application.generate_section_text.generate_section_text")
async def test_handle_generate_section_text_extensive_context(
    mock_generate_section_text,
    sample_grant_section,
    sample_research_objectives,
    sample_cfp_analysis,
) -> None:
    """Test section text generation with extensive shared context."""
    # Extensive context
    extensive_context = """
    Cancer biomarker discovery has evolved significantly with advances in proteomics
    and genomics technologies. Mass spectrometry-based approaches enable comprehensive
    protein profiling in biological samples. Machine learning algorithms can identify
    complex patterns in multi-dimensional biological data that traditional statistical
    methods might miss. Recent studies have demonstrated the utility of proteomics
    biomarkers in various cancer types including breast, lung, and colorectal cancers.
    Clinical validation studies are essential for regulatory approval and clinical
    implementation. Biomarker validation requires large patient cohorts and rigorous
    statistical analysis. Regulatory agencies require specific evidence of analytical
    and clinical validity before biomarkers can be used in clinical practice.
    """

    mock_section_text = """
    This comprehensive research project leverages state-of-the-art proteomics and
    machine learning technologies to develop innovative biomarkers for early cancer
    detection. Building on extensive prior research in biomarker discovery, we will
    apply cutting-edge mass spectrometry techniques to identify novel protein markers
    and develop sophisticated ML models for enhanced diagnostic accuracy.
    """
    mock_generate_section_text.return_value = mock_section_text

    # Execute
    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_objectives=sample_research_objectives,
        shared_context=extensive_context,
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    # Verify result
    assert isinstance(result, str)
    assert result == mock_section_text

    # Verify service call with extensive context
    mock_generate_section_text.assert_called_once()
    call_args = mock_generate_section_text.call_args
    assert call_args.kwargs["shared_context"] == extensive_context


@patch("services.rag.src.grant_application.generate_section_text.generate_section_text")
async def test_handle_generate_section_text_error_handling(
    mock_generate_section_text,
    sample_grant_section,
    sample_research_objectives,
    sample_shared_context,
    sample_cfp_analysis,
) -> None:
    """Test error handling when section text generation fails."""
    # Setup mock to raise exception
    mock_generate_section_text.side_effect = Exception("Section generation service error")

    # Execute and verify exception is propagated
    with pytest.raises(Exception, match="Section generation service error"):
        await handle_generate_section_text(
            section=sample_grant_section,
            research_objectives=sample_research_objectives,
            shared_context=sample_shared_context,
            cfp_analysis=sample_cfp_analysis,
            trace_id=str(uuid4()),
        )

    # Verify service was called
    mock_generate_section_text.assert_called_once()


@patch("services.rag.src.grant_application.generate_section_text.generate_section_text")
async def test_handle_generate_section_text_single_research_objective(
    mock_generate_section_text,
    sample_grant_section,
    sample_shared_context,
    sample_cfp_analysis,
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
    mock_generate_section_text.return_value = mock_section_text

    # Execute
    result = await handle_generate_section_text(
        section=sample_grant_section,
        research_objectives=single_objective,
        shared_context=sample_shared_context,
        cfp_analysis=sample_cfp_analysis,
        trace_id=str(uuid4()),
    )

    # Verify result
    assert isinstance(result, str)
    assert result == mock_section_text

    # Verify service call with single objective
    mock_generate_section_text.assert_called_once()
    call_args = mock_generate_section_text.call_args
    assert len(call_args.kwargs["research_objectives"]) == 1
    assert call_args.kwargs["research_objectives"][0]["title"] == "Develop biomarker assay"