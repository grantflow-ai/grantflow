import logging
from asyncio import sleep
from os import environ
from typing import Any

import pytest
from sanic_testing.testing import SanicASGITestClient
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.future import select

from src.db.tables import ApplicationFile, ApplicationVector, GrantApplication
from tests.conftest import TEST_DATA_SOURCES


@pytest.mark.timeout(180)
@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_files_upload(
    logger: logging.Logger,
    asgi_client: SanicASGITestClient,
    application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Running end-to-end test for creating embeddings")

    files = {file_path.name: file_path.read_bytes() for file_path in TEST_DATA_SOURCES}
    await asgi_client.post(f"/{application.id}/index-files", files=files)

    db_files: list[ApplicationFile] = []
    while len(db_files) < 3:
        await sleep(10)
        async with async_session_maker() as session, session.begin():
            db_files = list(await session.scalars(select(ApplicationFile)))

    have_vectors: tuple[bool, ...] = (False, False, False)
    while not all(have_vectors):
        await sleep(10)
        async with async_session_maker() as session, session.begin():
            have_vectors = tuple(
                [
                    bool(await session.scalars(select(ApplicationVector).where(ApplicationVector.file_id == file.id)))
                    for file in db_files
                ]
            )
