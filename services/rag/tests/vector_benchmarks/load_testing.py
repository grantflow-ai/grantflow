import asyncio
import time
from contextlib import suppress
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from packages.shared_utils.src.logger import get_logger
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from testing.performance_framework import Domain, ExecutionSpeed, performance_test

from .enhanced_metrics import EnhancedPerformanceTracker
from .framework import VectorBenchmarkFramework

logger = get_logger(__name__)


@dataclass
class LoadTestConfiguration:
    name: str
    description: str

    concurrent_users: int
    requests_per_user: int
    ramp_up_time_seconds: float

    vector_dimension: int
    dataset_size: int
    search_k: int

    test_duration_seconds: float | None = None
    warm_up_duration_seconds: float = 5.0

    load_pattern: str = "constant"

    expected_use_case: str = "Load testing"


@dataclass
class LoadTestResult:
    configuration: LoadTestConfiguration

    total_requests: int
    successful_requests: int
    failed_requests: int

    total_duration_seconds: float
    actual_rps: float
    target_rps: float

    avg_response_time_ms: float
    min_response_time_ms: float
    max_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float

    error_rate_percent: float
    error_types: dict[str, int]

    avg_concurrent_requests: float
    max_concurrent_requests: int

    peak_memory_mb: float
    avg_cpu_percent: float

    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))


class LoadTestExecutor:
    def __init__(self, session_maker: async_sessionmaker[AsyncSession]) -> None:
        self.session_maker = session_maker
        self.framework = VectorBenchmarkFramework(session_maker)

        self.active_requests = 0
        self.max_concurrent = 0
        self.request_times: list[float] = []
        self.errors: list[str] = []
        self.error_types: dict[str, int] = {}

        self.monitor_task: asyncio.Task[None] | None = None
        self.monitoring_active = False
        self.resource_tracker: EnhancedPerformanceTracker | None = None

    async def execute_search_load_test(
        self, config: LoadTestConfiguration, query_vectors: list[list[float]]
    ) -> LoadTestResult:
        logger.info("Starting search load test", config_name=config.name)
        logger.info("Config", concurrent_users=config.concurrent_users, requests_per_user=config.requests_per_user)

        self.resource_tracker = EnhancedPerformanceTracker(
            f"load_test_{config.name}", config.vector_dimension, config.dataset_size
        )
        await self.resource_tracker.start_monitoring()

        self.monitoring_active = True
        self.monitor_task = asyncio.create_task(self._monitor_concurrency())

        start_time = time.time()

        try:
            user_tasks = await self._create_user_tasks(config, query_vectors)

            await asyncio.gather(*user_tasks, return_exceptions=True)

        finally:
            self.monitoring_active = False
            if self.monitor_task:
                self.monitor_task.cancel()
                with suppress(asyncio.CancelledError):
                    await self.monitor_task

            await self.resource_tracker.stop_monitoring()

        end_time = time.time()
        total_duration = end_time - start_time

        return self._calculate_load_test_results(config, total_duration)

    async def _create_user_tasks(
        self, config: LoadTestConfiguration, query_vectors: list[list[float]]
    ) -> list[asyncio.Task[None]]:
        tasks = []

        if config.load_pattern == "constant":
            for user_id in range(config.concurrent_users):
                task = asyncio.create_task(self._simulate_user(user_id, config, query_vectors))
                tasks.append(task)

        elif config.load_pattern == "ramp":
            delay_between_users = config.ramp_up_time_seconds / config.concurrent_users

            for user_id in range(config.concurrent_users):
                delay = user_id * delay_between_users
                task = asyncio.create_task(self._simulate_user_with_delay(user_id, config, query_vectors, delay))
                tasks.append(task)

        elif config.load_pattern == "spike":
            immediate_users = config.concurrent_users // 2

            for user_id in range(immediate_users):
                task = asyncio.create_task(self._simulate_user(user_id, config, query_vectors))
                tasks.append(task)

            spike_delay = config.ramp_up_time_seconds
            for user_id in range(immediate_users, config.concurrent_users):
                task = asyncio.create_task(self._simulate_user_with_delay(user_id, config, query_vectors, spike_delay))
                tasks.append(task)

        return tasks

    async def _simulate_user_with_delay(
        self, user_id: int, config: LoadTestConfiguration, query_vectors: list[list[float]], delay: float
    ) -> None:
        await asyncio.sleep(delay)
        await self._simulate_user(user_id, config, query_vectors)

    async def _simulate_user(
        self, user_id: int, config: LoadTestConfiguration, query_vectors: list[list[float]]
    ) -> None:
        try:
            await asyncio.sleep(config.warm_up_duration_seconds)

            for request_id in range(config.requests_per_user):
                request_start = time.time()

                try:
                    self.active_requests += 1
                    self.max_concurrent = max(self.max_concurrent, self.active_requests)

                    query_idx = (user_id + request_id) % len(query_vectors)
                    query_vector = query_vectors[query_idx]

                    await self._execute_search_request(query_vector, config.search_k)

                    request_time = (time.time() - request_start) * 1000
                    self.request_times.append(request_time)

                except Exception as e:
                    error_msg = str(e)
                    self.errors.append(error_msg)
                    error_type = type(e).__name__
                    self.error_types[error_type] = self.error_types.get(error_type, 0) + 1

                    logger.warning("User request failed", user_id=user_id, request_id=request_id, error=error_msg)

                finally:
                    self.active_requests -= 1

                await asyncio.sleep(0.1)

        except Exception as e:
            logger.error("User simulation failed", user_id=user_id, error=str(e))

    async def _execute_search_request(
        self, query_vector: list[float], k: int
    ) -> list[tuple[str, list[float], str, str]]:
        async with self.session_maker() as session:
            from sqlalchemy import text

            embedding_str = "[" + ",".join(str(x) for x in query_vector) + "]"
            dimension = len(query_vector)

            query = text(f"""
                SELECT chunk, embedding, rag_source_id, id
                FROM text_vectors
                ORDER BY embedding <=> '{embedding_str}'::vector({dimension})
                LIMIT :k
            """)

            result = await session.execute(query, {"k": k})

            return [(str(row[0]), list(row[1]), str(row[2]), str(row[3])) for row in result.fetchall()]

    async def _monitor_concurrency(self) -> None:
        try:
            while self.monitoring_active:
                if self.resource_tracker:
                    pass

                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            pass

    def _calculate_load_test_results(self, config: LoadTestConfiguration, total_duration: float) -> LoadTestResult:
        total_requests = len(self.request_times) + len(self.errors)
        successful_requests = len(self.request_times)
        failed_requests = len(self.errors)

        if self.request_times:
            avg_response_time = sum(self.request_times) / len(self.request_times)
            min_response_time = min(self.request_times)
            max_response_time = max(self.request_times)

            sorted_times = sorted(self.request_times)
            p95_idx = int(len(sorted_times) * 0.95)
            p99_idx = int(len(sorted_times) * 0.99)
            p95_response_time = sorted_times[p95_idx]
            p99_response_time = sorted_times[p99_idx]
        else:
            avg_response_time = 0
            min_response_time = 0
            max_response_time = 0
            p95_response_time = 0
            p99_response_time = 0

        actual_rps = total_requests / total_duration if total_duration > 0 else 0
        target_rps = (config.concurrent_users * config.requests_per_user) / total_duration if total_duration > 0 else 0

        error_rate = (failed_requests / total_requests * 100) if total_requests > 0 else 0

        resource_metrics = self.resource_tracker.get_detailed_metrics() if self.resource_tracker else None

        return LoadTestResult(
            configuration=config,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            total_duration_seconds=total_duration,
            actual_rps=actual_rps,
            target_rps=target_rps,
            avg_response_time_ms=avg_response_time,
            min_response_time_ms=min_response_time,
            max_response_time_ms=max_response_time,
            p95_response_time_ms=p95_response_time,
            p99_response_time_ms=p99_response_time,
            error_rate_percent=error_rate,
            error_types=self.error_types,
            avg_concurrent_requests=self.max_concurrent / 2,
            max_concurrent_requests=self.max_concurrent,
            peak_memory_mb=resource_metrics.peak_memory_mb if resource_metrics else 0,
            avg_cpu_percent=resource_metrics.cpu_usage_percent
            if resource_metrics and resource_metrics.cpu_usage_percent
            else 0,
        )


LOAD_TEST_CONFIGURATIONS = [
    LoadTestConfiguration(
        name="light_load",
        description="Light load simulation: 5 concurrent users",
        concurrent_users=5,
        requests_per_user=10,
        ramp_up_time_seconds=2.0,
        vector_dimension=384,
        dataset_size=10000,
        search_k=10,
        load_pattern="constant",
        expected_use_case="Low traffic periods",
    ),
    LoadTestConfiguration(
        name="normal_load",
        description="Normal load simulation: 20 concurrent users",
        concurrent_users=20,
        requests_per_user=25,
        ramp_up_time_seconds=5.0,
        vector_dimension=384,
        dataset_size=10000,
        search_k=10,
        load_pattern="ramp",
        expected_use_case="Normal business hours",
    ),
    LoadTestConfiguration(
        name="peak_load",
        description="Peak load simulation: 50 concurrent users",
        concurrent_users=50,
        requests_per_user=20,
        ramp_up_time_seconds=10.0,
        vector_dimension=384,
        dataset_size=10000,
        search_k=10,
        load_pattern="ramp",
        expected_use_case="Peak usage periods",
    ),
    LoadTestConfiguration(
        name="spike_load",
        description="Spike load simulation: sudden 100 concurrent users",
        concurrent_users=100,
        requests_per_user=10,
        ramp_up_time_seconds=5.0,
        vector_dimension=384,
        dataset_size=10000,
        search_k=10,
        load_pattern="spike",
        expected_use_case="Traffic spikes and viral content",
    ),
    LoadTestConfiguration(
        name="stress_test",
        description="Stress test: 200 concurrent users",
        concurrent_users=200,
        requests_per_user=15,
        ramp_up_time_seconds=15.0,
        vector_dimension=384,
        dataset_size=25000,
        search_k=10,
        load_pattern="ramp",
        expected_use_case="Stress testing system limits",
    ),
]


def format_load_test_results(result: LoadTestResult) -> str:
    config = result.configuration

    summary = f"""
 {config.name} Load Test Results:
├── Configuration: {config.concurrent_users} users, {config.requests_per_user} req/user, {config.load_pattern} pattern
├── Execution: {result.total_duration_seconds:.1f}s duration, {result.actual_rps:.1f} RPS achieved
├── Requests: {result.total_requests:,} total ({result.successful_requests:,} success, {result.failed_requests:,} failed)
├── Response Times: avg={result.avg_response_time_ms:.1f}ms, P95={result.p95_response_time_ms:.1f}ms, P99={result.p99_response_time_ms:.1f}ms
├── Concurrency: max={result.max_concurrent_requests} concurrent, avg={result.avg_concurrent_requests:.1f}
├── Resources: {result.peak_memory_mb:.1f}MB peak memory, {result.avg_cpu_percent:.1f}% avg CPU
└── Errors: {result.error_rate_percent:.1f}% error rate"""

    if result.error_types:
        summary += f"\n    Error types: {dict(result.error_types)}"

    return summary


@performance_test(execution_speed=ExecutionSpeed.E2E_FULL, domain=Domain.VECTOR_BENCHMARK, timeout=1800)
async def benchmark_load_test(
    config: LoadTestConfiguration,
    session_maker: async_sessionmaker[AsyncSession],
    query_vectors: list[list[float]],
    logger: Any,
) -> LoadTestResult:
    logger.info("Starting load test benchmark", description=config.description)

    executor = LoadTestExecutor(session_maker)
    result = await executor.execute_search_load_test(config, query_vectors)

    logger.info(format_load_test_results(result))

    return result
