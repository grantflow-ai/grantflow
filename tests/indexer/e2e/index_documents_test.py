import logging
from json import dumps, loads
from os import environ
from pathlib import Path
from typing import cast

import pytest

from src.indexer.chunking import chunk_text
from src.indexer.extraction import OCROutput
from src.indexer.indexing import index_documents


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
async def test_index_documents(logger: logging.Logger, filename: str) -> None:
    logger.info("Running end-to-end test for creating embeddings")

    extraction_results = Path(__file__).parent / "results" / f"parse_{filename}_data_test_result.json"

    assert extraction_results.exists(), f"Expected file {extraction_results} to exist"

    data = loads(extraction_results.read_text())
    assert len(data) == 2

    ocr_results = cast(OCROutput, data[0])
    mime_type = cast(str, data[1])

    assert isinstance(ocr_results, dict)
    assert isinstance(mime_type, str)

    chunks = chunk_text(extracted_data=ocr_results, mime_type=mime_type)

    results = await index_documents(
        chunks=chunks,
        file_id=filename,
        application_id="test_application_id",
        section_name="research-plan",
    )

    assert results

    result_data = dumps(results)
    existing_results = Path(__file__).parent / "results" / f"create_embeddings_{filename}_test_result.json"

    assert existing_results.exists(), f"Expected file {existing_results} to exist"
    assert result_data == existing_results.read_text()
