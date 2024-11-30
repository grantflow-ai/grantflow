import logging
from json import dumps
from os import environ
from pathlib import Path

import pytest

from src.indexer.chunking import chunk_text
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

    extraction_result = Path(__file__).parent / "results" / f"parse_{filename}_data_test_result.md"

    assert extraction_result.exists(), f"Expected file {extraction_result} to exist"

    chunks = chunk_text(text=extraction_result.read_text(), mime_type="text/markdown")

    results = await index_documents(
        chunks=chunks,
        file_id=filename,
        application_id="test_application_id",
        section_name="research-plan",
    )

    assert results

    existing_results = Path(__file__).parent / "results" / f"create_embeddings_{filename}_test_result.json"
    existing_results.parent.mkdir(parents=True, exist_ok=True)
    existing_results.write_text(dumps(results))

    assert existing_results.exists(), f"Expected file {existing_results} to exist"
    assert dumps(results) == existing_results.read_text()
