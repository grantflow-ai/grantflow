"""Core evaluation functions with proper generics."""

import time
from typing import cast

from packages.shared_utils.src.exceptions import EvaluationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import deserialize

from services.rag.src.utils.evaluation.dto import (
    EvaluationContext,
    EvaluationResult,
    EvaluationSettings,
)
from services.rag.src.utils.evaluation.json_evaluator import evaluate_json_content
from services.rag.src.utils.evaluation.json_parser import parse_json_content
from services.rag.src.utils.evaluation.pipeline import evaluate_scientific_content

logger = get_logger(__name__)


def _validate_content(content: str) -> None:
    if not isinstance(content, str):
        raise EvaluationError("Content must be a string")
    if not content.strip():
        raise EvaluationError("Content cannot be empty")


def _validate_trace_id(trace_id: str) -> None:
    if not isinstance(trace_id, str):
        raise EvaluationError("Trace ID must be a string")
    if not trace_id.strip():
        raise EvaluationError("Trace ID cannot be empty")


async def evaluate_content[T](
    content: str,
    response_type: type[T],
    *,
    context: EvaluationContext | None = None,
    settings: EvaluationSettings | None = None,
    trace_id: str,
) -> T:
    """
    Evaluate content with proper generic typing.

    Args:
        content: Content to evaluate
        response_type: Target type for deserialization
        context: Evaluation context (optional)
        settings: Evaluation settings (optional)
        trace_id: Trace ID for logging

    Returns:
        Typed evaluation result
    """
    _validate_content(content)
    _validate_trace_id(trace_id)

    start_time = time.time()

    try:
        # Check if content is JSON and parse accordingly
        is_json, parsed_content = parse_json_content(content, response_type)

        if is_json and parsed_content is not None:
            # Handle JSON content evaluation
            result = await evaluate_json_content(
                content=content,
                parsed_content=parsed_content,
                response_type=response_type,
                context=context or {},
                settings=settings or {},
                trace_id=trace_id,
            )
            if result is not None:
                return cast("T", result)

        # Handle scientific content evaluation for EvaluationResult type
        if response_type is EvaluationResult:
            result = await evaluate_scientific_content(
                content=content,
                section_config=context.get("section_config") if context else None,
                rag_context=context.get("rag_context", []) if context else [],
                research_objectives=context.get("research_objectives", []) if context else [],
                trace_id=trace_id,
            )
            # Cast to T since we know response_type is EvaluationResult
            return cast("T", result)

        # Fallback: try to deserialize as the requested type
        return deserialize(content.encode(), response_type)

    except Exception as e:
        execution_time = (time.time() - start_time) * 1000
        logger.error(
            "Content evaluation failed",
            error=str(e),
            execution_time_ms=execution_time,
            trace_id=trace_id,
        )
        raise EvaluationError(f"Evaluation failed: {e}") from e


# with_evaluation is now directly imported above - no alias needed
