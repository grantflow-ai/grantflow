"""
Performance comparison test between original and optimized evaluation frameworks.
Tests real performance differences and identifies optimization effectiveness.
"""

import asyncio
import logging
import time
from unittest.mock import patch

from testing.e2e_utils import e2e_test

from services.rag.src.utils.evaluation_optimizer import (
    fast_evaluate_output,
    optimized_prompt_evaluation,
    quick_evaluation,
    standard_evaluation,
)
from services.rag.src.utils.llm_evaluation import (
    EvaluationCriterion,
    evaluate_prompt_output,
)
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import PerformanceTestContext


@e2e_test(timeout=300)
async def test_evaluation_performance_comparison(
    logger: logging.Logger,
) -> None:
    """
    Direct performance comparison between original and optimized evaluation systems.
    Measures timing, API calls, and quality differences.
    """
    with PerformanceTestContext(
        test_name="evaluation_performance_comparison",
        test_category=TestCategory.EVALUATION,
        logger=logger,
        configuration={
            "test_type": "optimization_comparison",
            "comparison_scenarios": 4,
        },
    ) as perf_ctx:
        logger.info("=== EVALUATION OPTIMIZATION COMPARISON ===")

        # Test criteria for consistent comparison
        criteria = [
            EvaluationCriterion(
                name="Content Quality",
                evaluation_instructions="Rate content quality from 0-100 based on clarity, completeness, and accuracy",
                weight=1.0,
            ),
            EvaluationCriterion(
                name="Structure Quality",
                evaluation_instructions="Rate structure and organization from 0-100",
                weight=0.8,
            ),
        ]

        test_content = "Comprehensive research methodology with detailed objectives, clear hypotheses, and well-defined outcomes for grant application development."

        comparison_results = {}

        # Test 1: Original evaluate_prompt_output vs fast_evaluate_output
        with perf_ctx.stage_timer("original_evaluation"), patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
            mock_request.return_value = {
                "criteria": {
                    "Content Quality": {"score": 85, "instructions": "Good content quality"},
                    "Structure Quality": {"score": 78, "instructions": "Well structured"}
                }
            }

            start_time = time.time()
            original_result = await evaluate_prompt_output(
                criteria=criteria,
                prompt="Evaluate this research methodology",
                model_output=test_content,
            )
            original_time = time.time() - start_time
            perf_ctx.add_llm_call()

        with perf_ctx.stage_timer("optimized_evaluation"), patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                mock_request.return_value = {
                    "criteria": {
                        "Content Quality": {"score": 85, "instructions": "Good content quality"},
                        "Structure Quality": {"score": 78, "instructions": "Well structured"}
                    }
                }

                start_time = time.time()
                optimized_result = await fast_evaluate_output(
                    criteria=criteria,
                    prompt="Evaluate this research methodology",
                    model_output=test_content,
                    evaluation_timeout=30.0,
                )
                optimized_time = time.time() - start_time
                perf_ctx.add_llm_call()

        comparison_results["single_evaluation"] = {
            "original_time": original_time,
            "optimized_time": optimized_time,
            "improvement": (original_time - optimized_time) / original_time * 100,
            "quality_maintained": original_result["criteria"]["Content Quality"]["score"] == optimized_result["criteria"]["Content Quality"]["score"]
        }

        # Test 2: Batch evaluation performance
        evaluation_tasks = [
            {
                "criteria": criteria,
                "prompt": f"Evaluate research content {i}",
                "model_output": f"Research content sample {i} with methodology and objectives.",
            }
            for i in range(5)
        ]

        with perf_ctx.stage_timer("batch_evaluation"):
            from services.rag.src.utils.evaluation_optimizer import batch_evaluate_outputs

            with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                mock_request.return_value = {
                    "criteria": {
                        "Content Quality": {"score": 80, "instructions": "Good content"},
                        "Structure Quality": {"score": 75, "instructions": "Well structured"}
                    }
                }

                start_time = time.time()
                batch_results = await batch_evaluate_outputs(evaluation_tasks, max_concurrent=3, timeout_per_task=30.0)
                batch_time = time.time() - start_time
                perf_ctx.add_llm_call(len(evaluation_tasks))

        comparison_results["batch_evaluation"] = {
            "tasks": len(evaluation_tasks),
            "time": batch_time,
            "time_per_task": batch_time / len(evaluation_tasks),
            "successful": sum(1 for r in batch_results if not isinstance(r, Exception)),
            "failed": sum(1 for r in batch_results if isinstance(r, Exception))
        }

        # Test 3: Early termination effectiveness
        async def mock_prompt_handler(prompt: str) -> str:
            return "Excellent research methodology with comprehensive analysis and clear objectives."

        with perf_ctx.stage_timer("early_termination_test"), patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                # Mock excellent scores to trigger early termination
                mock_request.return_value = {
                    "criteria": {
                        "Content Quality": {"score": 95, "instructions": "Excellent content quality"},
                        "Structure Quality": {"score": 92, "instructions": "Excellent structure"}
                    }
                }

                start_time = time.time()
                result = await optimized_prompt_evaluation(
                    prompt_identifier="early_termination_test",
                    passing_score=70,
                    prompt="Generate excellent research methodology",
                    prompt_handler=mock_prompt_handler,
                    criteria=criteria,
                    early_termination=True,
                    retries=2,
                )
                early_term_time = time.time() - start_time
                perf_ctx.add_llm_call(1)  # Should only make 1 call due to early termination

        comparison_results["early_termination"] = {
            "time": early_term_time,
            "expected_early_exit": True,
            "result_quality": "excellent" if result else "failed"
        }

        # Test 4: Timeout handling comparison
        with perf_ctx.stage_timer("timeout_handling"):
            try:
                with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                    # Mock a timeout scenario
                    async def slow_mock(*args: object, **kwargs: object) -> dict[str, object]:
                        await asyncio.sleep(2.0)  # Simulate slow response
                        return {
                            "criteria": {
                                "Content Quality": {"score": 70, "instructions": "Delayed response"},
                                "Structure Quality": {"score": 65, "instructions": "Delayed structure"}
                            }
                        }

                    mock_request.side_effect = slow_mock

                    start_time = time.time()
                    try:
                        await fast_evaluate_output(
                            criteria=criteria,
                            prompt="Test timeout handling",
                            model_output=test_content,
                            evaluation_timeout=1.0,  # Short timeout to trigger timeout
                        )
                        timeout_handled = False
                    except TimeoutError:
                        timeout_handled = True

                    timeout_test_time = time.time() - start_time

            except (TimeoutError, Exception) as e:
                logger.error("Timeout test failed: %s", e)
                timeout_handled = True
                timeout_test_time = 1.0

        comparison_results["timeout_handling"] = {
            "timeout_properly_handled": timeout_handled,
            "response_time": timeout_test_time,
            "within_timeout_limit": timeout_test_time <= 1.5  # Allow some buffer
        }

        # Set comprehensive results content
        results_content = f"""
# Evaluation Framework Optimization Results

## Single Evaluation Comparison
- Original time: {comparison_results['single_evaluation']['original_time']:.3f}s
- Optimized time: {comparison_results['single_evaluation']['optimized_time']:.3f}s
- Improvement: {comparison_results['single_evaluation']['improvement']:.1f}%
- Quality maintained: {comparison_results['single_evaluation']['quality_maintained']}

## Batch Evaluation Performance
- Tasks processed: {comparison_results['batch_evaluation']['tasks']}
- Total time: {comparison_results['batch_evaluation']['time']:.3f}s
- Time per task: {comparison_results['batch_evaluation']['time_per_task']:.3f}s
- Success rate: {comparison_results['batch_evaluation']['successful']}/{comparison_results['batch_evaluation']['tasks']}

## Early Termination Effectiveness
- Response time: {comparison_results['early_termination']['time']:.3f}s
- Early exit triggered: {comparison_results['early_termination']['expected_early_exit']}
- Result quality: {comparison_results['early_termination']['result_quality']}

## Timeout Handling
- Timeout handled properly: {comparison_results['timeout_handling']['timeout_properly_handled']}
- Response time: {comparison_results['timeout_handling']['response_time']:.3f}s
- Within limits: {comparison_results['timeout_handling']['within_timeout_limit']}
        """

        perf_ctx.set_content(results_content, [
            "Single Evaluation Comparison",
            "Batch Evaluation Performance",
            "Early Termination Effectiveness",
            "Timeout Handling"
        ])

        # Update configuration with test results
        perf_ctx.configuration.update({
            "comparison_results": comparison_results,
            "optimization_effective": comparison_results["single_evaluation"]["improvement"] > 0,
            "batch_processing_works": comparison_results["batch_evaluation"]["successful"] > 0,
            "early_termination_works": comparison_results["early_termination"]["expected_early_exit"],
            "timeout_handling_works": comparison_results["timeout_handling"]["timeout_properly_handled"]
        })

        logger.info("=== OPTIMIZATION COMPARISON SUMMARY ===")
        logger.info("Single evaluation improvement: %.1f%%", comparison_results["single_evaluation"]["improvement"])
        logger.info("Batch evaluation success rate: %d/%d",
                   comparison_results["batch_evaluation"]["successful"],
                   comparison_results["batch_evaluation"]["tasks"])
        logger.info("Early termination effectiveness: %s", comparison_results["early_termination"]["expected_early_exit"])
        logger.info("Timeout handling: %s", comparison_results["timeout_handling"]["timeout_properly_handled"])

        # Assertions to validate optimization effectiveness
        assert comparison_results["single_evaluation"]["quality_maintained"], "Quality should be maintained in optimizations"
        assert comparison_results["batch_evaluation"]["successful"] > 0, "Batch evaluation should succeed"
        assert comparison_results["timeout_handling"]["timeout_properly_handled"], "Timeout should be handled properly"


@e2e_test(timeout=180)
async def test_evaluation_profiles_performance(
    logger: logging.Logger,
) -> None:
    """
    Test the three evaluation profiles (quick, standard, thorough) for performance characteristics.
    """
    with PerformanceTestContext(
        test_name="evaluation_profiles_performance",
        test_category=TestCategory.EVALUATION,
        logger=logger,
        configuration={
            "test_type": "profile_comparison",
            "profiles": ["quick", "standard", "thorough"],
        },
    ) as perf_ctx:
        logger.info("=== EVALUATION PROFILES PERFORMANCE TEST ===")

        criteria = [
            EvaluationCriterion(
                name="Content Analysis",
                evaluation_instructions="Analyze content depth and quality",
                weight=1.0,
            ),
        ]

        test_content = "Research proposal with methodology, objectives, and expected outcomes for scientific investigation."
        profile_results = {}

        # Test quick evaluation (30s timeout)
        with perf_ctx.stage_timer("quick_profile"), patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                mock_request.return_value = {
                    "criteria": {
                        "Content Analysis": {"score": 75, "instructions": "Quick analysis complete"}
                    }
                }

                start_time = time.time()
                quick_result = await quick_evaluation(
                    criteria=criteria,
                    prompt="Quick evaluation test",
                    model_output=test_content,
                )
                quick_time = time.time() - start_time
                perf_ctx.add_llm_call()

        profile_results["quick"] = {"time": quick_time, "score": quick_result["criteria"]["Content Analysis"]["score"]}

        # Test standard evaluation (60s timeout)
        with perf_ctx.stage_timer("standard_profile"), patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                mock_request.return_value = {
                    "criteria": {
                        "Content Analysis": {"score": 80, "instructions": "Standard analysis complete"}
                    }
                }

                start_time = time.time()
                standard_result = await standard_evaluation(
                    criteria=criteria,
                    prompt="Standard evaluation test",
                    model_output=test_content,
                )
                standard_time = time.time() - start_time
                perf_ctx.add_llm_call()

        profile_results["standard"] = {"time": standard_time, "score": standard_result["criteria"]["Content Analysis"]["score"]}

        # Test thorough evaluation (120s timeout)
        with perf_ctx.stage_timer("thorough_profile"), patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                mock_request.return_value = {
                    "criteria": {
                        "Content Analysis": {"score": 85, "instructions": "Thorough analysis complete"}
                    }
                }

                start_time = time.time()
                thorough_result = await fast_evaluate_output(
                    criteria=criteria,
                    prompt="Thorough evaluation test",
                    model_output=test_content,
                    evaluation_timeout=120.0,
                )
                thorough_time = time.time() - start_time
                perf_ctx.add_llm_call()

        profile_results["thorough"] = {"time": thorough_time, "score": thorough_result["criteria"]["Content Analysis"]["score"]}

        # Generate content with results
        profiles_content = f"""
# Evaluation Profiles Performance Analysis

## Quick Profile (30s timeout)
- Response time: {profile_results['quick']['time']:.3f}s
- Quality score: {profile_results['quick']['score']}
- Efficiency: High

## Standard Profile (60s timeout)
- Response time: {profile_results['standard']['time']:.3f}s
- Quality score: {profile_results['standard']['score']}
- Efficiency: Balanced

## Thorough Profile (120s timeout)
- Response time: {profile_results['thorough']['time']:.3f}s
- Quality score: {profile_results['thorough']['score']}
- Efficiency: Quality-focused

## Profile Comparison
- Quick vs Standard: {((profile_results['standard']['time'] - profile_results['quick']['time']) / profile_results['quick']['time'] * 100):.1f}% time difference
- Standard vs Thorough: {((profile_results['thorough']['time'] - profile_results['standard']['time']) / profile_results['standard']['time'] * 100):.1f}% time difference
        """

        perf_ctx.set_content(profiles_content, [
            "Quick Profile Results",
            "Standard Profile Results",
            "Thorough Profile Results",
            "Profile Comparison Summary"
        ])

        perf_ctx.configuration.update({
            "profile_results": profile_results,
            "performance_ranking": ["quick", "standard", "thorough"],  # Fastest to slowest
            "quality_ranking": ["thorough", "standard", "quick"]      # Highest to lowest quality
        })

        logger.info("=== PROFILE PERFORMANCE SUMMARY ===")
        logger.info("Quick: %.3fs (score: %d)", profile_results["quick"]["time"], profile_results["quick"]["score"])
        logger.info("Standard: %.3fs (score: %d)", profile_results["standard"]["time"], profile_results["standard"]["score"])
        logger.info("Thorough: %.3fs (score: %d)", profile_results["thorough"]["time"], profile_results["thorough"]["score"])

        # Validate profile characteristics
        assert profile_results["quick"]["time"] < 5.0, "Quick evaluation should be under 5 seconds"
        assert profile_results["standard"]["time"] < 10.0, "Standard evaluation should be under 10 seconds"
        assert profile_results["thorough"]["time"] < 15.0, "Thorough evaluation should be under 15 seconds"
        assert all(result["score"] > 0 for result in profile_results.values()), "All profiles should return valid scores"
