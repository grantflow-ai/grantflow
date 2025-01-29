import logging
from datetime import UTC, datetime
from os import environ
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import FundingOrganization, GrantApplication
from src.rag.grant_template.extract_cfp_data import extract_cfp_data
from src.rag.grant_template.handler import extract_and_enrich_sections
from src.utils.serialization import serialize
from tests.conftest import FIXTURES_FOLDER, RESULTS_FOLDER


@pytest.fixture
async def organizations_by_id(async_session_maker: async_sessionmaker[Any]) -> dict[str, dict[str, str]]:
    async with async_session_maker() as session:
        organizations = await session.scalars(select(FundingOrganization).order_by(FundingOrganization.full_name.asc()))
        return {
            str(org.id): {
                "full_name": org.full_name,
                "abbreviation": org.abbreviation,
            }
            for org in organizations
        }


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_extract_cfp_data(
    logger: logging.Logger,
    organizations_by_id: dict[str, dict[str, str]],
) -> None:
    logger.info("Running end-to-end test for extracting CFP data")
    start_time = datetime.now(UTC)

    cfp_content_file = FIXTURES_FOLDER / "cfps" / "nih-cfp.md"
    assert cfp_content_file.exists(), "CFP content file does not exist"

    result = await extract_cfp_data(
        cfp_content=cfp_content_file.read_text(),
        organization_mapping=organizations_by_id,
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 30

    assert isinstance(result["organization_id"], (str | type(None)))
    assert isinstance(result["content"], list)
    assert isinstance(result["entities"], list)

    content_items = result["content"]
    assert len(content_items) >= 3
    assert all(isinstance(item, str) for item in content_items)
    assert all(len(item.strip()) > 0 for item in content_items)
    assert all(len(item) > 10 for item in content_items)

    entities = result["entities"]
    assert len(entities) >= 2
    assert all(isinstance(entity, str) for entity in entities)
    assert all(len(entity.strip()) > 0 for entity in entities)

    if result["organization_id"]:
        assert result["organization_id"] in organizations_by_id

    results_file = RESULTS_FOLDER / f"extract_cfp_data_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    results_file.write_bytes(serialize(result))

    logger.info(
        "Completed CFP data extraction in %.2f seconds with %d content items and %d entities",
        elapsed_time,
        len(content_items),
        len(entities),
    )


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template_melanoma_alliance(
    logger: logging.Logger,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    cfp_content_file = FIXTURES_FOLDER / "cfps" / "melanoma_alliance_cfp.md"
    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    sections = await extract_and_enrich_sections(cfp_content=cfp_content_file.read_text(), organization_id=None)

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    results_file = (
        RESULTS_FOLDER / f"grant_template_melanoma_alliance_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    )
    results_file.write_bytes(serialize(sections))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template_standard_aware(
    logger: logging.Logger,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    cfp_content_file = FIXTURES_FOLDER / "cfps" / "standard_awards.md"
    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    sections = await extract_and_enrich_sections(cfp_content=cfp_content_file.read_text(), organization_id=None)

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()

    results_file = (
        RESULTS_FOLDER / f"grant_template_standard_awards_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    )
    results_file.write_bytes(serialize(sections))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template_nih(
    logger: logging.Logger,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    nih_organization_id: str,
) -> None:
    cfp_content_file = FIXTURES_FOLDER / "cfps" / "nih-cfp.md"

    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    sections = await extract_and_enrich_sections(
        cfp_content=cfp_content_file.read_text(), organization_id=nih_organization_id
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()

    results_file = RESULTS_FOLDER / f"grant_template_nih_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    results_file.write_bytes(serialize(sections))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))
