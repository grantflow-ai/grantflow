import logging
from mimetypes import guess_type
from pathlib import Path
from typing import Any, cast

import pytest
from packages.db.src.json_objects import Chunk
from packages.db.src.tables import GrantApplication, GrantApplicationSource
from packages.shared_utils.src.embeddings import index_chunks
from packages.shared_utils.src.exceptions import ExternalOperationError, FileParsingError, ValidationError
from packages.shared_utils.src.extraction import extract_file_content
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import TEST_DATA_SOURCES
from testing.performance_framework import TestDomain, TestExecutionSpeed, performance_test


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.INDEXER)
@pytest.mark.parametrize("data_file", list(TEST_DATA_SOURCES))
async def test_index_chunks(
    logger: logging.Logger,
    data_file: Path,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationSource,
) -> None:
    logger.info("Running end-to-end test for creating embeddings from %s", data_file.name)

    mime_type = cast("str", guess_type(data_file.name)[0])
    if not mime_type:
        pytest.skip(f"Cannot determine MIME type for {data_file.name}")

    try:
        # Use the new optimized extraction with chunking enabled
        content, _extracted_mime_type, chunks, _ = await extract_file_content(
            content=data_file.read_bytes(),
            mime_type=mime_type,
            enable_chunking=True,
            enable_token_reduction=True,
            language_hint="en",
        )

        # Convert chunks to expected format if available
        chunk_dtos = [Chunk(content=chunk) for chunk in chunks] if chunks else [Chunk(content=content)]

        assert len(chunk_dtos) > 0, f"No chunks generated from {data_file.name}"

        vector_dtos = await index_chunks(
            chunks=chunk_dtos,
            source_id=str(grant_application_file.rag_source_id),
        )

        assert len(vector_dtos) > 0, f"No vectors generated for {data_file.name}"

        chunk_lengths = []
        embedding_norms = []

        for vector in vector_dtos:
            assert vector["rag_source_id"] == str(grant_application_file.rag_source_id), "Incorrect rag_source_id"
            assert "chunk" in vector, "Missing chunk attribute"
            assert vector["chunk"]["content"], "Missing chunk content"
            assert "embedding" in vector, "Missing embedding attribute"
            assert len(vector["embedding"]) > 0, "Missing embedding"

            chunk_content = vector["chunk"]["content"]
            chunk_lengths.append(len(chunk_content))
            assert len(chunk_content) >= 50, f"Chunk too short: {len(chunk_content)} chars"
            assert len(chunk_content) <= 3000, f"Chunk too long: {len(chunk_content)} chars"

            embedding = vector["embedding"]
            assert len(embedding) == 384, f"Unexpected embedding dimension: {len(embedding)}"

            import math

            norm = math.sqrt(sum(x**2 for x in embedding))
            embedding_norms.append(norm)
            assert 0.1 <= norm <= 3.0, f"Embedding norm out of range: {norm}"

        avg_chunk_length = sum(chunk_lengths) / len(chunk_lengths)
        avg_embedding_norm = sum(embedding_norms) / len(embedding_norms)

        assert 200 <= avg_chunk_length <= 2500, f"Average chunk length suspicious: {avg_chunk_length}"
        assert 0.5 <= avg_embedding_norm <= 2.0, f"Average embedding norm suspicious: {avg_embedding_norm}"

        logger.info(
            "Successfully indexed %d vectors from %s (avg chunk: %d chars, avg norm: %.3f)",
            len(vector_dtos),
            data_file.name,
            int(avg_chunk_length),
            avg_embedding_norm,
        )

    except (FileParsingError, ValidationError, ExternalOperationError) as e:
        logger.error("Failed to index chunks from %s: %s", data_file.name, e)
        pytest.fail(f"Indexing failed for {data_file.name}: {e}")
    except Exception as e:
        logger.exception("Unexpected error indexing chunks from %s", data_file.name)
        pytest.fail(f"Unexpected indexing error for {data_file.name}: {e}")
