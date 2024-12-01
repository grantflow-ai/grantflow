import logging
from json import loads
from os import environ
from pathlib import Path
from typing import TYPE_CHECKING, Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker  # type: ignore[attr-defined]

from src.db.tables import ApplicationFile, ApplicationVector, GrantApplication
from src.indexer.chunking import chunk_text
from src.indexer.indexing import index_documents
from tests.indexer.e2e.conftest import TEST_FILES

if TYPE_CHECKING:
    from src.indexer.extraction import OCROutput


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.parametrize(
    "filename",
    TEST_FILES,
)
async def test_index_documents(
    logger: logging.Logger,
    filename: str,
    async_session_maker: async_sessionmaker[Any],
    application: GrantApplication,
    application_file: ApplicationFile,
) -> None:
    logger.info("Running end-to-end test for creating embeddings")

    ext = "json" if filename.endswith(".pdf") else "md"

    extraction_result = Path(__file__).parent / "results" / f"parse_{filename}_data_test_result.{ext}"
    assert extraction_result.exists(), f"Expected file {extraction_result} to exist"

    content: str | OCROutput = extraction_result.read_text() if ext == "md" else loads(extraction_result.read_text())
    chunks = chunk_text(text=content, mime_type="text/markdown")

    await index_documents(
        chunks=chunks,
        file_id=str(application_file.id),
        application_id=str(application.id),
    )

    async with async_session_maker() as session, session.begin():
        stmt = select(ApplicationVector.file_id).where(ApplicationVector.file_id == application_file.id)
        db_vectors = await session.execute(stmt)

    assert len(list(db_vectors)) == len(chunks)
