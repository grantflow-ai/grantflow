from unittest.mock import AsyncMock, patch

import pytest
from packages.db.src.json_objects import (
    CategorizationAnalysisResult,
    CFPAnalysisResult,
    CFPSectionAnalysis,
)
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_section_analysis import (
    analyze_cfp_sections,
    handle_analyze_cfp,
    validate_cfp_analysis,
)


@pytest.fixture
def sample_nlp_analysis() -> CategorizationAnalysisResult:
    return {
        "money": ["$50,000 maximum award", "Budget limited to $25,000 per year"],
        "date_time": ["Applications due March 31, 2025", "Submit by 5:00 PM EST"],
        "writing_related": ["Submit a research proposal", "Include literature review"],
        "other_numbers": ["3 years maximum project duration", "Maximum 5 pages"],
        "recommendations": ["Collaboration is encouraged", "Preliminary data preferred"],
        "orders": ["Submit documents in the following order", "Follow application guidelines"],
        "positive_instructions": ["Include preliminary data", "Provide detailed methodology"],
        "negative_instructions": ["Do not exceed page limits", "Avoid proprietary information"],
        "evaluation_criteria": ["Scientific merit will be evaluated", "Innovation assessed"],
    }


@pytest.fixture
def sample_cfp_analysis() -> CFPSectionAnalysis:
    return {
        "sections_count": 2,
        "length_constraints_found": 2,
        "evaluation_criteria_count": 2,
        "required_sections": [
            {
                "section_name": "Project Summary",
                "definition": "Brief overview of the proposed research project",
                "requirements": [
                    {
                        "requirement": "Must include project objectives",
                        "quote_from_source": "The project summary must clearly state the project objectives and expected outcomes",
                        "category": "content",
                    },
                    {
                        "requirement": "Must be self-contained",
                        "quote_from_source": "Project summary should be self-contained and understandable without additional context",
                        "category": "content",
                    },
                ],
                "dependencies": [],
            },
            {
                "section_name": "Research Plan",
                "definition": "Detailed description of the research methodology and approach",
                "requirements": [
                    {
                        "requirement": "Must include detailed methodology",
                        "quote_from_source": "Research plan must provide detailed methodology and experimental design",
                        "category": "content",
                    }
                ],
                "dependencies": ["Project Summary"],
            },
        ],
        "length_constraints": [
            {
                "section_name": "Project Summary",
                "measurement_type": "pages",
                "limit_description": "1 page maximum",
                "quote_from_source": "Project summary is limited to one page including figures and tables",
                "exclusions": [],
            },
            {
                "section_name": "Research Plan",
                "measurement_type": "pages",
                "limit_description": "15 pages maximum",
                "quote_from_source": "Research plan cannot exceed 15 pages excluding references and appendices",
                "exclusions": ["References", "Appendices"],
            },
        ],
        "evaluation_criteria": [
            {
                "criterion_name": "Scientific Merit",
                "description": "Quality and significance of the scientific approach",
                "quote_from_source": "Applications will be evaluated based on scientific merit and innovation",
                "weight_percentage": 40,
            },
            {
                "criterion_name": "Feasibility",
                "description": "Likelihood of successful project completion",
                "quote_from_source": "Feasibility of the proposed research will be a key evaluation factor",
            },
        ],
        "additional_requirements": [
            {
                "requirement": "Must use 12-point font",
                "quote_from_source": "All text must be in 12-point Times New Roman font",
                "category": "formatting",
            },
            {
                "requirement": "Must include budget justification",
                "quote_from_source": "A detailed budget justification is required for all proposed expenses",
                "category": "budget",
            },
        ],
    }


def test_validate_cfp_analysis_valid_response(sample_cfp_analysis: CFPSectionAnalysis) -> None:
    """Test validation passes for valid CFP analysis response."""
    validate_cfp_analysis(sample_cfp_analysis)


def test_validate_cfp_analysis_with_error_field() -> None:
    """Test validation raises error when error field is present."""
    response: CFPSectionAnalysis = {
        "sections_count": 0,
        "length_constraints_found": 0,
        "evaluation_criteria_count": 0,
        "required_sections": [],
        "length_constraints": [],
        "evaluation_criteria": [],
        "additional_requirements": [],
        "error": "Failed to analyze CFP content",
    }

    with pytest.raises(ValidationError, match="CFP analysis failed"):
        validate_cfp_analysis(response)


def test_validate_cfp_analysis_no_sections() -> None:
    """Test validation raises error when no sections found."""
    response: CFPSectionAnalysis = {
        "sections_count": 0,
        "length_constraints_found": 0,
        "evaluation_criteria_count": 0,
        "required_sections": [],
        "length_constraints": [],
        "evaluation_criteria": [],
        "additional_requirements": [],
    }

    with pytest.raises(ValidationError, match="No sections identified"):
        validate_cfp_analysis(response)


def test_validate_cfp_analysis_count_mismatch() -> None:
    """Test validation raises error when section count doesn't match."""
    response: CFPSectionAnalysis = {
        "sections_count": 2,
        "length_constraints_found": 0,
        "evaluation_criteria_count": 0,
        "required_sections": [
            {"section_name": "Test Section", "definition": "Test definition", "requirements": [], "dependencies": []}
        ],  # Only 1 section but count says 2
        "length_constraints": [],
        "evaluation_criteria": [],
        "additional_requirements": [],
    }

    with pytest.raises(ValidationError, match="Sections count mismatch"):
        validate_cfp_analysis(response)


def test_validate_cfp_analysis_auto_fixes_missing_cfp_source_reference(sample_cfp_analysis: CFPSectionAnalysis) -> None:
    """Test validation handles missing CFP source references gracefully."""
    # Test that validation doesn't break when cfp_source_reference is not required
    response = sample_cfp_analysis.copy()

    # This should pass validation without issues
    validate_cfp_analysis(response)

    # Verify the response structure is still valid
    assert "required_sections" in response
    assert len(response["required_sections"]) == 2
    cfp_ref = response["required_sections"][0]["cfp_source_reference"]
    assert cfp_ref is not None
    assert cfp_ref.startswith("CFP defines")


def test_validate_cfp_analysis_fixes_short_quotes(sample_cfp_analysis: CFPSectionAnalysis) -> None:
    """Test validation handles short quotes appropriately."""
    response = sample_cfp_analysis.copy()
    # Make a quote short but valid
    response["required_sections"][0]["requirements"][0]["quote_from_source"] = "Short quote from CFP"

    validate_cfp_analysis(response)

    # Should preserve the quote as-is if it's already valid
    quote = response["required_sections"][0]["requirements"][0]["quote_from_source"]
    assert quote == "Short quote from CFP"


@patch("services.rag.src.grant_template.cfp_section_analysis.handle_completions_request")
async def test_analyze_cfp_sections_success(
    mock_completions: AsyncMock,
    sample_nlp_analysis: CategorizationAnalysisResult,
    sample_cfp_analysis: CFPSectionAnalysis,
) -> None:
    """Test successful CFP section analysis."""
    mock_completions.return_value = sample_cfp_analysis

    result = await analyze_cfp_sections(
        cfp_content="Sample CFP content for testing analysis",
        nlp_analysis=sample_nlp_analysis,
        trace_id="test-trace-id",
    )

    assert result == sample_cfp_analysis
    mock_completions.assert_called_once()

    # Verify the call was made with correct parameters
    call_kwargs = mock_completions.call_args.kwargs
    assert call_kwargs["prompt_identifier"] == "cfp_section_analyzer"
    assert call_kwargs["model"] == "gemini-2.5-flash"
    assert call_kwargs["temperature"] == 0.1
    assert call_kwargs["trace_id"] == "test-trace-id"


@patch("services.rag.src.grant_template.cfp_section_analysis.categorize_text")
@patch("services.rag.src.grant_template.cfp_section_analysis.analyze_cfp_sections")
async def test_handle_analyze_cfp_success(
    mock_analyze_sections: AsyncMock,
    mock_categorize: AsyncMock,
    sample_nlp_analysis: CategorizationAnalysisResult,
    sample_cfp_analysis: CFPSectionAnalysis,
) -> None:
    """Test successful full CFP analysis pipeline."""
    mock_categorize.return_value = sample_nlp_analysis
    mock_analyze_sections.return_value = sample_cfp_analysis

    result = await handle_analyze_cfp(full_cfp_text="Sample CFP content for testing", trace_id="test-trace-id")

    expected_result: CFPAnalysisResult = {
        "cfp_analysis": sample_cfp_analysis,
        "nlp_analysis": sample_nlp_analysis,
        "analysis_metadata": {
            "content_length": len("Sample CFP content for testing"),
            "categories_found": 9,  # All categories in sample_nlp_analysis have content
            "total_sentences": 18,  # Total sentences across all categories
        },
    }

    assert result == expected_result

    mock_categorize.assert_called_once_with("Sample CFP content for testing")
    mock_analyze_sections.assert_called_once_with(
        "Sample CFP content for testing", sample_nlp_analysis, trace_id="test-trace-id"
    )


@patch("services.rag.src.grant_template.cfp_section_analysis.categorize_text")
async def test_handle_analyze_cfp_calculates_metadata_correctly(
    mock_categorize: AsyncMock,
) -> None:
    """Test that metadata is calculated correctly."""
    # Mock NLP analysis with specific content
    mock_nlp_analysis: CategorizationAnalysisResult = {
        "money": ["$50,000"],  # 1 sentence
        "date_time": ["Due March 31"],  # 1 sentence
        "writing_related": [],  # 0 sentences - empty category
        "other_numbers": ["3 years", "5 pages"],  # 2 sentences
        "recommendations": [],  # 0 sentences - empty category
        "orders": ["Follow guidelines"],  # 1 sentence
        "positive_instructions": [],  # 0 sentences - empty category
        "negative_instructions": [],  # 0 sentences - empty category
        "evaluation_criteria": ["Merit assessed"],  # 1 sentence
    }

    mock_categorize.return_value = mock_nlp_analysis

    with patch("services.rag.src.grant_template.cfp_section_analysis.analyze_cfp_sections") as mock_analyze:
        mock_analyze.return_value = {
            "sections_count": 1,
            "length_constraints_found": 1,
            "evaluation_criteria_count": 1,
            "required_sections": [],
            "length_constraints": [],
            "evaluation_criteria": [],
            "additional_requirements": [],
        }

        cfp_text = "Test CFP content"
        result = await handle_analyze_cfp(full_cfp_text=cfp_text, trace_id="test-trace")

    metadata = result["analysis_metadata"]
    assert metadata["content_length"] == len(cfp_text)
    assert metadata["categories_found"] == 5  # 5 non-empty categories
    assert metadata["total_sentences"] == 6  # Total sentences: 1+1+0+2+0+1+0+0+1 = 6


@patch("services.rag.src.grant_template.cfp_section_analysis.analyze_cfp_sections")
async def test_handle_analyze_cfp_propagates_analysis_errors(
    mock_analyze_sections: AsyncMock,
) -> None:
    """Test that analysis errors are properly propagated."""
    mock_analyze_sections.side_effect = ValidationError("Analysis failed due to insufficient content")

    with (
        patch(
            "services.rag.src.grant_template.cfp_section_analysis.categorize_text", return_value={"test": ["category"]}
        ),
        pytest.raises(ValidationError, match="Analysis failed due to insufficient content"),
    ):
        await handle_analyze_cfp(full_cfp_text="Insufficient CFP content", trace_id="test-trace")
