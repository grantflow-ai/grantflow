import logging
from os import environ
from pathlib import Path
from typing import Any

import pytest
from packages.db.src.tables import GrantApplication, GrantApplicationFile
from services.indexer.src.chunking import chunk_text
from services.indexer.src.extraction import extract_file_content
from services.indexer.src.indexing import index_documents
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import TEST_DATA_SOURCES


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.parametrize("data_file", list(TEST_DATA_SOURCES))
async def test_index_documents(
    logger: logging.Logger,
    data_file: Path,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationFile,
) -> None:
    logger.info("Running end-to-end test for creating embeddings from %s", data_file.name)

    if data_file.name.endswith(".pdf"):
        pytest.skip("PDF files are tested separately")

    mime_type = "text/plain" if data_file.name.endswith(".txt") else "text/markdown"
    content, _ = await extract_file_content(
        content=data_file.read_bytes(),
        mime_type=mime_type,
    )

    chunks = chunk_text(text=content, mime_type=mime_type)
    assert len(chunks) > 0, f"No chunks generated from {data_file.name}"

    vector_dtos = await index_documents(
        chunks=chunks,
        file_id=str(grant_application_file.rag_file_id),
    )

    assert len(vector_dtos) > 0, f"No vectors generated for {data_file.name}"

    for vector in vector_dtos:
        assert vector["rag_file_id"] == grant_application_file.rag_file_id, "Incorrect rag_file_id"
        assert "chunk" in vector, "Missing chunk attribute"
        assert vector["chunk"]["content"], "Missing chunk content"
        assert "embedding" in vector, "Missing embedding attribute"
        assert len(vector["embedding"]) > 0, "Missing embedding"

    logger.info("Successfully indexed %d vectors from %s", len(vector_dtos), data_file.name)
