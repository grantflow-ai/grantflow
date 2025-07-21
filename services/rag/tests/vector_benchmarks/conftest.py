"""
Pytest Fixtures for Vector Benchmarking

This module provides fixtures for vector benchmarking tests.
The key advantage: we use the real production database schema
with synthetic modifications for testing different vector configurations.

Key fixtures:
- benchmark_db_manager: Manages isolated test database
- benchmark_session: Provides database session for tests
- test_data_generator: Generates realistic test data
- baseline_entities: Creates basic test entities (user, project, rag_source)

Usage in tests:
    @e2e_test(category=E2ETestCategory.VECTOR_BENCHMARK)
    async def test_my_benchmark(benchmark_session, test_data_generator):
        # Your benchmark code here
"""

import asyncio
import uuid
from collections.abc import AsyncGenerator
from typing import Any

import pytest
from packages.db.src.tables import RagFile
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from testing.factories import RagFileFactory

from .data_test import BenchmarkDataGenerator
from .synthetic_migrations import VectorTableModifier

logger = get_logger(__name__)


@pytest.fixture(scope="session")
def event_loop() -> Any:
    """
    Create event loop for async tests.

    This ensures all async fixtures and tests run in the same event loop.
    Required for session-scoped async fixtures.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def vector_table_modifier(
    async_session_maker: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[VectorTableModifier]:
    """
    Vector table modifier for changing schema during tests.

    This provides a shared interface for all vector-related schema changes.
    Tests can use this to modify vector dimensions or index parameters.
    """
    async with async_session_maker() as session:
        modifier = VectorTableModifier(session)
        yield modifier

        try:
            await modifier.restore_original_schema()
        except Exception as e:
            logger.warning("Error restoring schema after test", error=str(e))


@pytest.fixture
async def benchmark_rag_source(
    async_session_maker: async_sessionmaker[AsyncSession], grant_application: Any
) -> RagFile:
    """
    Creates a RagFile source for benchmarking.

    This creates a RagFile and associates it with a grant application
    for vector benchmarking.
    """
    from packages.db.src.tables import GrantApplicationRagSource

    async with async_session_maker() as session:
        rag_file = RagFileFactory.build()
        session.add(rag_file)
        await session.commit()
        await session.refresh(rag_file)

        app_rag_source = GrantApplicationRagSource(grant_application_id=grant_application.id, rag_source_id=rag_file.id)
        session.add(app_rag_source)
        await session.commit()

    return rag_file


@pytest.fixture
async def test_data_generator(async_session_maker: async_sessionmaker[AsyncSession]) -> BenchmarkDataGenerator:
    """
    Test data generator for creating realistic benchmark data.

    This uses the production database models to create proper
    test entities and vectors.

    Usage:
        async def test_something(test_data_generator, benchmark_rag_source):
            # Generate test data
            chunks = await test_data_generator.generate_test_chunks(1000, benchmark_rag_source.id)
    """
    async with async_session_maker() as session:
        return BenchmarkDataGenerator(session)


@pytest.fixture
async def benchmark_entities(project: Any, grant_application: Any, benchmark_rag_source: Any) -> dict[str, Any]:
    """
    Returns test entities for benchmarking using existing fixtures.

    This provides a consistent interface that uses the existing
    project, grant_application, and rag_source fixtures.

    Usage:
        async def test_something(benchmark_entities):
            project = benchmark_entities["project"]
            grant_application = benchmark_entities["grant_application"]
            rag_source = benchmark_entities["rag_source"]
            # Ready to create test data
    """
    return {"project": project, "grant_application": grant_application, "rag_source": benchmark_rag_source}


@pytest.fixture(params=["small_fast", "medium_balanced", "current_production"])
async def configured_vector_db(async_session_maker: async_sessionmaker[AsyncSession], request: Any) -> dict[str, Any]:
    """
    Parametrized fixture that tests multiple vector configurations.

    This fixture creates multiple vector configurations for comprehensive testing.
    It yields each configuration with the session_maker for database access.

    Configurations:
    - small_fast: Optimized for speed with smaller dimensions
    - medium_balanced: Balanced between speed and quality
    - current_production: Matches current production settings
    """
    config_name = request.param

    benchmark_configurations: dict[str, dict[str, Any]] = {
        "small_fast": {"dimension": 128, "index_parameters": {"m": 16, "ef_construction": 128}},
        "medium_balanced": {"dimension": 256, "index_parameters": {"m": 32, "ef_construction": 256}},
        "current_production": {"dimension": 384, "index_parameters": {"m": 48, "ef_construction": 256}},
    }

    config = benchmark_configurations[config_name]

    async with async_session_maker() as session:
        modifier = VectorTableModifier(session)

        dimension = int(config["dimension"])
        await modifier.modify_vector_dimension(dimension)

        if "index_parameters" in config:
            index_params = config["index_parameters"]
            if isinstance(index_params, dict):
                m = int(index_params.get("m", 48))
                ef_construction = int(index_params.get("ef_construction", 256))
                await modifier.modify_index_parameters(m=m, ef_construction=ef_construction)

    result: dict[str, Any] = {"config_name": config_name, "config": config, "session_maker": async_session_maker}

    return result


@pytest.fixture
async def small_dataset(
    async_session_maker: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[dict[str, Any]]:
    """
    Create small test dataset of vectors with different dimensions.

    This generates a reasonable number of vectors to use in benchmarks.

    Yields:
        Dictionary with test data configuration

    Example:
        async def test_vector_insertion(small_dataset):
            # Access generator and vectors
            generator = small_dataset["generator"]
            vectors = small_dataset["vectors"]
    """
    async with async_session_maker() as session:
        generator = BenchmarkDataGenerator(session)

        source_id = uuid.uuid4()
        chunks = await generator.generate_test_chunks(50, source_id)
        vectors = await generator.create_test_vectors(chunks, source_id, 384)

        await session.execute(text("TRUNCATE TABLE text_vectors CASCADE"))
        await session.commit()

        result: dict[str, Any] = {
            "generator": generator,
            "chunks": chunks,
            "vectors": vectors,
            "source_id": source_id,
        }

        yield result


@pytest.fixture
async def medium_dataset(
    async_session_maker: async_sessionmaker[AsyncSession], benchmark_entities: dict[str, Any]
) -> dict[str, Any]:
    """
    Creates medium dataset (10000 vectors) for comprehensive tests.

    Usage:
        async def test_something(medium_dataset):
            vectors = medium_dataset["vectors"]
            # 10000 vectors ready for testing
    """
    async with async_session_maker() as session:
        generator = BenchmarkDataGenerator(session)
        rag_source = benchmark_entities["rag_source"]
        chunks = await generator.generate_test_chunks(10000, rag_source.id)
        vectors = await generator.create_test_vectors(chunks, rag_source.id, 384)
        await generator.insert_vectors_to_database(vectors)

    return {"vectors": vectors, "chunks": chunks, "rag_source": rag_source, "size": 10000}


@pytest.fixture
async def large_dataset(
    async_session_maker: async_sessionmaker[AsyncSession], benchmark_entities: dict[str, Any]
) -> dict[str, Any]:
    """
    Creates large dataset (50000 vectors) for performance tests.

    Usage:
        async def test_something(large_dataset):
            vectors = large_dataset["vectors"]
            # 50000 vectors ready for testing
    """
    async with async_session_maker() as session:
        generator = BenchmarkDataGenerator(session)
        rag_source = benchmark_entities["rag_source"]
        chunks = await generator.generate_test_chunks(50000, rag_source.id)
        vectors = await generator.create_test_vectors(chunks, rag_source.id, 384)
        await generator.insert_vectors_to_database(vectors)

    return {"vectors": vectors, "chunks": chunks, "rag_source": rag_source, "size": 50000}
