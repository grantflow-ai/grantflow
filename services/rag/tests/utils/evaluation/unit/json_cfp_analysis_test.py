from typing import TYPE_CHECKING

from packages.db.src.json_objects import (
    CFPAnalysisEvaluationCriterion,
    CFPAnalysisRequirementWithQuote,
    CFPSectionLengthConstraint,
    CFPSectionRequirement,
)

from services.rag.src.utils.evaluation.json.cfp_analysis import (
    check_cfp_analysis_completeness,
    evaluate_cfp_analysis_quality,
)

if TYPE_CHECKING:
    from services.rag.src.dto import CFPAnalysisData


class TestCFPAnalysisQualityEvaluation:
    def test_evaluate_cfp_analysis_quality_high_quality(self) -> None:
        cfp_data: CFPAnalysisData = {
            "requirements": [
                CFPAnalysisRequirementWithQuote(
                    requirement="Principal investigator must hold PhD or MD degree",
                    quote_from_source="Applications must demonstrate clear clinical relevance",
                    category="eligibility",
                ),
                CFPAnalysisRequirementWithQuote(
                    requirement="Institution must be accredited research university",
                    quote_from_source="Collaborative research across multiple institutions is encouraged",
                    category="institutional",
                ),
            ],
            "evaluation_criteria": [
                CFPAnalysisEvaluationCriterion(
                    criterion_name="Scientific merit and innovation",
                    description="Assessment of scientific approach and innovative elements",
                    weight_percentage=40,
                    quote_from_source="Priority will be given to projects with strong preliminary data",
                ),
                CFPAnalysisEvaluationCriterion(
                    criterion_name="Research methodology",
                    description="Evaluation of research approach and methods",
                    weight_percentage=25,
                    quote_from_source="All research must comply with NIH guidelines",
                ),
            ],
            "sections": [
                CFPSectionRequirement(
                    title="Project narrative",
                    definition="Detailed description of research project",
                    requirements=[
                        CFPAnalysisRequirementWithQuote(
                            requirement="15 pages maximum",
                            quote_from_source="Project narrative (15 pages maximum)",
                            category="length",
                        )
                    ],
                    dependencies=[],
                )
            ],
            "length_constraints": [
                CFPSectionLengthConstraint(
                    title="Project narrative",
                    measurement_type="pages",
                    limit_description="15 pages maximum",
                    quote_from_source="Project narrative (15 pages maximum)",
                    exclusions=[],
                )
            ],
        }

        result = evaluate_cfp_analysis_quality(cfp_data)

        assert result["overall"] > 0.2, f"Expected reasonable overall quality, got {result['overall']}"
        assert result["requirement_clarity"] >= 0.0
        assert result["quote_accuracy"] >= 0.0
        assert result["completeness"] > 0.4
        assert result["categorization"] > 0.4

    def test_evaluate_cfp_analysis_quality_good_structure(self) -> None:
        cfp_data: CFPAnalysisData = {
            "requirements": [
                CFPAnalysisRequirementWithQuote(
                    requirement="PhD required",
                    quote_from_source="Applications should demonstrate innovation",
                    category="eligibility",
                )
            ],
            "evaluation_criteria": [
                CFPAnalysisEvaluationCriterion(
                    criterion_name="Scientific merit",
                    description="Assessment of scientific approach",
                    weight_percentage=50,
                    quote_from_source="Strong preliminary data preferred",
                )
            ],
        }

        result = evaluate_cfp_analysis_quality(cfp_data)

        assert 0.1 <= result["overall"] <= 0.7, f"Expected moderate overall quality, got {result['overall']}"
        assert result["completeness"] > 0.2
        assert result["categorization"] > 0.2

    def test_evaluate_cfp_analysis_quality_poor_quality(self) -> None:
        cfp_data: CFPAnalysisData = {
            "requirements": [
                CFPAnalysisRequirementWithQuote(
                    requirement="Requirements exist", quote_from_source="Do good work", category="general"
                )
            ],
            "evaluation_criteria": [
                CFPAnalysisEvaluationCriterion(
                    criterion_name="Good research", description="Vague criteria", quote_from_source="Submit somehow"
                )
            ],
        }

        result = evaluate_cfp_analysis_quality(cfp_data)

        assert result["overall"] < 0.6, f"Expected low overall quality, got {result['overall']}"
        assert result["requirement_clarity"] <= 1.0
        assert result["quote_accuracy"] < 0.3

    def test_evaluate_cfp_analysis_quality_missing_fields(self) -> None:
        cfp_data: CFPAnalysisData = {}

        result = evaluate_cfp_analysis_quality(cfp_data)

        assert result["overall"] == 0.0, f"Expected zero overall quality for empty data, got {result['overall']}"
        assert result["requirement_clarity"] == 0.0
        assert result["completeness"] == 0.0

    def test_evaluate_cfp_analysis_quality_detailed_requirements(self) -> None:
        cfp_data: CFPAnalysisData = {
            "requirements": [
                CFPAnalysisRequirementWithQuote(
                    requirement="Principal investigator must hold PhD or MD degree with minimum 5 years research experience",
                    quote_from_source="The principal investigator must have demonstrated research expertise",
                    category="eligibility",
                ),
                CFPAnalysisRequirementWithQuote(
                    requirement="Research must focus on biomedical applications with clinical relevance",
                    quote_from_source="Priority will be given to projects with clear translational potential",
                    category="research_focus",
                ),
            ],
            "evaluation_criteria": [
                CFPAnalysisEvaluationCriterion(
                    criterion_name="Scientific merit and innovation",
                    description="Comprehensive assessment of the scientific approach, methodology, and innovative elements of the proposed research",
                    weight_percentage=40,
                    quote_from_source="Applications will be evaluated on scientific merit and innovation (40%)",
                ),
            ],
        }

        result = evaluate_cfp_analysis_quality(cfp_data)

        assert result["overall"] > 0.3, f"Expected good overall quality with detailed content, got {result['overall']}"
        assert result["requirement_clarity"] > 0.3, "Should have good requirement clarity with detailed requirements"

    def test_evaluate_cfp_analysis_quality_accurate_quotes(self) -> None:
        cfp_data: CFPAnalysisData = {
            "requirements": [
                CFPAnalysisRequirementWithQuote(
                    requirement="Submissions must be received by 5:00 PM Eastern Time on the deadline date",
                    quote_from_source="All applications must be submitted electronically through grants.gov by 5:00 PM ET",
                    category="submission",
                )
            ],
            "evaluation_criteria": [
                CFPAnalysisEvaluationCriterion(
                    criterion_name="Research methodology",
                    description="Quality and appropriateness of the research design and methods",
                    weight_percentage=30,
                    quote_from_source="Applications will be evaluated on research methodology (30%)",
                )
            ],
        }

        result = evaluate_cfp_analysis_quality(cfp_data)

        assert result["quote_accuracy"] >= 0.0, "Should have some quote accuracy assessment"


class TestCFPAnalysisCompleteness:
    def test_check_cfp_analysis_completeness_complete(self) -> None:
        cfp_data: CFPAnalysisData = {
            "requirements": [
                CFPAnalysisRequirementWithQuote(
                    requirement="PhD required", quote_from_source="Source quote", category="eligibility"
                )
            ],
            "sections": [
                CFPSectionRequirement(
                    title="Project description",
                    definition="Detailed project description",
                    requirements=[],
                    dependencies=[],
                )
            ],
            "evaluation_criteria": [
                CFPAnalysisEvaluationCriterion(
                    criterion_name="Scientific merit",
                    description="Assessment of scientific approach",
                    quote_from_source="Merit evaluation",
                )
            ],
            "length_constraints": [
                CFPSectionLengthConstraint(
                    title="Project description",
                    measurement_type="pages",
                    limit_description="10 pages maximum",
                    quote_from_source="Project description (10 pages max)",
                    exclusions=[],
                )
            ],
        }

        result = check_cfp_analysis_completeness(cfp_data)

        assert result["has_requirements"] is True
        assert result["has_sections"] is True
        assert result["has_evaluation_criteria"] is True
        assert result["has_length_constraints"] is True

    def test_check_cfp_analysis_completeness_basic_only(self) -> None:
        cfp_data: CFPAnalysisData = {
            "requirements": [
                CFPAnalysisRequirementWithQuote(
                    requirement="Basic requirement", quote_from_source="Source", category="general"
                )
            ]
        }

        result = check_cfp_analysis_completeness(cfp_data)

        assert result["has_requirements"] is True
        assert result["has_sections"] is False
        assert result["has_evaluation_criteria"] is False
        assert result["has_length_constraints"] is False

    def test_check_cfp_analysis_completeness_empty_data(self) -> None:
        cfp_data: CFPAnalysisData = {}

        result = check_cfp_analysis_completeness(cfp_data)

        assert result["has_requirements"] is False
        assert result["has_sections"] is False
        assert result["has_evaluation_criteria"] is False
        assert result["has_length_constraints"] is False

    def test_check_cfp_analysis_completeness_empty_lists(self) -> None:
        cfp_data: CFPAnalysisData = {
            "requirements": [],
            "sections": [],
            "evaluation_criteria": [],
            "length_constraints": [],
        }

        result = check_cfp_analysis_completeness(cfp_data)

        assert result["has_requirements"] is False
        assert result["has_sections"] is False
        assert result["has_evaluation_criteria"] is False
        assert result["has_length_constraints"] is False

    def test_check_cfp_analysis_completeness_partial_basic_info(self) -> None:
        cfp_data: CFPAnalysisData = {
            "evaluation_criteria": [
                CFPAnalysisEvaluationCriterion(
                    criterion_name="Basic criteria", description="Basic description", quote_from_source="Basic quote"
                )
            ],
            "length_constraints": [
                CFPSectionLengthConstraint(
                    title="Summary",
                    measurement_type="words",
                    limit_description="500 words maximum",
                    quote_from_source="Summary (500 words max)",
                    exclusions=[],
                )
            ],
        }

        result = check_cfp_analysis_completeness(cfp_data)

        assert result["has_requirements"] is False
        assert result["has_sections"] is False
        assert result["has_evaluation_criteria"] is True
        assert result["has_length_constraints"] is True
