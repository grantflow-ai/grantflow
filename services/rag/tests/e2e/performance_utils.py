"""
Performance measurement utilities for RAG E2E tests.

Provides convenient decorators, context managers, and helper functions
to easily integrate the unified performance framework into existing tests.
"""

import contextlib
import logging
from collections.abc import Callable
from datetime import datetime
from functools import wraps
from pathlib import Path
from typing import Any, TypeVar
from uuid import uuid4

from .performance_framework import (
    PerformanceAnalyzer,
    PerformanceResult,
    PerformanceResultManager,
    TestCategory,
)

F = TypeVar("F", bound=Callable[..., Any])


RESULTS_BASE_PATH = Path("testing/test_data/results/unified_performance")
result_manager = PerformanceResultManager(RESULTS_BASE_PATH)


class StageTimer:
    """Context manager for timing individual pipeline stages."""

    def __init__(self, stage_name: str, stage_times: dict[str, float]) -> None:
        self.stage_name = stage_name
        self.stage_times = stage_times
        self.start_time: datetime | None = None

    def __enter__(self):
        self.start_time = datetime.now()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = (datetime.now() - self.start_time).total_seconds()
            self.stage_times[self.stage_name] = duration


class PerformanceTestContext:
    """Context manager for comprehensive performance testing."""

    def __init__(
        self,
        test_name: str,
        test_category: TestCategory,
        test_id: str | None = None,
        configuration: dict[str, Any] | None = None,
        baseline_test_name: str | None = None,
        expected_patterns: list[str] | None = None,
        logger: logging.Logger | None = None
    ) -> None:
        self.test_name = test_name
        self.test_category = test_category
        self.test_id = test_id or str(uuid4())
        self.configuration = configuration or {}
        self.baseline_test_name = baseline_test_name
        self.expected_patterns = expected_patterns or []
        self.logger = logger or logging.getLogger(__name__)


        self.analyzer = PerformanceAnalyzer(test_category)
        self.start_time: datetime | None = None
        self.stage_times: dict[str, float] = {}
        self.errors: list[str] = []
        self.warnings: list[str] = []


        self.generated_content: str = ""
        self.section_texts: list[str] = []
        self.llm_calls_made: int = 0


        self.result: PerformanceResult | None = None

    def __enter__(self):
        self.start_time = datetime.now()
        self.logger.info("Starting performance test: %s", self.test_name)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.logger.info("Entering __exit__ method - exc_type: %s", exc_type)
        if not self.start_time:
            self.logger.error("No start_time - returning early")
            return

        total_time = (datetime.now() - self.start_time).total_seconds()
        self.logger.info("Total time calculated: %.2fs", total_time)


        if exc_type:
            error_msg = f"{exc_type.__name__}: {exc_val}"
            self.errors.append(error_msg)
            self.logger.error("Test failed with error: %s", error_msg)


        baseline_time = None
        if self.baseline_test_name:
            baseline_time = result_manager.get_baseline_time(self.baseline_test_name)


        try:
            self.result = self.analyzer.create_performance_result(
                test_name=self.test_name,
                test_id=self.test_id,
                total_time=total_time,
                stage_times=self.stage_times,
                content=self.generated_content or "",
                section_texts=self.section_texts,
                configuration=self.configuration,
                baseline_time=baseline_time,
                current_llm_calls=self.llm_calls_made,
                expected_patterns=self.expected_patterns,
                errors=self.errors,
                warnings=self.warnings
            )
        except Exception as result_error:
            self.logger.error("Failed to create performance result: %s", result_error)

            from .performance_framework import PerformanceGrade, PerformanceResult, QualityMetrics
            self.logger.info("Creating fallback result")
            self.result = PerformanceResult(
                test_name=self.test_name,
                test_category=self.test_category,
                timestamp=datetime.now().isoformat(),
                test_id=self.test_id,
                configuration=self.configuration or {},
                total_duration_seconds=total_time,
                total_duration_minutes=total_time / 60,
                stage_metrics=[],
                performance_grade=PerformanceGrade.F,
                performance_score=0.0,
                meets_targets=False,
                bottleneck_stages=[],
                quality_metrics=QualityMetrics(
                    total_characters=0,
                    total_words=0,
                    total_lines=0,
                    section_count=0,
                    avg_chars_per_section=0.0,
                    has_objectives=False,
                    has_work_plan=False,
                    has_methodology=False,
                    has_timeline=False,
                    objective_count=0,
                    task_count=0,
                    key_terms_found=[],
                    content_richness_score=0.0,
                    structure_quality_score=0.0,
                    completeness_score=0.0,
                    overall_quality_score=0.0,
                    meets_min_length=False,
                    meets_min_sections=False,
                    meets_content_requirements=False
                ),
                optimization_metrics=None,
                environment_info={"test_framework": "unified_performance"},
                errors_encountered=[*self.errors, f"Result creation failed: {result_error}"],
                warnings_encountered=self.warnings
            )


        try:
            subfolder = self.test_category.value
            saved_path = result_manager.save_result(self.result, subfolder)
            self.logger.info("Performance result saved to: %s", saved_path)
        except Exception as e:
            self.logger.error("Failed to save performance result: %s", e)


        self.logger.info("Result created successfully, performance_grade: %s",
                        self.result.performance_grade if self.result else "None")
        self._log_performance_summary()

    def stage_timer(self, stage_name: str) -> StageTimer:
        """Get a timer for a specific pipeline stage."""
        return StageTimer(stage_name, self.stage_times)

    def set_content(self, content: str, section_texts: list[str] | None = None) -> None:
        """Set the generated content for quality analysis."""
        self.generated_content = content
        if section_texts:
            self.section_texts = section_texts

    def add_llm_call(self, count: int = 1) -> None:
        """Track LLM calls made during the test."""
        self.llm_calls_made += count

    def add_warning(self, message: str) -> None:
        """Add a warning to the test result."""
        self.warnings.append(message)
        self.logger.warning(message)

    def add_error(self, message: str) -> None:
        """Add an error to the test result."""
        self.errors.append(message)
        self.logger.error(message)

    def _log_performance_summary(self) -> None:
        """Log comprehensive performance summary."""
        if not self.result:
            return

        self.logger.info("=== PERFORMANCE TEST SUMMARY ===")
        self.logger.info("Test: %s", self.test_name)
        self.logger.info("Category: %s", self.test_category.value)
        self.logger.info("Total Time: %.1fs (%.1fm)",
                        self.result.total_duration_seconds,
                        self.result.total_duration_minutes)
        self.logger.info("Performance Grade: %s", self.result.performance_grade.value)
        self.logger.info("Performance Score: %.1f/100", self.result.performance_score)
        self.logger.info("Quality Score: %.1f/100", self.result.quality_metrics.overall_quality_score)


        if self.result.stage_metrics:
            self.logger.info("Stage Performance:")
            for stage in self.result.stage_metrics:
                status = "✅" if stage.meets_target else "❌"
                self.logger.info("  %s %s: %.1fs (target: %.1fs)",
                               status, stage.stage_name,
                               stage.duration_seconds, stage.target_seconds)


        if self.result.bottleneck_stages:
            self.logger.warning("Bottlenecks detected: %s", ", ".join(self.result.bottleneck_stages))


        if self.result.optimization_metrics:
            opt = self.result.optimization_metrics
            if opt.percentage_improvement:
                self.logger.info("Optimization: %.1f%% improvement (%.1fs saved)",
                               opt.percentage_improvement, opt.time_savings_seconds or 0)


        quality = self.result.quality_metrics
        self.logger.info("Content: %d chars, %d words, %d sections",
                        quality.total_characters, quality.total_words, quality.section_count)


        if self.warnings:
            self.logger.warning("Warnings: %d", len(self.warnings))
        if self.errors:
            self.logger.error("Errors: %d", len(self.errors))


def performance_test(
    test_category: TestCategory,
    baseline_test_name: str | None = None,
    expected_patterns: list[str] | None = None,
    configuration: dict[str, Any] | None = None
) -> Callable[[F], F]:
    """
    Decorator for automatic performance measurement.

    Usage:
        @performance_test(TestCategory.GRANT_TEMPLATE)
        async def test_my_template_generation():
            # Test implementation
            pass
    """
    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args, **kwargs):

            test_name = func.__name__.replace("test_", "")


            logger = kwargs.get("logger")
            if not logger and args:
                for arg in args:
                    if isinstance(arg, logging.Logger):
                        logger = arg
                        break

            with PerformanceTestContext(
                test_name=test_name,
                test_category=test_category,
                baseline_test_name=baseline_test_name,
                expected_patterns=expected_patterns,
                configuration=configuration,
                logger=logger
            ) as perf_ctx:

                return await func(*args, **kwargs, performance_context=perf_ctx)

        return wrapper
    return decorator



def grant_template_performance_test(
    baseline_test_name: str | None = None,
    expected_patterns: list[str] | None = None
):
    """Decorator for grant template performance tests."""
    return performance_test(
        TestCategory.GRANT_TEMPLATE,
        baseline_test_name,
        expected_patterns
    )


def grant_application_performance_test(
    baseline_test_name: str | None = None,
    expected_patterns: list[str] | None = None
):
    """Decorator for grant application performance tests."""
    return performance_test(
        TestCategory.GRANT_APPLICATION,
        baseline_test_name,
        expected_patterns
    )


def optimization_performance_test(
    baseline_test_name: str,
    expected_patterns: list[str] | None = None
):
    """Decorator for optimization performance tests."""
    return performance_test(
        TestCategory.OPTIMIZATION,
        baseline_test_name,
        expected_patterns
    )



def create_performance_context(
    test_name: str,
    test_category: TestCategory,
    logger: logging.Logger | None = None,
    **kwargs
) -> PerformanceTestContext:
    """Create a performance context for manual usage."""
    return PerformanceTestContext(
        test_name=test_name,
        test_category=test_category,
        logger=logger,
        **kwargs
    )


def quick_performance_analysis(
    test_name: str,
    test_category: TestCategory,
    total_time: float,
    content: str,
    stage_times: dict[str, float] | None = None,
    section_texts: list[str] | None = None
) -> PerformanceResult:
    """Quick performance analysis without full context management."""
    analyzer = PerformanceAnalyzer(test_category)

    return analyzer.create_performance_result(
        test_name=test_name,
        test_id=str(uuid4()),
        total_time=total_time,
        stage_times=stage_times or {},
        content=content,
        section_texts=section_texts
    )


def get_performance_baseline(test_name: str) -> float | None:
    """Get baseline performance time for comparison."""
    return result_manager.get_baseline_time(test_name)


def save_performance_result(result: PerformanceResult, subfolder: str | None = None) -> Path:
    """Save a performance result to disk."""
    return result_manager.save_result(result, subfolder)



@contextlib.asynccontextmanager
async def timed_stage(stage_name: str, stage_times: dict[str, float], logger: logging.Logger | None = None):
    """Async context manager for timing a specific stage."""
    if logger:
        logger.debug("Starting stage: %s", stage_name)

    start_time = datetime.now()
    try:
        yield
    finally:
        duration = (datetime.now() - start_time).total_seconds()
        stage_times[stage_name] = duration

        if logger:
            logger.debug("Completed stage %s in %.2fs", stage_name, duration)


@contextlib.asynccontextmanager
async def grant_template_test(
    test_name: str,
    logger: logging.Logger | None = None,
    **kwargs
):
    """Async context manager for grant template performance testing."""
    with PerformanceTestContext(
        test_name=test_name,
        test_category=TestCategory.GRANT_TEMPLATE,
        logger=logger,
        **kwargs
    ) as ctx:
        yield ctx


@contextlib.asynccontextmanager
async def grant_application_test(
    test_name: str,
    logger: logging.Logger | None = None,
    baseline_test_name: str | None = None,
    **kwargs
):
    """Async context manager for grant application performance testing."""
    with create_performance_context(
        test_name=test_name,
        test_category=TestCategory.GRANT_APPLICATION,
        logger=logger,
        baseline_test_name=baseline_test_name,
        **kwargs
    ) as ctx:
        yield ctx



def assert_performance_targets(result: PerformanceResult, min_grade: str = "C") -> None:
    """Assert that performance meets minimum targets."""
    if result is None:
        raise AssertionError("Performance result is None - test framework error")

    if result.performance_grade is None:
        raise AssertionError("Performance grade is None - analysis error")

    grade_order = ["A", "B", "C", "D", "F"]
    actual_grade_index = grade_order.index(result.performance_grade.value)
    min_grade_index = grade_order.index(min_grade)

    assert actual_grade_index <= min_grade_index, (
        f"Performance grade {result.performance_grade.value} does not meet "
        f"minimum requirement of {min_grade}"
    )


def assert_quality_targets(result: PerformanceResult, min_score: float = 70.0) -> None:
    """Assert that quality meets minimum targets."""
    quality_score = result.quality_metrics.overall_quality_score
    assert quality_score >= min_score, (
        f"Quality score {quality_score:.1f} does not meet minimum requirement of {min_score}"
    )


def assert_optimization_success(result: PerformanceResult, min_improvement: float = 20.0) -> None:
    """Assert that optimization was successful."""
    if not result.optimization_metrics:
        raise AssertionError("No optimization metrics available")

    opt = result.optimization_metrics
    if opt.percentage_improvement is None:
        raise AssertionError("No baseline comparison available")

    assert opt.percentage_improvement >= min_improvement, (
        f"Optimization improvement {opt.percentage_improvement:.1f}% does not meet "
        f"minimum requirement of {min_improvement}%"
    )

    assert opt.quality_maintained, "Optimization degraded content quality"
