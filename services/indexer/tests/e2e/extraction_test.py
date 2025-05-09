import logging
from mimetypes import guess_type
from os import environ
from pathlib import Path
from typing import cast

import pytest
from packages.shared_utils.src.extraction import extract_file_content
from testing import TEST_DATA_SOURCES


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.parametrize("data_file", list(TEST_DATA_SOURCES))
async def test_extraction(logger: logging.Logger, data_file: Path) -> None:
    if data_file.name.endswith(".pdf"):
        return

    logger.info("Running end-to-end test for extracting text from %s", data_file.name)
    mime_type = cast("str", guess_type(data_file.name)[0])
    result, _ = await extract_file_content(content=data_file.read_bytes(), mime_type=mime_type)

    assert isinstance(result, str), f"Expected string result, got {type(result)}"
    assert result.strip(), "Extracted text is empty"

    logger.info("Successfully extracted content from %s with mime type %s", data_file.name, mime_type)
