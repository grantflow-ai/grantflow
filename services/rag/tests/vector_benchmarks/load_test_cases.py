from typing import Any

import pytest
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from testing.benchmark_utils import benchmark_vector

from .data_test import BenchmarkDataGenerator
from .load_testing import (
    LOAD_TEST_CONFIGURATIONS,
    LoadTestConfiguration,
    LoadTestExecutor,
    LoadTestResult,
    format_load_test_results,
)
from .synthetic_migrations import VectorTableModifier

logger = get_logger(__name__)


@benchmark_vector(timeout=1800)
@pytest.mark.parametrize("config", LOAD_TEST_CONFIGURATIONS, ids=lambda c: c.name)
async def test_vector_search_load(
    async_session_maker: async_sessionmaker[AsyncSession],
    project: Any,
    config: LoadTestConfiguration,
    logger: Any,
) -> None:
    logger.info("Starting vector search load test", description=config.description)
    logger.info("Expected use case", expected_use_case=config.expected_use_case)

    async with async_session_maker() as session:
        modifier = VectorTableModifier(session)
        await modifier.modify_vector_dimension(config.vector_dimension)
        await modifier.modify_index_parameters(m=48, ef_construction=256)

    from packages.db.src.tables import GrantApplication, GrantApplicationSource
    from testing.factories import GrantApplicationFactory, RagFileFactory

    async with async_session_maker() as session:
        await session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))
        await session.commit()

        grant_app_query = await session.execute(select(GrantApplication).filter_by(project_id=project.id))
        grant_app = grant_app_query.scalar_one_or_none()
        if not grant_app:
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
        await session.refresh(app_rag)

        generator = BenchmarkDataGenerator(session)
        chunks = await generator.generate_test_chunks(config.dataset_size, rag_source.id)
        vectors = await generator.create_test_vectors(chunks, rag_source.id, config.vector_dimension)
        await generator.insert_vectors_to_database(vectors)

        logger.info("Created test vectors for load testing", vector_count=len(vectors))

    query_vectors = []
    query_count = config.concurrent_users * 3

    for i in range(query_count):
        query_vector = [0.1 * ((i + 1) % 10)] * config.vector_dimension

        norm = sum(x * x for x in query_vector) ** 0.5
        if norm > 0:
            query_vector = [x / norm for x in query_vector]
        query_vectors.append(query_vector)

    executor = LoadTestExecutor(async_session_maker)
    load_test_result: LoadTestResult = await executor.execute_search_load_test(config, query_vectors)

    logger.info(format_load_test_results(load_test_result))

    assert load_test_result.error_rate_percent < 5.0, f"Error rate too high: {load_test_result.error_rate_percent:.1f}%"
    assert load_test_result.avg_response_time_ms < 2000, (
        f"Average response time too high: {load_test_result.avg_response_time_ms:.1f}ms"
    )

    if config.name == "light_load":
        assert load_test_result.p95_response_time_ms < 500, (
            f"P95 response time too high for light load: {load_test_result.p95_response_time_ms:.1f}ms"
        )
        assert load_test_result.actual_rps > 10, f"RPS too low for light load: {load_test_result.actual_rps:.1f}"

    elif config.name == "normal_load":
        assert load_test_result.p95_response_time_ms < 1000, (
            f"P95 response time too high for normal load: {load_test_result.p95_response_time_ms:.1f}ms"
        )
        assert load_test_result.actual_rps > 20, f"RPS too low for normal load: {load_test_result.actual_rps:.1f}"

    elif config.name == "peak_load":
        assert load_test_result.p95_response_time_ms < 1500, (
            f"P95 response time too high for peak load: {load_test_result.p95_response_time_ms:.1f}ms"
        )
        assert load_test_result.actual_rps > 30, f"RPS too low for peak load: {load_test_result.actual_rps:.1f}"

    elif config.name == "spike_load":
        assert load_test_result.p99_response_time_ms < 5000, (
            f"P99 response time too high for spike load: {load_test_result.p99_response_time_ms:.1f}ms"
        )
        assert load_test_result.error_rate_percent < 10.0, (
            f"Error rate too high for spike load: {load_test_result.error_rate_percent:.1f}%"
        )

    elif config.name == "stress_test":
        assert load_test_result.error_rate_percent < 15.0, (
            f"Error rate too high for stress test: {load_test_result.error_rate_percent:.1f}%"
        )
        assert load_test_result.actual_rps > 20, f"RPS too low for stress test: {load_test_result.actual_rps:.1f}"

    logger.info("Load test passed all requirements", config_name=config.name)


@benchmark_vector(timeout=2400)
async def test_dimension_load_comparison(
    async_session_maker: async_sessionmaker[AsyncSession], project: Any, logger: Any
) -> None:
    logger.info("Starting dimension load comparison test")

    dimensions_to_test = [128, 256, 384]
    load_config = LoadTestConfiguration(
        name="dimension_load_test",
        description="Load test for dimension comparison",
        concurrent_users=20,
        requests_per_user=15,
        ramp_up_time_seconds=5.0,
        vector_dimension=384,
        dataset_size=10000,
        search_k=10,
        load_pattern="constant",
    )

    results: dict[int, LoadTestResult] = {}

    for dimension in dimensions_to_test:
        logger.info("Testing vector dimension", dimension=dimension)

        load_config.vector_dimension = dimension

        async with async_session_maker() as session:
            modifier = VectorTableModifier(session)
            await modifier.modify_vector_dimension(dimension)

            from packages.db.src.tables import GrantApplicationSource
            from testing.factories import GrantApplicationFactory, RagFileFactory

            grant_app = await GrantApplicationFactory.create_async()
            rag_source = await RagFileFactory.create_async(content_type="application/pdf")

            app_rag = GrantApplicationSource(grant_application_id=grant_app.id, rag_source_id=rag_source.id)
            session.add(app_rag)
            await session.commit()

            generator = BenchmarkDataGenerator(session)
            await generator.generate_test_chunks(load_config.dataset_size, rag_source.id)
            query_vectors = await generator.generate_query_vectors(50, dimension)

        executor = LoadTestExecutor(async_session_maker)
        dim_result: LoadTestResult = await executor.execute_search_load_test(load_config, query_vectors)

        results[dimension] = dim_result

        logger.info(
            "Dimension load test completed",
            dimension=dimension,
            actual_rps=f"{dim_result.actual_rps:.1f}",
            avg_response_time_ms=f"{dim_result.avg_response_time_ms:.1f}",
            error_rate_percent=f"{dim_result.error_rate_percent:.1f}",
        )

    logger.info("Dimension load comparison summary:")
    for dimension, dim_result in results.items():
        logger.info(
            "Dimension summary",
            dimension=dimension,
            actual_rps=f"{dim_result.actual_rps:.1f}",
            avg_response_time_ms=f"{dim_result.avg_response_time_ms:.1f}",
            p95_response_time_ms=f"{dim_result.p95_response_time_ms:.1f}",
            error_rate_percent=f"{dim_result.error_rate_percent:.1f}",
        )

    for dimension, dim_result in results.items():
        assert dim_result.error_rate_percent < 10.0, (
            f"Dimension {dimension}d error rate too high: {dim_result.error_rate_percent:.1f}%"
        )
        assert dim_result.actual_rps > 5.0, f"Dimension {dimension}d RPS too low: {dim_result.actual_rps:.1f}"
        assert dim_result.avg_response_time_ms < 3000, (
            f"Dimension {dimension}d avg response time too high: {dim_result.avg_response_time_ms:.1f}ms"
        )

    logger.info("✅ All dimensions passed load testing requirements")


@benchmark_vector(timeout=2400)
async def test_index_parameter_load_comparison(
    async_session_maker: async_sessionmaker[AsyncSession], project: Any, logger: Any
) -> None:
    logger.info("Starting index parameter load comparison test")

    index_params = {
        "light_index": {"m": 16, "ef": 64},
        "balanced_index": {"m": 32, "ef": 128},
        "quality_index": {"m": 64, "ef": 256},
    }

    async with async_session_maker() as session:
        modifier = VectorTableModifier(session)
        await modifier.modify_vector_dimension(384)

    load_config = LoadTestConfiguration(
        name="index_parameter_test",
        description="Load test for index parameter comparison",
        concurrent_users=15,
        requests_per_user=10,
        ramp_up_time_seconds=5.0,
        vector_dimension=384,
        dataset_size=1000,
        search_k=10,
        load_pattern="constant",
    )

    results: dict[str, LoadTestResult] = {}

    names = list(index_params.keys())

    for name_obj in names:
        name = str(name_obj)
        params = index_params[name]

        m_value = params.get("m", 48)
        ef_value = params.get("ef", 80)

        m = int(str(m_value)) if m_value is not None else 48
        ef_search = int(str(ef_value)) if ef_value is not None else 80

        logger.info("Testing index parameters", name=name, m=m, ef_search=ef_search)

        async with async_session_maker() as session:
            modifier = VectorTableModifier(session)
            await modifier.modify_index_parameters(m=m, ef_construction=ef_search)

            from packages.db.src.tables import GrantApplicationSource
            from testing.factories import GrantApplicationFactory, RagFileFactory

            grant_app = await GrantApplicationFactory.create_async()
            rag_source = await RagFileFactory.create_async(content_type="application/pdf")

            app_rag = GrantApplicationSource(grant_application_id=grant_app.id, rag_source_id=rag_source.id)
            session.add(app_rag)
            await session.commit()

            generator = BenchmarkDataGenerator(session)
            await generator.generate_test_chunks(load_config.dataset_size, rag_source.id)
            query_vectors = await generator.generate_query_vectors(50, 384)

        executor = LoadTestExecutor(async_session_maker)
        idx_result: LoadTestResult = await executor.execute_search_load_test(load_config, query_vectors)

        results[name] = idx_result

        logger.info(
            "Index load test completed",
            name=name,
            actual_rps=f"{idx_result.actual_rps:.1f}",
            avg_response_time_ms=f"{idx_result.avg_response_time_ms:.1f}",
            error_rate_percent=f"{idx_result.error_rate_percent:.1f}",
        )

    logger.info("Index parameter load comparison summary:")
    for name, result_value in results.items():
        logger.info(
            "Index summary",
            name=name,
            actual_rps=f"{result_value.actual_rps:.1f}",
            avg_response_time_ms=f"{result_value.avg_response_time_ms:.1f}",
            p95_response_time_ms=f"{result_value.p95_response_time_ms:.1f}",
            error_rate_percent=f"{result_value.error_rate_percent:.1f}",
        )

    best_config = None
    best_score = 0.0

    for name, result_value in results.items():
        score = result_value.actual_rps / (result_value.p95_response_time_ms + 1.0)
        if best_config is None or score > best_score:
            best_config = name
            best_score = score

    logger.info("Best index configuration", best_config=best_config, score=f"{best_score:.4f}")


async def test_result_quality_by_dimension(
    async_session_maker: async_sessionmaker[AsyncSession], project: Any, logger: Any
) -> None:
    logger.info("Starting result quality by dimension test")

    dimensions_to_test = [128, 256, 384]

    for dimension in dimensions_to_test:
        logger.info("Testing dimension result quality", dimension=dimension)

        async with async_session_maker() as session:
            modifier = VectorTableModifier(session)
            await modifier.modify_vector_dimension(dimension)
            await modifier.modify_index_parameters(m=32, ef_construction=256)

            from packages.db.src.tables import GrantApplicationSource
            from testing.factories import GrantApplicationFactory, RagFileFactory

            grant_app = await GrantApplicationFactory.create_async()
            rag_source = await RagFileFactory.create_async(content_type="application/pdf")

            app_rag = GrantApplicationSource(grant_application_id=grant_app.id, rag_source_id=rag_source.id)
            session.add(app_rag)
            await session.commit()

            generator = BenchmarkDataGenerator(session)
            chunks = await generator.generate_test_chunks(500, rag_source.id)

            vectors = await generator.create_test_vectors(chunks[:1], rag_source.id, dimension)
            query_vector = vectors[0]["embedding"]

            try:
                from packages.db.src.operations import vector_ops  # type: ignore

                for ef_search in [10, 50, 200]:
                    search_result = await vector_ops.search_vectors(session, query_vector, k=5, ef_search=ef_search)
                    result_count = len(search_result)
                    logger.info(
                        "Search results",
                        dimension=dimension,
                        ef_search=ef_search,
                        result_count=result_count,
                    )
                    assert result_count > 0, f"No results found with dimension {dimension}, ef_search {ef_search}"
            except ImportError:
                logger.warning("vector_ops module not found, skipping search quality test")
