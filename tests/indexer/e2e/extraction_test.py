import logging
from json import dumps
from os import environ

import pytest
from anyio import Path

from src.indexer.dto import FileDTO
from src.indexer.extraction import parse_file_data


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_parse_blob_data(logger: logging.Logger, test_data_file: FileDTO) -> None:
    logger.info("Running end-to-end test for extracting text from a document")
    result, _ = await parse_file_data(test_data_file)
    ext = "json" if isinstance(result, dict) else "md"
    content = dumps(result) if isinstance(result, dict) else result
    existing_results = Path(__file__).parent / "results" / f"parse_{test_data_file.filename}_data_test_result.{ext}"
    await existing_results.write_text(content)
    assert existing_results.exists(), f"Expected file {existing_results} to exist"
    assert content == await existing_results.read_text()
