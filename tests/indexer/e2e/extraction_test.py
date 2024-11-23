import logging
from json import dumps
from os import environ
from pathlib import Path

import pytest

from src.indexer.extraction import parse_blob_data
from tests.indexer.e2e.utils import load_settings_and_set_env


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.parametrize(
    "filename",
    [
        "nih-project-summary-template.docx",
        "r01ai181321-01-liu-application.pdf",
        "r01ai181321-01-liu-summary-statement.pdf",
    ],
)
async def test_parse_blob_data(logger: logging.Logger, filename: str) -> None:
    load_settings_and_set_env(logger)

    logger.info("Running end-to-end test for extracting text from a document")

    file = Path(__file__).parent / "data" / filename
    results = await parse_blob_data(blob_data=file.read_bytes(), filename=filename)

    result_data = dumps(results)
    existing_results = Path(__file__).parent / "results" / f"parse_{filename}_data_test_result.json"

    assert existing_results.exists(), f"Expected file {existing_results} to exist"
    assert result_data == existing_results.read_text()
