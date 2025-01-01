import logging
from json import dumps, loads
from os import environ
from pathlib import Path
from typing import TYPE_CHECKING, Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import Application, ApplicationFile, ApplicationVector
from src.indexer.chunking import chunk_text
from src.indexer.indexing import index_documents
from tests.conftest import RESULTS_FOLDER, TEST_DATA_SOURCES

if TYPE_CHECKING:
    from src.indexer.dto import OCROutput


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.parametrize("data_file", list(TEST_DATA_SOURCES))
async def test_index_documents(
    logger: logging.Logger,
    data_file: Path,
    async_session_maker: async_sessionmaker[Any],
    application: Application,
    application_file: ApplicationFile,
) -> None:
    logger.info("Running end-to-end test for creating embeddings")

    ext = "json" if data_file.name.endswith(".pdf") else "md"

    extraction_result = RESULTS_FOLDER / f"parse_{data_file.name}_data_test_result.{ext}"
    assert extraction_result.exists(), f"Expected file {extraction_result} to exist"

    content: str | OCROutput = extraction_result.read_text() if ext == "md" else loads(extraction_result.read_text())
    chunks = chunk_text(text=content, mime_type="text/markdown")

    await index_documents(
        chunks=chunks,
        file_id=str(application_file.id),
    )

    async with async_session_maker() as session, session.begin():
        stmt = select(ApplicationVector).where(ApplicationVector.file_id == application_file.id)
        db_vectors = list(await session.scalars(stmt))

    assert len(db_vectors) == len(chunks)

    index_results = RESULTS_FOLDER / f"parse_{data_file.name}_indexed_documents.json"
    content = dumps(
        [
            {
                "embedding": vector.embedding.tolist(),
                "content": vector.content,
                "chunk_index": vector.chunk_index,
                "element_type": vector.element_type,
                "page_number": vector.page_number,
            }
            for vector in db_vectors
        ]
    )
    if not index_results.exists():
        index_results.write_text(content)
    else:
        assert content == index_results.read_text()
