import logging
from os import environ
from typing import Any

import pytest
from anyio import Path
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import GrantApplicationFile, TextVector
from src.dto import VectorDTO
from src.rag.retrieval import retrieve_documents
from src.utils.serialization import deserialize, serialize
from tests.conftest import RESULTS_FOLDER, TEST_DATA_SOURCES


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.parametrize("data_file", list(TEST_DATA_SOURCES))
async def test_document_retrieval(
    logger: logging.Logger,
    grant_application_file: GrantApplicationFile,
    async_session_maker: async_sessionmaker[Any],
    data_file: Path,
) -> None:
    logger.info("Running end-to-end test for documents retrieval")
    vector_file = RESULTS_FOLDER / f"index_{data_file.name}_documents_test_result.json"
    assert vector_file.exists(), f"Expected file {vector_file} to exist"

    vector_dtos = deserialize(vector_file.read_bytes(), list[VectorDTO])
    async with async_session_maker() as session, session.begin():
        stmt = insert(TextVector).values(
            [
                {
                    "file_id": grant_application_file.rag_file_id,
                    "embedding": vector_dto["embedding"],
                    "chunk": vector_dto["chunk"],
                }
                for vector_dto in vector_dtos
            ]
        )
        await session.execute(stmt)
        await session.commit()

    logger.info("Inserted embeddings data into the database")
    results = await retrieve_documents(
        application_id=str(grant_application_file.grant_application_id),
        user_prompt=f"""
            The task is to test the RAG pipeline by testing that retrieval works.
            Identify effective queries from the provided content JSON array.

            {serialize([vector_dto["chunk"]["content"] for vector_dto in vector_dtos]).decode()}
            """,
    )

    retrival_results = RESULTS_FOLDER / f"retrieval_{data_file.name}_test_result.json"

    if not retrival_results.exists():
        retrival_results.write_bytes(serialize(results))
    else:
        assert serialize(results) == retrival_results.read_bytes()
