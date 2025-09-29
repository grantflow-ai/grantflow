import time
from collections.abc import Awaitable, Callable
from typing import Any

from packages.shared_utils.src.exceptions import EvaluationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import deserialize

# DocumentDTO imported in dto module
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
from services.rag.src.utils.evaluation.json.cfp_analysis import evaluate_cfp_analysis_quality
from services.rag.src.utils.evaluation.json.enrichment import evaluate_enrichment_quality
from services.rag.src.utils.evaluation.json.objectives import evaluate_objectives_quality
from services.rag.src.utils.evaluation.json.relationships import evaluate_relationships_quality
from services.rag.src.utils.evaluation.llm.evaluation import (
    EvaluationCriterion,
    EvaluationToolResponse,
    evaluate_output,
    with_prompt_evaluation,
)
from services.rag.src.utils.evaluation.pipeline import evaluate_scientific_content

logger = get_logger(__name__)

__all__ = [
    "CoherenceMetrics",
    "EvaluationContext",
    "EvaluationCriterion",
    "EvaluationResult",
    "EvaluationSettings",
    "EvaluationThresholds",
    "EvaluationToolResponse",
    "GroundingMetrics",
    "QualityMetrics",
    "ScientificAnalysis",
    "StructuralMetrics",
    "evaluate_content",
    "evaluate_scientific_content",
    "with_evaluation",
]


# Types imported from dto.py


DEFAULT_SETTINGS: EvaluationSettings = {
    "enable_fast_evaluation": True,
    "fast_confidence_threshold": 0.8,
    "fast_accept_threshold": 85.0,
    "fast_review_threshold": 70.0,
    "force_llm_evaluation": False,
    "llm_timeout": 60.0,
    "fast_weight": 0.3,
    "llm_weight": 0.7,
    "json_confidence_threshold": 0.95,  # Higher for structural JSON
    "json_semantic_threshold": 0.6,  # Lower for semantic content
}


def _validate_content(content: str) -> None:
    if not isinstance(content, str):
        raise EvaluationError("Content must be a string")
    if not content.strip():
        raise EvaluationError("Content cannot be empty")


def _validate_criteria(criteria: list[EvaluationCriterion]) -> None:
    if not isinstance(criteria, list):
        raise EvaluationError("Criteria must be a list")
    if not criteria:
        raise EvaluationError("At least one evaluation criterion is required")

    for i, criterion in enumerate(criteria):
        if not hasattr(criterion, "name") or not hasattr(criterion, "evaluation_instructions"):
            raise EvaluationError(f"Criterion {i} missing required fields")


def _validate_trace_id(trace_id: str) -> None:
    if not isinstance(trace_id, str):
        raise EvaluationError("Trace ID must be a string")
    if not trace_id.strip():
        raise EvaluationError("Trace ID cannot be empty")


def _has_fast_evaluation_context(context: EvaluationContext) -> bool:
    """Check if context has required fields for fast evaluation."""
    return bool(
        ("section_config" in context and "rag_context" in context and "research_objectives" in context)
        or _is_json_context(context)
    )


async def _evaluate_json_content(
    content: str,
    parsed_content: Any,
    context: EvaluationContext,
    settings: EvaluationSettings,
    trace_id: str,
) -> EvaluationResult | None:
    """Evaluate JSON content using specialized JSON evaluators.

    Routes to appropriate JSON evaluation based on content type detection.
    """
    try:
        # If we couldn't parse the content, try again
        if parsed_content is None and content:
            try:
                # Try as list first (for objectives), then as dict
                try:
                    parsed_content = deserialize(content.encode(), list)
                except Exception:
                    parsed_content = deserialize(content.encode(), dict)
            except Exception:
                logger.debug("Could not parse JSON for evaluation", trace_id=trace_id)
                return None

        if not parsed_content:
            return None

        # Detect content type and route to appropriate evaluator
        overall_score = 0.0
        confidence = 0.0
        feedback = []
        metrics: Any = None  # Will be typed metrics from specific evaluators

        # Check for research objectives
        if isinstance(parsed_content, list) and all(
            isinstance(obj, dict) and "research_tasks" in obj
            for obj in parsed_content[:3]  # Check first few
        ):
            logger.debug("Evaluating as research objectives", trace_id=trace_id)
            metrics = evaluate_objectives_quality(
                objectives=parsed_content,
                keywords=context.get("keywords", []),
                topics=context.get("topics", []),
            )
            feedback.append("JSON evaluation: Research objectives structure validated")

        # Check for relationships
        elif isinstance(parsed_content, dict) and all(
            isinstance(v, list) and all(
                isinstance(item, (list, tuple)) and len(item) >= 2
                for item in v[:2]  # Sample check
            )
            for k, v in list(parsed_content.items())[:3]  # Sample keys
        ):
            logger.debug("Evaluating as relationships", trace_id=trace_id)
            metrics = evaluate_relationships_quality(relationships=parsed_content)
            feedback.append("JSON evaluation: Relationships structure validated")

        # Check for enrichment data
        elif isinstance(parsed_content, dict) and (
            "enriched_objective" in parsed_content
            or "core_scientific_terms" in parsed_content
            or "research_objective" in parsed_content
        ):
            logger.debug("Evaluating as enrichment data", trace_id=trace_id)
            # Handle both single enrichment and objective with tasks
            if "research_objective" in parsed_content:
                # This is ObjectiveEnrichmentDTO format
                enrichment_data = parsed_content.get("research_objective", {})
            else:
                enrichment_data = parsed_content

            metrics = evaluate_enrichment_quality(
                enrichment_data=enrichment_data,
                keywords=context.get("keywords", []),
                topics=context.get("topics", []),
            )
            feedback.append("JSON evaluation: Enrichment data structure validated")

        # Check for CFP analysis
        elif isinstance(parsed_content, dict) and (
            "cfp_analysis" in parsed_content
            or "required_sections" in parsed_content
            or "evaluation_criteria" in parsed_content
        ):
            logger.debug("Evaluating as CFP analysis", trace_id=trace_id)
            metrics = evaluate_cfp_analysis_quality(cfp_data=parsed_content)
            feedback.append("JSON evaluation: CFP analysis structure validated")
        else:
            logger.debug("Could not determine JSON content type", trace_id=trace_id)
            return None

        # Process metrics if we got them
        if metrics:
            overall_score = metrics["overall"] * 100  # Convert to percentage

            # Use JSON-specific thresholds
            confidence_threshold = settings.get("json_confidence_threshold", 0.95)
            semantic_threshold = settings.get("json_semantic_threshold", 0.6)

            # Calculate confidence based on structural vs semantic scores
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
                    confidence = 0.95  # High confidence for good structure
                elif semantic_avg >= semantic_threshold:
                    confidence = 0.85  # Medium-high confidence for good semantics
                else:
                    confidence = max(0.7, (structural_avg + semantic_avg) / 2)
            else:
                confidence = min(0.95, overall_score / 100 + 0.15)  # JSON gets confidence boost

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

            result = EvaluationResult(
                success=True,
                overall_score=overall_score,
                confidence_score=confidence,
                recommendation=recommendation,
                detailed_feedback=feedback,
                evaluation_path="fast_only",
                execution_time_ms=0,  # Will be set by caller
            )

            # Add type-specific metrics based on what was evaluated
            if "scientific_rigor" in (metrics or {}):
                result["objective_metrics"] = metrics  # type: ignore
            elif "validity" in (metrics or {}):
                result["relationship_metrics"] = metrics  # type: ignore
            elif "value_added" in (metrics or {}):
                result["enrichment_metrics"] = metrics  # type: ignore
            elif "requirement_clarity" in (metrics or {}):
                result["cfp_metrics"] = metrics  # type: ignore

            # Store fast result for reference
            result["fast_result"] = {
                "overall_score": overall_score,
                "confidence_score": confidence,
                "recommendation": recommendation,
                "detailed_feedback": feedback,
            }

            return result

    except Exception as e:
        logger.warning(
            "JSON evaluation failed",
            error=str(e),
            trace_id=trace_id,
        )

    return None


async def _try_fast_evaluation(
    content: str, context: EvaluationContext, settings: EvaluationSettings, trace_id: str
) -> EvaluationResult | None:
    """Try fast evaluation with JSON detection and appropriate routing."""
    try:
        # Check if this is JSON content that should use JSON evaluation
        is_json, parsed_content = _detect_json_content(content)

        # Check if context indicates JSON evaluation
        if is_json or _is_json_context(context) or settings.get("is_json_content"):
            # Use JSON evaluation if available
            result = await _evaluate_json_content(
                content=content,
                parsed_content=parsed_content,
                context=context,
                settings=settings,
                trace_id=trace_id,
            )
            if result:
                return result

        # Fall back to text evaluation if we have required context
        section_config = context.get("section_config")
        rag_context = context.get("rag_context")
        research_objectives = context.get("research_objectives")

        # Check if we have the required fields for text evaluation
        if not section_config or not rag_context or not research_objectives:
            return None

        return await evaluate_scientific_content(
            content=content,
            section_config=section_config,
            rag_context=rag_context,
            research_objectives=research_objectives,
            trace_id=trace_id,
            reference_corpus=context.get("reference_corpus"),
            thresholds=EvaluationThresholds(
                accept_threshold=settings.get("fast_accept_threshold", 85.0),
                llm_review_threshold=settings.get("fast_review_threshold", 70.0),
                component_weights={
                    "structural": 0.15,
                    "source_grounding": 0.25,
                    "scientific_quality": 0.30,
                    "coherence": 0.20,
                    "cpu_scientific": 0.10,
                },
                minimum_component_scores={
                    "scientific_quality": 70.0,
                    "source_grounding": 60.0,
                    "coherence": 65.0,
                    "structural": 60.0,
                },
            ),
        )
    except Exception as e:
        logger.warning("Fast evaluation failed", error=str(e), trace_id=trace_id)
        return None


def _extract_llm_feedback(llm_result: EvaluationToolResponse, fast_result: EvaluationResult | None) -> list[str]:
    feedback = []

    if fast_result:
        feedback.extend(fast_result["detailed_feedback"])
        feedback.append("--- LLM Review ---")

    for criterion_name, result in llm_result["criteria"].items():
        if result["score"] < 80:
            feedback.append(f"🔍 {criterion_name}: {result['instructions']}")

    return feedback


def _is_json_context(context: EvaluationContext) -> bool:
    """Check if this is a JSON evaluation context."""
    if isinstance(context, dict) and "json_content" in context:
        return True
    # Also check for JSON-like structures in the content itself
    return bool(
        context.get("research_objectives")
        or context.get("relationships")
        or context.get("enrichment_data")
        or context.get("cfp_analysis")
    )


def _detect_json_content(content: str) -> tuple[bool, Any]:
    """Detect if content is JSON and parse it.

    Returns:
        Tuple of (is_json, parsed_content or None)
    """
    # First try to parse as JSON using our serialization utils
    try:
        # Try as list first (for objectives), then as dict
        try:
            parsed = deserialize(content.encode(), list)
            if isinstance(parsed, list):
                return True, parsed
        except Exception:
            parsed = deserialize(content.encode(), dict)
            if isinstance(parsed, dict):
                return True, parsed
    except Exception as e:
        logger.debug("JSON parsing failed", content_preview=content[:50], error=str(e))

    # Check for structured content patterns but couldn't parse
    content_stripped = content.strip()
    if content_stripped.startswith(("{", "[")):
        # Looks like JSON but couldn't parse - not valid JSON
        return False, None

    return False, None


async def evaluate_content(
    content: str,
    criteria: list[EvaluationCriterion],
    prompt: str,
    trace_id: str,
    *,
    settings: EvaluationSettings | None = None,
    context: EvaluationContext | None = None,
) -> EvaluationResult:
    start_time = time.time()

    _validate_content(content)
    _validate_criteria(criteria)
    _validate_trace_id(trace_id)

    eval_settings: EvaluationSettings = {**DEFAULT_SETTINGS, **(settings or {})}
    eval_context = context or {}

    logger.info(
        "Starting content evaluation",
        content_length=len(content),
        criteria_count=len(criteria),
        enable_fast=eval_settings["enable_fast_evaluation"],
        force_llm=eval_settings["force_llm_evaluation"],
        trace_id=trace_id,
    )

    try:
        fast_result = None
        if (
            eval_settings["enable_fast_evaluation"]
            and not eval_settings["force_llm_evaluation"]
            and _has_fast_evaluation_context(eval_context)
        ):
            fast_result = await _try_fast_evaluation(content, eval_context, eval_settings, trace_id)

            confidence_threshold = eval_settings["fast_confidence_threshold"]
            if fast_result and fast_result["confidence_score"] >= confidence_threshold:
                execution_time = (time.time() - start_time) * 1000

                logger.info(
                    "Fast evaluation successful, skipping LLM",
                    score=fast_result["overall_score"],
                    confidence=fast_result["confidence_score"],
                    recommendation=fast_result["recommendation"],
                    execution_time_ms=execution_time,
                    trace_id=trace_id,
                )

                return EvaluationResult(
                    success=True,
                    overall_score=fast_result["overall_score"],
                    confidence_score=fast_result["confidence_score"],
                    recommendation=fast_result["recommendation"],
                    detailed_feedback=fast_result["detailed_feedback"],
                    evaluation_path="fast_only",
                    execution_time_ms=execution_time,
                    fast_result=fast_result,
                )

        logger.info(
            "Using LLM evaluation",
            reason="forced"
            if eval_settings["force_llm_evaluation"]
            else "fast_fallback"
            if fast_result
            else "no_fast_context",
            fast_confidence=fast_result["confidence_score"] if fast_result else None,
            trace_id=trace_id,
        )

        llm_result = await evaluate_output(
            criteria=criteria,
            prompt=prompt,
            model_output=content,
            trace_id=trace_id,
            evaluation_timeout=eval_settings["llm_timeout"],
        )

        llm_scores = [result["score"] for result in llm_result["criteria"].values()]
        llm_avg_score = sum(llm_scores) / len(llm_scores) if llm_scores else 0
        llm_confidence = min(llm_avg_score / 100.0, 0.95)

        if fast_result:
            fast_weight = eval_settings["fast_weight"]
            llm_weight = eval_settings["llm_weight"]
            combined_score = (fast_result["overall_score"] * fast_weight) + (llm_avg_score * llm_weight)
            combined_confidence = max(fast_result["confidence_score"], llm_confidence)
            evaluation_path: EvaluationPathType = "fast_with_llm_fallback"
        else:
            combined_score = llm_avg_score
            combined_confidence = llm_confidence
            evaluation_path = "llm_only"

        if combined_score >= 85 and llm_avg_score >= 75:
            recommendation: RecommendationType = "accept"
        elif combined_score >= 70:
            recommendation = "llm_review"
        else:
            recommendation = "reject"

        execution_time = (time.time() - start_time) * 1000

        logger.info(
            "LLM evaluation completed",
            llm_score=llm_avg_score,
            combined_score=combined_score,
            recommendation=recommendation,
            evaluation_path=evaluation_path,
            execution_time_ms=execution_time,
            trace_id=trace_id,
        )

        result = EvaluationResult(
            success=True,
            overall_score=combined_score,
            confidence_score=combined_confidence,
            recommendation=recommendation,
            detailed_feedback=_extract_llm_feedback(llm_result, fast_result),
            evaluation_path=evaluation_path,
            execution_time_ms=execution_time,
            llm_result=llm_result,
        )

        if fast_result:
            result["fast_result"] = fast_result

        return result

    except Exception as e:
        execution_time = (time.time() - start_time) * 1000

        logger.error("Content evaluation failed", error=str(e), execution_time_ms=execution_time, trace_id=trace_id)

        return EvaluationResult(
            success=False,
            overall_score=0.0,
            confidence_score=0.0,
            recommendation="reject",
            detailed_feedback=[f"Evaluation failed: {e!s}"],
            evaluation_path="error",
            execution_time_ms=execution_time,
        )


async def with_evaluation[T, **P](
    *,
    prompt_identifier: str,
    prompt: str,
    prompt_handler: Callable[P, Awaitable[T]],
    criteria: list[EvaluationCriterion],
    trace_id: str,
    passing_score: int = 100,
    retries: int = 4,
    increment: float = 2.5,
    job_manager: Any | None = None,
    settings: EvaluationSettings | None = None,
    context: EvaluationContext | None = None,
    **kwargs: Any,
) -> T:
    _validate_criteria(criteria)
    _validate_trace_id(trace_id)

    eval_settings: EvaluationSettings = {**DEFAULT_SETTINGS, **(settings or {})}
    eval_context = context or {}

    logger.info(
        "Starting evaluation-guided generation",
        prompt_identifier=prompt_identifier,
        passing_score=passing_score,
        max_retries=retries,
        enable_fast=eval_settings["enable_fast_evaluation"],
        trace_id=trace_id,
    )

    async def unified_evaluator(
        eval_prompt: str,
        model_output: str | dict[str, Any],
        eval_criteria: list[EvaluationCriterion],
        eval_trace_id: str,
    ) -> EvaluationToolResponse:
        result = await evaluate_content(
            content=str(model_output),
            criteria=eval_criteria,
            prompt=eval_prompt,
            trace_id=eval_trace_id,
            settings=eval_settings,
            context=eval_context,
        )

        if result.get("llm_result"):
            return result["llm_result"]

        return {
            "criteria": {
                criterion.name: {
                    "score": max(50, int(result["overall_score"] * criterion.weight)),
                    "instructions": f"Score: {result['overall_score']:.1f}, Confidence: {result['confidence_score']:.2f}, Path: {result['evaluation_path']}",
                }
                for criterion in eval_criteria
            }
        }

    return await with_prompt_evaluation(
        prompt_identifier=prompt_identifier,
        passing_score=passing_score,
        prompt=prompt,
        prompt_handler=prompt_handler,
        retries=retries,
        increment=increment,
        criteria=criteria,
        trace_id=trace_id,
        job_manager=job_manager,
        evaluator=unified_evaluator,
        **kwargs,
    )
