import logging
import re
from datetime import UTC, datetime
from os import environ

import pytest
from packages.shared_utils.src.serialization import serialize
from services.backend.src.rag.grant_template.extract_cfp_data import handle_extract_cfp_data
from testing import FIXTURES_FOLDER, RESULTS_FOLDER


@pytest.mark.timeout(60 * 5)
@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
@pytest.mark.parametrize(
    "filename",
    [
        "nih.md",
        "ics.md",
        "erc.md",
    ],
)
async def test_extract_cfp_data(
    logger: logging.Logger,
    organization_mapping: dict[str, dict[str, str]],
    filename: str,
) -> None:
    logger.info("Running end-to-end test for extracting CFP data from %s", filename)
    start_time = datetime.now(UTC)

    cfp_content_file = FIXTURES_FOLDER / "cfps" / filename
    assert cfp_content_file.exists(), f"CFP content file {cfp_content_file} does not exist"

    result = await handle_extract_cfp_data(
        cfp_content=cfp_content_file.read_text(),
        organization_mapping=organization_mapping,
    )

    execution_time = (datetime.now(UTC) - start_time).total_seconds()
    logger.info("Extraction completed in %.2f seconds", execution_time)

    assert isinstance(result["organization_id"], (str | type(None))), "organization_id should be a string or None"
    assert isinstance(result["content"], list), "content should be a list"

    content_items = result["content"]
    assert len(content_items) >= 1, "At least one content item should be extracted"

    for item in content_items:
        assert "title" in item, f"Each content item should have a 'title' field: {item}"
        assert isinstance(item["title"], str), f"'title' field should be a string: {item}"
        assert "subtitles" in item, f"Each content item should have a 'subtitles' field: {item}"
        assert isinstance(item["subtitles"], list), f"'subtitles' field should be a list: {item}"

    if result["organization_id"]:
        assert result["organization_id"] in organization_mapping, (
            f"organization_id {result['organization_id']} not found in organization mapping"
        )
        logger.info("Identified organization: %s", result["organization_id"])

    folder = RESULTS_FOLDER / "cfps" / "extracted_data"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    filename_wo_ext = re.sub(r"\.[^.]*$", "", filename)
    timestamp = datetime.now(UTC).strftime("%d_%m_%Y_%H_%M")
    results_file = folder / f"extract_cfp_data_{filename_wo_ext}_{timestamp}.json"
    results_file.write_bytes(serialize(result))

    logger.info("Results saved to %s", results_file)
    logger.info("Successfully extracted %d content items from %s", len(content_items), filename)
