import logging
from json import loads
from os import environ
from pathlib import Path
from typing import TYPE_CHECKING, Any

import pytest
from packages.db.src.tables import GrantApplication, GrantApplicationFile
from packages.shared_utils.src.serialization import serialize
from services.indexer.src.chunking import chunk_text
from services.indexer.src.indexing import index_documents
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER, TEST_DATA_SOURCES

if TYPE_CHECKING:
    from azure.ai.documentintelligence.models import AnalyzeResult


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.parametrize("data_file", list(TEST_DATA_SOURCES))
async def test_index_documents(
    logger: logging.Logger,
    data_file: Path,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationFile,
) -> None:
    logger.info("Running end-to-end test for creating embeddings")

    ext = "json" if data_file.name.endswith(".pdf") else "md"

    extraction_result = RESULTS_FOLDER / f"parse_{data_file.name}_data_test_result.{ext}"
    assert extraction_result.exists(), f"Expected file {extraction_result} to exist"

    content: str | AnalyzeResult = (
        extraction_result.read_text() if ext == "md" else loads(extraction_result.read_text())
    )
    chunks = chunk_text(text=content, mime_type="text/plain" if data_file.name.endswith(".pdf") else "text/markdown")

    vector_dtos = await index_documents(
        chunks=chunks,
        file_id=str(grant_application_file.rag_file_id),
    )

    index_results = RESULTS_FOLDER / f"index_{data_file.name}_documents_test_result.json"

    if not index_results.exists():
        index_results.write_bytes(serialize(vector_dtos))
    else:
        assert serialize(vector_dtos) == index_results.read_bytes()
