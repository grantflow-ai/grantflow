"""
Unified Performance Measurement Framework for RAG E2E Tests.

Combines the best aspects of grant template and grant application performance testing:
- Stage-by-stage timing from grant template approach
- Rich quality validation from grant application approach
- Optimization tracking and baseline comparisons
- Comprehensive result analysis and trend tracking
"""

import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any


class TestCategory(Enum):
    """Test category for performance classification."""
    GRANT_TEMPLATE = "grant_template"
    GRANT_APPLICATION = "grant_application"
    OPTIMIZATION = "optimization"
    BASELINE = "baseline"


class PerformanceGrade(Enum):
    """Performance grade classification."""
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    F = "F"


@dataclass
class StageTimingConfig:
    """Configuration for individual stage timing targets."""
    stage_name: str
    target_seconds: float
    critical_threshold: float
    weight: float = 1.0


@dataclass
class PerformanceTargets:
    """Performance targets for different test categories."""
    excellent_seconds: float
    good_seconds: float
    acceptable_seconds: float
    poor_seconds: float
    stage_configs: list[StageTimingConfig]

    def get_grade(self, total_time: float) -> PerformanceGrade:
        """Calculate performance grade based on total time."""
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
    """Metrics for individual pipeline stage."""
    stage_name: str
    duration_seconds: float
    meets_target: bool
    target_seconds: float
    bottleneck: bool
    percentage_of_total: float


@dataclass
class QualityMetrics:
    """Comprehensive quality metrics for generated content."""

    total_characters: int
    total_words: int
    total_lines: int
    section_count: int
    avg_chars_per_section: float


    has_objectives: bool
    has_work_plan: bool
    has_methodology: bool
    has_timeline: bool


    objective_count: int
    task_count: int
    key_terms_found: list[str]


    content_richness_score: float
    structure_quality_score: float
    completeness_score: float
    overall_quality_score: float


    meets_min_length: bool
    meets_min_sections: bool
    meets_content_requirements: bool


@dataclass
class OptimizationMetrics:
    """Metrics for optimization analysis and baseline comparisons."""
    baseline_time_seconds: float | None
    optimized_time_seconds: float
    improvement_factor: float | None
    time_savings_seconds: float | None
    percentage_improvement: float | None


    llm_calls_baseline: int | None
    llm_calls_optimized: int
    llm_call_reduction: float | None


    optimization_successful: bool
    target_improvement_met: bool
    quality_maintained: bool


@dataclass
class PerformanceResult:
    """Comprehensive performance test result."""

    test_name: str
    test_category: TestCategory
    timestamp: str
    test_id: str
    configuration: dict[str, Any]


    total_duration_seconds: float
    total_duration_minutes: float
    stage_metrics: list[StageMetrics]


    performance_grade: PerformanceGrade
    performance_score: float
    meets_targets: bool
    bottleneck_stages: list[str]


    quality_metrics: QualityMetrics


    optimization_metrics: OptimizationMetrics | None


    environment_info: dict[str, Any]
    errors_encountered: list[str]
    warnings: list[str]


class PerformanceAnalyzer:
    """Unified performance analyzer for RAG pipeline tests."""


    GRANT_TEMPLATE_TARGETS = PerformanceTargets(
        excellent_seconds=60,
        good_seconds=120,
        acceptable_seconds=180,
        poor_seconds=300,
        stage_configs=[
            StageTimingConfig("rag_creation", 30, 45),
            StageTimingConfig("cfp_extraction", 60, 90),
            StageTimingConfig("section_extraction", 90, 135),
            StageTimingConfig("metadata_generation", 30, 45),
        ]
    )

    GRANT_APPLICATION_TARGETS = PerformanceTargets(
        excellent_seconds=300,
        good_seconds=480,
        acceptable_seconds=600,
        poor_seconds=900,
        stage_configs=[
            StageTimingConfig("objective_extraction", 30, 60),
            StageTimingConfig("objective_enrichment", 120, 200),
            StageTimingConfig("work_plan_generation", 180, 300),
            StageTimingConfig("final_generation", 90, 150),
        ]
    )

    def __init__(self, test_category: TestCategory) -> None:
        self.test_category = test_category
        self.targets = self._get_targets_for_category(test_category)

    def _get_targets_for_category(self, category: TestCategory) -> PerformanceTargets:
        """Get performance targets based on test category."""
        if category == TestCategory.GRANT_TEMPLATE:
            return self.GRANT_TEMPLATE_TARGETS
        if category in [TestCategory.GRANT_APPLICATION, TestCategory.BASELINE, TestCategory.OPTIMIZATION]:
            return self.GRANT_APPLICATION_TARGETS

        return self.GRANT_APPLICATION_TARGETS

    def analyze_stage_timing(
        self,
        stage_times: dict[str, float],
        total_time: float
    ) -> list[StageMetrics]:
        """Analyze individual stage performance."""
        stage_metrics = []

        for config in self.targets.stage_configs:
            stage_time = stage_times.get(config.stage_name, 0.0)
            percentage = (stage_time / total_time * 100) if total_time > 0 else 0

            stage_metric = StageMetrics(
                stage_name=config.stage_name,
                duration_seconds=stage_time,
                meets_target=stage_time <= config.target_seconds,
                target_seconds=config.target_seconds,
                bottleneck=stage_time > config.critical_threshold,
                percentage_of_total=percentage
            )
            stage_metrics.append(stage_metric)

        return stage_metrics

    def analyze_content_quality(
        self,
        content: str,
        section_texts: list[str] | None = None,
        expected_patterns: list[str] | None = None
    ) -> QualityMetrics:
        """Analyze content quality with comprehensive metrics."""
        if not content:
            content = ""


        char_count = len(content)
        word_count = len(content.split())
        line_count = len(content.split("\n"))


        if section_texts:
            section_count = len(section_texts)
            avg_chars_per_section = char_count / max(1, section_count)
        else:

            section_count = max(
                content.count("##"),
                content.count("###"),
                content.count("## "),
                1
            )
            avg_chars_per_section = char_count / section_count


        has_objectives = bool(re.search(r"objective|aim|goal", content, re.IGNORECASE))
        has_work_plan = bool(re.search(r"work plan|timeline|schedule|milestone", content, re.IGNORECASE))
        has_methodology = bool(re.search(r"method|approach|procedure|technique", content, re.IGNORECASE))
        has_timeline = bool(re.search(r"timeline|schedule|year|month|phase", content, re.IGNORECASE))


        objective_count = len(re.findall(r"### Objective|## Objective|Objective \d+", content, re.IGNORECASE))
        task_count = len(re.findall(r"#### |Task \d+|• ", content))


        key_terms = []
        if expected_patterns:
            for pattern in expected_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    key_terms.append(pattern)


        content_richness_score = min(100, (char_count / 5000) * 100)

        structure_indicators = sum([
            has_objectives, has_work_plan, has_methodology, has_timeline
        ])
        structure_quality_score = (structure_indicators / 4) * 100

        completeness_score = min(100, (section_count / 5) * 100)

        overall_quality_score = (
            content_richness_score * 0.4 +
            structure_quality_score * 0.4 +
            completeness_score * 0.2
        )

        return QualityMetrics(
            total_characters=char_count,
            total_words=word_count,
            total_lines=line_count,
            section_count=section_count,
            avg_chars_per_section=avg_chars_per_section,
            has_objectives=has_objectives,
            has_work_plan=has_work_plan,
            has_methodology=has_methodology,
            has_timeline=has_timeline,
            objective_count=objective_count,
            task_count=task_count,
            key_terms_found=key_terms,
            content_richness_score=content_richness_score,
            structure_quality_score=structure_quality_score,
            completeness_score=completeness_score,
            overall_quality_score=overall_quality_score,
            meets_min_length=char_count >= 1000,
            meets_min_sections=section_count >= 3,
            meets_content_requirements=overall_quality_score >= 70
        )

    def calculate_performance_score(
        self,
        total_time: float,
        stage_metrics: list[StageMetrics],
        quality_score: float
    ) -> float:
        """Calculate composite performance score (0-100)."""

        target_time = self.targets.good_seconds
        time_score = max(0, min(100, (target_time / total_time) * 100))


        stages_meeting_targets = sum(1 for stage in stage_metrics if stage.meets_target)
        stage_score = (stages_meeting_targets / len(stage_metrics)) * 100 if stage_metrics else 0


        composite_score = (
            time_score * 0.5 +
            quality_score * 0.3 +
            stage_score * 0.2
        )

        return round(composite_score, 1)

    def analyze_optimization(
        self,
        current_time: float,
        baseline_time: float | None = None,
        current_llm_calls: int | None = None,
        baseline_llm_calls: int | None = None,
        quality_maintained: bool = True,
        target_improvement_percent: float = 20.0
    ) -> OptimizationMetrics:
        """Analyze optimization performance vs baseline."""
        if baseline_time is None:
            return OptimizationMetrics(
                baseline_time_seconds=None,
                optimized_time_seconds=current_time,
                improvement_factor=None,
                time_savings_seconds=None,
                percentage_improvement=None,
                llm_calls_baseline=baseline_llm_calls,
                llm_calls_optimized=current_llm_calls,
                llm_call_reduction=None,
                optimization_successful=False,
                target_improvement_met=False,
                quality_maintained=quality_maintained
            )

        improvement_factor = baseline_time / current_time if current_time > 0 else 1.0
        time_savings = baseline_time - current_time
        percentage_improvement = (time_savings / baseline_time) * 100 if baseline_time > 0 else 0

        llm_call_reduction = None
        if baseline_llm_calls and current_llm_calls:
            llm_call_reduction = ((baseline_llm_calls - current_llm_calls) / baseline_llm_calls) * 100

        optimization_successful = percentage_improvement >= target_improvement_percent
        target_improvement_met = optimization_successful and quality_maintained

        return OptimizationMetrics(
            baseline_time_seconds=baseline_time,
            optimized_time_seconds=current_time,
            improvement_factor=improvement_factor,
            time_savings_seconds=time_savings,
            percentage_improvement=percentage_improvement,
            llm_calls_baseline=baseline_llm_calls,
            llm_calls_optimized=current_llm_calls,
            llm_call_reduction=llm_call_reduction,
            optimization_successful=optimization_successful,
            target_improvement_met=target_improvement_met,
            quality_maintained=quality_maintained
        )

    def create_performance_result(
        self,
        test_name: str,
        test_id: str,
        total_time: float,
        stage_times: dict[str, float],
        content: str,
        section_texts: list[str] | None = None,
        configuration: dict[str, Any] | None = None,
        baseline_time: float | None = None,
        current_llm_calls: int | None = None,
        baseline_llm_calls: int | None = None,
        expected_patterns: list[str] | None = None,
        errors: list[str] | None = None,
        warnings: list[str] | None = None
    ) -> PerformanceResult:
        """Create comprehensive performance result."""

        stage_metrics = self.analyze_stage_timing(stage_times, total_time)
        quality_metrics = self.analyze_content_quality(content, section_texts, expected_patterns)


        performance_grade = self.targets.get_grade(total_time)
        performance_score = self.calculate_performance_score(
            total_time, stage_metrics, quality_metrics.overall_quality_score
        )


        bottleneck_stages = [stage.stage_name for stage in stage_metrics if stage.bottleneck]


        optimization_metrics = None
        if baseline_time is not None:
            optimization_metrics = self.analyze_optimization(
                current_time=total_time,
                baseline_time=baseline_time,
                current_llm_calls=current_llm_calls,
                baseline_llm_calls=baseline_llm_calls,
                quality_maintained=quality_metrics.meets_content_requirements
            )

        return PerformanceResult(
            test_name=test_name,
            test_category=self.test_category,
            timestamp=datetime.now().isoformat(),
            test_id=test_id,
            configuration=configuration or {},
            total_duration_seconds=total_time,
            total_duration_minutes=total_time / 60,
            stage_metrics=stage_metrics,
            performance_grade=performance_grade,
            performance_score=performance_score,
            meets_targets=performance_grade.value in ["A", "B", "C"],
            bottleneck_stages=bottleneck_stages,
            quality_metrics=quality_metrics,
            optimization_metrics=optimization_metrics,
            environment_info={
                "test_framework": "unified_performance",
                "category": self.test_category.value,
            },
            errors_encountered=errors or [],
            warnings=warnings or []
        )


class PerformanceResultManager:
    """Manages saving, loading, and analyzing performance results."""

    def __init__(self, results_base_path: str | Path) -> None:
        self.results_path = Path(results_base_path)
        self.results_path.mkdir(parents=True, exist_ok=True)

    def save_result(self, result: PerformanceResult, subfolder: str | None = None) -> Path:
        """Save performance result to disk."""
        save_path = self.results_path
        if subfolder:
            save_path = save_path / subfolder
            save_path.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{result.test_name}_{timestamp}.json"
        file_path = save_path / filename


        result_dict = asdict(result)


        result_dict["test_category"] = result.test_category.value
        result_dict["performance_grade"] = result.performance_grade.value

        with open(file_path, "w") as f:
            json.dump(result_dict, f, indent=2, default=str)

        return file_path

    def load_results(self, test_name_pattern: str | None = None) -> list[PerformanceResult]:
        """Load performance results from disk."""
        results = []
        pattern = f"*{test_name_pattern}*.json" if test_name_pattern else "*.json"

        for file_path in self.results_path.rglob(pattern):
            try:
                with open(file_path) as f:
                    data = json.load(f)



                results.append(data)
            except Exception:
                pass

        return results

    def get_baseline_time(self, test_name: str) -> float | None:
        """Get baseline time for a specific test."""
        results = self.load_results(test_name)
        if not results:
            return None


        recent_result = max(results, key=lambda r: r.get("timestamp", ""))
        return recent_result.get("total_duration_seconds")



def create_grant_template_analyzer() -> PerformanceAnalyzer:
    """Create analyzer configured for grant template tests."""
    return PerformanceAnalyzer(TestCategory.GRANT_TEMPLATE)


def create_grant_application_analyzer() -> PerformanceAnalyzer:
    """Create analyzer configured for grant application tests."""
    return PerformanceAnalyzer(TestCategory.GRANT_APPLICATION)


def create_optimization_analyzer() -> PerformanceAnalyzer:
    """Create analyzer configured for optimization tests."""
    return PerformanceAnalyzer(TestCategory.OPTIMIZATION)
