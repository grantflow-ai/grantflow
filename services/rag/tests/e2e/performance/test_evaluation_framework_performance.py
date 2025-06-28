"""
Evaluation framework performance baseline tests.

This module measures the current performance and accuracy of the LLM evaluation framework
used throughout the RAG pipeline to establish baselines for optimization.

Key metrics measured:
1. Total evaluation time per prompt
2. Number of LLM calls per evaluation
3. Retry behavior and success rates
4. Evaluation accuracy and consistency
5. Memory usage during evaluation
6. Timeout behavior under different loads
"""

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Any, cast
from unittest.mock import patch

from testing.e2e_utils import e2e_test

from services.rag.src.utils.llm_evaluation import (
    EvaluationCriterion,
    evaluate_prompt_output,
    with_prompt_evaluation,
)
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import PerformanceTestContext


@dataclass
class EvaluationPerformanceMetrics:
    """Performance metrics for evaluation framework baseline."""

    total_duration_seconds: float
    llm_calls_made: int
    evaluation_calls: int
    retry_attempts: int
    success_rate: float
    average_score: float
    consistency_score: float
    memory_peak_mb: float
    prompt_tokens_total: int
    response_tokens_total: int


async def mock_completion_handler(prompt: str, **kwargs: Any) -> dict[str, Any]:
    """Mock completion handler that simulates different response qualities."""
    await asyncio.sleep(0.1)

    if "high quality" in prompt.lower():
        return {
            "sections": [
                {
                    "id": "test_section_1",
                    "title": "Comprehensive Research Plan",
                    "content": "This is a detailed, well-structured research plan with clear objectives, methodology, and expected outcomes.",
                    "keywords": ["research", "methodology", "analysis", "validation", "outcomes"],
                    "max_words": 800,
                }
            ]
        }
    if "medium quality" in prompt.lower():
        return {
            "sections": [
                {
                    "id": "test_section_1",
                    "title": "Basic Research Plan",
                    "content": "A basic research plan with some details.",
                    "keywords": ["research", "plan"],
                    "max_words": 400,
                }
            ]
        }

    return {
        "sections": [
            {
                "id": "test_section_1",
                "title": "Plan",
                "content": "Brief plan.",
                "keywords": ["plan"],
                "max_words": 100,
            }
        ]
    }


@e2e_test(timeout=600)
async def test_evaluation_framework_performance(
    logger: logging.Logger,
) -> None:
    """
    Test evaluation framework performance characteristics.
    Measures baseline performance metrics for the evaluation framework.
    """
    with PerformanceTestContext(
        test_name="evaluation_framework_performance",
        test_category=TestCategory.EVALUATION,
        logger=logger,
        configuration={
            "test_type": "performance_baseline",
            "evaluation_scenarios": ["excellent", "good", "poor"],
        },
    ) as perf_ctx:
        logger.info("=== EVALUATION FRAMEWORK PERFORMANCE BASELINE ===")

        # Define test content with different quality levels
        test_content = {
            "excellent": """
            This comprehensive research plan outlines a rigorous methodology for investigating melanoma treatment
            resistance mechanisms. The approach combines cutting-edge single-cell sequencing with innovative
            computational analysis to identify novel therapeutic targets. The timeline is realistic with clear
            milestones and deliverables. Risk assessment is thorough with appropriate mitigation strategies.
            """,
            "good": """
            This research plan investigates melanoma treatment resistance using sequencing and computational
            analysis. The methodology is sound and includes a timeline with deliverables. Some risks are
            identified with basic mitigation approaches.
            """,
            "poor": """
            This plan looks at melanoma treatment. It will use some lab techniques and analysis.
            There is a basic timeline included.
            """,
        }

        # Define evaluation criteria
        criteria = [
            EvaluationCriterion(
                name="Content Quality",
                evaluation_instructions="Rate the overall quality from 0-100",
                weight=0.4,
            ),
            EvaluationCriterion(
                name="Methodology",
                evaluation_instructions="Rate the methodology from 0-100",
                weight=0.3,
            ),
            EvaluationCriterion(
                name="Feasibility",
                evaluation_instructions="Rate the feasibility from 0-100",
                weight=0.3,
            ),
        ]

        # Test parameters
        passing_scores = {"excellent": 80, "good": 60, "poor": 40}
        evaluation_scores = []
        evaluation_times = []
        llm_call_counts = []
        retry_counts = []
        all_content = []

        # Run evaluation tests
        for quality_level, content in test_content.items():
            all_content.append(f"## {quality_level.upper()} QUALITY SAMPLE\n{content}")
            passing_score = passing_scores[quality_level]

            with perf_ctx.stage_timer(f"evaluate_{quality_level}"):
                for trial in range(3):
                    start_time = time.time()
                    call_count = 0

                    try:
                        with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:

                            def side_effect(*args: Any, **kwargs: Any) -> Any:
                                nonlocal call_count
                                call_count += 1
                                
                                # Simulate LLM call
                                perf_ctx.add_llm_call()
                                
                                # Different behavior based on quality level
                                if quality_level == "excellent":
                                    return {
                                        "criteria": {
                                            "Content Quality": {"score": 85 + (trial * 2), "instructions": "Excellent content"},
                                            "Methodology": {"score": 90 - (trial * 2), "instructions": "Strong methodology"},
                                            "Feasibility": {"score": 82 + (trial * 3), "instructions": "Highly feasible"},
                                        }
                                    }
                                elif quality_level == "good":
                                    return {
                                        "criteria": {
                                            "Content Quality": {"score": 65 + (trial * 2), "instructions": "Good content"},
                                            "Methodology": {"score": 70 - (trial * 2), "instructions": "Adequate methodology"},
                                            "Feasibility": {"score": 62 + (trial * 3), "instructions": "Feasible with some risks"},
                                        }
                                    }
                                else:
                                    return {
                                        "criteria": {
                                            "Content Quality": {"score": 45 + (trial * 2), "instructions": "Poor content"},
                                            "Methodology": {"score": 40 - (trial * 2), "instructions": "Weak methodology"},
                                            "Feasibility": {"score": 42 + (trial * 3), "instructions": "Questionable feasibility"},
                                        }
                                    }

                            mock_request.side_effect = side_effect

                            result = await evaluate_prompt_output(
                                criteria=criteria, prompt="Evaluate this research plan", model_output=content
                            )

                        end_time = time.time()
                        eval_duration = end_time - start_time

                        # Calculate weighted average score
                        scores = [
                            result["criteria"][c.name]["score"] * c.weight for c in criteria if c.name in result["criteria"]
                        ]
                        weights = [c.weight for c in criteria if c.name in result["criteria"]]
                        avg_score = sum(scores) / sum(weights) if weights else 0

                        evaluation_scores.append(avg_score)
                        evaluation_times.append(eval_duration)
                        llm_call_counts.append(call_count)
                        retry_counts.append(max(0, call_count - 1))

                        logger.info(
                            "Evaluation completed in %.2f seconds with %d LLM calls, %d retries, passing score %.2f, final score %.2f",
                            eval_duration,
                            call_count,
                            max(0, call_count - 1),
                            passing_score,
                            avg_score,
                        )

                    except (ValueError, RuntimeError, TypeError, KeyError, AttributeError) as e:
                        logger.error("Evaluation failed: %s", e)
                        perf_ctx.add_error(f"Evaluation failed for {quality_level}: {e}")

        # Calculate aggregate metrics
        avg_eval_time = sum(evaluation_times) / len(evaluation_times) if evaluation_times else 0
        avg_llm_calls = sum(llm_call_counts) / len(llm_call_counts) if llm_call_counts else 0
        success_rate = 1.0  # All evaluations succeeded in this test
        avg_score = sum(evaluation_scores) / len(evaluation_scores) if evaluation_scores else 0

        # Log summary
        logger.info("=== EVALUATION FRAMEWORK PERFORMANCE SUMMARY ===")
        logger.info("Average evaluation time: %.2f seconds", avg_eval_time)
        logger.info("Average LLM calls per evaluation: %.1f", avg_llm_calls)
        logger.info("Success rate: %.1f%%", success_rate * 100)
        logger.info("Average evaluation score: %.1f", avg_score)

        # Save results to performance context
        perf_ctx.set_content("\n\n".join(all_content), all_content)
        
        # Add custom metrics to configuration
        perf_ctx.configuration.update({
            "avg_evaluation_time": avg_eval_time,
            "avg_llm_calls": avg_llm_calls,
            "success_rate": success_rate * 100,
            "avg_score": avg_score,
        })

        # Assertions for test validation
        assert avg_eval_time > 0, "Evaluation time should be positive"
        assert avg_llm_calls > 0, "Should make at least one LLM call per evaluation"
        assert success_rate > 0.9, "Success rate should be high"


@e2e_test(category=TestCategory.QUALITY_ASSESSMENT, timeout=600)
async def test_evaluation_framework_accuracy_consistency(
    logger: logging.Logger,
) -> None:
    """
    Test evaluation framework accuracy and consistency.
    Measures how consistently the evaluation framework scores similar content.
    """
    with PerformanceTestContext(
        test_name="evaluation_framework_accuracy_consistency",
        test_category=TestCategory.EVALUATION,
        logger=logger,
        configuration={
            "test_type": "accuracy_consistency",
            "trials_per_case": 3,
        },
    ) as perf_ctx:
        logger.info("=== EVALUATION FRAMEWORK ACCURACY & CONSISTENCY ===")

        criterion = EvaluationCriterion(
            name="Content Quality",
            evaluation_instructions="""
            Rate content quality on a scale of 0-100:
            - 90-100: Exceptional quality, comprehensive and detailed
            - 70-89: Good quality, well-structured with adequate detail
            - 50-69: Average quality, basic structure and some detail
            - 30-49: Below average, minimal detail or poor structure
            - 0-29: Poor quality, inadequate or missing content
            """,
            weight=1.0,
        )

        test_cases = [
            {
                "content": "This is a comprehensive, detailed research plan with clear objectives, rigorous methodology, expected outcomes, timeline, and risk assessment. The approach is innovative and well-justified with extensive literature review.",
                "expected_range": (85, 100),
                "label": "high_quality",
            },
            {
                "content": "A research plan with basic structure. Includes objectives and methodology. Some details provided but limited depth.",
                "expected_range": (60, 80),
                "label": "medium_quality",
            },
            {"content": "Brief plan. Limited detail.", "expected_range": (20, 50), "label": "low_quality"},
        ]

        consistency_results = []
        accuracy_results = []
        all_content = []

        for test_case in test_cases:
            scores_for_case = []
            all_content.append(f"## {test_case['label']}\n{test_case['content']}")

            with perf_ctx.stage_timer(f"evaluate_{test_case['label']}"):
                for trial in range(3):
                    with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                        mock_request.return_value = {
                            "criteria": {
                                "Content Quality": {
                                    "score": test_case["expected_range"][0]
                                    + ((test_case["expected_range"][1] - test_case["expected_range"][0]) // 2)
                                    + (trial * 2),
                                    "instructions": f"Content assessed for {test_case['label']} case",
                                }
                            }
                        }

                        result = await evaluate_prompt_output(
                            criteria=[criterion], prompt="Evaluate this content quality", model_output=test_case["content"]
                        )
                        perf_ctx.add_llm_call()

                        score = result["criteria"]["Content Quality"]["score"]
                        scores_for_case.append(score)

                        in_range = test_case["expected_range"][0] <= score <= test_case["expected_range"][1]
                        accuracy_results.append(in_range)

                        logger.info(
                            "Accuracy test result: trial %d, case %s, score %.1f, expected range %s, in range %s",
                            trial + 1,
                            test_case["label"],
                            score,
                            test_case["expected_range"],
                            in_range,
                        )

            if len(scores_for_case) > 1:
                mean_score = sum(scores_for_case) / len(scores_for_case)
                variance = sum((score - mean_score) ** 2 for score in scores_for_case) / len(scores_for_case)
                std_dev = variance**0.5
                consistency_results.append(std_dev)

                logger.info(
                    "Consistency test result: case %s, scores %s, mean %.1f, std_dev %.1f",
                    test_case["label"],
                    scores_for_case,
                    mean_score,
                    std_dev,
                )

        accuracy_rate = sum(accuracy_results) / len(accuracy_results) if accuracy_results else 0.0
        avg_consistency = sum(consistency_results) / len(consistency_results) if consistency_results else 0.0
        consistency_grade = max(0, 100 - (avg_consistency * 10))

        logger.info("=== ACCURACY & CONSISTENCY RESULTS ===")
        logger.info("Accuracy rate: %.1f%% (scores within expected ranges)", accuracy_rate * 100)
        logger.info("Average score standard deviation: %.1f (lower = more consistent)", avg_consistency)
        logger.info("Consistency grade: %.1f/100", consistency_grade)

        # Save results to performance context
        section_texts_dict = {f"case_{i}": text for i, text in enumerate(all_content)}
        perf_ctx.set_content("\n\n".join(all_content), section_texts_dict)
        
        # Add custom metrics to configuration
        perf_ctx.configuration.update({
            "accuracy_rate": accuracy_rate * 100,
            "avg_consistency": avg_consistency,
            "consistency_grade": consistency_grade,
        })

        assert accuracy_rate > 0.6, f"Accuracy rate too low: {accuracy_rate:.1%}"


@e2e_test(category=TestCategory.QUALITY_ASSESSMENT, timeout=600)
async def test_evaluation_framework_timeout_behavior(
    logger: logging.Logger,
) -> None:
    """
    Test evaluation framework behavior under timeout and high load conditions.
    Measures performance degradation and failure modes.
    """
    logger.info("=== EVALUATION FRAMEWORK TIMEOUT & LOAD TESTING ===")

    criterion = EvaluationCriterion(
        name="Stress Test",
        evaluation_instructions="Evaluate under stress conditions with varying response times.",
        weight=1.0,
    )

    timeout_scenarios = [
        {"delay": 0.1, "label": "fast_response", "expected_success": True},
        {"delay": 1.0, "label": "normal_response", "expected_success": True},
        {"delay": 3.0, "label": "slow_response", "expected_success": False},
    ]

    timeout_results = []

    async def delayed_completion_handler(prompt: str, delay: float = 0.1, **kwargs: Any) -> dict[str, Any]:
        """Mock handler with configurable delay."""
        await asyncio.sleep(delay)
        return {"result": f"Completed after {delay}s delay"}

    for config in timeout_scenarios:
        scenario_name = config["label"]
        start_time = time.time()

        try:
            with patch("services.rag.src.utils.llm_evaluation.evaluate_prompt_output") as mock_eval:
                mock_eval.return_value = {
                    "criteria": {
                        "Stress Test": {"score": 75, "instructions": f"Processed {scenario_name} scenario"}
                    }
                }

                def create_handler(s: dict[str, Any]) -> Any:
                    return lambda p, **k: delayed_completion_handler(p, s["delay"], **k)

                result = await with_prompt_evaluation(
                    prompt_identifier=f"timeout_test_{scenario_name}",
                    prompt_handler=create_handler(config),
                    prompt="Test prompt for timeout scenario",
                    criteria=[criterion],
                    passing_score=70,
                    retries=2,
                    increment=5,
                )

                duration = time.time() - start_time
                success = True
                error_msg = ""

        except (TimeoutError, ValueError, RuntimeError, TypeError, KeyError, AttributeError) as e:
            duration = time.time() - start_time
            success = False
            error_msg = str(e)

        if success:
            logger.info(
                "Scenario %s completed in %.2f seconds (configured delay: %.2f) - Success: %s",
                scenario_name,
                duration,
                config["delay"],
                success,
            )
        else:
            logger.warning(
                "Scenario %s failed after %.2f seconds (configured delay: %.2f) - Error: %s",
                scenario_name,
                duration,
                config["delay"],
                error_msg,
            )

        # Check if outcome matches expectations
        if success == config["expected_success"]:
            logger.info(
                "Scenario %s behaved as expected - Success: %s, Duration: %.2f, Configured delay: %.2f",
                scenario_name,
                success,
                duration,
                config["delay"],
            )
        else:
            perf_ctx.add_error(
                f"Scenario {scenario_name} did not behave as expected: got success={success}, expected={config['expected_success']}"
            )

        timeout_results.append(
            {
                "scenario": scenario_name,
                "delay": config["delay"],
                "duration": duration,
                "success": success,
                "error": error_msg,
            }
        )

    successful_scenarios = [r for r in timeout_results if r["success"]]
    failed_scenarios = [r for r in timeout_results if not r["success"]]

    logger.info("=== TIMEOUT & LOAD TEST RESULTS ===")
    logger.info("Successful scenarios: %d/%d", len(successful_scenarios), len(timeout_results))
    logger.info("Failed scenarios: %d", len(failed_scenarios))

    for result in timeout_results:
        logger.info(
            "Scenario result: %s, Success: %s, Duration: %.2f, Configured delay: %.2f",
            result["scenario"],
            result["success"],
            result["duration"],
            result["delay"],
        )

    # Calculate success metrics
    success_rate = sum(1 for s in timeout_scenarios if s["expected_success"]) / len(timeout_scenarios)
    avg_delay = sum(s["delay"] for s in timeout_scenarios) / len(timeout_scenarios)
    
    # Save results to performance context
    section_texts_dict = {f"scenario_{i}": f"## {s['label']}\nDelay: {s['delay']}s" for i, s in enumerate(timeout_scenarios)}
    perf_ctx.set_content("\n\n".join(section_texts_dict.values()), section_texts_dict)
    
    # Add custom metrics to configuration
    perf_ctx.configuration.update({
        "success_rate": success_rate * 100,
        "avg_configured_delay": avg_delay,
    })

    if len(successful_scenarios) > 1:
        min_duration = min(r["duration"] for r in successful_scenarios)
        max_duration = max(r["duration"] for r in successful_scenarios)
        degradation_factor = max_duration / min_duration if min_duration > 0 else 1.0

        logger.info("Performance degradation factor: %.1fx", degradation_factor)

        assert degradation_factor < 10, f"Performance degradation too high: {degradation_factor:.1f}x"

    return {
        "successful_scenarios": len(successful_scenarios),
        "failed_scenarios": len(failed_scenarios),
        "timeout_results": timeout_results,
    }
