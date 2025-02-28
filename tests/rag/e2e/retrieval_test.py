import logging
from datetime import UTC, datetime
from os import environ
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.rag.retrieval import retrieve_documents
from src.utils.db import retrieve_application
from src.utils.serialization import serialize
from tests.test_utils import RESULTS_FOLDER


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_document_retrieval(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    melanoma_alliance_full_application_id: str,
) -> None:
    logger.info("Running end-to-end test for documents retrieval")

    application = await retrieve_application(
        application_id=melanoma_alliance_full_application_id, session_maker=async_session_maker
    )

    results = await retrieve_documents(
        rerank=True,
        application_id=melanoma_alliance_full_application_id,
        task_description=f"""
            The task is to test the RAG pipeline by testing that retrieval works.

            Here is the content of the grant application:

            {serialize(application).decode()}
            """,
    )
    assert len(results) == 25
    # Verify results are strings, not DocumentDTO objects
    assert all(isinstance(result, str) for result in results)

    retrival_results = (
        RESULTS_FOLDER
        / melanoma_alliance_full_application_id
        / f"retrieval_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    )
    retrival_results.write_bytes(serialize(results))
