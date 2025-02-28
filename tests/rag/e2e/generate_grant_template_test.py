import logging
from datetime import UTC, datetime
from os import environ
from typing import Any

import pytest

from src.db.tables import FundingOrganization, GrantApplication
from src.rag.grant_template.handler import extract_and_enrich_sections
from src.utils.serialization import serialize
from tests.rag.e2e.utils import get_extracted_section_data
from tests.test_utils import RESULTS_FOLDER


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template_melanoma_alliance(
    logger: logging.Logger,
) -> None:
    result = await get_extracted_section_data(
        source_file_name="melanoma_alliance_cfp.md",
        organization_mapping={},
    )
    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    sections = await extract_and_enrich_sections(
        cfp_content="...".join(result["content"]), cfp_subject=result["cfp_subject"], organization=None
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()
    assert elapsed_time < 180

    folder = RESULTS_FOLDER / "cfps" / "template_data"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"grant_template_melanoma_alliance_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    results_file.write_bytes(serialize(sections))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template_standard_aware(
    logger: logging.Logger,
) -> None:
    result = await get_extracted_section_data(
        source_file_name="standard_awards.md",
        organization_mapping={},
    )
    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    sections = await extract_and_enrich_sections(
        cfp_content="...".join(result["content"]), cfp_subject=result["cfp_subject"], organization=None
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()

    folder = RESULTS_FOLDER / "cfps" / "template_data"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"grant_template_standard_awards_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    results_file.write_bytes(serialize(sections))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template_nih(
    logger: logging.Logger,
    nih_organization: FundingOrganization,
    organization_mapping: dict[str, dict[str, str]],
) -> None:
    result = await get_extracted_section_data(
        source_file_name="nih.md",
        organization_mapping=organization_mapping,
    )
    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    sections = await extract_and_enrich_sections(
        cfp_content="...".join(result["content"]), cfp_subject=result["cfp_subject"], organization=nih_organization
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()

    folder = RESULTS_FOLDER / "cfps" / "template_data"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"grant_template_nih_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    results_file.write_bytes(serialize(sections))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_handle_generate_grant_template_ics(
    logger: logging.Logger,
) -> None:
    result = await get_extracted_section_data(
        source_file_name="ics.md",
        organization_mapping={},
    )
    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(UTC)

    sections = await extract_and_enrich_sections(
        cfp_content="...".join(result["content"]), cfp_subject=result["cfp_subject"], organization=None
    )

    elapsed_time = (datetime.now(UTC) - start_time).total_seconds()

    folder = RESULTS_FOLDER / "cfps" / "template_data"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"grant_template_ics_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    results_file.write_bytes(serialize(sections))

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.parametrize("source_file_name", ["melanoma_alliance", "standard_awards", "nih", "ics"])
async def test_handle_generate_grant_template(
    logger: logging.Logger,
    grant_application: GrantApplication,
    async_session_maker: Any,
    nih_organization: FundingOrganization,
    organization_mapping: dict[str, dict[str, str]],
    source_file_name: str,
) -> None:
    """Validates generated grant templates against synthetic data."""

    result = await get_extracted_section_data(
        source_file_name=f"{source_file_name}.md",
        organization_mapping=organization_mapping,
    )

    logger.info("Running end-to-end test for complete grant template generation")
    start_time = datetime.now(tz=UTC)

    sections = await extract_and_enrich_sections(
        cfp_content="...".join(result["content"]), cfp_subject=result["cfp_subject"], organization=nih_organization
    )

    elapsed_time = (datetime.now(tz=UTC) - start_time).total_seconds()

    logger.info("Completed grant template generation in %.2f seconds with %d sections", elapsed_time, len(sections))

    folder = RESULTS_FOLDER / "cfps" / "template_data"
    folder.mkdir(parents=True, exist_ok=True)

    results_file = folder / f"{source_file_name}_{datetime.now(tz=UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    results_file.write_bytes(serialize(sections))
