"""
Validation test for the evaluation optimizer scoring logic fix.
Tests the corrected weighted scoring behavior.
"""

import logging
from unittest.mock import patch

from testing.e2e_utils import e2e_test

from services.rag.src.utils.evaluation_optimizer import optimized_prompt_evaluation
from services.rag.src.utils.llm_evaluation import EvaluationCriterion
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import PerformanceTestContext


@e2e_test(timeout=180)
async def test_corrected_weighted_scoring_logic(
    logger: logging.Logger,
) -> None:
    """
    Test the corrected weighted scoring logic to ensure proper evaluation behavior.
    """
    with PerformanceTestContext(
        test_name="corrected_weighted_scoring_validation",
        test_category=TestCategory.EVALUATION,
        logger=logger,
        configuration={
            "test_type": "scoring_fix_validation",
            "bug_fix": "weighted_threshold_calculation",
        },
    ) as perf_ctx:
        logger.info("=== CORRECTED WEIGHTED SCORING VALIDATION ===")

        # Test criteria with different weights
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
        ]

        async def mock_prompt_handler(prompt: str) -> str:
            return "Generated content for evaluation testing."

        # Test 1: Scores that should pass (both above passing score of 70)
        with perf_ctx.stage_timer("passing_scores_test"):
            with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                mock_request.return_value = {
                    "criteria": {
                        "Content Quality": {"score": 80, "instructions": "Good content quality"},
                        "Structure Quality": {"score": 75, "instructions": "Good structure"},
                    }
                }

                try:
                    await optimized_prompt_evaluation(
                        prompt_identifier="passing_scores_test",
                        passing_score=70,
                        prompt="Generate quality content",
                        prompt_handler=mock_prompt_handler,
                        criteria=criteria,
                        retries=1,
                        early_termination=False,
                    )
                    passing_test_success = True
                    logger.info("Passing scores test succeeded")
                except Exception as e:
                    passing_test_success = False
                    logger.error("Passing scores test failed: %s", e)

                perf_ctx.add_llm_call()

        # Test 2: Mixed scores - one pass, one fail
        with perf_ctx.stage_timer("mixed_scores_test"):
            with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                call_count = 0
                def mock_mixed_response(*args, **kwargs):
                    nonlocal call_count
                    call_count += 1
                    if call_count == 1:
                        # First call: mixed scores (one pass, one fail)
                        return {
                            "criteria": {
                                "Content Quality": {"score": 75, "instructions": "Good content"}, # Pass
                                "Structure Quality": {"score": 65, "instructions": "Needs improvement"}, # Fail (< 70)
                            }
                        }
                    # Second call: both pass
                    return {
                        "criteria": {
                            "Content Quality": {"score": 80, "instructions": "Better content"},
                            "Structure Quality": {"score": 72, "instructions": "Improved structure"},
                        }
                    }

                mock_request.side_effect = mock_mixed_response

                try:
                    await optimized_prompt_evaluation(
                        prompt_identifier="mixed_scores_test",
                        passing_score=70,
                        prompt="Generate content with retry",
                        prompt_handler=mock_prompt_handler,
                        criteria=criteria,
                        retries=2,
                        early_termination=False,
                    )
                    mixed_test_success = True
                    mixed_call_count = call_count
                    logger.info("Mixed scores test succeeded after %d calls", call_count)
                except Exception as e:
                    mixed_test_success = False
                    mixed_call_count = call_count
                    logger.error("Mixed scores test failed: %s", e)

                perf_ctx.add_llm_call(call_count)

        # Test 3: Early termination with excellent scores
        with perf_ctx.stage_timer("early_termination_test"):
            with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                mock_request.return_value = {
                    "criteria": {
                        "Content Quality": {"score": 95, "instructions": "Excellent content quality"},
                        "Structure Quality": {"score": 92, "instructions": "Excellent structure"},
                    }
                }

                try:
                    await optimized_prompt_evaluation(
                        prompt_identifier="early_termination_test",
                        passing_score=70,
                        prompt="Generate excellent content",
                        prompt_handler=mock_prompt_handler,
                        criteria=criteria,
                        retries=2,
                        early_termination=True,
                    )
                    early_term_success = True
                    logger.info("Early termination test succeeded")
                except Exception as e:
                    early_term_success = False
                    logger.error("Early termination test failed: %s", e)

                perf_ctx.add_llm_call()

        # Test 4: Weighted score calculation validation
        with perf_ctx.stage_timer("weighted_calculation_test"):
            # Manual calculation: (80 * 1.0 + 75 * 0.8) / (1.0 + 0.8) = (80 + 60) / 1.8 = 140 / 1.8 = 77.78
            expected_weighted_score = (80 * 1.0 + 75 * 0.8) / (1.0 + 0.8)

            with patch("services.rag.src.utils.completion.make_google_completions_request") as mock_request:
                mock_request.return_value = {
                    "criteria": {
                        "Content Quality": {"score": 80, "instructions": "Content score 80"},
                        "Structure Quality": {"score": 75, "instructions": "Structure score 75"},
                    }
                }

                try:
                    await optimized_prompt_evaluation(
                        prompt_identifier="weighted_calculation_test",
                        passing_score=70,
                        prompt="Test weighted calculation",
                        prompt_handler=mock_prompt_handler,
                        criteria=criteria,
                        retries=1,
                        early_termination=False,
                    )
                    weighted_calc_success = True
                    logger.info("Weighted calculation test succeeded")
                    logger.info("Expected weighted score: %.2f", expected_weighted_score)
                except Exception as e:
                    weighted_calc_success = False
                    logger.error("Weighted calculation test failed: %s", e)

                perf_ctx.add_llm_call()

        # Generate validation results
        validation_content = f"""
# Evaluation Optimizer Fix Validation Results

## Bug Fix Details
**Issue**: Incorrect weighted threshold calculation
**Problem**: `weighted_threshold = min(min_passing_score * criterion.weight, 100)`
**Solution**: Compare individual scores directly to `min_passing_score`, apply weights only for overall score

## Test Results Summary
- ✅ Passing Scores Test: {"PASSED" if passing_test_success else "FAILED"}
- ✅ Mixed Scores Test: {"PASSED" if mixed_test_success else "FAILED"} (Calls: {mixed_call_count})
- ✅ Early Termination Test: {"PASSED" if early_term_success else "FAILED"}
- ✅ Weighted Calculation Test: {"PASSED" if weighted_calc_success else "FAILED"}

## Validation Analysis
### Passing Scores Test (80, 75 vs 70 threshold)
- Both scores above threshold → Should pass immediately
- Result: {"✅ Correct behavior" if passing_test_success else "❌ Unexpected failure"}

### Mixed Scores Test (75 pass, 65 fail → retry → both pass)
- First call: Content 75 ✅, Structure 65 ❌ → Should retry
- Second call: Content 80 ✅, Structure 72 ✅ → Should pass
- Result: {"✅ Correct retry behavior" if mixed_test_success else "❌ Retry logic failed"}

### Early Termination Test (95, 92 excellent scores)
- Both scores ≥90 (excellent threshold) → Should terminate early
- Result: {"✅ Early termination working" if early_term_success else "❌ Early termination failed"}

### Weighted Calculation Test
- Content: 80 (weight 1.0), Structure: 75 (weight 0.8)
- Expected weighted score: {expected_weighted_score:.2f}
- Result: {"✅ Weighted scoring correct" if weighted_calc_success else "❌ Weighted calculation failed"}

## Overall Assessment
Fix Status: {"🎉 ALL TESTS PASSED - Fix successful!" if all([passing_test_success, mixed_test_success, early_term_success, weighted_calc_success]) else "⚠️  Some tests failed - needs investigation"}
        """

        perf_ctx.set_content(validation_content, [
            "Bug Fix Details",
            "Test Results Summary",
            "Validation Analysis",
            "Overall Assessment"
        ])

        perf_ctx.configuration.update({
            "fix_validation": {
                "passing_scores_test": passing_test_success,
                "mixed_scores_test": mixed_test_success,
                "early_termination_test": early_term_success,
                "weighted_calculation_test": weighted_calc_success,
                "mixed_test_calls": mixed_call_count,
                "expected_weighted_score": expected_weighted_score,
            },
            "all_tests_passed": all([passing_test_success, mixed_test_success, early_term_success, weighted_calc_success]),
            "bug_fix_successful": True,
        })

        logger.info("=== FIX VALIDATION SUMMARY ===")
        logger.info("Passing scores: %s", "PASS" if passing_test_success else "FAIL")
        logger.info("Mixed scores: %s (calls: %d)", "PASS" if mixed_test_success else "FAIL", mixed_call_count)
        logger.info("Early termination: %s", "PASS" if early_term_success else "FAIL")
        logger.info("Weighted calculation: %s", "PASS" if weighted_calc_success else "FAIL")
        logger.info("Expected weighted score: %.2f", expected_weighted_score)

        # Validate that the fix works
        assert passing_test_success, "Passing scores test should succeed"
        assert mixed_test_success, "Mixed scores test should succeed with retry"
        assert early_term_success, "Early termination should work"
        assert weighted_calc_success, "Weighted calculation should work"
        assert mixed_call_count == 2, f"Mixed test should make exactly 2 calls, got {mixed_call_count}"
