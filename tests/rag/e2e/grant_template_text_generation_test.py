import logging
from datetime import UTC, datetime
from os import environ
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.enums import ContentTopicEnum, GrantSectionEnum
from src.db.tables import FundingOrganization, GrantApplication, GrantTemplate
from src.rag.grant_template.extract_cfp_data import extract_cfp_data
from src.rag.grant_template.generate_template_data import generate_grant_template
from src.rag.grant_template.handler import handle_generate_grant_template
from src.utils.serialization import serialize
from tests.conftest import RESULTS_FOLDER


@pytest.fixture
async def organizations_by_id(async_session_maker: async_sessionmaker[Any]) -> dict[str, dict[str, str | None]]:
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
    organizations_by_id: dict[str, dict[str, str | None]],
) -> None:
    logger.info("Running end-to-end test for extracting CFP data")
    start_time = datetime.now(UTC)

    cfp_content_file = RESULTS_FOLDER / "extracted_cfp_content.md"
    assert cfp_content_file.exists(), "CFP content file does not exist"

    result = await extract_cfp_data(
        cfp_content=cfp_content_file.read_text(),
        organization_mapping=organizations_by_id,  # type: ignore[arg-type]
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
async def test_pipeline_flow(
    logger: logging.Logger,
    organizations_by_id: dict[str, dict[str, str | None]],
) -> None:
    logger.info("Running end-to-end test for full grant template pipeline")
    pipeline_start = datetime.now(UTC)

    cfp_content_file = RESULTS_FOLDER / "extracted_cfp_content.md"
    assert cfp_content_file.exists(), "CFP content file does not exist"
    cfp_content = cfp_content_file.read_text()

    extraction_start = datetime.now(UTC)
    extract_result = await extract_cfp_data(
        cfp_content=cfp_content,
        organization_mapping=organizations_by_id,  # type: ignore[arg-type]
    )
    extraction_time = (datetime.now(UTC) - extraction_start).total_seconds()

    assert len(extract_result["content"]) >= 3
    if extract_result["organization_id"]:
        assert extract_result["organization_id"] in organizations_by_id

    template_start = datetime.now(UTC)
    template_result = await generate_grant_template(
        cfp_content="...".join(extract_result["content"]),
        organization_id=extract_result["organization_id"],
    )
    template_time = (datetime.now(UTC) - template_start).total_seconds()

    assert template_result["name"]
    assert template_result["template"]
    assert len(template_result["sections"]) >= 2

    total_time = (datetime.now(UTC) - pipeline_start).total_seconds()
    assert total_time < 90

    results_file = RESULTS_FOLDER / f"pipeline_flow_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    results_file.write_bytes(serialize(template_result))

    logger.info(
        "Completed pipeline flow in %.2f seconds (extraction: %.2f, template: %.2f)",
        total_time,
        extraction_time,
        template_time,
    )


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template(
    logger: logging.Logger,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    cfp_content_file = RESULTS_FOLDER / "extracted_cfp_content.md"
    assert cfp_content_file.exists(), "CFP content file does not exist"

    result = await handle_generate_grant_template(
        cfp_content=cfp_content_file.read_text(),
        application_id=grant_application.id,
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 120

    assert isinstance(result, GrantTemplate)
    assert result.grant_application_id == grant_application.id
    assert result.template
    assert len(result.template) > 100
    assert result.name
    assert len(result.name) >= 10
    assert result.grant_sections
    assert len(result.grant_sections) >= 2

    async with async_session_maker() as session:
        db_template = await session.scalar(
            select(GrantTemplate).where(GrantTemplate.grant_application_id == grant_application.id)
        )
        assert db_template is not None
        assert db_template.id == result.id
        assert db_template.template == result.template
        assert db_template.name == result.name
        assert len(db_template.grant_sections) == len(result.grant_sections)

        assert "{{" in db_template.template
        assert "}}" in db_template.template

        for section in db_template.grant_sections:
            assert section["type"] in GrantSectionEnum
            assert isinstance(section["topics"], list)
            assert len(section["topics"]) >= 2
            for topic in section["topics"]:
                assert topic["type"] in ContentTopicEnum
                assert 0 <= topic["weight"] <= 1

        results_file = (
            RESULTS_FOLDER / f"handle_generate_grant_template_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
        )
        results_file.write_bytes(serialize(result))

    logger.info("Completed end-to-end grant template generation in %.2f seconds", elapsed_time)
