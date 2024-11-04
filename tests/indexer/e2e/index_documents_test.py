import logging
from json import dumps, loads
from os import environ
from pathlib import Path
from typing import cast

import pytest

from src.indexer.chunking import chunk_text, index_documents
from src.indexer.dto import OCROutput
from tests.indexer.e2e.utils import load_settings_and_set_env


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_index_documents(logger: logging.Logger) -> None:
    load_settings_and_set_env(logger)

    logger.info("Running end-to-end test for creating embeddings")

    existing_results = Path(__file__).parent / "results" / "parse_blob_data_test_result.json"

    assert existing_results.exists(), f"Expected file {existing_results} to exist"

    data = loads(existing_results.read_text())
    assert len(data) == 2

    ocr_results = cast(OCROutput, data[0])
    mime_type = cast(str, data[1])

    assert isinstance(ocr_results, dict)
    assert isinstance(mime_type, str)

    chunks = chunk_text(extracted_data=ocr_results, mime_type=mime_type)

    results = await index_documents(
        chunks=chunks,
        filename="ocr-sample.pdf",
        parent_id="parent_id",
        workspace_id="workspace_id",
    )

    assert results

    result_data = dumps(results)
    existing_results = Path(__file__).parent / "results" / "create_embeddings_test_result.json"

    assert existing_results.exists(), f"Expected file {existing_results} to exist"
    assert result_data == existing_results.read_text()
