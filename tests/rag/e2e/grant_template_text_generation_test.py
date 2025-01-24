import logging
from datetime import UTC, datetime
from os import environ
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.tables import FundingOrganization, GrantApplication
from src.rag.grant_template.extract_cfp_data import extract_cfp_data
from src.rag.grant_template.generate_template_data import handle_generate_grant_template
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
async def test_pipeline_flow(
    logger: logging.Logger,
    organizations_by_id: dict[str, dict[str, str]],
) -> None:
    logger.info("Running end-to-end test for full grant template pipeline")
    pipeline_start = datetime.now(UTC)

    cfp_content_file = FIXTURES_FOLDER / "cfps" / "nih-cfp.md"
    assert cfp_content_file.exists(), "CFP content file does not exist"
    cfp_content = cfp_content_file.read_text()

    extraction_start = datetime.now(UTC)
    extract_result = await extract_cfp_data(
        cfp_content=cfp_content,
        organization_mapping=organizations_by_id,
    )
    extraction_time = (datetime.now(UTC) - extraction_start).total_seconds()

    assert len(extract_result["content"]) >= 3
    if extract_result["organization_id"]:
        assert extract_result["organization_id"] in organizations_by_id

    template_start = datetime.now(UTC)
    template_result = await handle_generate_grant_template(
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
async def test_handle_generate_grant_template_without_rag(
    logger: logging.Logger,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    cfp_content_file = FIXTURES_FOLDER / "cfps" / "melanoma_alliance_cfp.md"
    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    template_result = await handle_generate_grant_template(
        cfp_content=cfp_content_file.read_text(), organization_id=None
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 120

    assert isinstance(template_result, dict)
    assert "name" in template_result
    assert "template" in template_result
    assert "sections" in template_result

    assert "::research_plan::" in template_result["template"]
    assert isinstance(template_result["name"], str)
    assert len(template_result["name"]) > 0
    assert isinstance(template_result["template"], str)
    assert len(template_result["template"]) > 0

    sections = template_result["sections"]
    assert isinstance(sections, list)
    assert len(sections) > 0

    section_names = {s["name"] for s in sections}

    for section in sections:
        assert isinstance(section, dict)
        assert all(key in section for key in ["name", "title", "instructions", "keywords", "depends_on"])

        assert isinstance(section["name"], str)
        assert isinstance(section["title"], str)
        assert isinstance(section["instructions"], str)
        assert len(section["name"]) > 0
        assert len(section["title"]) > 0
        assert len(section["instructions"]) > 0

        assert isinstance(section["keywords"], list)
        assert 3 <= len(section["keywords"]) <= 10
        assert all(isinstance(k, str) for k in section["keywords"])
        assert all(len(k) > 0 for k in section["keywords"])

        assert isinstance(section["depends_on"], list)
        assert all(isinstance(d, str) for d in section["depends_on"])

        assert all((d in {"::research_plan::", "research_plan", *section_names}) for d in section["depends_on"])

        assert section["name"] not in section["depends_on"]

    for section_name in section_names:
        content_placeholder = f"{{{{{section_name}.content}}}}"
        assert content_placeholder in template_result["template"]

        title_placeholder = f"{{{{{section_name}.title}}}}"
        assert title_placeholder in template_result["template"]

    results_file = RESULTS_FOLDER / f"grant_template_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    results_file.write_bytes(serialize(template_result))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template_with_rag(
    logger: logging.Logger,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    nih_guidelines: None,
) -> None:
    cfp_content_file = FIXTURES_FOLDER / "cfps" / "nih-cfp.md"

    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    template_result = await handle_generate_grant_template(
        cfp_content=cfp_content_file.read_text(), organization_id=None
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 60

    assert isinstance(template_result, dict)
    assert "name" in template_result
    assert "template" in template_result
    assert "sections" in template_result

    assert isinstance(template_result["name"], str)
    assert len(template_result["name"]) > 0
    assert isinstance(template_result["template"], str)
    assert len(template_result["template"]) > 0

    sections = template_result["sections"]
    assert isinstance(sections, list)
    assert len(sections) > 0

    section_names = {s["name"] for s in sections}

    for section in sections:
        assert isinstance(section, dict)
        assert all(key in section for key in ["name", "title", "instructions", "keywords", "depends_on"])

        assert isinstance(section["name"], str)
        assert isinstance(section["title"], str)
        assert isinstance(section["instructions"], str)
        assert len(section["name"]) > 0
        assert len(section["title"]) > 0
        assert len(section["instructions"]) > 0

        assert isinstance(section["keywords"], list)
        assert 3 <= len(section["keywords"]) <= 10
        assert all(isinstance(k, str) for k in section["keywords"])
        assert all(len(k) > 0 for k in section["keywords"])

        assert isinstance(section["depends_on"], list)
        assert all(isinstance(d, str) for d in section["depends_on"])

        assert all(d in section_names for d in section["depends_on"])

        assert section["name"] not in section["depends_on"]

    for section_name in section_names:
        content_placeholder = f"{{{{{section_name}.content}}}}"
        assert content_placeholder in template_result["template"]

        title_placeholder = f"{{{{{section_name}.title}}}}"
        assert title_placeholder in template_result["template"]

    results_file = RESULTS_FOLDER / f"grant_template_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    results_file.write_bytes(serialize(template_result))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))
