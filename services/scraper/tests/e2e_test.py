from logging import Logger
from os import environ
from typing import Final

import pytest
from anyio import Path
from services.scraper.src.main import run_scraper
from services.scraper.src.storage import SimpleFileStorage

E2E_DATE: Final[str] = "09062024"


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_run_scraper(logger: Logger) -> None:
    """Test the scraper by scraping the NIH grant search page."""
    logger.info("Initializing e2e test using the date range %s to %s")
    await run_scraper(SimpleFileStorage())
    logger.info("Finished scraping")

    assert await Path("./.results").exists(), "The results folder should exist"
    assert await Path("./.results/grants_search_excel_09_06_2024.json").exists(), "The JSON file should exist"
