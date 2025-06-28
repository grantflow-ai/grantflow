import functools
import json
import logging
import math
import os
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum
from pathlib import Path
from typing import Any, cast

import pytest

from testing import RESULTS_FOLDER


class E2ETestCategory(str, Enum):
    SMOKE = "smoke"
    QUALITY_ASSESSMENT = "quality_assessment"
    E2E_FULL = "e2e_full"
    SEMANTIC_EVALUATION = "semantic_evaluation"
    AI_EVAL = "ai_eval"


@dataclass
class TestScenario:
    name: str
    description: str
    category: E2ETestCategory
    timeout: int
    expected_duration: str


TEST_SCENARIOS = {
    E2ETestCategory.SMOKE: TestScenario(
        name="smoke",
        description="Quick validation tests",
        category=E2ETestCategory.SMOKE,
        timeout=60,
        expected_duration="< 1 minute",
    ),
    E2ETestCategory.QUALITY_ASSESSMENT: TestScenario(
        name="quality_assessment",
        description="Quality validation tests",
        category=E2ETestCategory.QUALITY_ASSESSMENT,
        timeout=1800,
        expected_duration="2-30 minutes",
    ),
    E2ETestCategory.E2E_FULL: TestScenario(
        name="e2e_full",
        description="Complete end-to-end tests",
        category=E2ETestCategory.E2E_FULL,
        timeout=1800,
        expected_duration="10-30 minutes",
    ),
    E2ETestCategory.SEMANTIC_EVALUATION: TestScenario(
        name="semantic_evaluation",
        description="Semantic similarity evaluation tests",
        category=E2ETestCategory.SEMANTIC_EVALUATION,
        timeout=1800,
        expected_duration="5-30 minutes",
    ),
    E2ETestCategory.AI_EVAL: TestScenario(
        name="ai_eval",
        description="AI-powered evaluation tests",
        category=E2ETestCategory.AI_EVAL,
        timeout=1800,
        expected_duration="5-30 minutes",
    ),
}


def e2e_test[F: Callable[..., Any]](
    category: E2ETestCategory = E2ETestCategory.QUALITY_ASSESSMENT,
    timeout: int | None = None,
    save_results: bool = True,
) -> Callable[[F], F]:
    def decorator(func: F) -> F:
        scenario = TEST_SCENARIOS.get(category, TEST_SCENARIOS[E2ETestCategory.QUALITY_ASSESSMENT])
        test_timeout = timeout or scenario.timeout

        @pytest.mark.skipif(
            not os.environ.get("E2E_TESTS"),
            reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
        )
        @getattr(pytest.mark, category.value)  # type: ignore[misc]
        @pytest.mark.timeout(test_timeout)
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            start_time = time.time()
            logger = kwargs.get("logger")

            if logger:
                logger.info(
                    "Starting %s test: %s (expected: %s)",
                    category.value,
                    func.__name__,
                    scenario.expected_duration,
                )

            try:
                result = await func(*args, **kwargs)

                end_time = time.time()
                execution_time = end_time - start_time

                if save_results and logger:
                    evaluation_results = {
                        "test_name": func.__name__,
                        "test_category": category.value,
                        "status": "success",
                        "performance": {
                            "execution_time": execution_time,
                            "within_threshold": execution_time <= test_timeout,
                            "timeout_utilization": execution_time / test_timeout,
                        },
                        "timestamp": datetime.now(UTC).isoformat(),
                    }

                    output_path = (
                        RESULTS_FOLDER
                        / "e2e_performance"
                        / f"{func.__name__}_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.json"
                    )
                    save_test_results(evaluation_results, output_path)

                    logger.info(
                        "✅ Completed %s in %.2f seconds (%.1f%% of timeout used)",
                        func.__name__,
                        execution_time,
                        (execution_time / test_timeout) * 100,
                    )

                return result

            except Exception as e:
                end_time = time.time()
                execution_time = end_time - start_time

                if save_results and logger:
                    error_results = {
                        "test_name": func.__name__,
                        "test_category": category.value,
                        "status": "failed",
                        "error": {
                            "type": type(e).__name__,
                            "message": str(e),
                            "execution_time_before_failure": execution_time,
                        },
                        "performance": {
                            "execution_time": execution_time,
                            "timeout_reached": execution_time >= test_timeout * 0.95,
                            "timeout_utilization": execution_time / test_timeout,
                        },
                        "diagnostic_info": {
                            "timeout_configured": test_timeout,
                            "category": category.value,
                            "args_provided": len(args),
                            "kwargs_provided": list(kwargs.keys()),
                        },
                        "timestamp": datetime.now(UTC).isoformat(),
                    }

                    failure_path = (
                        RESULTS_FOLDER
                        / "e2e_failures"
                        / f"{func.__name__}_failure_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.json"
                    )
                    save_test_results(error_results, failure_path)

                    logger.error(
                        "❌ Test %s failed after %.2f seconds (%.1f%% of timeout): %s",
                        func.__name__,
                        execution_time,
                        (execution_time / test_timeout) * 100,
                        str(e),
                    )

                    logger.info(
                        "📊 Diagnostic info saved to: %s",
                        failure_path,
                    )

                raise

        wrapper.__name__ = func.__name__
        wrapper.__doc__ = func.__doc__
        return cast("F", wrapper)

    return decorator


def save_test_results(results: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with output_path.open("w") as f:
            json.dump(results, f, indent=2, default=str)
    except (OSError, ValueError):
        pass


def validate_test_result(
    result: Any,
    expected_type: type,
    min_length: int | None = None,
    required_fields: list[str] | None = None,
) -> None:
    assert isinstance(result, expected_type), f"Expected {expected_type}, got {type(result)}"

    if min_length is not None and hasattr(result, "__len__"):
        assert len(result) >= min_length, f"Result length {len(result)} is less than minimum {min_length}"

    if required_fields:
        for field in required_fields:
            if isinstance(result, dict):
                assert field in result, f"Required field '{field}' not found in result"
            else:
                assert hasattr(result, field), f"Required attribute '{field}' not found in result"


def create_test_output_path(test_name: str, category: str, file_suffix: str = "json") -> Path:
    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    output_dir = RESULTS_FOLDER / category / test_name
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"{test_name}_{timestamp}.{file_suffix}"


class E2ETestData:
    QUICK_TEST_SCENARIOS = ["scenario_1"]
    QUALITY_TEST_SCENARIOS = ["scenario_1", "scenario_2", "scenario_3"]
    FULL_TEST_SCENARIOS = ["scenario_1", "scenario_2", "scenario_3", "scenario_4", "scenario_5"]

    @classmethod
    def get_test_scenarios(cls, category: E2ETestCategory) -> list[str]:
        if category == E2ETestCategory.SMOKE:
            return cls.QUICK_TEST_SCENARIOS
        if category == E2ETestCategory.QUALITY_ASSESSMENT:
            return cls.QUALITY_TEST_SCENARIOS
        return cls.FULL_TEST_SCENARIOS


def track_performance(operation: str, start_time: float, threshold: float | None = None) -> dict[str, Any]:
    end_time = time.time()
    execution_time = end_time - start_time

    result = {
        "operation": operation,
        "execution_time": execution_time,
        "timestamp": datetime.now(UTC).isoformat(),
    }

    if threshold:
        result["threshold"] = threshold
        result["within_threshold"] = execution_time <= threshold

    return result


def validate_content_quality(
    content: str,
    min_length: int = 50,
    min_alpha_ratio: float = 0.3,
    required_keywords: list[str] | None = None,
) -> None:
    assert content.strip(), "Content should not be empty"
    assert len(content) >= min_length, f"Content too short: {len(content)} chars (min: {min_length})"

    alpha_chars = sum(1 for c in content if c.isalpha())
    alpha_ratio = alpha_chars / len(content) if content else 0
    assert alpha_ratio >= min_alpha_ratio, f"Low alphabetic ratio: {alpha_ratio:.2f} (min: {min_alpha_ratio})"

    if required_keywords:
        content_lower = content.lower()
        found_keywords = [kw for kw in required_keywords if kw in content_lower]
        assert len(found_keywords) >= len(required_keywords) // 2, (
            f"Too few required keywords found: {found_keywords} (required: {required_keywords})"
        )


def validate_embedding_quality(
    embeddings: list[float],
    expected_dimension: int = 384,
    min_norm: float = 0.1,
    max_norm: float = 3.0,
) -> None:
    assert len(embeddings) == expected_dimension, (
        f"Wrong embedding dimension: {len(embeddings)} (expected: {expected_dimension})"
    )

    norm = math.sqrt(sum(x**2 for x in embeddings))
    assert min_norm <= norm <= max_norm, f"Embedding norm out of range: {norm} (expected: {min_norm}-{max_norm})"


class ProgressReporter:
    """Progress reporter for long-running tests to provide important info even when failing."""

    def __init__(self, logger: logging.Logger, test_name: str, total_steps: int) -> None:
        self.logger = logger
        self.test_name = test_name
        self.total_steps = total_steps
        self.current_step = 0
        self.start_time = time.time()
        self.step_times: list[float] = []
        self.last_step_time = time.time()

    def report_step(self, step_name: str, details: dict[str, Any] | None = None) -> None:
        """Report progress of a test step."""
        self.current_step += 1
        current_time = time.time()
        elapsed = current_time - self.start_time

        if self.step_times:
            avg_step_time = sum(self.step_times) / len(self.step_times)
            remaining_steps = self.total_steps - self.current_step
            eta_seconds = remaining_steps * avg_step_time
            eta_minutes = eta_seconds / 60
            eta_info = f"ETA: {eta_minutes:.1f}m"
        else:
            eta_info = "ETA: calculating..."

        progress_pct = (self.current_step / self.total_steps) * 100

        self.logger.info(
            "🔄 [%s] Step %d/%d (%.1f%%) - %s | Elapsed: %.1fm | %s",
            self.test_name,
            self.current_step,
            self.total_steps,
            progress_pct,
            step_name,
            elapsed / 60,
            eta_info,
        )

        if details:
            for key, value in details.items():
                self.logger.info("   📋 %s: %s", key, value)

        if len(self.step_times) > 0:
            step_duration = current_time - self.last_step_time
            self.step_times.append(step_duration)

            if len(self.step_times) > 5:
                self.step_times.pop(0)

        self.last_step_time = current_time

    def report_final_status(self, success: bool, result_info: dict[str, Any] | None = None) -> None:
        """Report final test status with comprehensive info."""
        elapsed = time.time() - self.start_time
        status_emoji = "✅" if success else "❌"
        status_text = "SUCCESS" if success else "FAILURE"

        self.logger.info(
            "%s [%s] FINAL STATUS: %s | Total time: %.1fm | Steps completed: %d/%d",
            status_emoji,
            self.test_name,
            status_text,
            elapsed / 60,
            self.current_step,
            self.total_steps,
        )

        if result_info:
            self.logger.info("📊 Final Results:")
            for key, value in result_info.items():
                self.logger.info("   📈 %s: %s", key, value)


def create_heavy_test_context(
    test_name: str,
    logger: logging.Logger,
    total_steps: int,
    expected_timeout_minutes: int = 30,
) -> ProgressReporter:
    """Create a context for heavy integration tests with progress reporting."""
    logger.info(
        "🚀 Starting heavy integration test: %s | Expected steps: %d | Max timeout: %dm",
        test_name,
        total_steps,
        expected_timeout_minutes,
    )

    return ProgressReporter(logger, test_name, total_steps)
