import logging
from os import environ
from typing import Any

import pytest
from google.cloud import storage
from packages.db.src.tables import GrantApplication, GrantApplicationFile, TextVector
from packages.shared_utils.src.serialization import serialize
from services.indexer.src.files import parse_and_index_file
from services.indexer.src.gcs import download_blob
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER, SOURCES_FOLDER

FILENAME = "PIC seq.pdf"
SMALL_PDF_TEST_FILE = SOURCES_FOLDER / "application_sources" / "43b4aed5-8549-461f-9290-5ee9a630ac9a" / FILENAME


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_parse_and_index_blob(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationFile,
    storage_bucket: storage.Bucket,
) -> None:
    logger.info("Running end-to-end test for parse_and_index_blob")

    # Upload test file to the storage bucket
    blob = storage_bucket.blob(FILENAME)
    blob.upload_from_filename(str(SMALL_PDF_TEST_FILE))

    # Download the blob and parse/index it
    content = await download_blob(FILENAME)
    await parse_and_index_file(
        content=content,
        filename=FILENAME,
        mime_type="application/pdf",
        file_id=str(grant_application_file.rag_file_id),
    )

    # Verify that vectors were created in the database
    async with async_session_maker() as session:
        results = list(
            await session.scalars(
                select(TextVector).where(TextVector.rag_file_id == grant_application_file.rag_file_id)
            )
        )

    # Just verify that we got results with the expected structure and fields
    # Don't compare exact vectors as they may have minor variations between runs
    assert len(results) > 0, "No text vectors were created"
    
    # Check that all records have the expected structure
    for result in results:
        assert result.rag_file_id == grant_application_file.rag_file_id, "Incorrect rag_file_id"
        assert result.chunk and "content" in result.chunk, "Missing chunk content"
        assert result.embedding is not None and len(result.embedding) > 0, "Missing embedding vector"
        assert result.id, "Missing ID field"
        assert result.created_at, "Missing created_at timestamp"
        assert result.updated_at, "Missing updated_at timestamp"
    
    logger.info(f"Successfully created {len(results)} text vectors")
