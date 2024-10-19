import logging
from json import dumps
from os import environ
from pathlib import Path

import pytest

from src.extraction import parse_blob_data
from tests.e2e.utils import load_settings_and_set_env


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_parse_blob_data(logger: logging.Logger) -> None:
    load_settings_and_set_env()

    logger.info("Running end-to-end test for parsing")

    file = Path(__file__).parent / "data" / "ocr-sample.pdf"
    results = await parse_blob_data(blob_data=file.read_bytes(), filename="ocr-sample.pdf")

    result_data = dumps(results)
    existing_results = Path(__file__).parent / "results" / "parse_blob_data_test_result.json"

    assert existing_results.exists(), f"Expected file {existing_results} does not exist"
    assert result_data == existing_results.read_text()
