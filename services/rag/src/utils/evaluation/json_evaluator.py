"""JSON content evaluation with proper generics."""

from typing import Any, cast

from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import deserialize

from services.rag.src.utils.evaluation.dto import (
    EvaluationContext,
    EvaluationResult,
    EvaluationSettings,
    RecommendationType,
)
from services.rag.src.utils.evaluation.json.cfp_analysis import evaluate_cfp_analysis_quality
from services.rag.src.utils.evaluation.json.enrichment import evaluate_enrichment_quality
from services.rag.src.utils.evaluation.json.objectives import evaluate_objectives_quality
from services.rag.src.utils.evaluation.json.relationships import evaluate_relationships_quality

logger = get_logger(__name__)


def _detect_json_content_type(parsed_content: Any) -> str | None:
    """Detect the type of JSON content for routing to appropriate evaluator."""
    if not parsed_content:
        return None

    # Check for research objectives
    if isinstance(parsed_content, list) and all(
        isinstance(obj, dict) and "research_tasks" in obj
        for obj in parsed_content[:3]  # Check first few
    ):
        return "objectives"

    # Check for relationships
    if (
        isinstance(parsed_content, dict)
        and all(
            isinstance(v, list)
            and all(
                isinstance(item, (list, tuple)) and len(item) >= 2
                for item in v[:2]  # Sample check
            )
            for k, v in list(parsed_content.items())[:3]  # Sample keys
        )
    ):
        return "relationships"

    # Check for enrichment data
    if isinstance(parsed_content, dict) and (
        "enriched_objective" in parsed_content
        or "core_scientific_terms" in parsed_content
        or "research_objective" in parsed_content
    ):
        return "enrichment"

    # Check for CFP analysis
    if isinstance(parsed_content, dict) and (
        "cfp_analysis" in parsed_content
        or "required_sections" in parsed_content
        or "evaluation_criteria" in parsed_content
    ):
        return "cfp_analysis"

    return None


def _evaluate_content_by_type(
    content_type: str, parsed_content: Any, context: EvaluationContext
) -> tuple[Any | None, str]:
    """Evaluate content based on detected type and return metrics and feedback."""
    if content_type == "objectives":
        metrics = evaluate_objectives_quality(
            objectives=parsed_content,
            keywords=context.get("keywords", []),
            topics=context.get("topics", []),
        )
        feedback = "JSON evaluation: Research objectives structure validated"
    elif content_type == "relationships":
        metrics = evaluate_relationships_quality(relationships=parsed_content)
        feedback = "JSON evaluation: Relationships structure validated"
    elif content_type == "enrichment":
        # Handle both single enrichment and objective with tasks
        if "research_objective" in parsed_content:
            enrichment_data = parsed_content.get("research_objective", {})
        else:
            enrichment_data = parsed_content

        metrics = evaluate_enrichment_quality(
            enrichment_data=enrichment_data,
            keywords=context.get("keywords", []),
            topics=context.get("topics", []),
        )
        feedback = "JSON evaluation: Enrichment data structure validated"
    elif content_type == "cfp_analysis":
        # Cast to CFPAnalysisData type for evaluation
        cfp_data = parsed_content
        metrics = evaluate_cfp_analysis_quality(cfp_data=cfp_data)
        feedback = "JSON evaluation: CFP analysis structure validated"
    else:
        return None, ""

    return metrics, feedback


def _calculate_confidence(metrics: Any, settings: EvaluationSettings, overall_score: float) -> float:
    """Calculate confidence score based on metrics and settings."""
    confidence_threshold = settings.get("json_confidence_threshold", 0.95)
    semantic_threshold = settings.get("json_semantic_threshold", 0.6)

    if hasattr(metrics, "get"):
        structural_scores = [
            metrics.get("completeness", 0),
            metrics.get("validity", 0),
            metrics.get("structure", 0),
        ]
        semantic_scores = [
            metrics.get("scientific_rigor", 0),
            metrics.get("innovation_score", 0),
            metrics.get("coherence", 0),
        ]

        # Weight structural higher for JSON
        structural_avg = sum(s for s in structural_scores if s) / max(len([s for s in structural_scores if s]), 1)
        semantic_avg = sum(s for s in semantic_scores if s) / max(len([s for s in semantic_scores if s]), 1)

        if structural_avg >= confidence_threshold:
            return 0.95  # High confidence for good structure
        if semantic_avg >= semantic_threshold:
            return 0.85  # Medium-high confidence for good semantics
        calculated_avg = (structural_avg + semantic_avg) / 2
        return max(0.7, calculated_avg)

    return min(0.95, overall_score / 100 + 0.15)  # JSON gets confidence boost


def _add_metrics_to_result(result: EvaluationResult, metrics: Any) -> None:
    """Add type-specific metrics to evaluation result."""
    if "scientific_rigor" in (metrics or {}):
        result["objective_metrics"] = metrics
    elif "validity" in (metrics or {}):
        result["relationship_metrics"] = metrics
    elif "value_added" in (metrics or {}):
        result["enrichment_metrics"] = metrics
    elif "requirement_clarity" in (metrics or {}):
        result["cfp_analysis_metrics"] = metrics


async def evaluate_json_content[T](
    content: str,
    parsed_content: Any,
    response_type: type[T],
    context: EvaluationContext,
    settings: EvaluationSettings,
    trace_id: str,
) -> T | None:
    """
    Evaluate JSON content using specialized JSON evaluators with proper generics.

    Args:
        content: Original content string
        parsed_content: Already parsed JSON content
        response_type: Target type for evaluation result
        context: Evaluation context
        settings: Evaluation settings
        trace_id: Trace ID for logging

    Returns:
        Typed evaluation result or None if evaluation fails
    """
    try:
        # If we couldn't parse the content, try again with proper types
        if parsed_content is None and content:
            try:
                parsed_content = deserialize(content.encode(), response_type)
            except Exception:
                logger.debug("Could not parse JSON for evaluation", trace_id=trace_id)
                return None

        if not parsed_content:
            return None

        # Only handle EvaluationResult type for now
        if response_type is not EvaluationResult:
            try:
                return deserialize(content.encode(), response_type)
            except Exception:
                return None

        # Detect content type and route to appropriate evaluator
        content_type = _detect_json_content_type(parsed_content)
        if not content_type:
            logger.debug("Could not determine JSON content type", trace_id=trace_id)
            return None

        logger.debug("Evaluating as %s", content_type, trace_id=trace_id)
        metrics, feedback_msg = _evaluate_content_by_type(content_type, parsed_content, context)

        if not metrics:
            return None

        # Process metrics and build result
        overall_score = metrics["overall"] * 100  # Convert to percentage
        confidence = _calculate_confidence(metrics, settings, overall_score)
        feedback = [feedback_msg]

        # Add detailed feedback from metrics
        for key, value in metrics.items():
            if key != "overall" and isinstance(value, (int, float)):
                quality = "excellent" if value >= 0.9 else "good" if value >= 0.7 else "needs improvement"
                feedback.append(f"JSON {key.replace('_', ' ')}: {quality} ({value:.2f})")

        # Determine recommendation based on JSON-specific thresholds
        if overall_score >= 85 and confidence >= 0.85:
            recommendation: RecommendationType = "accept"
        elif overall_score >= 70:
            recommendation = "llm_review"
        else:
            recommendation = "reject"

        logger.info(
            "JSON evaluation completed",
            content_type=context.get("content_type", "unknown"),
            overall_score=overall_score,
            confidence=confidence,
            recommendation=recommendation,
            trace_id=trace_id,
        )

        # Create result - we know this is EvaluationResult type at this point
        result = EvaluationResult(
            success=True,
            overall_score=overall_score,
            confidence_score=confidence,
            recommendation=recommendation,
            detailed_feedback=feedback,
            evaluation_path="fast_only",
            execution_time_ms=0,  # Will be set by caller
        )

        # Add type-specific metrics
        _add_metrics_to_result(result, metrics)

        # Cast since we verify response_type is EvaluationResult above
        return cast("T", result)

    except Exception as e:
        logger.warning("JSON evaluation failed", error=str(e), trace_id=trace_id)

    return None
