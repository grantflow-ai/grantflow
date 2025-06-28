import importlib.util
import logging
from typing import Any
from uuid import uuid4

import pytest
from packages.db.src.utils import retrieve_application
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.e2e_utils import E2ETestCategory, e2e_test, validate_test_result

from services.rag.src.grant_template.extract_cfp_data import handle_extract_cfp_data_from_rag_sources
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.search_queries import handle_create_search_queries


@e2e_test(category=E2ETestCategory.SMOKE, timeout=30)
async def test_retrieval_with_invalid_application_id(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    invalid_id = str(uuid4())

    results = await retrieve_documents(
        application_id=invalid_id,
        task_description="Test with invalid application ID",
    )

    assert results == [], "Should return empty list for invalid application ID"
    logger.info("Correctly handled invalid application ID - returned empty results")


@e2e_test(category=E2ETestCategory.SMOKE, timeout=30)
async def test_query_generation_with_empty_prompt(logger: logging.Logger) -> None:
    queries = await handle_create_search_queries(user_prompt="")

    validate_test_result(queries, list)
    assert len(queries) >= 3, "Should generate default queries even with empty prompt"
    logger.info("Generated %d queries from empty prompt", len(queries))


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=120)
async def test_cfp_extraction_with_empty_sources(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
) -> None:
    from packages.shared_utils.src.exceptions import ValidationError

    with pytest.raises(ValidationError, match="No RAG sources found"):
        await handle_extract_cfp_data_from_rag_sources(
            source_ids=[],
            organization_mapping=organization_mapping,
            session_maker=async_session_maker,
        )
    logger.info("Correctly handled empty source list")


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=300)
async def test_retrieval_with_malformed_task_description(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    malformed_descriptions = [
        "x" * 10000,
        "\\x00\\x01\\x02",
        '{"json": "should not parse"}',
        "",
    ]

    for desc in malformed_descriptions:
        try:
            results = await retrieve_documents(
                application_id=melanoma_alliance_full_application_id,
                task_description=desc,
            )

            validate_test_result(results, list)
            assert len(results) > 0, f"Should return results even with malformed description: {desc[:50]}..."
            logger.info("Handled malformed description gracefully: %s...", desc[:50])

        except (ValueError, TypeError) as e:
            pytest.fail(f"Should handle malformed description gracefully, but got: {e!s}")


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=180)
async def test_database_connection_failure_recovery(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    from unittest.mock import AsyncMock, patch

    async def failing_execute(*args: Any, **kwargs: Any) -> None:
        raise SQLAlchemyError("Database connection failed")

    with patch.object(async_session_maker, "__call__") as mock_session:
        mock_session.return_value.__aenter__.return_value.execute = AsyncMock(side_effect=failing_execute)

        with pytest.raises(SQLAlchemyError) as exc_info:
            await retrieve_application(
                application_id=melanoma_alliance_full_application_id,
                session=mock_session.return_value.__aenter__.return_value,
            )

        assert "Database connection failed" in str(exc_info.value)
        logger.info("Database failure handled appropriately")


@e2e_test(category=E2ETestCategory.SMOKE, timeout=30)
async def test_search_query_generation_edge_cases(logger: logging.Logger) -> None:
    edge_cases: list[dict[str, Any]] = [
        {"prompt": "a", "min_queries": 3},
        {"prompt": "test " * 100, "min_queries": 3},
        {"prompt": "🔬🧬🦠", "min_queries": 3},
        {"prompt": "SELECT * FROM users;", "min_queries": 3},
        {"prompt": "<script>alert('xss')</script>", "min_queries": 3},
    ]

    for case in edge_cases:
        prompt = str(case["prompt"])
        min_queries = int(case["min_queries"])
        queries = await handle_create_search_queries(user_prompt=prompt)
        validate_test_result(queries, list, min_length=min_queries)
        logger.info("Generated %d queries for edge case: %s", len(queries), prompt[:30])


@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=120)
@pytest.mark.skipif(
    not any(importlib.util.find_spec(mod) for mod in ["psutil"]), reason="psutil not available in CI environment"
)
async def test_memory_usage_with_large_retrieval(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    import os

    import psutil

    process = psutil.Process(os.getpid())
    initial_memory = process.memory_info().rss / 1024 / 1024

    results = await retrieve_documents(
        rerank=True,
        application_id=melanoma_alliance_full_application_id,
        task_description="Retrieve maximum documents for memory testing",
        max_results=100,
    )

    final_memory = process.memory_info().rss / 1024 / 1024
    memory_increase = final_memory - initial_memory

    validate_test_result(results, list)
    assert memory_increase < 500, f"Memory usage increased by {memory_increase:.2f}MB, which exceeds 500MB limit"

    logger.info(
        "Memory test completed - Initial: %.2fMB, Final: %.2fMB, Increase: %.2fMB",
        initial_memory,
        final_memory,
        memory_increase,
    )
