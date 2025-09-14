from pathlib import Path
from unittest.mock import patch

import pytest
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_application.generate_section_text import _format_cfp_requirements_for_section
from services.rag.src.grant_template.cfp_section_analyzer import (
    CFP_SECTION_ANALYZER_SCHEMA,
    GEMINI_2_5_FLASH_MODEL,
    CFPSectionAnalysis,
    analyze_cfp_sections_with_gemini,
    generate_cfp_analysis_report,
    transform_analysis_for_database,
    validate_cfp_analysis,
)
from services.rag.src.grant_template.nlp_categorizer import categorize_text_async


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


@pytest.fixture
def mock_gemini_response() -> CFPSectionAnalysis:
    return {
        "required_sections": [
            {
                "section_name": "Project Summary",
                "definition": "Executive overview of the research project",
                "requirements": [
                    {
                        "requirement": "Clear problem statement and objectives",
                        "quote_from_source": "Project Summary (1 page maximum) - Executive overview of the research project",
                        "category": "content",
                    }
                ],
                "dependencies": [],
            },
            {
                "section_name": "Research Plan",
                "definition": "Detailed research methodology and implementation",
                "requirements": [
                    {
                        "requirement": "Literature review and methodology",
                        "quote_from_source": "Research Plan (15 pages maximum) - Detailed research methodology and implementation",
                        "category": "content",
                    }
                ],
                "dependencies": ["Project Summary"],
            },
            {
                "section_name": "Budget Justification",
                "definition": "Detailed cost breakdown and rationale",
                "requirements": [
                    {
                        "requirement": "Personnel costs and equipment breakdown",
                        "quote_from_source": "Budget Justification (3 pages maximum) - Personnel costs, equipment, supplies, travel",
                        "category": "content",
                    }
                ],
                "dependencies": ["Research Plan"],
            },
        ],
        "length_constraints": [
            {
                "section_name": "Project Summary",
                "measurement_type": "pages",
                "limit_description": "1 page maximum",
                "quote_from_source": "Project Summary (1 page maximum)",
                "exclusions": [],
            },
            {
                "section_name": "Research Plan",
                "measurement_type": "pages",
                "limit_description": "15 pages maximum",
                "quote_from_source": "Research Plan (15 pages maximum)",
                "exclusions": [],
            },
            {
                "section_name": "Budget Justification",
                "measurement_type": "pages",
                "limit_description": "3 pages maximum",
                "quote_from_source": "Budget Justification (3 pages maximum)",
                "exclusions": [],
            },
        ],
        "evaluation_criteria": [
            {
                "criterion_name": "Intellectual Merit",
                "description": "Scientific advancement potential and methodological rigor",
                "weight_percentage": 50,
                "quote_from_source": "intellectual merit (50%)",
            },
            {
                "criterion_name": "Broader Impacts",
                "description": "Societal benefits and educational outcomes",
                "weight_percentage": 50,
                "quote_from_source": "broader impacts (50%)",
            },
        ],
        "additional_requirements": [
            {
                "requirement": "Font and margin specifications",
                "quote_from_source": "Format: 11-point Times New Roman, 1-inch margins",
                "category": "formatting",
            },
            {
                "requirement": "Electronic submission required",
                "quote_from_source": "Deadline March 31, 2025",
                "category": "submission",
            },
        ],
        "sections_count": 3,
        "length_constraints_found": 3,
        "evaluation_criteria_count": 2,
    }


def test_validates_complete_cfp_analysis_with_all_required_fields(mock_gemini_response: CFPSectionAnalysis) -> None:
    validate_cfp_analysis(mock_gemini_response)


def test_rejects_cfp_analysis_when_gemini_returns_error_message() -> None:
    response_with_error: CFPSectionAnalysis = {
        "required_sections": [],
        "length_constraints": [],
        "evaluation_criteria": [],
        "additional_requirements": [],
        "sections_count": 2,
        "length_constraints_found": 1,
        "evaluation_criteria_count": 1,
        "error": "Analysis failed due to insufficient context",
    }

    with pytest.raises(ValidationError) as exc_info:
        validate_cfp_analysis(response_with_error)

    assert "Analysis failed due to insufficient context" in str(exc_info.value)


def test_rejects_cfp_analysis_when_quotes_shorter_than_minimum_length() -> None:
    brief_response: CFPSectionAnalysis = {
        "required_sections": [
            {
                "section_name": "Test",
                "definition": "Test section",
                "requirements": [
                    {"requirement": "Test requirement", "quote_from_source": "Short", "category": "content"}
                ],
                "dependencies": [],
            }
        ],
        "length_constraints": [],
        "evaluation_criteria": [],
        "additional_requirements": [],
        "sections_count": 1,
        "length_constraints_found": 0,
        "evaluation_criteria_count": 0,
    }

    with pytest.raises(ValidationError):
        validate_cfp_analysis(brief_response)


def test_rejects_cfp_analysis_when_zero_sections_identified() -> None:
    no_sections_response: CFPSectionAnalysis = {
        "required_sections": [],
        "length_constraints": [],
        "evaluation_criteria": [],
        "additional_requirements": [],
        "sections_count": 0,
        "length_constraints_found": 0,
        "evaluation_criteria_count": 0,
    }

    with pytest.raises(ValidationError) as exc_info:
        validate_cfp_analysis(no_sections_response)

    assert "No sections identified" in str(exc_info.value)


async def test_extracts_sections_constraints_and_criteria_from_cfp_content(
    sample_cfp_content: str, mock_gemini_response: CFPSectionAnalysis
) -> None:
    nlp_result = await categorize_text_async(sample_cfp_content)

    with patch(
        "services.rag.src.grant_template.cfp_section_analyzer.handle_completions_request",
        return_value=mock_gemini_response,
    ):
        result = await analyze_cfp_sections_with_gemini(sample_cfp_content, nlp_result)

    assert result["sections_count"] == 3
    assert result["length_constraints_found"] == 3
    assert result["evaluation_criteria_count"] == 2
    assert len(result["required_sections"]) == 3
    assert result["required_sections"][0]["section_name"] == "Project Summary"
    assert result["required_sections"][1]["section_name"] == "Research Plan"
    assert result["required_sections"][2]["section_name"] == "Budget Justification"


async def test_generates_markdown_report_with_structured_analysis_data(
    sample_cfp_content: str, mock_gemini_response: CFPSectionAnalysis, tmp_path: Path
) -> None:
    nlp_result = await categorize_text_async(sample_cfp_content)

    with patch(
        "services.rag.src.grant_template.cfp_section_analyzer.analyze_cfp_sections_with_gemini",
        return_value=mock_gemini_response,
    ):
        output_file = tmp_path / "test_report.md"
        report = await generate_cfp_analysis_report(
            cfp_content=sample_cfp_content, nlp_analysis=nlp_result, output_file=str(output_file)
        )

    assert "# CFP Analysis Report" in report
    assert "**Sections Identified**: 3" in report
    assert "**Length Constraints**: 3" in report
    assert "**Evaluation Criteria**: 2" in report
    assert "Project Summary" in report
    assert "NLP Analysis Summary" in report
    assert "This analysis was generated using Gemini 2.5 Flash" in report

    assert output_file.exists()
    saved_content = output_file.read_text()
    assert saved_content == report


async def test_categorizes_cfp_content_using_nlp_semantic_analysis() -> None:
    test_cfp = """
    Applications must not exceed 10 pages total.
    Budget limit: $500,000 over 2 years.
    Proposals evaluated on innovation (40%) and feasibility (60%).
    Deadline: June 15, 2025.
    """

    nlp_result = await categorize_text_async(test_cfp)
    assert len(nlp_result["writing_related"]) > 0
    assert len(nlp_result["money"]) > 0
    assert len(nlp_result["date_time"]) > 0

    mock_response = {
        "required_sections": [
            {
                "section_name": "Main Application",
                "definition": "Primary application document",
                "requirements": [
                    {
                        "requirement": "Complete application form",
                        "quote_from_source": "Main Application (10 pages maximum)",
                        "category": "content",
                    }
                ],
                "dependencies": [],
            }
        ],
        "length_constraints": [
            {
                "section_name": "Main Application",
                "measurement_type": "pages",
                "limit_description": "10 pages maximum",
                "quote_from_source": "Main Application (10 pages maximum)",
                "exclusions": [],
            }
        ],
        "evaluation_criteria": [
            {
                "criterion_name": "Innovation",
                "description": "Technical innovation and advancement",
                "weight_percentage": 40,
                "quote_from_source": "innovation (40%)",
            },
            {
                "criterion_name": "Feasibility",
                "description": "Project feasibility and implementation",
                "weight_percentage": 60,
                "quote_from_source": "feasibility (60%)",
            },
        ],
        "additional_requirements": [
            {
                "requirement": "Budget limit compliance",
                "quote_from_source": "Budget limit: $500,000 over 2 years",
                "category": "budget",
            },
            {
                "requirement": "Submission deadline",
                "quote_from_source": "Deadline: June 15, 2025",
                "category": "submission",
            },
        ],
        "sections_count": 1,
        "length_constraints_found": 1,
        "evaluation_criteria_count": 2,
    }

    with patch(
        "services.rag.src.grant_template.cfp_section_analyzer.analyze_cfp_sections_with_gemini",
        return_value=mock_response,
    ):
        report = await generate_cfp_analysis_report(test_cfp, nlp_result)

    assert "# CFP Analysis Report" in report
    assert "Innovation: 40%" in report or "innovation" in report.lower()
    assert "NLP Analysis Summary" in report


def test_json_schema_enforces_required_fields_and_data_types() -> None:
    valid_response = {
        "required_sections": [
            {
                "section_name": "Test Section",
                "definition": "Test definition for section",
                "requirements": [
                    {
                        "requirement": "Test requirement",
                        "quote_from_source": "This is a valid quote from source",
                        "category": "content",
                    }
                ],
                "dependencies": [],
            }
        ],
        "length_constraints": [],
        "evaluation_criteria": [],
        "additional_requirements": [],
        "sections_count": 1,
        "length_constraints_found": 0,
        "evaluation_criteria_count": 0,
    }

    required_fields = CFP_SECTION_ANALYZER_SCHEMA["required"]
    for field in required_fields:
        assert field in valid_response

    properties = CFP_SECTION_ANALYZER_SCHEMA["properties"]
    sections_count_prop = properties["sections_count"]  # type: ignore[index]
    constraints_prop = properties["length_constraints_found"]  # type: ignore[index]
    criteria_prop = properties["evaluation_criteria_count"]  # type: ignore[index]

    assert isinstance(sections_count_prop, dict)
    assert sections_count_prop["minimum"] == 1
    assert isinstance(constraints_prop, dict)
    assert constraints_prop["minimum"] == 0
    assert isinstance(criteria_prop, dict)
    assert criteria_prop["minimum"] == 0


@pytest.mark.parametrize(
    "cfp_file",
    [
        "nih_biomedical_research.txt",
        "nasa_space_technology.txt",
        "erc_advanced_grants.txt",
        "nsf_collaborative_research.txt",
        "darpa_research_grants.txt",
        "doe_energy_innovation.txt",
    ],
)
async def test_processes_various_cfp_formats_with_nlp_categorization(cfp_file: str) -> None:
    samples_dir = Path("testing/test_data/nlp_cfp_samples")
    cfp_path = samples_dir / cfp_file

    if not cfp_path.exists():
        pytest.skip(f"Test data file {cfp_file} not found")

    cfp_content = cfp_path.read_text(encoding="utf-8")

    nlp_result = await categorize_text_async(cfp_content)

    categories_found = sum(1 for v in nlp_result.values() if v)
    assert categories_found >= 3, f"Expected at least 3 NLP categories, got {categories_found}"

    content_length = len(cfp_content)
    estimated_sections = min(12, max(4, content_length // 1000))
    estimated_constraints = min(15, max(2, content_length // 2000))
    estimated_criteria = min(8, max(1, categories_found // 2))

    mock_response = {
        "required_sections": [
            {
                "section_name": f"Section {i}",
                "definition": f"Description of section {i}",
                "requirements": [
                    {
                        "requirement": f"Requirement for section {i}",
                        "quote_from_source": f"This is a quote from the CFP content for section {i}",
                        "category": "content",
                    }
                ],
                "dependencies": [],
            }
            for i in range(estimated_sections)
        ],
        "length_constraints": [
            {
                "section_name": f"Section {i}",
                "measurement_type": "pages",
                "limit_description": f"{i + 1} pages maximum",
                "quote_from_source": f"Section {i} ({i + 1} pages maximum)",
                "exclusions": [],
            }
            for i in range(estimated_constraints)
        ],
        "evaluation_criteria": [
            {
                "criterion_name": f"Criterion {i}",
                "description": f"Evaluation criterion {i} description",
                "quote_from_source": f"criterion {i} evaluation text",
            }
            for i in range(estimated_criteria)
        ],
        "additional_requirements": [
            {
                "requirement": "Standard formatting requirements",
                "quote_from_source": "All submissions must follow standard formatting",
                "category": "formatting",
            }
        ],
        "sections_count": estimated_sections,
        "length_constraints_found": estimated_constraints,
        "evaluation_criteria_count": estimated_criteria,
    }

    with patch(
        "services.rag.src.grant_template.cfp_section_analyzer.handle_completions_request", return_value=mock_response
    ):
        result = await analyze_cfp_sections_with_gemini(cfp_content, nlp_result)

        assert result["sections_count"] >= 4
        assert result["length_constraints_found"] >= 2
        assert result["evaluation_criteria_count"] >= 1
        assert len(result["required_sections"]) >= 4


def test_uses_correct_gemini_model_identifier() -> None:
    assert GEMINI_2_5_FLASH_MODEL == "gemini-2.5-flash"


async def test_nlp_integration_without_external_api_calls() -> None:
    test_content = """
    Applications must not exceed 10 pages. Budget limit: $500,000.
    Proposals evaluated on innovation (40%) and impact (60%).
    Deadline: June 15, 2025.
    """

    nlp_result = await categorize_text_async(test_content)

    assert len(nlp_result["writing_related"]) > 0
    assert len(nlp_result["money"]) > 0
    assert len(nlp_result["date_time"]) > 0

    mock_response = {
        "required_sections": [
            {
                "section_name": f"Section {i}",
                "definition": f"Section {i} definition",
                "requirements": [
                    {
                        "requirement": f"Section {i} requirement",
                        "quote_from_source": f"This is the requirement text for section {i} from CFP",
                        "category": "content",
                    }
                ],
                "dependencies": [],
            }
            for i in range(1, 6)
        ],
        "length_constraints": [
            {
                "section_name": f"Section {i}",
                "measurement_type": "pages",
                "limit_description": f"{i * 2} pages maximum",
                "quote_from_source": f"Applications must not exceed {i * 2} pages for section {i}",
                "exclusions": [],
            }
            for i in range(1, 4)
        ],
        "evaluation_criteria": [
            {
                "criterion_name": "Innovation",
                "description": "Technical innovation assessment",
                "weight_percentage": 40,
                "quote_from_source": "innovation (40%)",
            },
            {
                "criterion_name": "Impact",
                "description": "Project impact evaluation",
                "weight_percentage": 60,
                "quote_from_source": "impact (60%)",
            },
        ],
        "additional_requirements": [
            {"requirement": "Budget compliance", "quote_from_source": "Budget limit: $500,000", "category": "budget"}
        ],
        "sections_count": 5,
        "length_constraints_found": 3,
        "evaluation_criteria_count": 2,
    }

    with patch(
        "services.rag.src.grant_template.cfp_section_analyzer.handle_completions_request", return_value=mock_response
    ):
        report = await generate_cfp_analysis_report(cfp_content=test_content, nlp_analysis=nlp_result)

        assert "# CFP Analysis Report" in report
        assert "**Sections Identified**: 5" in report
        assert "**Length Constraints**: 3" in report
        assert "**Evaluation Criteria**: 2" in report
        assert "## NLP Analysis Summary" in report
        assert "writing_related" in report
        assert "money" in report
        assert "date_time" in report


async def test_handles_multiple_error_scenarios_with_appropriate_messages() -> None:
    error_response = {
        "required_sections": [],
        "length_constraints": [],
        "evaluation_criteria": [],
        "additional_requirements": [],
        "sections_count": 0,
        "length_constraints_found": 0,
        "evaluation_criteria_count": 0,
        "error": "Analysis failed due to invalid content",
    }

    with pytest.raises(ValidationError) as exc_info:
        validate_cfp_analysis(error_response)  # type: ignore[arg-type]
    assert "Analysis failed due to invalid content" in str(exc_info.value)

    brief_response = {
        "required_sections": [
            {
                "section_name": "Test",
                "definition": "Test definition",
                "requirements": [
                    {"requirement": "Test requirement", "quote_from_source": "Brief", "category": "content"}
                ],
                "dependencies": [],
            }
        ],
        "length_constraints": [],
        "evaluation_criteria": [],
        "additional_requirements": [],
        "sections_count": 1,
        "length_constraints_found": 0,
        "evaluation_criteria_count": 0,
    }

    with pytest.raises(ValidationError):
        validate_cfp_analysis(brief_response)  # type: ignore[arg-type]

    no_sections_response = {
        "required_sections": [],
        "length_constraints": [],
        "evaluation_criteria": [],
        "additional_requirements": [],
        "sections_count": 0,
        "length_constraints_found": 1,
        "evaluation_criteria_count": 1,
    }

    with pytest.raises(ValidationError) as exc_info:
        validate_cfp_analysis(no_sections_response)  # type: ignore[arg-type]
    assert "No sections identified" in str(exc_info.value)


def test_transforms_analysis_data_for_database_storage(mock_gemini_response: CFPSectionAnalysis) -> None:
    db_format = transform_analysis_for_database(mock_gemini_response)

    assert "section_requirements" in db_format
    assert "length_constraints" in db_format
    assert "evaluation_criteria" in db_format
    assert "additional_requirements" in db_format

    assert len(db_format["section_requirements"]) == 3
    assert db_format["section_requirements"][0]["section"] == "Project Summary"
    assert len(db_format["section_requirements"][0]["requirements"]) == 1


def test_formats_cfp_requirements_for_section_correctly() -> None:
    cfp_analysis = {
        "section_requirements": [
            {
                "section": "Project Summary",
                "requirements": [
                    {
                        "requirement": "Must include clear objectives",
                        "quote": "Project Summary must include clear research objectives",
                    },
                    {"requirement": "Maximum 1 page", "quote": "Project Summary (1 page maximum)"},
                ],
            }
        ],
        "length_constraints": [
            {"description": "Project Summary page limit", "quote": "Project Summary (1 page maximum)"}
        ],
        "evaluation_criteria": [
            {"criterion": "Project Summary Clarity", "quote": "Project summaries will be evaluated on clarity (30%)"}
        ],
    }

    result = _format_cfp_requirements_for_section("Project Summary", cfp_analysis)  # type: ignore[arg-type]

    assert "## CFP Requirements" in result
    assert "### Section Requirements" in result
    assert "Must include clear objectives" in result
    assert "Maximum 1 page" in result
    assert "### Length Constraints" in result
    assert "Project Summary page limit" in result
    assert "### Evaluation Criteria" in result
    assert "Project Summary Clarity" in result


def test_formats_cfp_requirements_returns_empty_when_no_match() -> None:
    cfp_analysis = {
        "section_requirements": [
            {
                "section": "Budget Justification",
                "requirements": [
                    {"requirement": "Must justify all costs", "quote": "Budget must justify all project costs"}
                ],
            }
        ],
        "length_constraints": [],
        "evaluation_criteria": [],
    }

    result = _format_cfp_requirements_for_section("Project Summary", cfp_analysis)  # type: ignore[arg-type]

    assert result == ""


def test_formats_cfp_requirements_handles_none_analysis() -> None:
    result = _format_cfp_requirements_for_section("Project Summary", None)

    assert result == ""
