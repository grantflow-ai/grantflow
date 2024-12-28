import logging
from json import loads
from os import environ
from typing import Any

import pytest
from anyio import Path
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import ApplicationFile, ApplicationVector
from src.rag.retrieval import retrieve_documents

SEARCH_QUERIES = [
    "Staphylococcus aureus vaccine insights and antibody response mechanisms",
    "Facilities and equipment used in S. aureus research at UCSD and Vanderbilt",
    "Research strategy and experimental aims for staphylococcal vaccine development",
    "Funding details and key personnel for NIH R01 project by George Liu",
    "Preliminary findings and hypotheses on S. aureus vaccine failures",
]


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_document_retrieval(
    logger: logging.Logger,
    application_file: ApplicationFile,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Running end-to-end test for documents retrieval")
    embeddings_data = loads(await (Path(__file__).parent / "data" / "embeddings_data.json").read_text())
    async with async_session_maker() as session, session.begin():
        stmt = insert(ApplicationVector).values(
            [
                {
                    "application_id": application_file.application_id,
                    "file_id": application_file.id,
                    "chunk_index": vector["chunk_index"],
                    "content": vector["content"],
                    "element_type": vector["element_type"],
                    "embedding": vector["embedding"],
                    "page_number": vector["page_number"],
                }
                for vector in embeddings_data
            ]
        )
        await session.execute(stmt)
        await session.commit()

    logger.info("Inserted embeddings data into the database")
    results = await retrieve_documents(
        application_id=str(application_file.application_id),
        search_queries=SEARCH_QUERIES,
    )
    assert len(results) == 10
