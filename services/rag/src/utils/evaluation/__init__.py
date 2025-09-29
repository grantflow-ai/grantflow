import time
from collections.abc import Awaitable, Callable
from typing import Any, TypedDict

from packages.db.src.json_objects import GrantLongFormSection, ResearchObjective
from packages.shared_utils.src.exceptions import EvaluationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.dto import DocumentDTO
from services.rag.src.utils.evaluation.dto import (
    CoherenceMetrics,
    EvaluationPathType,
    EvaluationResult,
    EvaluationThresholds,
    GroundingMetrics,
    QualityMetrics,
    RecommendationType,
    ScientificAnalysis,
    StructuralMetrics,
)
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


class EvaluationSettings(TypedDict, total=False):
    enable_fast_evaluation: bool
    fast_confidence_threshold: float
    fast_accept_threshold: float
    fast_review_threshold: float

    force_llm_evaluation: bool
    llm_timeout: float

    fast_weight: float
    llm_weight: float


class EvaluationContext(TypedDict, total=False):
    section_config: GrantLongFormSection
    rag_context: list[DocumentDTO]
    research_objectives: list[ResearchObjective]
    reference_corpus: list[str]


DEFAULT_SETTINGS: EvaluationSettings = {
    "enable_fast_evaluation": True,
    "fast_confidence_threshold": 0.8,
    "fast_accept_threshold": 85.0,
    "fast_review_threshold": 70.0,
    "force_llm_evaluation": False,
    "llm_timeout": 60.0,
    "fast_weight": 0.3,
    "llm_weight": 0.7,
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
    return "section_config" in context and "rag_context" in context and "research_objectives" in context


async def _try_fast_evaluation(
    content: str, context: EvaluationContext, settings: EvaluationSettings, trace_id: str
) -> EvaluationResult | None:
    try:
        return await evaluate_scientific_content(
            content=content,
            section_config=context["section_config"],
            rag_context=context["rag_context"],
            research_objectives=context["research_objectives"],
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
