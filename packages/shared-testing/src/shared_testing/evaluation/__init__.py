"""Evaluation utilities for testing RAG and LLM outputs."""

# Re-export from RAG evaluation
# Re-export from AI evaluation
from shared_testing.evaluation.ai import (
    evaluate_cfp_extraction_accuracy,
    evaluate_grant_application_quality,
    evaluate_query_generation_quality,
    evaluate_retrieval_relevance,
    parse_json_from_ai_response,
)

# Re-export from performance baselines
from shared_testing.evaluation.baselines import (
    PerformanceBaseline,
    PerformanceResult,
    detect_performance_regression,
    evaluate_performance_baseline,
    run_all_baselines,
)

# Re-export from performance framework
from shared_testing.evaluation.performance import (
    PerformanceGrade,
    PerformanceTargets,
    QualityMetrics,
    StageMetrics,
    StageTimer,
    StageTimingConfig,
    TestDomain,
    TestExecutionSpeed,
    TestScenario,
)
from shared_testing.evaluation.rag import (
    assess_grant_template_quality,
    assess_query_quality,
    calculate_performance_metrics,
    calculate_retrieval_diversity,
    load_test_fixture,
    save_evaluation_results,
    validate_cfp_extraction_structure,
    validate_grant_application_structure,
)

# Re-export from red team utilities
from shared_testing.evaluation.red_team import (
    save_application_output,
    save_editorial_workflow_output,
    save_sections_breakdown,
)

# Re-export from evaluation utilities
from shared_testing.evaluation.utils import (
    assess_chunk_quality,
    assess_coverage_quality,
    assess_embedding_quality,
    assess_semantic_coherence,
    calculate_embedding_statistics,
    comprehensive_quality_assessment,
    cosine_similarity,
    load_fixture_vectors,
    select_representative_chunks,
)

__all__ = [
    # Performance baselines
    "PerformanceBaseline",
    # Performance framework
    "PerformanceGrade",
    "PerformanceResult",
    "PerformanceTargets",
    "QualityMetrics",
    "StageMetrics",
    "StageTimer",
    "StageTimingConfig",
    "TestDomain",
    "TestExecutionSpeed",
    "TestScenario",
    # Evaluation utilities
    "assess_chunk_quality",
    "assess_coverage_quality",
    "assess_embedding_quality",
    # RAG evaluation
    "assess_grant_template_quality",
    "assess_query_quality",
    "assess_semantic_coherence",
    "calculate_embedding_statistics",
    "calculate_performance_metrics",
    "calculate_retrieval_diversity",
    "comprehensive_quality_assessment",
    "cosine_similarity",
    "detect_performance_regression",
    # AI evaluation
    "evaluate_cfp_extraction_accuracy",
    "evaluate_grant_application_quality",
    "evaluate_performance_baseline",
    "evaluate_query_generation_quality",
    "evaluate_retrieval_relevance",
    "load_fixture_vectors",
    "load_test_fixture",
    "parse_json_from_ai_response",
    "run_all_baselines",
    # Red team utilities
    "save_application_output",
    "save_editorial_workflow_output",
    "save_evaluation_results",
    "save_sections_breakdown",
    "select_representative_chunks",
    "validate_cfp_extraction_structure",
    "validate_grant_application_structure",
]
