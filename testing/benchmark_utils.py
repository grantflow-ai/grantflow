"""
Benchmark Testing Utilities

This module extends the e2e testing framework for performance benchmarking.
It provides decorators and utilities specifically for benchmark tests.
"""

import functools
import os
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum
from typing import Any, cast

import pytest

from testing import RESULTS_FOLDER
from testing.e2e_utils import save_test_results


class BenchmarkCategory(str, Enum):
    """Categories for different types of benchmarks."""

    VECTOR = "vector"
    DATABASE = "database"
    API = "api"
    MEMORY = "memory"
    CONCURRENT = "concurrent"


@dataclass
class BenchmarkScenario:
    """Configuration for a benchmark scenario."""

    name: str
    description: str
    category: BenchmarkCategory
    timeout: int
    expected_duration: str
    warm_up_runs: int = 0
    iterations: int = 1


BENCHMARK_SCENARIOS = {
    BenchmarkCategory.VECTOR: BenchmarkScenario(
        name="vector",
        description="Vector database performance benchmarks",
        category=BenchmarkCategory.VECTOR,
        timeout=1200,
        expected_duration="5-20 minutes",
        warm_up_runs=0,
        iterations=1,
    ),
    BenchmarkCategory.DATABASE: BenchmarkScenario(
        name="database",
        description="Database query performance benchmarks",
        category=BenchmarkCategory.DATABASE,
        timeout=600,
        expected_duration="5-10 minutes",
    ),
    BenchmarkCategory.API: BenchmarkScenario(
        name="api",
        description="API endpoint performance benchmarks",
        category=BenchmarkCategory.API,
        timeout=300,
        expected_duration="2-5 minutes",
    ),
}


def benchmark[F: Callable[..., Any]](
    category: BenchmarkCategory = BenchmarkCategory.VECTOR,
    timeout: int | None = None,
    save_results: bool = True,
    warm_up: bool = False,
) -> Callable[[F], F]:
    """
    Decorator for benchmark tests.

    This extends the e2e_test pattern but adds benchmark-specific features:
    - Warm-up runs to stabilize performance
    - Multiple iterations for statistical significance
    - Performance metrics collection
    - Benchmark-specific result formatting

    Args:
        category: Type of benchmark (vector, database, api, etc.)
        timeout: Test timeout in seconds (uses scenario default if None)
        save_results: Whether to save benchmark results to disk
        warm_up: Whether to perform warm-up runs before measurement

    Example:
        @benchmark(category=BenchmarkCategory.VECTOR, timeout=300)
        async def test_vector_insertion_performance(logger):
            # Benchmark code here
            pass
    """

    def decorator(func: F) -> F:
        scenario = BENCHMARK_SCENARIOS.get(category, BENCHMARK_SCENARIOS[BenchmarkCategory.VECTOR])
        test_timeout = timeout or scenario.timeout

        @pytest.mark.skipif(
            not os.environ.get("BENCHMARK_TESTS"),
            reason="Benchmark tests are disabled. Set BENCHMARK_TESTS=1 to run benchmarks",
        )
        @pytest.mark.benchmark
        @pytest.mark.timeout(test_timeout)
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            logger = kwargs.get("logger")

            if logger:
                logger.info(
                    "🎯 Starting benchmark",
                    category=category.value,
                    function_name=func.__name__,
                    expected_duration=scenario.expected_duration,
                )

            if warm_up and scenario.warm_up_runs > 0:
                if logger:
                    logger.info("Performing warm-up runs", warm_up_runs=scenario.warm_up_runs)

                for i in range(scenario.warm_up_runs):
                    try:
                        await func(*args, **kwargs)
                    except Exception as e:
                        if logger:
                            logger.warning("Warm-up run failed", run_number=i + 1, error=str(e))

            iteration_times = []
            errors = []

            for iteration in range(scenario.iterations):
                start_time = time.time()

                try:
                    result = await func(*args, **kwargs)

                    end_time = time.time()
                    execution_time = end_time - start_time
                    iteration_times.append(execution_time)

                    if logger:
                        logger.info(
                            "Benchmark iteration completed",
                            iteration=iteration + 1,
                            total_iterations=scenario.iterations,
                            execution_time=execution_time,
                        )

                except Exception as e:
                    end_time = time.time()
                    execution_time = end_time - start_time
                    errors.append(
                        {
                            "iteration": iteration + 1,
                            "error": str(e),
                            "execution_time": execution_time,
                        }
                    )

                    if logger:
                        logger.error(
                            "Benchmark iteration failed - iteration %d, execution_time=%.3fs, error=%s",
                            iteration + 1,
                            execution_time,
                            str(e),
                        )

            if iteration_times:
                avg_time = sum(iteration_times) / len(iteration_times)
                min_time = min(iteration_times)
                max_time = max(iteration_times)

                variance = sum((t - avg_time) ** 2 for t in iteration_times) / len(iteration_times)
                std_dev = variance**0.5

                if save_results and logger:
                    benchmark_results = {
                        "test_name": func.__name__,
                        "benchmark_category": category.value,
                        "status": "completed" if not errors else "partial",
                        "performance": {
                            "iterations": scenario.iterations,
                            "successful_iterations": len(iteration_times),
                            "failed_iterations": len(errors),
                            "average_time": avg_time,
                            "min_time": min_time,
                            "max_time": max_time,
                            "std_deviation": std_dev,
                            "individual_times": iteration_times,
                            "timeout_utilization": avg_time / test_timeout,
                        },
                        "errors": errors,
                        "configuration": {
                            "warm_up_runs": scenario.warm_up_runs if warm_up else 0,
                            "timeout": test_timeout,
                            "category": category.value,
                        },
                        "timestamp": datetime.now(UTC).isoformat(),
                    }

                    output_path = (
                        RESULTS_FOLDER
                        / "benchmarks"
                        / category.value
                        / f"{func.__name__}_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.json"
                    )
                    save_test_results(benchmark_results, output_path)

                    logger.info(
                        "📊 Benchmark completed",
                        avg_time=avg_time,
                        min_time=min_time,
                        max_time=max_time,
                        std_dev=std_dev,
                    )

                    if errors:
                        logger.warning(
                            "⚠️ Some benchmark iterations failed",
                            failed_iterations=len(errors),
                            total_iterations=scenario.iterations,
                        )

            else:
                if logger:
                    logger.error("❌ All benchmark iterations failed")
                raise Exception(f"All {scenario.iterations} benchmark iterations failed")

            return result if "result" in locals() else None

        wrapper.__name__ = func.__name__
        wrapper.__doc__ = func.__doc__
        return cast("F", wrapper)

    return decorator


def benchmark_vector(timeout: int | None = None, **kwargs: Any) -> Callable[[Any], Any]:
    """Convenience decorator for vector benchmarks."""
    return benchmark(category=BenchmarkCategory.VECTOR, timeout=timeout, **kwargs)


def benchmark_database(timeout: int | None = None, **kwargs: Any) -> Callable[[Any], Any]:
    """Convenience decorator for database benchmarks."""
    return benchmark(category=BenchmarkCategory.DATABASE, timeout=timeout, **kwargs)


def benchmark_api(timeout: int | None = None, **kwargs: Any) -> Callable[[Any], Any]:
    """Convenience decorator for API benchmarks."""
    return benchmark(category=BenchmarkCategory.API, timeout=timeout, **kwargs)
