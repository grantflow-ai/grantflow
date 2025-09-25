import asyncio
import time
from contextlib import asynccontextmanager, suppress
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import psutil
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)


@dataclass(slots=True)
class DetailedBenchmarkMetrics:
    test_name: str
    vector_dimension: int
    dataset_size: int
    batch_size: int

    total_execution_time_ms: float
    average_operation_time_ms: float
    min_operation_time_ms: float
    max_operation_time_ms: float

    throughput_ops_per_sec: float

    memory_usage_mb: float
    peak_memory_mb: float
    memory_growth_mb: float

    throughput_vectors_per_sec: float | None = None
    throughput_queries_per_sec: float | None = None

    index_build_time_ms: float | None = None
    index_size_mb: float | None = None
    m_parameter: int | None = None
    ef_construction: int | None = None

    search_k: int | None = None
    average_results_returned: float | None = None

    cpu_usage_percent: float | None = None
    disk_io_bytes: int | None = None

    latency_p50_ms: float | None = None
    latency_p95_ms: float | None = None
    latency_p99_ms: float | None = None

    error_count: int = 0
    error_rate_percent: float = 0.0

    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
    additional_data: dict[str, Any] = field(default_factory=dict)


class EnhancedPerformanceTracker:
    def __init__(self, test_name: str, vector_dimension: int, dataset_size: int) -> None:
        self.test_name = test_name
        self.vector_dimension = vector_dimension
        self.dataset_size = dataset_size
        self.batch_size = 1000

        self.operation_times: list[float] = []
        self.start_time: float | None = None
        self.end_time: float | None = None

        self.memory_samples: list[float] = []
        self.process = psutil.Process()
        self.initial_memory: float | None = None

        self.index_metrics: dict[str, Any] = {}

        self.search_results: list[int] = []

        self.cpu_samples: list[float] = []

        self.errors: list[str] = []

        self.monitoring_task: asyncio.Task[None] | None = None
        self.monitoring_active = False

    async def start_monitoring(self) -> None:
        self.start_time = time.time()
        self.initial_memory = self.process.memory_info().rss / 1024 / 1024
        self.monitoring_active = True

        self.monitoring_task = asyncio.create_task(self._monitor_system_metrics())

        logger.debug("Started enhanced monitoring", test_name=self.test_name)

    async def stop_monitoring(self) -> None:
        self.end_time = time.time()
        self.monitoring_active = False

        if self.monitoring_task:
            self.monitoring_task.cancel()
            with suppress(asyncio.CancelledError):
                await self.monitoring_task

        logger.debug("Stopped enhanced monitoring", test_name=self.test_name)

    async def _monitor_system_metrics(self) -> None:
        try:
            while self.monitoring_active:
                memory_mb = self.process.memory_info().rss / 1024 / 1024
                self.memory_samples.append(memory_mb)

                cpu_percent = self.process.cpu_percent()
                self.cpu_samples.append(cpu_percent)

                await asyncio.sleep(0.1)

        except asyncio.CancelledError:
            pass

    def record_operation(self, operation_time_ms: float, result_count: int | None = None) -> None:
        self.operation_times.append(operation_time_ms)

        if result_count is not None:
            self.search_results.append(result_count)

    def record_error(self, error: str) -> None:
        self.errors.append(error)

    def record_index_metrics(self, build_time_ms: float, m: int, ef_construction: int) -> None:
        self.index_metrics = {
            "build_time_ms": build_time_ms,
            "m": m,
            "ef_construction": ef_construction,
        }

    def set_batch_size(self, batch_size: int) -> None:
        self.batch_size = batch_size

    async def measure_index_size(self, session: AsyncSession) -> None:
        try:
            result = await session.execute(
                text("""
                SELECT pg_size_pretty(pg_total_relation_size('idx_text_vectors_embedding'))::text as index_size,
                       pg_total_relation_size('idx_text_vectors_embedding') as index_bytes
            """)
            )
            row = result.fetchone()
            if row:
                index_bytes = row[1]
                self.index_metrics["size_mb"] = index_bytes / 1024 / 1024
                self.index_metrics["size_pretty"] = row[0]
        except Exception as e:
            logger.warning("Could not measure index size", error=str(e))

    def calculate_percentiles(self, values: list[float]) -> dict[str, float]:
        if not values:
            return {"p50": 0, "p95": 0, "p99": 0}

        sorted_values = sorted(values)
        n = len(sorted_values)

        return {
            "p50": sorted_values[int(n * 0.5)],
            "p95": sorted_values[int(n * 0.95)],
            "p99": sorted_values[int(n * 0.99)],
        }

    def get_detailed_metrics(self) -> DetailedBenchmarkMetrics:
        if not self.start_time or not self.end_time:
            raise RuntimeError("Monitoring not completed - call start_monitoring() and stop_monitoring()")

        total_time_ms = (self.end_time - self.start_time) * 1000

        if self.operation_times:
            avg_operation_time = sum(self.operation_times) / len(self.operation_times)
            min_operation_time = min(self.operation_times)
            max_operation_time = max(self.operation_times)

            total_operations = len(self.operation_times)
            throughput_ops_per_sec = total_operations / (total_time_ms / 1000)

            latency_percentiles = self.calculate_percentiles(self.operation_times)
        else:
            avg_operation_time = 0
            min_operation_time = 0
            max_operation_time = 0
            throughput_ops_per_sec = 0
            latency_percentiles = {"p50": 0, "p95": 0, "p99": 0}

        current_memory = self.process.memory_info().rss / 1024 / 1024
        memory_usage = current_memory - (self.initial_memory or 0)
        peak_memory = max(self.memory_samples) if self.memory_samples else current_memory
        memory_growth = peak_memory - (self.initial_memory or 0)

        avg_cpu = sum(self.cpu_samples) / len(self.cpu_samples) if self.cpu_samples else 0

        avg_results = sum(self.search_results) / len(self.search_results) if self.search_results else None

        error_count = len(self.errors)
        error_rate = (error_count / len(self.operation_times)) * 100 if self.operation_times else 0

        throughput_vectors_per_sec = None
        throughput_queries_per_sec = None

        if "insertion" in self.test_name.lower():
            throughput_vectors_per_sec = self.dataset_size / (total_time_ms / 1000)
        elif "search" in self.test_name.lower():
            throughput_queries_per_sec = throughput_ops_per_sec

        return DetailedBenchmarkMetrics(
            test_name=self.test_name,
            vector_dimension=self.vector_dimension,
            dataset_size=self.dataset_size,
            batch_size=self.batch_size,
            total_execution_time_ms=total_time_ms,
            average_operation_time_ms=avg_operation_time,
            min_operation_time_ms=min_operation_time,
            max_operation_time_ms=max_operation_time,
            throughput_ops_per_sec=throughput_ops_per_sec,
            throughput_vectors_per_sec=throughput_vectors_per_sec,
            throughput_queries_per_sec=throughput_queries_per_sec,
            memory_usage_mb=memory_usage,
            peak_memory_mb=peak_memory,
            memory_growth_mb=memory_growth,
            index_build_time_ms=self.index_metrics.get("build_time_ms"),
            index_size_mb=self.index_metrics.get("size_mb"),
            m_parameter=self.index_metrics.get("m"),
            ef_construction=self.index_metrics.get("ef_construction"),
            search_k=self.search_results[0] if self.search_results else None,
            average_results_returned=avg_results,
            cpu_usage_percent=avg_cpu,
            latency_p50_ms=latency_percentiles["p50"],
            latency_p95_ms=latency_percentiles["p95"],
            latency_p99_ms=latency_percentiles["p99"],
            error_count=error_count,
            error_rate_percent=error_rate,
            additional_data={
                "operation_count": len(self.operation_times),
                "memory_samples": len(self.memory_samples),
                "cpu_samples": len(self.cpu_samples),
                "errors": self.errors,
            },
        )


@asynccontextmanager
async def enhanced_metrics_tracking(test_name: str, vector_dimension: int, dataset_size: int) -> Any:
    tracker = EnhancedPerformanceTracker(test_name, vector_dimension, dataset_size)
    await tracker.start_monitoring()

    try:
        yield tracker
    finally:
        await tracker.stop_monitoring()


def format_metrics_summary(metrics: DetailedBenchmarkMetrics) -> str:
    summary = f"""
📊 {metrics.test_name} Performance Summary:
├── Configuration: {metrics.vector_dimension}d vectors, {metrics.dataset_size:,} dataset, batch={metrics.batch_size}
├── Execution: {metrics.total_execution_time_ms:.0f}ms total, {metrics.average_operation_time_ms:.2f}ms avg
├── Throughput: {metrics.throughput_ops_per_sec:.1f} ops/sec"""

    if metrics.throughput_vectors_per_sec:
        summary += f", {metrics.throughput_vectors_per_sec:.1f} vectors/sec"
    if metrics.throughput_queries_per_sec:
        summary += f", {metrics.throughput_queries_per_sec:.1f} queries/sec"

    summary += f"""
├── Memory: {metrics.memory_usage_mb:.1f}MB usage, {metrics.peak_memory_mb:.1f}MB peak
├── Latency: P50={metrics.latency_p50_ms:.2f}ms, P95={metrics.latency_p95_ms:.2f}ms, P99={metrics.latency_p99_ms:.2f}ms"""

    if metrics.index_build_time_ms:
        summary += f"""
├── Index: {metrics.index_build_time_ms:.0f}ms build time, M={metrics.m_parameter}, ef={metrics.ef_construction}"""

    if metrics.index_size_mb:
        summary += f", {metrics.index_size_mb:.1f}MB size"

    if metrics.error_count > 0:
        summary += f"""
├── Errors: {metrics.error_count} errors ({metrics.error_rate_percent:.1f}% rate)"""

    summary += f"""
└── System: {metrics.cpu_usage_percent:.1f}% CPU avg
"""

    return summary
