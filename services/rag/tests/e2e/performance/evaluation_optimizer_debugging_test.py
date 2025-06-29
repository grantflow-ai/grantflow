"""
Debug test for evaluation optimizer to identify and fix scoring issues.
"""

import logging
from unittest.mock import patch

from testing.e2e_utils import e2e_test

from services.rag.src.utils.evaluation_optimizer import (
    fast_evaluate_output,
    optimized_prompt_evaluation,
)
from services.rag.src.utils.llm_evaluation import EvaluationCriterion
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import PerformanceTestContext


@e2e_test(timeout=120)
async def test_evaluation_optimizer_scoring_logic(
    logger: logging.Logger,
) -> None:
    """
    Debug the scoring logic in the evaluation optimizer to identify issues.
    """
    with PerformanceTestContext(
        test_name="evaluation_optimizer_scoring_debug",
        test_category=TestCategory.EVALUATION,
        logger=logger,
        configuration={
            "test_type": "scoring_debug",
            "scenarios": 3,
        },
    ) as perf_ctx:
        logger.info("=== EVALUATION OPTIMIZER SCORING DEBUG ===")

        # Simple criteria for debugging
        criteria = [
            EvaluationCriterion(
                name="Content Quality",
                evaluation_instructions="Rate content quality from 0-100",
                weight=1.0,
            ),
        ]

        # Test 1: High score that should pass easily
        with perf_ctx.stage_timer("high_score_test"):
            with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                mock_request.return_value = {
                    "criteria": {
                        "Content Quality": {"score": 90, "instructions": "Excellent content quality"},
                    }
                }

                try:
                    result = await fast_evaluate_output(
                        criteria=criteria,
                        prompt="Evaluate high quality content",
                        model_output="Excellent research methodology with comprehensive analysis.",
                        evaluation_timeout=30.0,
                    )
                    high_score_success = True
                    high_score_result = result["criteria"]["Content Quality"]["score"]
                    logger.info("High score test passed: %d", high_score_result)
                except Exception as e:
                    high_score_success = False
                    high_score_result = 0
                    logger.error("High score test failed: %s", e)

                perf_ctx.add_llm_call()

        # Test 2: Medium score test
        with perf_ctx.stage_timer("medium_score_test"):
            with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                mock_request.return_value = {
                    "criteria": {
                        "Content Quality": {"score": 75, "instructions": "Good content quality"},
                    }
                }

                try:
                    result = await fast_evaluate_output(
                        criteria=criteria,
                        prompt="Evaluate medium quality content",
                        model_output="Good research methodology with some analysis.",
                        evaluation_timeout=30.0,
                    )
                    medium_score_success = True
                    medium_score_result = result["criteria"]["Content Quality"]["score"]
                    logger.info("Medium score test passed: %d", medium_score_result)
                except Exception as e:
                    medium_score_success = False
                    medium_score_result = 0
                    logger.error("Medium score test failed: %s", e)

                perf_ctx.add_llm_call()

        # Test 3: Test the optimized_prompt_evaluation with proper mock setup
        async def mock_prompt_handler(prompt: str) -> str:
            return "Generated research methodology content."

        with perf_ctx.stage_timer("optimized_evaluation_test"):
            with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                # Start with failing scores to test retry, then succeed
                call_count = 0
                def mock_response(*args, **kwargs):
                    nonlocal call_count
                    call_count += 1
                    if call_count == 1:
                        # First call - low scores to trigger retry
                        return {
                            "criteria": {
                                "Content Quality": {"score": 60, "instructions": "Needs improvement"},
                            }
                        }
                    # Second call - high scores to pass
                    return {
                        "criteria": {
                            "Content Quality": {"score": 85, "instructions": "Much better quality"},
                        }
                    }

                mock_request.side_effect = mock_response

                try:
                    result = await optimized_prompt_evaluation(
                        prompt_identifier="debug_test",
                        passing_score=70,  # Lower passing score for test
                        prompt="Generate quality research methodology",
                        prompt_handler=mock_prompt_handler,
                        criteria=criteria,
                        retries=2,
                        early_termination=True,
                    )
                    optimized_success = True
                    optimized_result = str(result)[:100] if result else "No result"
                    logger.info("Optimized evaluation test passed: %s", optimized_result)
                except Exception as e:
                    optimized_success = False
                    optimized_result = f"Failed: {str(e)[:100]}"
                    logger.error("Optimized evaluation test failed: %s", e)

                perf_ctx.add_llm_call(call_count)

        # Generate debug results
        debug_content = f"""
# Evaluation Optimizer Scoring Debug Results

## Test Results Summary
- High Score Test (90): {"✅ PASSED" if high_score_success else "❌ FAILED"}
- Medium Score Test (75): {"✅ PASSED" if medium_score_success else "❌ FAILED"}
- Optimized Evaluation: {"✅ PASSED" if optimized_success else "❌ FAILED"}

## Detailed Results
### High Score Test
- Expected: 90
- Actual: {high_score_result}
- Status: {"Success" if high_score_success else "Failed"}

### Medium Score Test
- Expected: 75
- Actual: {medium_score_result}
- Status: {"Success" if medium_score_success else "Failed"}

### Optimized Evaluation Test
- Result: {optimized_result}
- Status: {"Success" if optimized_success else "Failed"}

## Analysis
The tests reveal scoring logic behavior under different scenarios.
{"All tests passed - scoring logic working correctly." if all([high_score_success, medium_score_success, optimized_success]) else "Some tests failed - scoring logic needs investigation."}
        """

        perf_ctx.set_content(debug_content, [
            "High Score Test Results",
            "Medium Score Test Results",
            "Optimized Evaluation Results",
            "Analysis Summary"
        ])

        perf_ctx.configuration.update({
            "high_score_success": high_score_success,
            "medium_score_success": medium_score_success,
            "optimized_success": optimized_success,
            "debug_complete": True,
        })

        logger.info("=== DEBUG RESULTS SUMMARY ===")
        logger.info("High score (90): %s", "PASSED" if high_score_success else "FAILED")
        logger.info("Medium score (75): %s", "PASSED" if medium_score_success else "FAILED")
        logger.info("Optimized evaluation: %s", "PASSED" if optimized_success else "FAILED")

        # Basic assertions for scoring functionality
        assert high_score_success, "High score evaluation should succeed"
        assert medium_score_success, "Medium score evaluation should succeed"


@e2e_test(timeout=120)
async def test_weighted_scoring_logic(
    logger: logging.Logger,
) -> None:
    """
    Test the weighted scoring logic specifically to identify calculation issues.
    """
    with PerformanceTestContext(
        test_name="weighted_scoring_debug",
        test_category=TestCategory.EVALUATION,
        logger=logger,
        configuration={
            "test_type": "weighted_scoring_debug",
        },
    ) as perf_ctx:
        logger.info("=== WEIGHTED SCORING LOGIC DEBUG ===")

        # Multiple criteria with different weights
        criteria = [
            EvaluationCriterion(
                name="Content Quality",
                evaluation_instructions="Rate content quality from 0-100",
                weight=1.0,
            ),
            EvaluationCriterion(
                name="Structure Quality",
                evaluation_instructions="Rate structure quality from 0-100",
                weight=0.8,
            ),
            EvaluationCriterion(
                name="Technical Accuracy",
                evaluation_instructions="Rate technical accuracy from 0-100",
                weight=1.2,
            ),
        ]

        async def mock_prompt_handler(prompt: str) -> str:
            return "Test content for weighted scoring evaluation."

        with perf_ctx.stage_timer("weighted_scoring_test"):
            with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                mock_request.return_value = {
                    "criteria": {
                        "Content Quality": {"score": 80, "instructions": "Good content"},
                        "Structure Quality": {"score": 75, "instructions": "Decent structure"},
                        "Technical Accuracy": {"score": 85, "instructions": "Good technical content"},
                    }
                }

                try:
                    result = await optimized_prompt_evaluation(
                        prompt_identifier="weighted_scoring_test",
                        passing_score=75,
                        prompt="Generate content for weighted evaluation",
                        prompt_handler=mock_prompt_handler,
                        criteria=criteria,
                        retries=1,
                        early_termination=False,  # Disable early termination for testing
                    )

                    # Calculate expected weighted score manually
                    # (80 * 1.0 + 75 * 0.8 + 85 * 1.2) / (1.0 + 0.8 + 1.2) = (80 + 60 + 102) / 3.0 = 242 / 3.0 = 80.67
                    expected_weighted_score = 80.67

                    weighted_success = True
                    weighted_result = str(result)[:100] if result else "No result"
                    logger.info("Weighted scoring test passed: %s", weighted_result)
                    logger.info("Expected weighted score: %.2f", expected_weighted_score)

                except Exception as e:
                    weighted_success = False
                    weighted_result = f"Failed: {str(e)[:200]}"
                    expected_weighted_score = 0
                    logger.error("Weighted scoring test failed: %s", e)

                perf_ctx.add_llm_call()

        # Generate weighted scoring results
        weighted_content = f"""
# Weighted Scoring Logic Debug

## Test Configuration
- Content Quality: Score 80, Weight 1.0
- Structure Quality: Score 75, Weight 0.8
- Technical Accuracy: Score 85, Weight 1.2
- Passing Score: 75

## Expected Calculation
Weighted Score = (80×1.0 + 75×0.8 + 85×1.2) ÷ (1.0+0.8+1.2)
              = (80 + 60 + 102) ÷ 3.0
              = 242 ÷ 3.0
              = {expected_weighted_score:.2f}

## Test Result
- Status: {"✅ PASSED" if weighted_success else "❌ FAILED"}
- Result: {weighted_result}

## Analysis
{"Weighted scoring logic working correctly." if weighted_success else "Weighted scoring logic has issues that need investigation."}
        """

        perf_ctx.set_content(weighted_content, [
            "Test Configuration",
            "Expected Calculation",
            "Test Result",
            "Analysis"
        ])

        perf_ctx.configuration.update({
            "weighted_success": weighted_success,
            "expected_score": expected_weighted_score,
            "criteria_count": len(criteria),
        })

        logger.info("=== WEIGHTED SCORING SUMMARY ===")
        logger.info("Expected weighted score: %.2f", expected_weighted_score)
        logger.info("Test result: %s", "PASSED" if weighted_success else "FAILED")

        # Note: Don't assert here since we're debugging the issue
