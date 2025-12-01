"""Tests for the scientific analysis module.

This module tests validation, aggregation, and formatting of scientific
analysis data extracted from source documents.
"""

import pytest
from packages.db.src.json_objects import (
    AnalysisMetadata,
    ArgumentElement,
    ConclusionElement,
    EvidenceElement,
    ExperimentResultElement,
    HypothesisElement,
    ObjectiveElement,
    ScientificAnalysisResult,
    SourceElement,
    TaskElement,
)
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.scientific_analysis import (
    aggregate_analyses,
    validate_scientific_analysis,
)


@pytest.fixture
def sample_argument() -> ArgumentElement:
    return ArgumentElement(
        id=1,
        text="Novel biomarker discovery using proteomics",
        context="Introduction",
        type="main",
        source="writers",
        temporal_context="experiment",
        temporal_order=0.1,
        action_type="author_action",
        pivot=False,
        rhetorical_action="argue",
        hierarchy="1.0",
    )


@pytest.fixture
def sample_evidence() -> EvidenceElement:
    return EvidenceElement(
        id=1,
        text="Mass spectrometry analysis revealed 50 differentially expressed proteins",
        type="experimental",
        supports="Biomarker discovery approach",
        source="writers",
        temporal_context="experiment",
        temporal_order=0.2,
        action_type="author_action",
        pivot=False,
        rhetorical_action="support_by_evidence",
        hierarchy="1.1",
    )


@pytest.fixture
def sample_hypothesis() -> HypothesisElement:
    return HypothesisElement(
        id=1,
        text="Protein biomarkers can detect cancer at early stages",
        type="primary",
        testable="Through prospective clinical validation studies",
        source="writers",
        temporal_context="experiment",
        temporal_order=0.0,
        action_type="author_action",
        pivot=True,
        rhetorical_action="bring_hypothesis",
        hierarchy="1.0",
    )


@pytest.fixture
def sample_conclusion() -> ConclusionElement:
    return ConclusionElement(
        id=1,
        text="The identified biomarker panel shows promising diagnostic potential",
        type="main",
        based_on="Experimental validation in 200 patients",
        source="writers",
        temporal_context="experiment",
        temporal_order=0.9,
        action_type="author_action",
        pivot=False,
        rhetorical_action="conclude",
        hierarchy="4.0",
    )


@pytest.fixture
def sample_result() -> ExperimentResultElement:
    return ExperimentResultElement(
        id=1,
        text="AUC of 0.92 for cancer detection",
        experiment="ROC analysis",
        outcome="High diagnostic accuracy",
        significance="p < 0.001",
        source="writers",
        temporal_context="experiment",
        temporal_order=0.7,
        action_type="author_action",
        pivot=False,
        rhetorical_action="support_by_evidence",
        hierarchy="3.1",
    )


@pytest.fixture
def sample_source() -> SourceElement:
    return SourceElement(
        id=1,
        text="Smith et al., 2023, Cancer Research",
        type="citation",
        relevance="Prior work on biomarker validation",
    )


@pytest.fixture
def sample_objective() -> ObjectiveElement:
    return ObjectiveElement(
        id=1,
        text="Develop a validated biomarker panel for early cancer detection",
        scope="Multi-center clinical validation",
        expected_outcome="FDA-approved diagnostic test",
        type="primary",
        temporal_context="future",
        temporal_order=1.0,
        hierarchy="O1",
    )


@pytest.fixture
def sample_task() -> TaskElement:
    return TaskElement(
        id=1,
        text="Collect patient samples from 5 clinical sites",
        action="Sample collection",
        deliverable="Biobank of 1000 samples",
        supports_objective=1,
        depends_on=[],
        temporal_context="future",
        temporal_order=1.1,
        hierarchy="T1",
    )


@pytest.fixture
def valid_analysis_result(
    sample_argument: ArgumentElement,
    sample_evidence: EvidenceElement,
    sample_hypothesis: HypothesisElement,
    sample_conclusion: ConclusionElement,
    sample_result: ExperimentResultElement,
    sample_source: SourceElement,
    sample_objective: ObjectiveElement,
    sample_task: TaskElement,
) -> ScientificAnalysisResult:
    return ScientificAnalysisResult(
        arguments=[sample_argument],
        evidence=[sample_evidence],
        hypotheses=[sample_hypothesis],
        conclusions=[sample_conclusion],
        experiment_results=[sample_result],
        sources=[sample_source],
        objectives=[sample_objective],
        tasks=[sample_task],
        metadata=AnalysisMetadata(
            total_arguments=1,
            total_evidence=1,
            total_hypotheses=1,
            total_conclusions=1,
            total_results=1,
            total_sources=1,
            total_objectives=1,
            total_tasks=1,
            article_type="research",
        ),
    )


class TestValidateScientificAnalysis:
    """Tests for validate_scientific_analysis function."""

    def test_validate_scientific_analysis_with_valid_result(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        validate_scientific_analysis(valid_analysis_result)

    def test_validate_scientific_analysis_raises_error_for_missing_key(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        incomplete_result = dict(valid_analysis_result)
        del incomplete_result["arguments"]

        with pytest.raises(ValidationError, match="Missing required key: arguments"):
            validate_scientific_analysis(incomplete_result)  # type: ignore[arg-type]

    def test_validate_scientific_analysis_raises_error_for_argument_count_mismatch(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        mismatched_result = ScientificAnalysisResult(
            **{
                **valid_analysis_result,
                "metadata": AnalysisMetadata(
                    **{**valid_analysis_result["metadata"], "total_arguments": 5}
                ),
            }
        )

        with pytest.raises(
            ValidationError, match="Metadata count mismatch for arguments"
        ):
            validate_scientific_analysis(mismatched_result)

    def test_validate_scientific_analysis_raises_error_for_evidence_count_mismatch(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        mismatched_result = ScientificAnalysisResult(
            **{
                **valid_analysis_result,
                "metadata": AnalysisMetadata(
                    **{**valid_analysis_result["metadata"], "total_evidence": 10}
                ),
            }
        )

        with pytest.raises(
            ValidationError, match="Metadata count mismatch for evidence"
        ):
            validate_scientific_analysis(mismatched_result)

    def test_validate_scientific_analysis_raises_error_for_invalid_task_dependency(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        task_with_invalid_dep = TaskElement(
            id=1,
            text="Test task",
            action="Test action",
            deliverable="Test deliverable",
            supports_objective=1,
            depends_on=[999],
            temporal_context="future",
            temporal_order=1.0,
            hierarchy="T1",
        )

        invalid_result = ScientificAnalysisResult(
            **{
                **valid_analysis_result,
                "tasks": [task_with_invalid_dep],
            }
        )

        with pytest.raises(ValidationError, match="depends on non-existent task 999"):
            validate_scientific_analysis(invalid_result)

    def test_validate_scientific_analysis_raises_error_for_invalid_objective_reference(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        task_with_invalid_obj = TaskElement(
            id=1,
            text="Test task",
            action="Test action",
            deliverable="Test deliverable",
            supports_objective=999,
            depends_on=[],
            temporal_context="future",
            temporal_order=1.0,
            hierarchy="T1",
        )

        invalid_result = ScientificAnalysisResult(
            **{
                **valid_analysis_result,
                "tasks": [task_with_invalid_obj],
                "metadata": AnalysisMetadata(
                    **{**valid_analysis_result["metadata"], "total_tasks": 1}
                ),
            }
        )

        with pytest.raises(
            ValidationError, match="supports non-existent objective 999"
        ):
            validate_scientific_analysis(invalid_result)

    def test_validate_scientific_analysis_with_empty_lists(self) -> None:
        empty_result = ScientificAnalysisResult(
            arguments=[],
            evidence=[],
            hypotheses=[],
            conclusions=[],
            experiment_results=[],
            sources=[],
            objectives=[],
            tasks=[],
            metadata=AnalysisMetadata(
                total_arguments=0,
                total_evidence=0,
                total_hypotheses=0,
                total_conclusions=0,
                total_results=0,
                total_sources=0,
                total_objectives=0,
                total_tasks=0,
                article_type="other",
            ),
        )

        validate_scientific_analysis(empty_result)


class TestAggregateAnalyses:
    """Tests for aggregate_analyses function."""

    def test_aggregate_analyses_with_empty_list(self) -> None:
        result = aggregate_analyses([])

        assert result["arguments"] == []
        assert result["evidence"] == []
        assert result["hypotheses"] == []
        assert result["conclusions"] == []
        assert result["experiment_results"] == []
        assert result["sources"] == []
        assert result["objectives"] == []
        assert result["tasks"] == []
        assert result["metadata"]["total_arguments"] == 0
        assert result["metadata"]["article_type"] == "other"

    def test_aggregate_analyses_with_single_analysis(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        result = aggregate_analyses([valid_analysis_result])

        assert len(result["arguments"]) == 1
        assert len(result["evidence"]) == 1
        assert result["metadata"]["total_arguments"] == 1
        assert result["metadata"]["article_type"] == "research"

    def test_aggregate_analyses_combines_multiple_analyses(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        analysis1 = valid_analysis_result
        analysis2 = ScientificAnalysisResult(
            arguments=[
                ArgumentElement(
                    id=1,
                    text="Second analysis argument",
                    context="Methods",
                    type="supporting",
                    source="writers",
                    temporal_context="experiment",
                    temporal_order=0.3,
                    action_type="author_action",
                    pivot=False,
                    rhetorical_action="describe",
                    hierarchy="2.0",
                )
            ],
            evidence=[],
            hypotheses=[],
            conclusions=[],
            experiment_results=[],
            sources=[],
            objectives=[
                ObjectiveElement(
                    id=1,
                    text="Second objective",
                    scope="Narrow scope",
                    expected_outcome="Secondary outcome",
                    type="secondary",
                    temporal_context="future",
                    temporal_order=1.5,
                    hierarchy="O2",
                )
            ],
            tasks=[
                TaskElement(
                    id=1,
                    text="Second task",
                    action="Second action",
                    deliverable="Second deliverable",
                    supports_objective=1,
                    depends_on=[],
                    temporal_context="future",
                    temporal_order=1.6,
                    hierarchy="T2",
                )
            ],
            metadata=AnalysisMetadata(
                total_arguments=1,
                total_evidence=0,
                total_hypotheses=0,
                total_conclusions=0,
                total_results=0,
                total_sources=0,
                total_objectives=1,
                total_tasks=1,
                article_type="review",
            ),
        )

        result = aggregate_analyses([analysis1, analysis2])

        assert len(result["arguments"]) == 2
        assert result["metadata"]["total_arguments"] == 2
        assert result["metadata"]["total_objectives"] == 2
        assert result["metadata"]["total_tasks"] == 2
        assert result["metadata"]["article_type"] == "research"

    def test_aggregate_analyses_assigns_unique_ids(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        analysis1 = valid_analysis_result
        analysis2 = ScientificAnalysisResult(
            **{
                **valid_analysis_result,
            }
        )

        result = aggregate_analyses([analysis1, analysis2])

        argument_ids = [arg["id"] for arg in result["arguments"]]
        assert len(argument_ids) == len(set(argument_ids))

        objective_ids = [obj["id"] for obj in result["objectives"]]
        assert len(objective_ids) == len(set(objective_ids))

    def test_aggregate_analyses_updates_task_dependencies(self) -> None:
        analysis1 = ScientificAnalysisResult(
            arguments=[],
            evidence=[],
            hypotheses=[],
            conclusions=[],
            experiment_results=[],
            sources=[],
            objectives=[
                ObjectiveElement(
                    id=1,
                    text="First objective",
                    scope="Scope 1",
                    expected_outcome="Outcome 1",
                    type="primary",
                    temporal_context="future",
                    temporal_order=1.0,
                    hierarchy="O1",
                )
            ],
            tasks=[
                TaskElement(
                    id=1,
                    text="First task",
                    action="Action 1",
                    deliverable="Deliverable 1",
                    supports_objective=1,
                    depends_on=[],
                    temporal_context="future",
                    temporal_order=1.1,
                    hierarchy="T1",
                ),
                TaskElement(
                    id=2,
                    text="Second task",
                    action="Action 2",
                    deliverable="Deliverable 2",
                    supports_objective=1,
                    depends_on=[1],
                    temporal_context="future",
                    temporal_order=1.2,
                    hierarchy="T2",
                ),
            ],
            metadata=AnalysisMetadata(
                total_arguments=0,
                total_evidence=0,
                total_hypotheses=0,
                total_conclusions=0,
                total_results=0,
                total_sources=0,
                total_objectives=1,
                total_tasks=2,
                article_type="research",
            ),
        )

        analysis2 = ScientificAnalysisResult(
            arguments=[],
            evidence=[],
            hypotheses=[],
            conclusions=[],
            experiment_results=[],
            sources=[],
            objectives=[
                ObjectiveElement(
                    id=1,
                    text="Second objective",
                    scope="Scope 2",
                    expected_outcome="Outcome 2",
                    type="secondary",
                    temporal_context="future",
                    temporal_order=1.5,
                    hierarchy="O2",
                )
            ],
            tasks=[
                TaskElement(
                    id=1,
                    text="Third task",
                    action="Action 3",
                    deliverable="Deliverable 3",
                    supports_objective=1,
                    depends_on=[],
                    temporal_context="future",
                    temporal_order=1.6,
                    hierarchy="T3",
                )
            ],
            metadata=AnalysisMetadata(
                total_arguments=0,
                total_evidence=0,
                total_hypotheses=0,
                total_conclusions=0,
                total_results=0,
                total_sources=0,
                total_objectives=1,
                total_tasks=1,
                article_type="research",
            ),
        )

        result = aggregate_analyses([analysis1, analysis2])

        task_with_dep = next(t for t in result["tasks"] if len(t["depends_on"]) > 0)
        assert task_with_dep["depends_on"][0] in [t["id"] for t in result["tasks"]]

        for task in result["tasks"]:
            matching_objectives = [
                o for o in result["objectives"] if o["id"] == task["supports_objective"]
            ]
            assert len(matching_objectives) == 1

    def test_aggregate_analyses_preserves_all_element_types(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        result = aggregate_analyses([valid_analysis_result])

        assert "arguments" in result
        assert "evidence" in result
        assert "hypotheses" in result
        assert "conclusions" in result
        assert "experiment_results" in result
        assert "sources" in result
        assert "objectives" in result
        assert "tasks" in result
        assert "metadata" in result

        assert result["metadata"]["total_evidence"] == len(result["evidence"])
        assert result["metadata"]["total_hypotheses"] == len(result["hypotheses"])
        assert result["metadata"]["total_conclusions"] == len(result["conclusions"])
        assert result["metadata"]["total_results"] == len(result["experiment_results"])
        assert result["metadata"]["total_sources"] == len(result["sources"])


class TestScientificAnalysisSerialization:
    """Tests for ScientificAnalysisResult JSON serialization.

    These tests verify that ScientificAnalysisResult can be properly serialized
    to JSON, which is the core functionality used by _format_argument_structure
    in the RAG service.
    """

    def test_serialize_none_returns_null_bytes(self) -> None:
        """Verify None handling for serialization."""
        from packages.shared_utils.src.serialization import serialize

        result = serialize(None)
        assert result == b"null"

    def test_serialize_valid_analysis_returns_bytes(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        from packages.shared_utils.src.serialization import serialize

        result = serialize(valid_analysis_result)

        assert isinstance(result, bytes)
        assert len(result) > 0
        result_str = result.decode("utf-8")
        assert "arguments" in result_str
        assert "evidence" in result_str
        assert "metadata" in result_str

    def test_serialized_json_contains_argument_text(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        from packages.shared_utils.src.serialization import serialize

        result = serialize(valid_analysis_result).decode("utf-8")

        assert "Novel biomarker discovery using proteomics" in result

    def test_serialized_json_contains_objective_text(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        from packages.shared_utils.src.serialization import serialize

        result = serialize(valid_analysis_result).decode("utf-8")

        assert "Develop a validated biomarker panel" in result

    def test_serialized_json_contains_task_text(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        from packages.shared_utils.src.serialization import serialize

        result = serialize(valid_analysis_result).decode("utf-8")

        assert "Collect patient samples" in result

    def test_serialized_json_is_valid_parseable(
        self, valid_analysis_result: ScientificAnalysisResult
    ) -> None:
        import json

        from packages.shared_utils.src.serialization import serialize

        result = serialize(valid_analysis_result)
        parsed = json.loads(result)

        assert "arguments" in parsed
        assert "objectives" in parsed
        assert "tasks" in parsed
        assert "metadata" in parsed
        assert len(parsed["arguments"]) == 1

    def test_serialize_empty_analysis_returns_valid_json(self) -> None:
        import json

        from packages.shared_utils.src.serialization import serialize

        empty_analysis = ScientificAnalysisResult(
            arguments=[],
            evidence=[],
            hypotheses=[],
            conclusions=[],
            experiment_results=[],
            sources=[],
            objectives=[],
            tasks=[],
            metadata=AnalysisMetadata(
                total_arguments=0,
                total_evidence=0,
                total_hypotheses=0,
                total_conclusions=0,
                total_results=0,
                total_sources=0,
                total_objectives=0,
                total_tasks=0,
                article_type="other",
            ),
        )

        result = serialize(empty_analysis)
        parsed = json.loads(result)

        assert parsed["arguments"] == []
        assert parsed["metadata"]["total_arguments"] == 0
