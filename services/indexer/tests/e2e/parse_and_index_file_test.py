import logging
from os import environ
from typing import Any

import pytest
from packages.db.src.tables import GrantApplication, GrantApplicationFile, TextVector
from services.indexer.src.files import parse_and_index_file
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import SOURCES_FOLDER

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
    grant_application_file: GrantApplicationFile,
) -> None:
    logger.info("Running end-to-end test for parse_and_index_file")

    await parse_and_index_file(
        content=SMALL_PDF_TEST_FILE.read_bytes(),
        filename="test.pdf",
        mime_type="application/pdf",
        file_id=str(grant_application_file.rag_file_id),
    )

    async with async_session_maker() as session:
        results = list(
            await session.scalars(
                select(TextVector).where(TextVector.rag_file_id == grant_application_file.rag_file_id)
            )
        )

    assert len(results) > 0, "No text vectors were created"

    for result in results:
        assert result.rag_file_id == grant_application_file.rag_file_id, "Incorrect rag_file_id"
        assert result.chunk, "Missing chunk content"
        assert "content" in result.chunk, "Missing 'content' key in chunk"
        assert result.embedding is not None, "Missing embedding vector"
        assert len(result.embedding) > 0, "Empty embedding vector"
        assert result.id, "Missing ID field"
        assert result.created_at, "Missing created_at timestamp"
        assert result.updated_at, "Missing updated_at timestamp"

    logger.info("Successfully created %d text vectors", len(results))
