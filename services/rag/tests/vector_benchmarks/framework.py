import time
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any

import psutil
from packages.db.src.tables import TextVector
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


@dataclass(slots=True)
class BenchmarkResult:
    test_name: str
    vector_dimension: int
    dataset_size: int
    benchmark_type: str
    execution_time_ms: float
    memory_usage_mb: float
    throughput: float
    additional_metrics: dict[str, Any]
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))


class PerformanceMetrics:
    def __init__(self, test_name: str, dataset_size: int = 0) -> None:
        self.test_name = test_name
        self.dataset_size = dataset_size
        self.start_time: float | None = None
        self.end_time: float | None = None
        self.memory_before: float | None = None
        self.memory_after: float | None = None
        self.additional_metrics: dict[str, Any] = {}
        self.process = psutil.Process()

    async def __aenter__(self) -> "PerformanceMetrics":
        self.memory_before = self.process.memory_info().rss / 1024 / 1024
        self.start_time = time.time()
        logger.debug("Starting performance measurement", test_name=self.test_name)
        return self

    async def __aexit__(self, exc_type: object, exc_val: object, exc_tb: object) -> None:
        self.end_time = time.time()
        self.memory_after = self.process.memory_info().rss / 1024 / 1024

        execution_time = ((self.end_time or 0) - (self.start_time or 0)) * 1000
        memory_usage = (self.memory_after or 0) - (self.memory_before or 0)

        logger.debug(
            "Completed performance measurement",
            test_name=self.test_name,
            execution_time_ms=execution_time,
            memory_usage_mb=memory_usage,
        )

    def add_metric(self, name: str, value: Any) -> None:
        self.additional_metrics[name] = value

    def get_result(self, benchmark_type: str, vector_dimension: int) -> BenchmarkResult:
        if self.start_time is None or self.end_time is None:
            raise RuntimeError("Performance measurement not completed")

        execution_time = ((self.end_time or 0) - (self.start_time or 0)) * 1000
        memory_usage = (self.memory_after or 0) - (self.memory_before or 0)

        throughput = 0.0
        if execution_time > 0 and self.dataset_size > 0:
            throughput = (self.dataset_size / execution_time) * 1000

        return BenchmarkResult(
            test_name=self.test_name,
            vector_dimension=vector_dimension,
            dataset_size=self.dataset_size,
            benchmark_type=benchmark_type,
            execution_time_ms=execution_time,
            memory_usage_mb=memory_usage,
            throughput=throughput,
            additional_metrics=self.additional_metrics,
        )


class VectorBenchmarkFramework:
    def __init__(self, session_maker: async_sessionmaker[Any]) -> None:
        self.session_maker = session_maker
        self.results: list[BenchmarkResult] = []

    async def benchmark_vector_insertion(
        self, vectors: list[VectorDTO], batch_size: int = 1000, test_name: str = "vector_insertion"
    ) -> BenchmarkResult:
        vector_dimension = len(vectors[0]["embedding"]) if vectors else 0

        async with PerformanceMetrics(test_name, len(vectors)) as metrics, self.session_maker() as session:
            use_raw_sql = vector_dimension != 384

            for i in range(0, len(vectors), batch_size):
                batch = vectors[i : i + batch_size]

                if use_raw_sql:
                    import json
                    import uuid

                    from sqlalchemy import text

                    for vector_dto in batch:
                        embedding_str = "[" + ",".join(str(x) for x in vector_dto["embedding"]) + "]"

                        vector_id = str(uuid.uuid4())
                        chunk_json = json.dumps(vector_dto["chunk"])

                        query = f"""
                                INSERT INTO text_vectors (id, chunk, embedding, rag_source_id, created_at, updated_at)
                                VALUES (
                                    '{vector_id}'::uuid,
                                    '{chunk_json.replace("'", "''")}'::jsonb,
                                    '{embedding_str}'::vector({vector_dimension}),
                                    '{vector_dto["rag_source_id"]}'::uuid,
                                    NOW(),
                                    NOW()
                                )
                            """
                        await session.execute(text(query))
                else:
                    text_vectors = []
                    for vector_dto in batch:
                        text_vector = TextVector(
                            embedding=vector_dto["embedding"],
                            chunk=vector_dto["chunk"],
                            rag_source_id=vector_dto["rag_source_id"],
                        )
                        text_vectors.append(text_vector)

                    session.add_all(text_vectors)

                await session.commit()

                batch_num = i // batch_size + 1
                total_batches = (len(vectors) + batch_size - 1) // batch_size
                logger.debug("Inserted batch", batch_num=batch_num, total_batches=total_batches)

            metrics.add_metric("batch_size", batch_size)
            metrics.add_metric("total_batches", total_batches)

        result = metrics.get_result("insertion", vector_dimension)
        self.results.append(result)

        logger.info("Vector insertion benchmark completed", throughput=result.throughput)
        return result

    async def benchmark_similarity_search(
        self, query_vectors: list[list[float]], k: int = 10, test_name: str = "similarity_search"
    ) -> BenchmarkResult:
        vector_dimension = len(query_vectors[0]) if query_vectors else 0

        async with PerformanceMetrics(test_name, len(query_vectors)) as metrics, self.session_maker() as session:
            total_results = 0

            use_raw_sql = vector_dimension != 384

            for query_vector in query_vectors:
                if use_raw_sql:
                    embedding_str = "[" + ",".join(str(x) for x in query_vector) + "]"

                    raw_query = text(f"""
                        SELECT chunk, embedding, rag_source_id, id, created_at, updated_at
                        FROM text_vectors
                        ORDER BY embedding <=> '{embedding_str}'::vector({vector_dimension})
                        LIMIT :k
                    """)

                    result = await session.execute(raw_query, {"k": k})
                    vectors = result.fetchall()
                    total_results += len(vectors)
                else:
                    query = select(TextVector).order_by(TextVector.embedding.cosine_distance(query_vector)).limit(k)

                    result = await session.execute(query)
                    vectors = result.scalars().all()
                    total_results += len(vectors)

            metrics.add_metric("k", k)
            metrics.add_metric("total_results", total_results)
            metrics.add_metric("avg_results_per_query", total_results / len(query_vectors))

        result = metrics.get_result("similarity_search", vector_dimension)
        self.results.append(result)

        logger.info("Similarity search benchmark completed", throughput=result.throughput)
        return result

    async def benchmark_index_build(self, test_name: str = "index_build") -> BenchmarkResult:
        async with PerformanceMetrics(test_name, 0) as metrics, self.session_maker() as session:
            count_query = select(func.count(TextVector.id))
            result = await session.execute(count_query)
            vector_count = result.scalar()

            await session.execute(text("REINDEX TABLE text_vectors"))

            metrics.add_metric("vector_count", vector_count)

        result = metrics.get_result("index_build", 0)
        result.dataset_size = metrics.additional_metrics.get("vector_count", 0)
        self.results.append(result)

        logger.info(
            "Index build benchmark completed",
            execution_time_ms=result.execution_time_ms,
            dataset_size=result.dataset_size,
        )
        return result

    async def benchmark_memory_usage(
        self, vector_counts: list[int], vector_dimension: int, test_name: str = "memory_usage"
    ) -> list[BenchmarkResult]:
        results = []

        for vector_count in vector_counts:
            async with (
                PerformanceMetrics(f"{test_name}_{vector_count}", vector_count) as metrics,
                self.session_maker() as session,
            ):
                count_query = select(func.count(TextVector.id))
                result = await session.execute(count_query)
                actual_count = result.scalar()

                size_query = text("SELECT pg_database_size(current_database())")
                result = await session.execute(size_query)
                db_size_bytes = result.scalar()
                db_size_mb = db_size_bytes / 1024 / 1024

                metrics.add_metric("actual_vector_count", actual_count)
                metrics.add_metric("database_size_mb", db_size_mb)

            result = metrics.get_result("memory_usage", vector_dimension)
            results.append(result)
            self.results.append(result)

        logger.info("Memory usage benchmark completed", dataset_sizes_count=len(vector_counts))
        return results

    async def run_comprehensive_benchmark(
        self, test_vectors: list[VectorDTO], query_vectors: list[list[float]], test_name: str = "comprehensive"
    ) -> dict[str, BenchmarkResult]:
        logger.info("Starting comprehensive benchmark", test_vectors_count=len(test_vectors))

        results = {}

        insertion_result = await self.benchmark_vector_insertion(test_vectors, test_name=f"{test_name}_insertion")
        results["insertion"] = insertion_result

        index_result = await self.benchmark_index_build(test_name=f"{test_name}_index_build")
        results["index_build"] = index_result

        search_result = await self.benchmark_similarity_search(query_vectors, test_name=f"{test_name}_search")
        results["search"] = search_result

        logger.info("Comprehensive benchmark completed")
        return results

    def get_all_results(self) -> list[BenchmarkResult]:
        return self.results.copy()

    def clear_results(self) -> None:
        self.results.clear()

    def export_results_to_dict(self) -> list[dict[str, Any]]:
        return [asdict(result) for result in self.results]
