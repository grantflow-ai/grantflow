import logging
from os import environ
from typing import Any

import pytest
from anyio import Path

from src.rag.search_queries import handle_create_search_queries
from src.utils.serialization import deserialize, serialize
from tests.conftest import RESULTS_FOLDER, TEST_DATA_SOURCES


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.parametrize("data_file", list(TEST_DATA_SOURCES))
async def test_handle_create_search_queries(
    logger: logging.Logger,
    data_file: Path,
) -> None:
    logger.info("Running end-to-end test for documents retrieval")
    retrieval_file = RESULTS_FOLDER / f"retrieval_{data_file.name}_test_result.json"
    if not retrieval_file.exists():
        return

    queries_response = await handle_create_search_queries(
        content=deserialize(retrieval_file.read_bytes(), list[dict[str, Any]]),
        task_description="""
        The task is to test the RAG pipeline by testing that generating queries works.
        Identify and return effective queries from the provided content JSON array.
        """,
    )

    assert 3 <= len(queries_response.queries) <= 10

    queries_result = RESULTS_FOLDER / f"queries_generation_{data_file.name}_test_result.json"

    if not queries_result.exists():
        queries_result.write_bytes(serialize(queries_response))
