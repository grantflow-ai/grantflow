"""
Optimized evaluation framework for improved performance and reliability.

Key optimizations:
1. Configurable timeout limits
2. Early termination on acceptable scores
3. Batch evaluation support
4. Reduced retry overhead
5. Performance monitoring
"""

import asyncio
import time
from typing import Any, Final, cast

from packages.shared_utils.src.exceptions import EvaluationError
from packages.shared_utils.src.logger import get_logger

from services.rag.src.utils.llm_evaluation import (
    EvaluationCriterion,
    EvaluationToolResponse,
    evaluate_prompt_output,
)

logger = get_logger(__name__)


FAST_EVALUATION_TIMEOUT: Final[float] = 30.0
STANDARD_EVALUATION_TIMEOUT: Final[float] = 60.0
COMPREHENSIVE_EVALUATION_TIMEOUT: Final[float] = 120.0


EXCELLENT_SCORE_THRESHOLD: Final[int] = 90
GOOD_SCORE_THRESHOLD: Final[int] = 75
ACCEPTABLE_SCORE_THRESHOLD: Final[int] = 60


async def fast_evaluate_output(
    *,
    criteria: list[EvaluationCriterion],
    prompt: str,
    model_output: str | dict[str, Any],
    evaluation_timeout: float = FAST_EVALUATION_TIMEOUT,
) -> EvaluationToolResponse:
    """
    Fast evaluation with early termination and timeout handling.

    Args:
        criteria: Evaluation criteria to assess
        prompt: Original prompt for context
        model_output: Output to evaluate
        timeout: Maximum time to spend on evaluation

    Returns:
        Evaluation results with scores and feedback

    Raises:
        EvaluationError: If evaluation fails or times out
    """
    start_time = time.time()

    try:

        result = await asyncio.wait_for(
            evaluate_prompt_output(
                criteria=criteria,
                prompt=prompt,
                model_output=model_output,
            ),
            timeout=evaluation_timeout,
        )

        duration = time.time() - start_time
        logger.info(
            "Fast evaluation completed",
            duration_seconds=duration,
            criteria_count=len(criteria),
            timeout_used=evaluation_timeout,
        )

        return result

    except TimeoutError:
        duration = time.time() - start_time
        logger.warning(
            "Evaluation timed out",
            duration_seconds=duration,
            timeout_seconds=evaluation_timeout,
            criteria_count=len(criteria),
        )
        raise EvaluationError(
            f"Evaluation timed out after {evaluation_timeout}s",
            context={
                "duration": duration,
                "timeout": evaluation_timeout,
                "criteria_count": len(criteria),
            },
        ) from None
    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            "Evaluation failed",
            duration_seconds=duration,
            error=str(e),
            criteria_count=len(criteria),
        )
        raise EvaluationError(
            f"Evaluation failed: {e}",
            context={
                "duration": duration,
                "original_error": str(e),
                "criteria_count": len(criteria),
            },
        ) from e


async def optimized_prompt_evaluation[T](
    *,
    prompt_identifier: str,
    passing_score: int = 70,
    prompt: str,
    prompt_handler: Any,
    retries: int = 2,
    increment: float = 10.0,
    criteria: list[EvaluationCriterion],
    timeout_per_attempt: float = STANDARD_EVALUATION_TIMEOUT,
    early_termination: bool = True,
    **kwargs: Any,
) -> T:
    """
    Optimized version of with_prompt_evaluation with performance improvements.

    Key optimizations:
    1. Reduced default retries
    2. Early termination on excellent scores
    3. Per-attempt timeout control
    4. Larger score increment steps
    5. Better error handling

    Args:
        prompt_identifier: Identifier for logging
        passing_score: Minimum score to accept
        prompt: Prompt text
        prompt_handler: Function to generate content
        retries: Maximum retry attempts (reduced default)
        increment: Score reduction per retry (increased default)
        criteria: Evaluation criteria
        timeout_per_attempt: Timeout per evaluation attempt
        early_termination: Whether to terminate early on excellent scores
        **kwargs: Additional arguments for prompt_handler

    Returns:
        Generated content that meets quality standards

    Raises:
        EvaluationError: If unable to generate acceptable content
    """
    start_time = time.time()
    current_prompt = str(prompt)
    iteration = 1
    min_passing_score = float(passing_score)

    mapped_criteria = {criterion.name: criterion for criterion in criteria}
    failures: list[dict[str, Any]] = []

    logger.info(
        "Starting optimized evaluation",
        prompt_identifier=prompt_identifier,
        passing_score=min_passing_score,
        max_retries=retries,
        timeout_per_attempt=timeout_per_attempt,
        early_termination=early_termination,
    )

    while iteration <= retries:
        iteration_start = time.time()

        try:

            model_output = await prompt_handler(current_prompt, **kwargs)


            evaluation_result = await fast_evaluate_output(
                criteria=criteria,
                prompt=current_prompt,
                model_output=model_output,
                evaluation_timeout=timeout_per_attempt,
            )


            failing_criteria = {}
            excellent_scores = 0
            total_weighted_score = 0.0
            total_weight = 0.0

            for criterion_name, result in evaluation_result["criteria"].items():
                if criterion_name in mapped_criteria:
                    criterion = mapped_criteria[criterion_name]
                    score = result["score"]

                    total_weighted_score += score * criterion.weight
                    total_weight += criterion.weight



                    if score < min_passing_score:
                        failing_criteria[criterion_name] = result
                    elif score >= EXCELLENT_SCORE_THRESHOLD:
                        excellent_scores += 1


            overall_score = total_weighted_score / total_weight if total_weight > 0 else 0


            if not failing_criteria:
                duration = time.time() - start_time
                logger.info(
                    "Evaluation passed",
                    prompt_identifier=prompt_identifier,
                    iteration=iteration,
                    overall_score=overall_score,
                    duration_seconds=duration,
                    all_scores={k: v["score"] for k, v in evaluation_result["criteria"].items()},
                )
                return cast("T", model_output)


            if (
                early_termination
                and excellent_scores >= len(criteria) // 2
                and overall_score >= min_passing_score * 0.9
            ):
                duration = time.time() - start_time
                logger.info(
                    "Early termination on excellent performance",
                    prompt_identifier=prompt_identifier,
                    iteration=iteration,
                    overall_score=overall_score,
                    excellent_scores=excellent_scores,
                    duration_seconds=duration,
                )
                return cast("T", model_output)


            iteration_duration = time.time() - iteration_start
            logger.warning(
                "Evaluation failed - preparing retry",
                prompt_identifier=prompt_identifier,
                iteration=iteration,
                overall_score=overall_score,
                iteration_duration=iteration_duration,
                failing_criteria_count=len(failing_criteria),
            )

            failures.append(
                {
                    "iteration": iteration,
                    "overall_score": overall_score,
                    "failing_criteria": {k: v["score"] for k, v in failing_criteria.items()},
                    "duration": iteration_duration,
                }
            )


            min_passing_score -= increment
            iteration += 1


            if iteration <= retries:
                improvement_instructions = []
                for criterion_name, result in failing_criteria.items():
                    improvement_instructions.append(f"- {criterion_name}: {result['instructions']}")

                current_prompt = f"""
                Improve the previous output based on this feedback:
                {chr(10).join(improvement_instructions)}

                Original prompt: {prompt}
                Previous output: {model_output}

                Generate an improved version that addresses the feedback above.
                """

        except EvaluationError:

            raise
        except Exception as e:
            iteration_duration = time.time() - iteration_start
            logger.exception(
                "Unexpected error in evaluation iteration",
                prompt_identifier=prompt_identifier,
                iteration=iteration,
                error=str(e),
                iteration_duration=iteration_duration,
            )
            failures.append(
                {
                    "iteration": iteration,
                    "error": str(e),
                    "duration": iteration_duration,
                }
            )
            iteration += 1


    total_duration = time.time() - start_time
    logger.error(
        "Evaluation failed after all retries",
        prompt_identifier=prompt_identifier,
        total_duration=total_duration,
        failures_count=len(failures),
    )

    raise EvaluationError(
        f"Failed to generate acceptable content after {retries} attempts",
        context={
            "prompt_identifier": prompt_identifier,
            "total_duration": total_duration,
            "failures": failures,
            "final_passing_score": min_passing_score,
        },
    )


async def batch_evaluate_outputs(
    evaluation_tasks: list[dict[str, Any]],
    max_concurrent: int = 3,
    timeout_per_task: float = STANDARD_EVALUATION_TIMEOUT,
) -> list[EvaluationToolResponse | Exception]:
    """
    Evaluate multiple outputs concurrently for improved throughput.

    Args:
        evaluation_tasks: List of evaluation task dictionaries with keys:
                         'criteria', 'prompt', 'model_output'
        max_concurrent: Maximum concurrent evaluations
        timeout_per_task: Timeout per individual evaluation

    Returns:
        List of evaluation results or exceptions
    """
    start_time = time.time()

    async def evaluate_single_task(task: dict[str, Any]) -> EvaluationToolResponse | Exception:
        try:
            return await fast_evaluate_output(
                criteria=task["criteria"],
                prompt=task["prompt"],
                model_output=task["model_output"],
                evaluation_timeout=timeout_per_task,
            )
        except (EvaluationError, TimeoutError) as e:

            return e


    semaphore = asyncio.Semaphore(max_concurrent)

    async def limited_evaluate(task: dict[str, Any]) -> EvaluationToolResponse | Exception:
        async with semaphore:
            return await evaluate_single_task(task)


    raw_results = await asyncio.gather(
        *[limited_evaluate(task) for task in evaluation_tasks],
        return_exceptions=True,
    )


    results: list[EvaluationToolResponse | Exception] = []
    for result in raw_results:
        if isinstance(result, Exception):
            results.append(result)
        elif isinstance(result, BaseException):

            results.append(Exception(str(result)))
        elif hasattr(result, "criteria"):
            results.append(result)
        else:
            results.append(Exception(f"Unexpected result type: {type(result)}"))

    duration = time.time() - start_time
    successful_evaluations = sum(1 for r in results if not isinstance(r, Exception))

    logger.info(
        "Batch evaluation completed",
        total_tasks=len(evaluation_tasks),
        successful_evaluations=successful_evaluations,
        failed_evaluations=len(evaluation_tasks) - successful_evaluations,
        duration_seconds=duration,
        max_concurrent=max_concurrent,
    )

    return results



async def quick_evaluation(
    criteria: list[EvaluationCriterion],
    prompt: str,
    model_output: str | dict[str, Any],
) -> EvaluationToolResponse:
    """Quick evaluation with minimal timeout."""
    return await fast_evaluate_output(
        criteria=criteria,
        prompt=prompt,
        model_output=model_output,
        evaluation_timeout=FAST_EVALUATION_TIMEOUT,
    )


async def standard_evaluation(
    criteria: list[EvaluationCriterion],
    prompt: str,
    model_output: str | dict[str, Any],
) -> EvaluationToolResponse:
    """Standard evaluation with balanced timeout."""
    return await fast_evaluate_output(
        criteria=criteria,
        prompt=prompt,
        model_output=model_output,
        evaluation_timeout=STANDARD_EVALUATION_TIMEOUT,
    )


async def thorough_evaluation(
    criteria: list[EvaluationCriterion],
    prompt: str,
    model_output: str | dict[str, Any],
) -> EvaluationToolResponse:
    """Thorough evaluation with extended timeout."""
    return await fast_evaluate_output(
        criteria=criteria,
        prompt=prompt,
        model_output=model_output,
        evaluation_timeout=COMPREHENSIVE_EVALUATION_TIMEOUT,
    )
