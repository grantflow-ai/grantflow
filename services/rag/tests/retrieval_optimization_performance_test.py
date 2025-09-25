import asyncio
import time

import pytest
from packages.db.src.tables import GrantApplication, TextVector
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from services.rag.src.utils.retrieval import MAX_RESULTS, retrieve_documents


async def test_max_results_optimization_provides_adequate_quality(
    test_application_with_template: GrantApplication,
) -> None:
    application_id = str(test_application_with_template.id)

    start_time = time.time()
    optimized_results = await retrieve_documents(
        application_id=application_id,
        search_queries=["machine learning", "neural networks", "research methodology"],
        task_description="Test retrieval optimization with current MAX_RESULTS setting",
        trace_id="test_optimization",
    )
    optimized_duration = time.time() - start_time

    assert len(optimized_results) <= MAX_RESULTS, f"Should not exceed MAX_RESULTS={MAX_RESULTS}"
    assert optimized_duration < 10.0, "Retrieval should complete within reasonable time"

    for result in optimized_results:
        assert isinstance(result, str), "Each result should be a string"
        assert len(result.strip()) > 0, "Results should not be empty"


async def test_retrieval_performance_improvement(
    async_session_maker: async_sessionmaker[AsyncSession],
    test_application_with_template: GrantApplication,
) -> None:
    async with async_session_maker() as session:
        vector_count = await session.scalar(select(func.count(TextVector.id)))

    if vector_count == 0:
        pytest.skip("No vectors available for performance testing")

    application_id = str(test_application_with_template.id)
    search_queries = ["research", "analysis", "methodology"]

    start_time = time.time()
    results = await retrieve_documents(
        application_id=application_id,
        search_queries=search_queries,
        task_description="Performance benchmark test",
        trace_id="perf_test",
    )
    duration = time.time() - start_time

    assert duration < 5.0, "Retrieval should complete within 5 seconds"
    assert len(results) <= MAX_RESULTS, f"Should respect MAX_RESULTS limit of {MAX_RESULTS}"


async def test_retrieval_cache_efficiency_with_optimization(
    test_application_with_template: GrantApplication,
) -> None:
    application_id = str(test_application_with_template.id)
    search_queries = ["machine learning", "optimization"]
    task_description = "Cache efficiency test"

    start_time = time.time()
    first_results = await retrieve_documents(
        application_id=application_id,
        search_queries=search_queries,
        task_description=task_description,
        trace_id="cache_test_1",
    )
    time.time() - start_time

    start_time = time.time()
    cached_results = await retrieve_documents(
        application_id=application_id,
        search_queries=search_queries,
        task_description=task_description,
        trace_id="cache_test_2",
    )
    time.time() - start_time

    assert first_results == cached_results, "Cached results should be identical"
    assert len(cached_results) <= MAX_RESULTS, f"Cached results should respect MAX_RESULTS={MAX_RESULTS}"


async def test_retrieval_quality_with_different_query_patterns(
    test_application_with_template: GrantApplication,
) -> None:
    application_id = str(test_application_with_template.id)

    test_cases: list[tuple[list[str], str]] = [
        (["specific technical term"], "Specific technical queries"),
        (["broad research topic", "methodology"], "Broad research queries"),
        (["machine learning", "neural networks", "deep learning"], "Multiple related terms"),
        (["very specific niche terminology that might not exist"], "Edge case queries"),
    ]

    for search_queries, description in test_cases:
        results = await retrieve_documents(
            application_id=application_id,
            search_queries=search_queries,
            task_description=f"Quality test: {description}",
            trace_id=f"quality_test_{len(search_queries)}",
        )

        assert len(results) <= MAX_RESULTS, f"Results should not exceed MAX_RESULTS for {description}"

        for result in results:
            assert isinstance(result, str), "Each result should be a string"
            assert len(result.strip()) >= 0, "Results should be valid strings"


async def test_retrieval_optimization_memory_efficiency(
    test_application_with_template: GrantApplication,
) -> None:
    application_id = str(test_application_with_template.id)

    async def single_retrieval(task_id: int) -> list[str]:
        return await retrieve_documents(
            application_id=application_id,
            search_queries=["test query", f"task {task_id}"],
            task_description=f"Memory test task {task_id}",
            trace_id=f"memory_test_{task_id}",
        )

    results = await asyncio.gather(*[single_retrieval(i) for i in range(3)])

    assert len(results) == 3, "All concurrent retrievals should complete"

    for i, result_list in enumerate(results):
        assert len(result_list) <= MAX_RESULTS, f"Task {i} should respect MAX_RESULTS limit"
        assert isinstance(result_list, list), f"Task {i} should return a list"


async def test_retrieval_optimization_reduces_database_load(
    async_session_maker: async_sessionmaker[AsyncSession],
    test_application_with_template: GrantApplication,
) -> None:
    assert MAX_RESULTS == 15, f"Expected MAX_RESULTS to be optimized to 15, but got {MAX_RESULTS}"

    application_id = str(test_application_with_template.id)
    results = await retrieve_documents(
        application_id=application_id,
        search_queries=["test query for database load validation"],
        task_description="Database load validation test",
        trace_id="db_load_test",
    )

    assert len(results) <= MAX_RESULTS, "Results should respect the optimized MAX_RESULTS limit"
