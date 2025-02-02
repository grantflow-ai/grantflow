import logging
from datetime import UTC, datetime
from os import environ
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import GrantApplication
from src.rag.grant_template.extract_sections import handle_extract_sections
from src.utils.serialization import serialize
from tests.conftest import FIXTURES_FOLDER, RESULTS_FOLDER


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_extract_sections_melanoma_alliance_cfp(
    logger: logging.Logger,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    cfp_content_file = FIXTURES_FOLDER / "cfps" / "melanoma_alliance_cfp.md"
    logger.info("Running end-to-end test for extracting sections from CFP data")
    start_time = datetime.now(UTC)

    sections = await handle_extract_sections(cfp_content=cfp_content_file.read_text())

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    results_file = (
        RESULTS_FOLDER
        / f"handle_extract_sections_melanoma_alliance_cfp_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    )
    if not RESULTS_FOLDER.exists():
        RESULTS_FOLDER.mkdir(parents=True, exist_ok=True)

    results_file.write_bytes(serialize(sections))

    logger.info("Completed section extraction in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_extract_sections_standard_awards_cfp(
    logger: logging.Logger,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    cfp_content_file = FIXTURES_FOLDER / "cfps" / "standard_awards.md"
    logger.info("Running end-to-end test for extracting sections from CFP data")
    start_time = datetime.now(UTC)

    sections = await handle_extract_sections(cfp_content=cfp_content_file.read_text())

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    results_file = (
        RESULTS_FOLDER
        / f"handle_extract_sections_standard_awards_cfp_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    )
    if not RESULTS_FOLDER.exists():
        RESULTS_FOLDER.mkdir(parents=True, exist_ok=True)

    results_file.write_bytes(serialize(sections))

    logger.info("Completed section extraction in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_extract_sections_nih_cfp(
    logger: logging.Logger,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    nih_organization_id: str,
) -> None:
    cfp_content_file = FIXTURES_FOLDER / "cfps" / "nih-cfp.md"
    logger.info("Running end-to-end test for extracting sections from CFP data")
    start_time = datetime.now(UTC)

    sections = await handle_extract_sections(
        cfp_content=cfp_content_file.read_text(), organization_id=nih_organization_id
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    results_file = (
        RESULTS_FOLDER / f"handle_extract_sections_nih_cfp_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    )
    if not RESULTS_FOLDER.exists():
        RESULTS_FOLDER.mkdir(parents=True, exist_ok=True)

    results_file.write_bytes(serialize(sections))

    logger.info("Completed section extraction in %.2f seconds with %d sections", elapsed_time, len(sections))
