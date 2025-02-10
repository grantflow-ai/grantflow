import logging
from datetime import UTC, datetime
from os import environ
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import FundingOrganization, GrantApplication
from src.rag.grant_template.extract_sections import handle_extract_sections
from src.utils.serialization import serialize
from tests.conftest import RESULTS_FOLDER
from tests.rag.e2e.utils import get_extracted_section_data


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_extract_sections_melanoma_alliance_cfp(
    logger: logging.Logger,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
) -> None:
    result = await get_extracted_section_data(
        source_file_name="melanoma_alliance_cfp.md",
        organization_mapping=organization_mapping,
    )
    logger.info("Running end-to-end test for extracting sections from CFP data")
    start_time = datetime.now(UTC)

    sections = await handle_extract_sections(
        cfp_content="...".join(result["content"]), cfp_subject=result["cfp_subject"]
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    folder = RESULTS_FOLDER / "cfps" / "extracted_sections"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = (
        folder / f"handle_extract_sections_melanoma_alliance_cfp_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    )
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
    organization_mapping: dict[str, dict[str, str]],
) -> None:
    result = await get_extracted_section_data(
        source_file_name="standard_awards.md",
        organization_mapping=organization_mapping,
    )

    logger.info("Running end-to-end test for extracting sections from CFP data")
    start_time = datetime.now(UTC)

    sections = await handle_extract_sections(
        cfp_content="...".join(result["content"]), cfp_subject=result["cfp_subject"]
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    folder = RESULTS_FOLDER / "cfps" / "extracted_sections"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = (
        folder / f"handle_extract_sections_standard_awards_cfp_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    )
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
    nih_organization: FundingOrganization,
    organization_mapping: dict[str, dict[str, str]],
) -> None:
    result = await get_extracted_section_data(
        source_file_name="nih.md",
        organization_mapping=organization_mapping,
    )
    logger.info("Running end-to-end test for extracting sections from CFP data")
    start_time = datetime.now(UTC)

    sections = await handle_extract_sections(
        cfp_content="...".join(result["content"]), cfp_subject=result["cfp_subject"], organization=nih_organization
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    folder = RESULTS_FOLDER / "cfps" / "extracted_sections"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"handle_extract_sections_nih_cfp_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    results_file.write_bytes(serialize(sections))
    logger.info("Completed section extraction in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_extract_sections_ics_cfp(
    logger: logging.Logger,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    nih_organization: FundingOrganization,
    organization_mapping: dict[str, dict[str, str]],
) -> None:
    result = await get_extracted_section_data(
        source_file_name="ics.md",
        organization_mapping=organization_mapping,
    )
    logger.info("Running end-to-end test for extracting sections from CFP data")
    start_time = datetime.now(UTC)

    sections = await handle_extract_sections(
        cfp_content="...".join(result["content"]), cfp_subject=result["cfp_subject"], organization=nih_organization
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    folder = RESULTS_FOLDER / "cfps" / "extracted_sections"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"handle_extract_sections_nih_cfp_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    results_file.write_bytes(serialize(sections))
    logger.info("Completed section extraction in %.2f seconds with %d sections", elapsed_time, len(sections))
