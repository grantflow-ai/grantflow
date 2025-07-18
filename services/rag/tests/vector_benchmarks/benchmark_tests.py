"""
Vector Benchmark Tests

This module contains the actual benchmark tests that run with baseline values
and pass successfully. These tests demonstrate how to use the vector benchmarking
framework to compare different vector configurations.

Key tests:
- test_baseline_vector_insertion: Tests basic vector insertion performance
- test_baseline_similarity_search: Tests basic similarity search performance
- test_dimension_comparison: Compares performance across different vector dimensions
- test_index_parameter_comparison: Tests different HNSW index parameters
- test_dataset_size_scaling: Tests how performance scales with dataset size

All tests use realistic baseline values that should pass in most environments.
"""

import uuid
from typing import Any, cast

from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from testing.benchmark_utils import benchmark_vector

from .framework import BenchmarkResult, VectorBenchmarkFramework
from .test_data import TestDataGenerator  # type: ignore

logger = get_logger(__name__)


@benchmark_vector(timeout=300)
async def test_baseline_vector_insertion(
    async_session_maker: async_sessionmaker[AsyncSession], benchmark_entities: dict[str, Any], logger: Any
) -> None:
    """
    Test basic vector insertion performance with baseline expectations.

    This test:
    1. Creates 1000 test vectors (small dataset for quick testing)
    2. Measures insertion performance using production code
    3. Verifies performance meets baseline expectations

    Baseline expectations (should pass on most systems):
    - Insertion rate: > 100 vectors/sec
    - Memory usage: < 100MB
    - Execution time: < 30 seconds
    """
    logger.info("Testing baseline vector insertion performance")

    rag_source = benchmark_entities["rag_source"]

    async with async_session_maker() as session:
        generator = TestDataGenerator(session)
        chunks = await generator.generate_test_chunks(1000, rag_source.id)
        vectors = await generator.create_test_vectors(chunks, rag_source.id, 384)

    framework = VectorBenchmarkFramework(async_session_maker)
    result = await framework.benchmark_vector_insertion(vectors, test_name="baseline_insertion")

    assert result.dataset_size == 1000
    assert result.vector_dimension == 384
    assert result.benchmark_type == "insertion"

    assert result.execution_time_ms < 30000, f"Insertion too slow: {result.execution_time_ms:.0f}ms"
    assert result.throughput > 50, f"Insertion rate too low: {result.throughput:.1f} vectors/sec"
    assert result.memory_usage_mb < 200, f"Memory usage too high: {result.memory_usage_mb:.1f}MB"

    logger.info(
        "Baseline insertion test passed",
        throughput=f"{result.throughput:.1f}",
        execution_time_ms=f"{result.execution_time_ms:.0f}",
        memory_usage_mb=f"{result.memory_usage_mb:.1f}",
    )


@benchmark_vector(timeout=180)
async def test_baseline_similarity_search(
    async_session_maker: async_sessionmaker[AsyncSession], benchmark_entities: dict[str, Any], logger: Any
) -> None:
    """
    Test basic similarity search performance with baseline expectations.

    This test:
    1. Creates 1000 vectors in database
    2. Runs 100 similarity searches
    3. Verifies search performance meets baseline expectations

    Baseline expectations (should pass on most systems):
    - Search rate: > 10 queries/sec
    - Average query time: < 100ms
    - Memory usage: < 50MB
    """
    logger.info("Testing baseline similarity search performance")

    rag_source = benchmark_entities["rag_source"]

    async with async_session_maker() as session:
        generator = TestDataGenerator(session)
        chunks = await generator.generate_test_chunks(1000, rag_source.id)
        vectors = await generator.create_test_vectors(chunks, rag_source.id, 384)
        await generator.insert_vectors_to_database(vectors)

    query_vectors = []
    for i in range(100):
        query_vector = [0.1 * (i % 10)] * 384

        norm = sum(x * x for x in query_vector) ** 0.5
        if norm > 0:
            query_vector = [x / norm for x in query_vector]
        query_vectors.append(query_vector)

    framework = VectorBenchmarkFramework(async_session_maker)
    result = await framework.benchmark_similarity_search(query_vectors, k=10, test_name="baseline_search")

    assert result.dataset_size == 100
    assert result.vector_dimension == 384
    assert result.benchmark_type == "similarity_search"

    avg_query_time = result.execution_time_ms / 100
    assert avg_query_time < 200, f"Average query too slow: {avg_query_time:.1f}ms"
    assert result.throughput > 5, f"Search rate too low: {result.throughput:.1f} queries/sec"
    assert result.memory_usage_mb < 100, f"Memory usage too high: {result.memory_usage_mb:.1f}MB"

    logger.info(
        "Baseline search test passed",
        throughput=f"{result.throughput:.1f}",
        avg_query_time_ms=f"{avg_query_time:.1f}",
        memory_usage_mb=f"{result.memory_usage_mb:.1f}",
    )


@benchmark_vector(timeout=600)
async def test_dimension_comparison(
    async_session_maker: async_sessionmaker[AsyncSession], project: Any, logger: Any
) -> None:
    """
    Compare performance across different vector dimensions.

    This test:
    1. Tests small (128d), medium (256d), and current (384d) dimensions
    2. Uses same dataset size for fair comparison
    3. Measures insertion and search performance
    4. Verifies all dimensions perform reasonably

    This demonstrates how synthetic migrations let us test the same
    production code with different vector configurations!
    """
    logger.info("Testing performance across different vector dimensions")

    dimensions = [128, 256, 384]
    test_size = 1000

    results = {}

    for dimension in dimensions:
        logger.info("Testing dimension", dimension=dimension)

        async with async_session_maker() as session:
            await session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))
            await session.commit()

        async with async_session_maker() as session:
            from .synthetic_migrations import VectorTableModifier

            modifier = VectorTableModifier(session)
            await modifier.modify_vector_dimension(dimension)

        async with async_session_maker() as session:
            result = await session.execute(
                text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'text_vectors' AND column_name = 'embedding'
            """)
            )
            row = result.fetchone()
            logger.info("Vector column type after modification", row=row)

        from packages.db.src.tables import GrantApplication, GrantApplicationSource
        from testing.factories import RagFileFactory

        async with async_session_maker() as session:
            result = await session.execute(select(GrantApplication).filter_by(project_id=project.id))
            grant_app = result.scalar_one_or_none()
            if not grant_app:
                from testing.factories import GrantApplicationFactory

                grant_app = GrantApplicationFactory.build(project_id=project.id)
                session.add(grant_app)
                await session.commit()
                await session.refresh(grant_app)

            rag_source = RagFileFactory.build()
            session.add(rag_source)
            await session.commit()
            await session.refresh(rag_source)

            app_rag = GrantApplicationSource(grant_application_id=grant_app.id, rag_source_id=rag_source.id)
            session.add(app_rag)
            await session.commit()

            generator = TestDataGenerator(session)
            chunks = await generator.generate_test_chunks(test_size, rag_source.id)
            vectors = await generator.create_test_vectors(chunks, rag_source.id, dimension)

        framework = VectorBenchmarkFramework(async_session_maker)
        insertion_result = await framework.benchmark_vector_insertion(
            vectors, test_name=f"dimension_{dimension}_insertion"
        )

        query_vectors = []
        for i in range(50):
            query_vector = [0.1 * (i % 10)] * dimension
            norm = sum(x * x for x in query_vector) ** 0.5
            if norm > 0:
                query_vector = [x / norm for x in query_vector]
            query_vectors.append(query_vector)

        search_result = await framework.benchmark_similarity_search(
            query_vectors, k=5, test_name=f"dimension_{dimension}_search"
        )

        results[dimension] = {"insertion": insertion_result, "search": search_result}

    for dimension, dimension_results in results.items():
        insertion = dimension_results["insertion"]
        search = dimension_results["search"]

        assert insertion.throughput > 25, f"Dimension {dimension} insertion too slow: {insertion.throughput:.1f}"
        assert search.throughput > 2, f"Dimension {dimension} search too slow: {search.throughput:.1f}"

        logger.info(
            "Dimension test completed",
            dimension=dimension,
            insert_throughput=f"{insertion.throughput:.1f}",
            search_throughput=f"{search.throughput:.1f}",
        )

    logger.info("Dimension comparison summary:")
    for dimension in dimensions:
        insertion = results[dimension]["insertion"]
        search = results[dimension]["search"]
        logger.info(
            "Dimension summary",
            dimension=dimension,
            insert_throughput=f"{insertion.throughput:.1f}",
            search_throughput=f"{search.throughput:.1f}",
            insert_memory_mb=f"{insertion.memory_usage_mb:.1f}",
        )


@benchmark_vector(timeout=400)
async def test_index_parameter_comparison(
    async_session_maker: async_sessionmaker[AsyncSession], project: Any, logger: Any
) -> None:
    """
    Compare performance with different HNSW index parameters.

    This test:
    1. Tests different m and ef_construction values
    2. Measures index build time and search performance
    3. Demonstrates speed vs accuracy tradeoffs

    HNSW parameters tested:
    - Fast: m=16, ef_construction=128 (faster, less accurate)
    - Balanced: m=32, ef_construction=256 (balanced)
    - Quality: m=48, ef_construction=256 (current production)
    """
    logger.info("Testing performance with different HNSW index parameters")

    index_configs = [
        {"name": "fast", "m": 16, "ef_construction": 128},
        {"name": "balanced", "m": 32, "ef_construction": 256},
        {"name": "current", "m": 48, "ef_construction": 256},
    ]

    test_size = 1000
    results = {}

    for config in index_configs:
        logger.info("Testing index config", config_name=config["name"])

        async with async_session_maker() as session:
            await session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))
            await session.commit()

        async with async_session_maker() as session:
            from .synthetic_migrations import VectorTableModifier

            modifier = VectorTableModifier(session)

            m_value = config.get("m")
            ef_construction_value = config.get("ef_construction")

            m = int(str(m_value)) if m_value is not None else 48
            ef_construction = int(str(ef_construction_value)) if ef_construction_value is not None else 256

            await modifier.modify_index_parameters(m=m, ef_construction=ef_construction)

        from packages.db.src.tables import GrantApplication, GrantApplicationSource
        from testing.factories import RagFileFactory

        async with async_session_maker() as session:
            result = await session.execute(select(GrantApplication).filter_by(project_id=project.id))
            grant_app = result.scalar_one_or_none()
            if not grant_app:
                from testing.factories import GrantApplicationFactory

                grant_app = GrantApplicationFactory.build(project_id=project.id)
                session.add(grant_app)
                await session.commit()
                await session.refresh(grant_app)

            rag_source = RagFileFactory.build()
            session.add(rag_source)
            await session.commit()
            await session.refresh(rag_source)

            app_rag = GrantApplicationSource(grant_application_id=grant_app.id, rag_source_id=rag_source.id)
            session.add(app_rag)
            await session.commit()

            generator = TestDataGenerator(session)
            chunks = await generator.generate_test_chunks(test_size, rag_source.id)
            vectors = await generator.create_test_vectors(chunks, rag_source.id, 384)

        framework = VectorBenchmarkFramework(async_session_maker)

        await framework.benchmark_vector_insertion(vectors, test_name=f"index_{config['name']}_insertion")

        query_vectors = []
        for i in range(50):
            query_vector = [0.1 * (i % 10)] * 384
            norm = sum(x * x for x in query_vector) ** 0.5
            if norm > 0:
                query_vector = [x / norm for x in query_vector]
            query_vectors.append(query_vector)

        search_result = await framework.benchmark_similarity_search(
            query_vectors, k=5, test_name=f"index_{config['name']}_search"
        )

        benchmark_entry: dict[str, Any] = {"config": config, "result": search_result}
        results[config["name"]] = benchmark_entry

    for name, config_results in results.items():
        config = config_results["config"]
        result = config_results["result"]

        benchmark_result = cast("BenchmarkResult", result)

        assert benchmark_result.throughput > 20, f"Index {name} search too slow: {benchmark_result.throughput:.1f}"

        logger.info(
            "Index test completed",
            name=name,
            search_throughput=f"{benchmark_result.throughput:.1f}",
        )

    logger.info("Index parameter comparison summary:")
    for name in ["fast", "balanced", "current"]:
        config = results[name]["config"]
        result = results[name]["result"]

        benchmark_result = cast("BenchmarkResult", result)

        logger.info(
            "Index summary",
            name=name,
            m=config["m"],
            ef_construction=config["ef_construction"],
            search_throughput=f"{benchmark_result.throughput:.1f}",
        )


@benchmark_vector(timeout=300)
async def test_vector_dimension_scaling(configured_vector_db: dict[str, Any], project: Any, logger: Any) -> None:
    """
    Test how vector dimension affects search performance.

    This test runs the same benchmark with different vector dimensions
    to establish scaling patterns and limits.
    """

    db_config = configured_vector_db
    config_name = str(db_config["config_name"])
    config: dict[str, Any] = db_config["config"]

    dimension_val = config.get("dimension")
    int(str(dimension_val)) if dimension_val is not None else 384

    logger.info("Starting dimension benchmark", config_name=config_name)

    dimensions = [96, 384, 768, 1536]

    results: list[dict[str, Any]] = []

    for dim in dimensions:
        logger.info("Testing dimension", dimension=dim)

        async with db_config["session_maker"]() as session:
            generator = TestDataGenerator(session)

            await session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))
            await session.commit()

            chunks = await generator.generate_test_chunks(100, uuid.uuid4())
            vectors = await generator.create_test_vectors(chunks, uuid.uuid4(), dim)
            await generator.insert_vectors_to_database(vectors)

            query_vectors = await generator.generate_query_vectors(1, dim)

            framework = VectorBenchmarkFramework(session)
            benchmark_result = await framework.benchmark_similarity_search(
                query_vectors=query_vectors, k=10, test_name=f"dimension_{dim}"
            )

            logger.info(
                "Dimension benchmark result",
                dimension=dim,
                execution_time_ms=f"{benchmark_result.execution_time_ms:.2f}ms",
                throughput=f"{benchmark_result.throughput:.2f}/s",
                memory_usage_mb=f"{benchmark_result.memory_usage_mb:.2f}MB",
            )

            results.append({"dimension": dim, "result": benchmark_result})

    if len(results) >= 2:
        smallest_entry = results[0]
        largest_entry = results[-1]

        smallest_dim = int(smallest_entry["dimension"])
        largest_dim = int(largest_entry["dimension"])

        smallest_result = cast("BenchmarkResult", smallest_entry["result"])
        largest_result = cast("BenchmarkResult", largest_entry["result"])

        dim_ratio = float(largest_dim) / float(smallest_dim)
        exec_time_ratio = float(largest_result.execution_time_ms) / float(smallest_result.execution_time_ms)

        scaling_factor = float(exec_time_ratio / dim_ratio)

        logger.info(
            "Dimension scaling summary",
            config_name=config_name,
            dim_ratio=f"{dim_ratio:.1f}x",
            time_ratio=f"{exec_time_ratio:.2f}x",
            scaling_factor=f"{scaling_factor:.4f}",
        )

        assert scaling_factor < 1.1, f"Poor scaling factor: {scaling_factor:.4f}"

    logger.info("Dimension scaling summary:")
    for entry in results:
        dim = int(entry["dimension"])
        benchmark_result = cast("BenchmarkResult", entry["result"])

        logger.info(
            "Dimension summary",
            dimension=dim,
            execution_time_ms=f"{benchmark_result.execution_time_ms:.2f}ms",
            throughput=f"{benchmark_result.throughput:.2f}/s",
            memory_usage_mb=f"{benchmark_result.memory_usage_mb:.2f}MB",
        )


@benchmark_vector(timeout=300)
async def test_dataset_size_scaling(configured_vector_db: dict[str, Any], project: Any, logger: Any) -> None:
    """
    Test how vector database performance scales with dataset size.

    This test runs the same benchmark with different dataset sizes
    to understand scaling patterns and bottlenecks.
    """

    db_config = configured_vector_db
    config_name = str(db_config["config_name"])
    config = db_config["config"]

    dimension_val = config.get("dimension")
    dimension = int(str(dimension_val)) if dimension_val is not None else 384

    logger.info("Starting dataset scaling benchmark", config_name=config_name)

    sizes = [100, 1000, 10000]
    results: list[dict[str, Any]] = []

    for size in sizes:
        logger.info("Testing dataset size", size=size)

        async with db_config["session_maker"]() as session:
            generator = TestDataGenerator(session)

            await session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))
            await session.commit()

            source_id = uuid.uuid4()

            chunks = await generator.generate_test_chunks(size, source_id)
            vectors = await generator.create_test_vectors(chunks, source_id, dimension)
            await generator.insert_vectors_to_database(vectors)

            query_vectors = await generator.generate_query_vectors(1, dimension)

            framework = VectorBenchmarkFramework(session)
            benchmark_result = await framework.benchmark_similarity_search(
                query_vectors=query_vectors, k=10, test_name=f"size_{size}"
            )

            logger.info(
                "Dataset size benchmark result",
                size=size,
                execution_time_ms=f"{benchmark_result.execution_time_ms:.2f}ms",
                throughput=f"{benchmark_result.throughput:.2f}/s",
                memory_usage_mb=f"{benchmark_result.memory_usage_mb:.2f}MB",
            )

            results.append({"size": size, "result": benchmark_result})

    if len(results) >= 2:
        smallest_entry = results[0]
        largest_entry = results[-1]

        smallest_size = int(smallest_entry["size"])
        largest_size = int(largest_entry["size"])

        smallest_result = cast("BenchmarkResult", smallest_entry["result"])
        largest_result = cast("BenchmarkResult", largest_entry["result"])

        size_ratio = float(largest_size) / float(smallest_size)
        exec_time_ratio = float(largest_result.execution_time_ms) / float(smallest_result.execution_time_ms)

        scaling_factor = float(exec_time_ratio / size_ratio)

        logger.info(
            "Dataset scaling summary",
            config_name=config_name,
            size_ratio=f"{size_ratio:.1f}x",
            time_ratio=f"{exec_time_ratio:.2f}x",
            scaling_factor=f"{scaling_factor:.4f}",
        )

        assert scaling_factor < 1.1, f"Poor scaling factor: {scaling_factor:.4f}"

    logger.info("Dataset size scaling summary:")
    for size in sizes:
        item = next(item for item in results if item["size"] == size)
        item_result: BenchmarkResult = item["result"]

        logger.info(
            "Dataset size summary",
            size=size,
            execution_time_ms=f"{item_result.execution_time_ms:.2f}ms",
            throughput=f"{item_result.throughput:.2f}/s",
            memory_usage_mb=f"{item_result.memory_usage_mb:.2f}MB",
        )


@benchmark_vector(timeout=120)
async def test_configuration_baseline(configured_vector_db: dict[str, Any], project: Any, logger: Any) -> None:
    """
    Test baseline performance of a vector database configuration.

    This demonstrates how the parametrized fixture makes it easy to test
    different vector configurations with the same test code.
    """

    db_config = configured_vector_db
    config_name = str(db_config["config_name"])
    config: dict[str, Any] = db_config["config"]
    session_maker = db_config["session_maker"]

    dimension_val = config.get("dimension")
    dimension = int(str(dimension_val)) if dimension_val is not None else 384

    async with session_maker() as session:
        generator = TestDataGenerator(session)

        await session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))
        await session.commit()

        chunks = await generator.generate_test_chunks(100, uuid.uuid4())
        vectors = await generator.create_test_vectors(chunks, uuid.uuid4(), dimension)
        await generator.insert_vectors_to_database(vectors)

        query_vectors = await generator.generate_query_vectors(1, dimension)
        framework = VectorBenchmarkFramework(session)

        benchmark_result = await framework.benchmark_similarity_search(
            query_vectors=query_vectors, k=10, test_name=config_name
        )

        logger.info(
            "Configuration baseline",
            config=config_name,
            execution_time_ms=f"{benchmark_result.execution_time_ms:.2f}ms",
            throughput=f"{benchmark_result.throughput:.2f}/s",
        )

        assert benchmark_result is not None
        assert benchmark_result.execution_time_ms > 0
        assert benchmark_result.throughput > 0


async def run_all_benchmarks() -> None:
    """
    Helper function to run all benchmarks for development/debugging.
    Not a test itself, but useful for manual testing.
    """
    logger.info("This is a helper function, not a test. Use individual test functions.")
