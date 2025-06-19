import logging
from mimetypes import guess_type
from os import environ
from pathlib import Path
from typing import cast

import pytest
from packages.shared_utils.src.exceptions import ExternalOperationError, FileParsingError, ValidationError
from packages.shared_utils.src.extraction import extract_file_content
from testing import TEST_DATA_SOURCES


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.e2e_full
@pytest.mark.parametrize("data_file", list(TEST_DATA_SOURCES))
async def test_extraction(logger: logging.Logger, data_file: Path) -> None:
    logger.info("Running end-to-end test for extracting text from %s", data_file.name)
    mime_type = cast("str", guess_type(data_file.name)[0])

    if not mime_type:
        pytest.skip(f"Cannot determine MIME type for {data_file.name}")

    try:
        result, extracted_mime_type = await extract_file_content(content=data_file.read_bytes(), mime_type=mime_type)

        assert isinstance(result, str), f"Expected string result, got {type(result)}"
        assert result.strip(), "Extracted text is empty"
        assert extracted_mime_type, "No MIME type returned"
        assert len(result) >= 100, f"Extracted text too short: {len(result)} chars"

        words = result.split()
        assert len(words) >= 20, f"Too few words extracted: {len(words)}"

        alpha_chars = sum(1 for c in result if c.isalpha())
        alpha_ratio = alpha_chars / len(result) if result else 0
        assert alpha_ratio > 0.3, f"Low alphabetic character ratio: {alpha_ratio:.2f}"

        logger.info(
            "Successfully extracted %d characters from %s (mime: %s -> %s)",
            len(result),
            data_file.name,
            mime_type,
            extracted_mime_type,
        )
    except (FileParsingError, ValidationError, ExternalOperationError) as e:
        logger.error("Failed to extract content from %s: %s", data_file.name, e)
        pytest.fail(f"Extraction failed for {data_file.name}: {e}")
    except Exception as e:
        logger.exception("Unexpected error extracting content from %s", data_file.name)
        pytest.fail(f"Unexpected extraction error for {data_file.name}: {e}")
