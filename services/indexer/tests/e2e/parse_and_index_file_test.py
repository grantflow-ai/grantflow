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
@pytest.mark.e2e_full
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

        # Enhanced validation with quality metrics
        chunk_contents = [v["chunk"]["content"] for v in vectors]
        chunk_lengths = [len(content) for content in chunk_contents]

        for vector in vectors:
            assert vector["rag_source_id"] == str(grant_application_file.rag_source_id), "Incorrect rag_source_id"
            assert "chunk" in vector, "Missing chunk attribute"
            assert vector["chunk"]["content"], "Missing chunk content"
            assert "embedding" in vector, "Missing embedding attribute"
            assert len(vector["embedding"]) > 0, "Empty embedding vector"

            # Enhanced quality checks
            chunk_content = vector["chunk"]["content"]
            embedding = vector["embedding"]

            assert len(chunk_content) >= 100, f"Chunk too short: {len(chunk_content)} chars"
            assert len(embedding) == 384, f"Wrong embedding dimension: {len(embedding)}"

            import math

            norm = math.sqrt(sum(x**2 for x in embedding))
            assert 0.1 <= norm <= 3.0, f"Embedding norm out of range: {norm}"

        # Coverage and distribution checks
        total_chunk_chars = sum(chunk_lengths)
        coverage_ratio = total_chunk_chars / len(text_content) if text_content else 0

        assert 0.7 <= coverage_ratio <= 1.5, f"Coverage ratio suspicious: {coverage_ratio}"

        # Check for duplicate content
        unique_contents = set(chunk_contents)
        duplicate_ratio = 1 - (len(unique_contents) / len(chunk_contents))
        assert duplicate_ratio < 0.2, f"Too many duplicate chunks: {duplicate_ratio:.1%}"

        avg_chunk_length = sum(chunk_lengths) / len(chunk_lengths)
        logger.info(
            "Successfully processed %s: extracted %d characters, generated %d vectors (avg chunk: %d chars, coverage: %.1f%%)",
            FILENAME,
            len(text_content),
            len(vectors),
            int(avg_chunk_length),
            coverage_ratio * 100,
        )

    except (FileParsingError, ValidationError, ExternalOperationError) as e:
        logger.error("Failed to parse and index file %s: %s", FILENAME, e)
        pytest.fail(f"File processing failed for {FILENAME}: {e}")
    except Exception as e:
        logger.exception("Unexpected error processing file %s", FILENAME)
        pytest.fail(f"Unexpected file processing error for {FILENAME}: {e}")
