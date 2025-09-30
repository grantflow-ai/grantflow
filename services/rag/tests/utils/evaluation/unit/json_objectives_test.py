from packages.db.src.json_objects import ResearchObjective, ResearchTask

from services.rag.src.utils.evaluation.json.objectives import (
    check_objectives_completeness,
    evaluate_objectives_quality,
)


class TestObjectivesQualityEvaluation:
    def test_evaluate_objectives_quality_high_quality(self) -> None:
        objectives = [
            ResearchObjective(
                number=1,
                title="Investigate novel biomarker expression in cancer progression",
                description="We will systematically analyze protein biomarkers using innovative mass spectrometry techniques to determine their correlation with tumor stage progression in breast cancer patients.",
                research_tasks=[
                    ResearchTask(
                        number=1,
                        title="Biomarker correlation analysis",
                        description="Analyze correlation between biomarker levels and tumor progression",
                    ),
                    ResearchTask(
                        number=2,
                        title="Predictive value assessment",
                        description="Determine predictive value of identified biomarkers",
                    ),
                ],
            ),
            ResearchObjective(
                number=2,
                title="Develop innovative clinical diagnostic assay",
                description="Based on identified biomarkers, we will develop a breakthrough clinically applicable diagnostic assay using advanced ELISA methodology for rapid patient assessment.",
                research_tasks=[
                    ResearchTask(
                        number=1,
                        title="ELISA optimization",
                        description="Optimize ELISA methodology for clinical applications",
                    ),
                    ResearchTask(
                        number=2,
                        title="Clinical validation",
                        description="Validate assay performance across patient populations",
                    ),
                ],
            ),
        ]

        keywords = ["biomarker", "cancer", "diagnostic", "clinical"]
        topics = ["oncology", "diagnostics", "biomarker discovery"]

        result = evaluate_objectives_quality(objectives, keywords, topics)

        assert result["overall"] > 0.4, f"Expected reasonable overall quality, got {result['overall']}"
        assert result["scientific_rigor"] > 0.3
        assert result["innovation_score"] > 0.0, "Should have innovation score with keywords"
        assert result["coherence"] >= 0.5
        assert result["comprehensiveness"] > 0.3
        assert result["keyword_alignment"] > 0.3

    def test_evaluate_objectives_quality_with_keyword_alignment(self) -> None:
        objectives = [
            ResearchObjective(
                number=1,
                title="Biomarker analysis for cancer research",
                description="Study protein biomarkers in cancer progression using mass spectrometry techniques.",
                research_tasks=[
                    ResearchTask(
                        number=1,
                        title="Mass spectrometry analysis",
                        description="Perform mass spectrometry analysis of cancer biomarkers",
                    )
                ],
            )
        ]

        keywords_matching = ["biomarker", "cancer", "mass spectrometry"]
        result_with_keywords = evaluate_objectives_quality(objectives, keywords_matching, None)

        result_without_keywords = evaluate_objectives_quality(objectives, None, None)

        assert result_with_keywords["keyword_alignment"] > result_without_keywords["keyword_alignment"]
        assert result_with_keywords["overall"] >= result_without_keywords["overall"]

    def test_evaluate_objectives_quality_poor_quality(self) -> None:
        objectives = [
            ResearchObjective(
                number=1,
                title="Do research",
                description="We will do some research on things.",
                research_tasks=[ResearchTask(number=1, title="Generic task")],
            )
        ]

        result = evaluate_objectives_quality(objectives, None, None)

        assert result["overall"] < 0.7, f"Expected low overall quality, got {result['overall']}"
        assert result["scientific_rigor"] <= 0.7
        assert result["coherence"] <= 1.0
        assert result["comprehensiveness"] <= 1.0

    def test_evaluate_objectives_quality_empty_list(self) -> None:
        result = evaluate_objectives_quality([], None, None)

        assert result["overall"] == 0.0
        assert result["scientific_rigor"] == 0.0
        assert result["innovation_score"] == 0.0
        assert result["coherence"] == 0.0
        assert result["comprehensiveness"] == 0.0
        assert result["keyword_alignment"] == 0.0

    def test_evaluate_objectives_quality_topic_alignment(self) -> None:
        objectives = [
            ResearchObjective(
                number=1,
                title="Clinical trial for oncology biomarkers",
                description="Conduct clinical validation of biomarkers for oncology applications in diagnostic medicine.",
                research_tasks=[
                    ResearchTask(
                        number=1,
                        title="Clinical validation",
                        description="Validate biomarkers for oncology applications",
                    )
                ],
            )
        ]

        topics = ["oncology", "clinical medicine", "diagnostics"]
        result = evaluate_objectives_quality(objectives, None, topics)

        assert result["keyword_alignment"] > 0.0, "Should have topic alignment score"


class TestObjectivesCompleteness:
    def test_check_objectives_completeness_complete(self) -> None:
        objectives = [
            ResearchObjective(
                number=1,
                title="Complete objective",
                description="Detailed description with scientific methodology and clear goals.",
                research_tasks=[
                    ResearchTask(
                        number=1,
                        title="Systematic analysis",
                        description="Perform systematic experimental approach with controls",
                    ),
                    ResearchTask(
                        number=2, title="Mechanism investigation", description="Investigate mechanism of target process"
                    ),
                ],
            ),
            ResearchObjective(
                number=2,
                title="Second complete objective",
                description="Another detailed description with clear scientific focus.",
                research_tasks=[
                    ResearchTask(
                        number=1,
                        title="Protocol validation",
                        description="Validate experimental protocols for quantifiable results",
                    )
                ],
            ),
        ]

        result = check_objectives_completeness(objectives)

        assert result["has_objectives"] is True
        assert result["minimum_objectives"] is True
        assert result["all_have_descriptions"] is True
        assert result["all_have_titles"] is True
        assert result["all_have_tasks"] is True
        assert result["sequential_numbering"] is True

    def test_check_objectives_completeness_incomplete(self) -> None:
        objectives = [
            ResearchObjective(
                number=1,
                title="Incomplete objective",
                research_tasks=[],
            )
        ]

        result = check_objectives_completeness(objectives)

        assert result["has_objectives"] is True
        assert result["minimum_objectives"] is False
        assert result["all_have_descriptions"] is False
        assert result["all_have_titles"] is True
        assert result["all_have_tasks"] is False
        assert result["sequential_numbering"] is True

    def test_check_objectives_completeness_empty(self) -> None:
        result = check_objectives_completeness([])

        assert result["has_objectives"] is False
        assert result["minimum_objectives"] is False
        assert result["all_have_descriptions"] is True
        assert result["all_have_titles"] is True
        assert result["all_have_tasks"] is True
        assert result["sequential_numbering"] is True
