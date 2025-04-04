import logging
import re
from datetime import UTC, datetime
from os import environ

import pytest

from src.rag.grant_template.extract_cfp_data import handle_extract_cfp_data
from src.utils.serialization import serialize
from tests.test_utils import FIXTURES_FOLDER, RESULTS_FOLDER


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_extract_cfp_data_nih(
    logger: logging.Logger,
    organization_mapping: dict[str, dict[str, str]],
) -> None:
    await helper(logger, organization_mapping, "nih.md")


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_extract_cfp_data_israeli_chief_scientist(
    logger: logging.Logger,
    organization_mapping: dict[str, dict[str, str]],
) -> None:
    await helper(logger, organization_mapping, "ics.md")


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_extract_cfp_data_erc(
    logger: logging.Logger,
    organization_mapping: dict[str, dict[str, str]],
) -> None:
    await helper(logger, organization_mapping, "erc.md")


async def helper(
    logger: logging.Logger,
    organization_mapping: dict[str, dict[str, str]],
    filename: str,
) -> None:
    logger.info("Running end-to-end test for extracting CFP data")
    start_time = datetime.now(UTC)

    cfp_content_file = FIXTURES_FOLDER / "cfps" / filename
    assert cfp_content_file.exists(), "CFP content file does not exist"
    result = await handle_extract_cfp_data(
        cfp_content=cfp_content_file.read_text(),
        organization_mapping=organization_mapping,
    )

    (datetime.now(UTC) - start_time).total_seconds()

    assert isinstance(result["organization_id"], (str | type(None)))
    assert isinstance(result["content"], list)

    content_items = result["content"]
    assert len(content_items) >= 1
    assert all(isinstance(item, str) for item in content_items)

    if result["organization_id"]:
        assert result["organization_id"] in organization_mapping

    folder = RESULTS_FOLDER / "cfps" / "extracted_data"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    filename_wo_ext = re.sub(r"\.[^.]*$", "", filename)
    results_file = folder / f"extract_cfp_data_{filename_wo_ext}_{datetime.now(UTC).strftime('%d_%m_%Y_%H:%M')}.json"
    results_file.write_bytes(serialize(result))
