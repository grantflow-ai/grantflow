from typing import Any

import pytest
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from testing.performance_framework import TestDomain, TestExecutionSpeed, performance_test

from .data_test import BenchmarkDataGenerator
from .framework import VectorBenchmarkFramework
from .parameter_matrix import (
    BATCH_OPTIMIZATION_MATRIX,
    DIMENSION_OPTIMIZATION_MATRIX,
    HNSW_OPTIMIZATION_MATRIX,
    PRODUCTION_CANDIDATES_MATRIX,
    SCALE_OPTIMIZATION_MATRIX,
    SEARCH_OPTIMIZATION_MATRIX,
    ParameterMatrix,
    VectorTestParameters,
)
from .synthetic_migrations import VectorTableModifier

logger = get_logger(__name__)


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.VECTOR_BENCHMARK, timeout=1800)
@pytest.mark.parametrize("params", DIMENSION_OPTIMIZATION_MATRIX, ids=lambda p: p.name)
async def test_dimension_optimization_matrix(
    async_session_maker: async_sessionmaker[AsyncSession],
    project: Any,
    params: VectorTestParameters,
    logger: Any,
) -> None:
    logger.info("Testing dimension optimization", description=params.description)
    logger.info("Parameters", dimension=params.dimension, dataset_size=params.dataset_size)

    async with async_session_maker() as session:
        modifier = VectorTableModifier(session)
        await modifier.modify_vector_dimension(params.dimension)
        await modifier.modify_index_parameters(params.m, params.ef_construction)

    from packages.db.src.tables import GrantApplication, GrantApplicationSource
    from testing.factories import GrantApplicationFactory, RagFileFactory

    async with async_session_maker() as session:
        await session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))
        await session.commit()

        result = await session.execute(select(GrantApplication).filter_by(project_id=project.id))
        grant_app = result.scalar_one_or_none()
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

        generator = BenchmarkDataGenerator(session)
        chunks = await generator.generate_test_chunks(params.dataset_size, rag_source.id)
        vectors = await generator.create_test_vectors(chunks, rag_source.id, params.dimension)

    framework = VectorBenchmarkFramework(async_session_maker)

    insertion_result = await framework.benchmark_vector_insertion(
        vectors, batch_size=params.batch_size, test_name=f"{params.name}_insertion"
    )

    query_vectors = []
    for i in range(100):
        query_vector = [0.1 * (i % 10)] * params.dimension
        norm = sum(x * x for x in query_vector) ** 0.5
        if norm > 0:
            query_vector = [x / norm for x in query_vector]
        query_vectors.append(query_vector)

    search_result = await framework.benchmark_similarity_search(
        query_vectors, k=params.search_k, test_name=f"{params.name}_search"
    )

    logger.info(
        "Dimension test completed",
        test_name=params.name,
        insert_throughput=f"{insertion_result.throughput:.1f}",
        search_throughput=f"{search_result.throughput:.1f}",
        memory_usage_mb=f"{insertion_result.memory_usage_mb:.1f}",
    )

    assert insertion_result.throughput > 20, f"Insert performance too low: {insertion_result.throughput:.1f}"
    assert search_result.throughput > 50, f"Search performance too low: {search_result.throughput:.1f}"


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.VECTOR_BENCHMARK, timeout=2400)
@pytest.mark.parametrize("params", HNSW_OPTIMIZATION_MATRIX, ids=lambda p: p.name)
async def test_hnsw_optimization_matrix(
    async_session_maker: async_sessionmaker[AsyncSession],
    project: Any,
    params: VectorTestParameters,
    logger: Any,
) -> None:
    logger.info("Testing HNSW optimization", description=params.description)
    logger.info("Parameters", m=params.m, ef_construction=params.ef_construction)

    async with async_session_maker() as session:
        modifier = VectorTableModifier(session)
        await modifier.modify_vector_dimension(params.dimension)
        await modifier.modify_index_parameters(params.m, params.ef_construction)

    from packages.db.src.tables import GrantApplication, GrantApplicationSource
    from testing.factories import GrantApplicationFactory, RagFileFactory

    async with async_session_maker() as session:
        await session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))
        await session.commit()

        result = await session.execute(select(GrantApplication).filter_by(project_id=project.id))
        grant_app = result.scalar_one_or_none()
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

        generator = BenchmarkDataGenerator(session)
        chunks = await generator.generate_test_chunks(params.dataset_size, rag_source.id)
        vectors = await generator.create_test_vectors(chunks, rag_source.id, params.dimension)

    framework = VectorBenchmarkFramework(async_session_maker)

    insertion_result = await framework.benchmark_vector_insertion(
        vectors, batch_size=params.batch_size, test_name=f"{params.name}_insertion"
    )

    query_vectors = []
    for i in range(100):
        query_vector = [0.1 * (i % 10)] * params.dimension
        norm = sum(x * x for x in query_vector) ** 0.5
        if norm > 0:
            query_vector = [x / norm for x in query_vector]
        query_vectors.append(query_vector)

    search_result = await framework.benchmark_similarity_search(
        query_vectors, k=params.search_k, test_name=f"{params.name}_search"
    )

    logger.info(
        "HNSW test completed",
        test_name=params.name,
        insert_throughput=f"{insertion_result.throughput:.1f}",
        search_throughput=f"{search_result.throughput:.1f}",
        m=params.m,
        ef_construction=params.ef_construction,
    )

    min_insert_threshold = 15 if params.m >= 48 else 25
    min_search_threshold = 30 if params.ef_construction >= 256 else 50

    assert insertion_result.throughput > min_insert_threshold, f"Insert too slow for M={params.m}"
    assert search_result.throughput > min_search_threshold, f"Search too slow for ef={params.ef_construction}"


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.VECTOR_BENCHMARK, timeout=3600)
@pytest.mark.parametrize("params", SCALE_OPTIMIZATION_MATRIX, ids=lambda p: p.name)
async def test_scale_optimization_matrix(
    async_session_maker: async_sessionmaker[AsyncSession],
    project: Any,
    params: VectorTestParameters,
    logger: Any,
) -> None:
    logger.info("Testing scale optimization", description=params.description)
    logger.info("Dataset size", dataset_size=params.dataset_size)

    async with async_session_maker() as session:
        modifier = VectorTableModifier(session)
        await modifier.modify_vector_dimension(params.dimension)
        await modifier.modify_index_parameters(params.m, params.ef_construction)

    from packages.db.src.tables import GrantApplication, GrantApplicationSource
    from testing.factories import GrantApplicationFactory, RagFileFactory

    async with async_session_maker() as session:
        await session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))
        await session.commit()

        result = await session.execute(select(GrantApplication).filter_by(project_id=project.id))
        grant_app = result.scalar_one_or_none()
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

        generator = BenchmarkDataGenerator(session)
        chunks = await generator.generate_test_chunks(params.dataset_size, rag_source.id)
        vectors = await generator.create_test_vectors(chunks, rag_source.id, params.dimension)

    framework = VectorBenchmarkFramework(async_session_maker)

    insertion_result = await framework.benchmark_vector_insertion(
        vectors, batch_size=params.batch_size, test_name=f"{params.name}_insertion"
    )

    query_count = min(200, params.dataset_size // 50)
    query_vectors = []
    for i in range(query_count):
        query_vector = [0.1 * (i % 10)] * params.dimension
        norm = sum(x * x for x in query_vector) ** 0.5
        if norm > 0:
            query_vector = [x / norm for x in query_vector]
        query_vectors.append(query_vector)

    search_result = await framework.benchmark_similarity_search(
        query_vectors, k=params.search_k, test_name=f"{params.name}_search"
    )

    logger.info(
        "Scale test completed",
        test_name=params.name,
        insert_throughput=f"{insertion_result.throughput:.1f}",
        search_throughput=f"{search_result.throughput:.1f}",
        dataset_size=params.dataset_size,
        query_count=query_count,
    )

    min_insert_threshold = max(10, 100 - (params.dataset_size // 1000))
    min_search_threshold = max(20, 200 - (params.dataset_size // 500))

    assert insertion_result.throughput > min_insert_threshold, f"Insert scaling poor at {params.dataset_size}"
    assert search_result.throughput > min_search_threshold, f"Search scaling poor at {params.dataset_size}"


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.VECTOR_BENCHMARK, timeout=900)
@pytest.mark.parametrize("params", BATCH_OPTIMIZATION_MATRIX, ids=lambda p: p.name)
async def test_batch_optimization_matrix(
    async_session_maker: async_sessionmaker[AsyncSession],
    project: Any,
    params: VectorTestParameters,
    logger: Any,
) -> None:
    logger.info("Testing batch optimization", description=params.description)
    logger.info("Batch size", batch_size=params.batch_size)

    async with async_session_maker() as session:
        modifier = VectorTableModifier(session)
        await modifier.modify_vector_dimension(params.dimension)
        await modifier.modify_index_parameters(params.m, params.ef_construction)

    from packages.db.src.tables import GrantApplication, GrantApplicationSource
    from testing.factories import GrantApplicationFactory, RagFileFactory

    async with async_session_maker() as session:
        await session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))
        await session.commit()

        result = await session.execute(select(GrantApplication).filter_by(project_id=project.id))
        grant_app = result.scalar_one_or_none()
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

        generator = BenchmarkDataGenerator(session)
        chunks = await generator.generate_test_chunks(params.dataset_size, rag_source.id)
        vectors = await generator.create_test_vectors(chunks, rag_source.id, params.dimension)

    framework = VectorBenchmarkFramework(async_session_maker)

    insertion_result = await framework.benchmark_vector_insertion(
        vectors, batch_size=params.batch_size, test_name=f"{params.name}_insertion"
    )

    logger.info(
        "Batch test completed",
        test_name=params.name,
        insert_throughput=f"{insertion_result.throughput:.1f}",
        batch_size=params.batch_size,
        memory_usage_mb=f"{insertion_result.memory_usage_mb:.1f}",
    )

    assert insertion_result.throughput > 15, f"Batch size {params.batch_size} too slow"
    assert insertion_result.memory_usage_mb < 500, f"Batch size {params.batch_size} uses too much memory"


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.VECTOR_BENCHMARK, timeout=600)
@pytest.mark.parametrize("params", SEARCH_OPTIMIZATION_MATRIX, ids=lambda p: p.name)
async def test_search_optimization_matrix(
    async_session_maker: async_sessionmaker[AsyncSession],
    project: Any,
    params: VectorTestParameters,
    logger: Any,
) -> None:
    logger.info("Testing search optimization", description=params.description)
    logger.info("Search k", search_k=params.search_k)

    async with async_session_maker() as session:
        modifier = VectorTableModifier(session)
        await modifier.modify_vector_dimension(params.dimension)
        await modifier.modify_index_parameters(params.m, params.ef_construction)

    from packages.db.src.tables import GrantApplication, GrantApplicationSource
    from testing.factories import GrantApplicationFactory, RagFileFactory

    async with async_session_maker() as session:
        await session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))
        await session.commit()

        result = await session.execute(select(GrantApplication).filter_by(project_id=project.id))
        grant_app = result.scalar_one_or_none()
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

        generator = BenchmarkDataGenerator(session)
        chunks = await generator.generate_test_chunks(params.dataset_size, rag_source.id)
        vectors = await generator.create_test_vectors(chunks, rag_source.id, params.dimension)

        await generator.insert_vectors_to_database(vectors)

    framework = VectorBenchmarkFramework(async_session_maker)

    query_vectors = []
    for i in range(100):
        query_vector = [0.1 * (i % 10)] * params.dimension
        norm = sum(x * x for x in query_vector) ** 0.5
        if norm > 0:
            query_vector = [x / norm for x in query_vector]
        query_vectors.append(query_vector)

    search_result = await framework.benchmark_similarity_search(
        query_vectors, k=params.search_k, test_name=f"{params.name}_search"
    )

    logger.info(
        "Search test completed",
        test_name=params.name,
        search_throughput=f"{search_result.throughput:.1f}",
        search_k=params.search_k,
        avg_latency_ms=f"{search_result.execution_time_ms / 100:.1f}",
    )

    min_threshold = max(20, 100 - (params.search_k * 2))
    assert search_result.throughput > min_threshold, f"Search k={params.search_k} too slow"


@performance_test(execution_speed=TestExecutionSpeed.QUALITY, domain=TestDomain.VECTOR_BENCHMARK, timeout=4800)
@pytest.mark.parametrize("params", PRODUCTION_CANDIDATES_MATRIX, ids=lambda p: p.name)
async def test_production_candidates_matrix(
    async_session_maker: async_sessionmaker[AsyncSession],
    project: Any,
    params: VectorTestParameters,
    logger: Any,
) -> None:
    logger.info("Testing production candidate", description=params.description)
    logger.info("Expected use case", expected_use_case=params.expected_use_case)

    async with async_session_maker() as session:
        modifier = VectorTableModifier(session)
        await modifier.modify_vector_dimension(params.dimension)
        await modifier.modify_index_parameters(params.m, params.ef_construction)

    from packages.db.src.tables import GrantApplication, GrantApplicationSource
    from testing.factories import GrantApplicationFactory, RagFileFactory

    async with async_session_maker() as session:
        await session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))
        await session.commit()

        result = await session.execute(select(GrantApplication).filter_by(project_id=project.id))
        grant_app = result.scalar_one_or_none()
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

        generator = BenchmarkDataGenerator(session)
        chunks = await generator.generate_test_chunks(params.dataset_size, rag_source.id)
        vectors = await generator.create_test_vectors(chunks, rag_source.id, params.dimension)

    framework = VectorBenchmarkFramework(async_session_maker)

    insertion_result = await framework.benchmark_vector_insertion(
        vectors, batch_size=params.batch_size, test_name=f"{params.name}_insertion"
    )

    query_vectors = []
    for i in range(200):
        query_vector = [0.1 * (i % 10)] * params.dimension
        norm = sum(x * x for x in query_vector) ** 0.5
        if norm > 0:
            query_vector = [x / norm for x in query_vector]
        query_vectors.append(query_vector)

    search_result = await framework.benchmark_similarity_search(
        query_vectors, k=params.search_k, test_name=f"{params.name}_search"
    )

    logger.info(
        "Production test results",
        test_name=params.name,
        insert_throughput=f"{insertion_result.throughput:.1f}",
        insert_memory_mb=f"{insertion_result.memory_usage_mb:.1f}",
        search_throughput=f"{search_result.throughput:.1f}",
        search_avg_latency_ms=f"{search_result.execution_time_ms / 200:.1f}",
        dimension=params.dimension,
        m=params.m,
        ef_construction=params.ef_construction,
    )

    assert insertion_result.throughput > 10, f"Production insert too slow: {insertion_result.throughput:.1f}"
    assert search_result.throughput > 50, f"Production search too slow: {search_result.throughput:.1f}"
    assert insertion_result.memory_usage_mb < 1000, (
        f"Production memory too high: {insertion_result.memory_usage_mb:.1f}MB"
    )


async def run_matrix_summary() -> None:
    matrices = {
        "Dimension Optimization": DIMENSION_OPTIMIZATION_MATRIX,
        "HNSW Optimization": HNSW_OPTIMIZATION_MATRIX,
        "Scale Optimization": SCALE_OPTIMIZATION_MATRIX,
        "Batch Optimization": BATCH_OPTIMIZATION_MATRIX,
        "Search Optimization": SEARCH_OPTIMIZATION_MATRIX,
        "Production Candidates": PRODUCTION_CANDIDATES_MATRIX,
    }

    for matrix in matrices.values():
        ParameterMatrix.get_matrix_summary(matrix)
