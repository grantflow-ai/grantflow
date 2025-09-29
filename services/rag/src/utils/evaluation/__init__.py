"""Scientific content evaluation system with proper generics."""

# Core evaluation functions
from services.rag.src.utils.evaluation.core import evaluate_content

# DTO types
from services.rag.src.utils.evaluation.dto import (
    CoherenceMetrics,
    EvaluationContext,
    EvaluationPathType,
    EvaluationResult,
    EvaluationSettings,
    EvaluationThresholds,
    GroundingMetrics,
    QualityMetrics,
    RecommendationType,
    ScientificAnalysis,
    StructuralMetrics,
)

# LLM evaluation components
from services.rag.src.utils.evaluation.llm.evaluation import (
    EvaluationCriterion,
    EvaluationToolResponse,
    evaluate_output,
    with_evaluation,
)

# Main pipeline function
from services.rag.src.utils.evaluation.pipeline import evaluate_scientific_content

__all__ = [
    "CoherenceMetrics",
    "EvaluationContext",
    "EvaluationCriterion",
    "EvaluationPathType",
    "EvaluationResult",
    "EvaluationSettings",
    "EvaluationThresholds",
    "EvaluationToolResponse",
    "GroundingMetrics",
    "QualityMetrics",
    "RecommendationType",
    "ScientificAnalysis",
    "StructuralMetrics",
    "evaluate_content",
    "evaluate_output",
    "evaluate_scientific_content",
    "with_evaluation",
]
