import logging
from os import environ
from typing import Any

import pytest
from packages.db.src.tables import GrantApplication, GrantApplicationRagSource
from packages.shared_utils.src.exceptions import ExternalOperationError, FileParsingError, ValidationError
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import SOURCES_FOLDER

from services.indexer.src.processing import process_source

FILENAME = "PIC seq.pdf"
SMALL_PDF_TEST_FILE = SOURCES_FOLDER / "application_sources" / "43b4aed5-8549-461f-9290-5ee9a630ac9a" / FILENAME


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_parse_application_file(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationRagSource,
) -> None:
    logger.info("Running end-to-end test for parse_and_index_file")

    if not SMALL_PDF_TEST_FILE.exists():
        pytest.skip(f"Test file {SMALL_PDF_TEST_FILE} does not exist")

    try:
        vectors, text_content = await process_source(
            content=SMALL_PDF_TEST_FILE.read_bytes(),
            filename="test.pdf",
            mime_type="application/pdf",
            source_id=str(grant_application_file.rag_source_id),
        )

        assert len(vectors) > 0, "No vectors were generated"
        assert text_content.strip(), "No text content was extracted"

        logger.info(
            "Successfully processed %s: extracted %d characters, generated %d vectors",
            FILENAME,
            len(text_content),
            len(vectors),
        )

        for vector in vectors:
            assert vector["rag_source_id"] == str(grant_application_file.rag_source_id), "Incorrect rag_source_id"
            assert "chunk" in vector, "Missing chunk attribute"
            assert vector["chunk"]["content"], "Missing chunk content"
            assert "embedding" in vector, "Missing embedding attribute"
            assert len(vector["embedding"]) > 0, "Empty embedding vector"

    except (FileParsingError, ValidationError, ExternalOperationError) as e:
        logger.error("Failed to parse and index file %s: %s", FILENAME, e)
        pytest.fail(f"File processing failed for {FILENAME}: {e}")
    except Exception as e:
        logger.exception("Unexpected error processing file %s", FILENAME)
        pytest.fail(f"Unexpected file processing error for {FILENAME}: {e}")
