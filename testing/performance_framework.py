import functools
import json
import logging
import os
import time
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from enum import Enum
from pathlib import Path
from typing import Any, NotRequired, TypedDict, cast

import pytest

from testing import RESULTS_FOLDER


class StageTimer:
    def __init__(self, context: "PerformanceTestContext", stage_name: str) -> None:
        self.context = context
        self.stage_name = stage_name

    def __enter__(self) -> "StageTimer":
        self.context.start_stage(self.stage_name)
        return self

    def __exit__(self, exc_type: type[BaseException] | None, exc_val: BaseException | None, exc_tb: object) -> None:
        self.context.end_stage()


class ExecutionSpeed(str, Enum):
    SMOKE = "smoke"
    QUALITY = "quality"
    E2E_FULL = "e2e_full"


class Domain(str, Enum):
    GRANT_TEMPLATE = "grant_template"
    GRANT_APPLICATION = "grant_application"
    OPTIMIZATION = "optimization"
    VECTOR_BENCHMARK = "vector_benchmark"
    DATABASE_BENCHMARK = "database_benchmark"
    API_BENCHMARK = "api_benchmark"
    SEMANTIC_EVALUATION = "semantic_evaluation"
    AI_EVALUATION = "ai_evaluation"
    CRAWLER = "crawler"
    INDEXER = "indexer"
    SCRAPER = "scraper"
    NLP_CATEGORIZATION = "nlp_categorization"
    RETRIEVAL = "retrieval"


class PerformanceGrade(Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    F = "F"


@dataclass
class TestScenario:
    name: str
    description: str
    execution_speed: ExecutionSpeed
    domain: Domain | None = None
    timeout: int = 300
    expected_duration: str = "< 5 minutes"
    warm_up_runs: int = 0
    iterations: int = 1


@dataclass
class StageTimingConfig:
    stage_name: str
    target_seconds: float
    critical_threshold: float
    weight: float = 1.0


@dataclass
class PerformanceTargets:
    excellent_seconds: float
    good_seconds: float
    acceptable_seconds: float
    poor_seconds: float
    stage_configs: list[StageTimingConfig] = field(default_factory=list)

    def get_grade(self, total_time: float) -> PerformanceGrade:
        if total_time <= self.excellent_seconds:
            return PerformanceGrade.A
        if total_time <= self.good_seconds:
            return PerformanceGrade.B
        if total_time <= self.acceptable_seconds:
            return PerformanceGrade.C
        if total_time <= self.poor_seconds:
            return PerformanceGrade.D
        return PerformanceGrade.F


@dataclass
class StageMetrics:
    stage_name: str
    duration_seconds: float
    meets_target: bool
    target_seconds: float
    bottleneck: bool
    percentage_of_total: float


@dataclass
class QualityMetrics:
    total_characters: int = 0
    total_words: int = 0
    total_lines: int = 0
    section_count: int = 0
    avg_chars_per_section: float = 0.0

    has_objectives: bool = False
    has_work_plan: bool = False
    has_methodology: bool = False
    has_timeline: bool = False

    objective_count: int = 0
    task_count: int = 0
    key_terms_found: list[str] = field(default_factory=list)

    content_richness_score: float = 0.0
    structure_quality_score: float = 0.0
    completeness_score: float = 0.0
    overall_quality_score: float = 0.0


class PerformanceResultParams(TypedDict):
    test_name: str
    test_id: str
    total_time: float
    stage_times: dict[str, float]
    content: NotRequired[str]
    section_texts: NotRequired[list[str]]
    configuration: NotRequired[dict[str, Any]]
    baseline_time: NotRequired[float]
    current_llm_calls: NotRequired[int]
    baseline_llm_calls: NotRequired[int]
    expected_patterns: NotRequired[list[str]]
    errors: NotRequired[list[str]]
    warnings: NotRequired[list[str]]
    quality_metrics: NotRequired[dict[str, Any]]


@dataclass
class PerformanceResult:
    test_name: str
    test_id: str
    timestamp: datetime
    execution_speed: ExecutionSpeed
    domain: Domain | None
    total_time: float
    stage_times: dict[str, float]
    passed: bool
    performance_grade: PerformanceGrade | None = None
    stage_metrics: list[StageMetrics] = field(default_factory=list)
    quality_metrics: QualityMetrics | None = None
    configuration: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "test_name": self.test_name,
            "test_id": self.test_id,
            "timestamp": self.timestamp.isoformat(),
            "execution_speed": self.execution_speed.value,
            "domain": self.domain.value if self.domain else None,
            "total_time": self.total_time,
            "stage_times": self.stage_times,
            "passed": self.passed,
            "performance_grade": self.performance_grade.value if self.performance_grade else None,
            "stage_metrics": [asdict(m) for m in self.stage_metrics],
            "quality_metrics": asdict(self.quality_metrics) if self.quality_metrics else None,
            "configuration": self.configuration,
            "errors": self.errors,
            "warnings": self.warnings,
            "metadata": self.metadata,
        }


class PerformanceTestContext:
    def __init__(
        self,
        test_name: str,
        execution_speed: ExecutionSpeed = ExecutionSpeed.QUALITY,
        domain: Domain | None = None,
        performance_targets: PerformanceTargets | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self.test_name = test_name
        self.test_id = f"{test_name}_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}"
        self.execution_speed = execution_speed
        self.domain = domain
        self.performance_targets = performance_targets
        self.logger = logger or logging.getLogger(__name__)

        self.start_time: float | None = None
        self.end_time: float | None = None
        self.stage_times: dict[str, float] = {}
        self.current_stage: str | None = None
        self.current_stage_start: float | None = None
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.metadata: dict[str, Any] = {}

    def __enter__(self) -> "PerformanceTestContext":
        self.start_time = time.time()
        self.logger.info(
            "🎯 Starting performance test: %s",
            self.test_name,
            extra={
                "test_id": self.test_id,
                "execution_speed": self.execution_speed.value,
                "domain": self.domain.value if self.domain else None,
            },
        )
        return self

    def __exit__(self, exc_type: type[BaseException] | None, exc_val: BaseException | None, exc_tb: object) -> None:
        self.end_time = time.time()
        if self.current_stage:
            self.end_stage()

        total_time = self.end_time - self.start_time if self.start_time else 0
        passed = exc_type is None

        if self.logger:
            self.logger.info(
                "✅ Performance test completed: %s",
                self.test_name,
                extra={
                    "test_id": self.test_id,
                    "total_time": f"{total_time:.2f}s",
                    "passed": passed,
                },
            )

    def start_stage(self, stage_name: str) -> None:
        if self.current_stage:
            self.end_stage()
        self.current_stage = stage_name
        self.current_stage_start = time.time()
        if self.logger:
            self.logger.debug("Starting stage: %s", stage_name)

    def end_stage(self) -> None:
        if self.current_stage and self.current_stage_start:
            duration = time.time() - self.current_stage_start
            self.stage_times[self.current_stage] = duration
            if self.logger:
                self.logger.debug("Completed stage: %s (%.2fs)", self.current_stage, duration)
            self.current_stage = None
            self.current_stage_start = None

    def add_error(self, error: str) -> None:
        self.errors.append(error)
        if self.logger:
            self.logger.error(error)

    def add_warning(self, warning: str) -> None:
        self.warnings.append(warning)
        if self.logger:
            self.logger.warning(warning)

    def set_metadata(self, key: str, value: Any) -> None:
        self.metadata[key] = value

    def add_llm_call(self) -> None:
        self.metadata.setdefault("llm_calls_made", 0)
        self.metadata["llm_calls_made"] += 1

    def set_content(self, content: str, content_dict: Any = None) -> None:
        self.metadata["content"] = content
        if content_dict is not None:
            self.metadata["content_dict"] = content_dict

    @property
    def llm_calls_made(self) -> int:
        return int(self.metadata.get("llm_calls_made", 0))

    @property
    def configuration(self) -> dict[str, Any]:
        return dict(self.metadata.get("configuration", {}))

    @configuration.setter
    def configuration(self, config: dict[str, Any]) -> None:
        self.metadata["configuration"] = config

    def stage_timer(self, stage_name: str) -> "StageTimer":
        return StageTimer(self, stage_name)

    def get_result(self, passed: bool = True, quality_metrics: QualityMetrics | None = None) -> PerformanceResult:
        total_time = self.end_time - self.start_time if self.start_time and self.end_time else 0

        performance_grade = None
        stage_metrics = []

        if self.performance_targets:
            performance_grade = self.performance_targets.get_grade(total_time)

            for config in self.performance_targets.stage_configs:
                stage_time = self.stage_times.get(config.stage_name, 0)
                meets_target = stage_time <= config.target_seconds
                bottleneck = stage_time > config.critical_threshold
                percentage = (stage_time / total_time * 100) if total_time > 0 else 0

                stage_metrics.append(
                    StageMetrics(
                        stage_name=config.stage_name,
                        duration_seconds=stage_time,
                        meets_target=meets_target,
                        target_seconds=config.target_seconds,
                        bottleneck=bottleneck,
                        percentage_of_total=percentage,
                    )
                )

        return PerformanceResult(
            test_name=self.test_name,
            test_id=self.test_id,
            timestamp=datetime.now(UTC),
            execution_speed=self.execution_speed,
            domain=self.domain,
            total_time=total_time,
            stage_times=self.stage_times,
            passed=passed,
            performance_grade=performance_grade,
            stage_metrics=stage_metrics,
            quality_metrics=quality_metrics,
            errors=self.errors,
            warnings=self.warnings,
            metadata=self.metadata,
        )


def save_performance_results(result: PerformanceResult, results_dir: Path | None = None) -> Path:
    if results_dir is None:
        results_dir = RESULTS_FOLDER / "performance"

    results_dir.mkdir(parents=True, exist_ok=True)

    date_str = result.timestamp.strftime("%Y-%m-%d")
    file_dir = results_dir / date_str / result.domain.value if result.domain else results_dir / date_str

    file_dir.mkdir(parents=True, exist_ok=True)

    timestamp_str = result.timestamp.strftime("%H%M%S")
    filename = f"{result.test_name}_{timestamp_str}.json"
    file_path = file_dir / filename

    with file_path.open("w") as f:
        json.dump(result.to_dict(), f, indent=2)

    return file_path


TEST_SCENARIOS = {
    ExecutionSpeed.SMOKE: TestScenario(
        name="smoke",
        description="Quick validation tests",
        execution_speed=ExecutionSpeed.SMOKE,
        timeout=60,
        expected_duration="< 1 minute",
    ),
    ExecutionSpeed.QUALITY: TestScenario(
        name="quality",
        description="Quality validation tests",
        execution_speed=ExecutionSpeed.QUALITY,
        timeout=300,
        expected_duration="2-5 minutes",
    ),
    ExecutionSpeed.E2E_FULL: TestScenario(
        name="e2e_full",
        description="Complete end-to-end tests",
        execution_speed=ExecutionSpeed.E2E_FULL,
        timeout=1800,
        expected_duration="10+ minutes",
    ),
}


def performance_test[F: Callable[..., Any]](
    execution_speed: ExecutionSpeed = ExecutionSpeed.QUALITY,
    domain: Domain | None = None,
    timeout: int | None = None,
    save_results: bool = True,
    warm_up_runs: int = 0,
) -> Callable[[F], F]:
    def decorator(func: F) -> F:
        scenario = TEST_SCENARIOS.get(execution_speed, TEST_SCENARIOS[ExecutionSpeed.QUALITY])
        test_timeout = timeout or scenario.timeout

        marks = []

        if execution_speed != ExecutionSpeed.SMOKE:
            marks.append(
                pytest.mark.skipif(
                    not os.environ.get("E2E_TESTS"),
                    reason="E2E tests disabled. Set E2E_TESTS=1 to run",
                )
            )

        if execution_speed == ExecutionSpeed.SMOKE:
            marks.append(pytest.mark.smoke)
        elif execution_speed == ExecutionSpeed.QUALITY:
            marks.append(pytest.mark.quality_assessment)
        elif execution_speed == ExecutionSpeed.E2E_FULL:
            marks.append(pytest.mark.e2e_full)

        marks.append(pytest.mark.timeout(test_timeout))

        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            logger = kwargs.get("logger") or logging.getLogger(func.__name__)

            if warm_up_runs > 0:
                logger.info("Performing %d warm-up runs", warm_up_runs)
                for i in range(warm_up_runs):
                    try:
                        await func(*args, **kwargs)
                    except Exception as e:
                        logger.warning("Warm-up run %d failed: %s", i + 1, e)

            context = PerformanceTestContext(
                test_name=func.__name__,
                execution_speed=execution_speed,
                domain=domain,
                logger=logger,
            )

            if "performance_context" in func.__code__.co_varnames:
                kwargs["performance_context"] = context

            with context:
                result = await func(*args, **kwargs)

            perf_result = context.get_result(passed=True)

            if save_results:
                results_path = save_performance_results(perf_result)
                logger.info("Performance results saved to: %s", results_path)

            return result

        for mark in marks:
            wrapper = mark(wrapper)

        return cast("F", wrapper)

    return decorator


e2e_test = performance_test


def benchmark(
    category: Domain | None = Domain.VECTOR_BENCHMARK,
    timeout: int | None = None,
    save_results: bool = True,
    warm_up: bool = False,
) -> Callable[[Any], Any]:
    domain_map = {
        "vector": Domain.VECTOR_BENCHMARK,
        "database": Domain.DATABASE_BENCHMARK,
        "api": Domain.API_BENCHMARK,
    }

    domain = domain_map.get(category, Domain.VECTOR_BENCHMARK) if isinstance(category, str) else category

    return performance_test(
        execution_speed=ExecutionSpeed.QUALITY,
        domain=domain,
        timeout=timeout,
        save_results=save_results,
        warm_up_runs=1 if warm_up else 0,
    )
