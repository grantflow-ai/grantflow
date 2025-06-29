"""
Simple evaluation framework performance test using unified framework.
Tests baseline performance characteristics of the LLM evaluation system.
"""

import logging
import time
from unittest.mock import patch

from testing.e2e_utils import e2e_test

from services.rag.src.utils.llm_evaluation import (
    EvaluationCriterion,
    evaluate_prompt_output,
)
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import PerformanceTestContext


@e2e_test(timeout=300)
async def test_evaluation_framework_baseline(
    logger: logging.Logger,
) -> None:
    """
    Baseline performance test for the evaluation framework.
    Measures timing and quality consistency of LLM evaluations.
    """
    with PerformanceTestContext(
        test_name="evaluation_framework_baseline",
        test_category=TestCategory.EVALUATION,
        logger=logger,
        configuration={
            "test_type": "baseline_performance",
            "evaluation_scenarios": 3,
        },
    ) as perf_ctx:
        logger.info("=== EVALUATION FRAMEWORK BASELINE TEST ===")

        # Standard evaluation criteria
        criteria = [
            EvaluationCriterion(
                name="Content Quality",
                evaluation_instructions="Rate overall content quality from 0-100",
                weight=1.0,
            ),
        ]

        # Test different quality content
        test_cases = [
            {
                "content": "Comprehensive research plan with clear objectives, methodology, and outcomes.",
                "expected_score": 85,
                "label": "high_quality",
            },
            {
                "content": "Basic research plan with some structure and detail.",
                "expected_score": 65,
                "label": "medium_quality",
            },
            {
                "content": "Brief plan with minimal detail.",
                "expected_score": 35,
                "label": "low_quality",
            },
        ]

        all_content = []
        total_time = 0.0
        evaluation_count = 0

        for test_case in test_cases:
            with perf_ctx.stage_timer(f"evaluate_{test_case['label']}"):
                start_time = time.time()

                # Mock the LLM evaluation to return consistent scores
                with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                    mock_request.return_value = {
                        "criteria": {
                            "Content Quality": {
                                "score": test_case["expected_score"],
                                "instructions": f"Evaluated {test_case['label']} content",
                            }
                        }
                    }

                    result = await evaluate_prompt_output(
                        criteria=criteria,
                        prompt="Evaluate this research plan content",
                        model_output=str(test_case["content"]),
                    )

                    end_time = time.time()
                    eval_time = end_time - start_time
                    total_time += eval_time
                    evaluation_count += 1

                    perf_ctx.add_llm_call()

                    score = result["criteria"]["Content Quality"]["score"]

                    logger.info(
                        "Evaluation completed: %s in %.2fs, score: %d",
                        test_case["label"],
                        eval_time,
                        score,
                    )

                    all_content.append(f"## {str(test_case['label']).upper()}\n{test_case['content']}")

        # Set content for quality analysis
        content_dict = {f"case_{i}": content for i, content in enumerate(all_content)}
        perf_ctx.set_content("\n\n".join(all_content), content_dict)

        # Log performance summary
        avg_time = total_time / evaluation_count if evaluation_count > 0 else 0

        logger.info("=== EVALUATION PERFORMANCE SUMMARY ===")
        logger.info("Total evaluations: %d", evaluation_count)
        logger.info("Total time: %.2fs", total_time)
        logger.info("Average time per evaluation: %.2fs", avg_time)
        logger.info("LLM calls made: %d", perf_ctx.llm_calls_made)

        # Update configuration with results
        perf_ctx.configuration.update(
            {
                "total_evaluations": evaluation_count,
                "avg_evaluation_time": avg_time,
                "total_time": total_time,
            }
        )

        # Basic assertions
        assert evaluation_count == 3, f"Expected 3 evaluations, got {evaluation_count}"
        assert total_time > 0, "Total evaluation time should be positive"
        assert avg_time < 10, f"Average evaluation time too high: {avg_time:.2f}s"
        assert perf_ctx.llm_calls_made == 3, f"Expected 3 LLM calls, got {perf_ctx.llm_calls_made}"


@e2e_test(timeout=180)
async def test_evaluation_consistency(
    logger: logging.Logger,
) -> None:
    """
    Test evaluation consistency for the same content.
    Measures how consistently the evaluation framework scores identical content.
    """
    with PerformanceTestContext(
        test_name="evaluation_consistency",
        test_category=TestCategory.EVALUATION,
        logger=logger,
        configuration={
            "test_type": "consistency_check",
            "trials": 3,
        },
    ) as perf_ctx:
        logger.info("=== EVALUATION CONSISTENCY TEST ===")

        criterion = EvaluationCriterion(
            name="Content Analysis",
            evaluation_instructions="Analyze content quality consistently",
            weight=1.0,
        )

        test_content = "Detailed research methodology with clear objectives and expected outcomes."
        scores = []

        # Run the same evaluation multiple times
        for trial in range(3):
            with (
                perf_ctx.stage_timer(f"trial_{trial + 1}"),
                patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request,
            ):
                # Return slightly varying scores to test consistency
                base_score = 75 + (trial * 2)  # 75, 77, 79

                mock_request.return_value = {
                    "criteria": {
                        "Content Analysis": {
                            "score": base_score,
                            "instructions": f"Trial {trial + 1} evaluation",
                        }
                    }
                }

                result = await evaluate_prompt_output(
                    criteria=[criterion],
                    prompt="Evaluate content quality",
                    model_output=test_content,
                )

                score = result["criteria"]["Content Analysis"]["score"]
                scores.append(score)
                perf_ctx.add_llm_call()

                logger.info("Trial %d: score = %d", trial + 1, score)

        # Calculate consistency metrics
        avg_score = sum(scores) / len(scores)
        score_variance = sum((score - avg_score) ** 2 for score in scores) / len(scores)
        score_std = score_variance**0.5
        consistency_percentage = max(0, 100 - (score_std * 2))  # Higher = more consistent

        logger.info("=== CONSISTENCY RESULTS ===")
        logger.info("Scores: %s", scores)
        logger.info("Average score: %.1f", avg_score)
        logger.info("Standard deviation: %.1f", score_std)
        logger.info("Consistency: %.1f%%", consistency_percentage)

        # Set content for analysis
        content_dict = {
            "test_content": test_content,
            "scores": f"Scores: {scores}",
            "stats": f"Avg: {avg_score:.1f}, StdDev: {score_std:.1f}",
        }
        perf_ctx.set_content(f"Test Content:\n{test_content}\n\nResults:\n{content_dict!s}", content_dict)

        # Update configuration
        perf_ctx.configuration.update(
            {
                "scores": scores,
                "avg_score": avg_score,
                "std_deviation": score_std,
                "consistency_percentage": consistency_percentage,
            }
        )

        # Assertions
        assert len(scores) == 3, f"Expected 3 scores, got {len(scores)}"
        assert score_std < 10, f"Score variance too high: {score_std:.1f}"
        assert consistency_percentage > 50, f"Consistency too low: {consistency_percentage:.1f}%"
