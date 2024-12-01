import logging
from json import dumps
from os import environ
from pathlib import Path

import pytest

from src.indexer.dto import FileDTO
from src.indexer.extraction import parse_file_data
from tests.indexer.e2e.conftest import TEST_FILES


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.parametrize(
    "filename",
    TEST_FILES,
)
async def test_parse_blob_data(logger: logging.Logger, filename: str) -> None:
    logger.info("Running end-to-end test for extracting text from a document")

    file = Path(__file__).parent / "data" / filename
    result, _ = await parse_file_data(file_data=FileDTO(content=file.read_bytes(), filename=filename))
    ext = "json" if isinstance(result, dict) else "md"
    content = dumps(result) if isinstance(result, dict) else result

    existing_results = Path(__file__).parent / "results" / f"parse_{filename}_data_test_result.{ext}"

    assert existing_results.exists(), f"Expected file {existing_results} to exist"
    assert content == existing_results.read_text()
