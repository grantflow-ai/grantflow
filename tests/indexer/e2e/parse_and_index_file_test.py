import logging
from os import environ
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import ApplicationVector, GrantApplication, GrantApplicationFile
from src.dto import FileDTO
from src.indexer.files import parse_and_index_file
from src.utils.serialization import serialize
from tests.conftest import RESULTS_FOLDER, SOURCES_FOLDER

FILENAME = "PIC seq.pdf"
SMALL_PDF_TEST_FILE = SOURCES_FOLDER / FILENAME


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_parse_application_file(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    application: GrantApplication,
    application_file: GrantApplicationFile,
) -> None:
    logger.info("Running end-to-end test for parse_and_index_file")

    file_dto = FileDTO(
        content=SMALL_PDF_TEST_FILE.read_bytes(),
        filename="test.pdf",
        mime_type="application/pdf",
    )

    await parse_and_index_file(
        application_id=str(application.id),
        file_dto=file_dto,
        file_id=str(application_file.id),
    )

    async with async_session_maker() as session:
        results = list(
            await session.scalars(select(ApplicationVector).where(ApplicationVector.file_id == application_file.id))
        )

    index_results = RESULTS_FOLDER / "parse_and_index_application_file_result.json"

    if not index_results.exists():
        index_results.write_bytes(serialize(results))
    else:
        assert serialize(results) == index_results.read_bytes()
