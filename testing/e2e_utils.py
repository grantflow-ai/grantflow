import functools
import json
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
        timeout=180,
        expected_duration="2-5 minutes",
    ),
    E2ETestCategory.E2E_FULL: TestScenario(
        name="e2e_full",
        description="Complete end-to-end tests",
        category=E2ETestCategory.E2E_FULL,
        timeout=600,
        expected_duration="10+ minutes",
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
                        "performance": {
                            "execution_time": execution_time,
                            "within_threshold": execution_time <= test_timeout,
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
                        "Completed %s in %.2f seconds (%.1fx under timeout)",
                        func.__name__,
                        execution_time,
                        test_timeout / execution_time,
                    )

                return result

            except Exception as e:
                if logger:
                    logger.error("Test %s failed: %s", func.__name__, str(e))
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
