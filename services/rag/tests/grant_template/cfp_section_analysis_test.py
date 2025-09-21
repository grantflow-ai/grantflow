import pytest
from packages.db.src.json_objects import CFPSectionAnalysis
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.cfp_section_analysis import (
    handle_analyze_cfp,
    validate_cfp_analysis,
)


@pytest.fixture
def sample_cfp_content() -> str:
    return """
    National Science Foundation Research Grant Program

    REQUIRED SECTIONS:
    1. Project Summary (1 page maximum)
    2. Research Plan (15 pages maximum)
    3. Budget Justification (3 pages maximum)

    EVALUATION: Applications evaluated on intellectual merit (50%) and broader impacts (50%).

    SUBMISSION: Deadline March 31, 2025. Format: 11-point Times New Roman, 1-inch margins.
    """


async def test_handle_analyze_cfp_basic_functionality(sample_cfp_content: str) -> None:
    result = await handle_analyze_cfp(full_cfp_text=sample_cfp_content, trace_id="test-trace-id")

    assert isinstance(result, dict)
    assert "cfp_analysis" in result
    assert "nlp_analysis" in result
    assert "analysis_metadata" in result

    cfp_analysis = result["cfp_analysis"]
    assert "sections_count" in cfp_analysis
    assert "length_constraints_found" in cfp_analysis
    assert "evaluation_criteria_count" in cfp_analysis

    assert cfp_analysis["sections_count"] > 0

    metadata = result["analysis_metadata"]
    assert "content_length" in metadata
    assert "categories_found" in metadata
    assert "total_sentences" in metadata
    assert metadata["content_length"] > 0


async def test_handle_analyze_cfp_empty_content() -> None:
    with pytest.raises(ValidationError):
        await handle_analyze_cfp(full_cfp_text="", trace_id="test-trace-id")


def test_validate_cfp_analysis_valid_data() -> None:
    valid_analysis = CFPSectionAnalysis(
        sections_count=1,
        length_constraints_found=1,
        evaluation_criteria_count=1,
        required_sections=[
            {
                "section_name": "Project Summary",
                "definition": "Brief overview of the research project",
                "requirements": [
                    {
                        "requirement": "Brief overview of project",
                        "quote_from_source": "Project Summary (1 page maximum)",
                        "category": "content",
                    }
                ],
                "dependencies": [],
            }
        ],
        length_constraints=[
            {
                "section_name": "Project Summary",
                "measurement_type": "pages",
                "limit_description": "1 page maximum",
                "quote_from_source": "Project Summary (1 page maximum)",
                "exclusions": [],
            }
        ],
        evaluation_criteria=[
            {
                "criterion_name": "Intellectual Merit",
                "description": "Scientific value of the research",
                "quote_from_source": "Applications evaluated on intellectual merit",
                "weight_percentage": 50,
            }
        ],
        additional_requirements=[],
    )

    validate_cfp_analysis(valid_analysis)


def test_validate_cfp_analysis_empty_sections() -> None:
    invalid_analysis = CFPSectionAnalysis(
        sections_count=0,
        length_constraints_found=0,
        evaluation_criteria_count=0,
        required_sections=[],
        length_constraints=[],
        evaluation_criteria=[],
        additional_requirements=[],
    )

    with pytest.raises(ValidationError) as exc_info:
        validate_cfp_analysis(invalid_analysis)

    assert "No sections identified" in str(exc_info.value)
