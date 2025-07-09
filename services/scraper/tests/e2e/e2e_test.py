import logging
from typing import Final

from anyio import Path
from services.scraper.src.main import run_scraper
from services.scraper.src.storage import SimpleFileStorage
from testing.e2e_utils import E2ETestCategory, e2e_test

E2E_DATE: Final[str] = "09062024"


@e2e_test(category=E2ETestCategory.SMOKE, timeout=300)
async def test_run_scraper(logger: logging.Logger) -> None:
    """Test the scraper by scraping the NIH grant search page."""
    logger.info("Initializing e2e test using the date range %s to %s")
    await run_scraper(SimpleFileStorage())
    logger.info("Finished scraping")

    assert await Path("./.results").exists(), "The results folder should exist"
    assert await Path("./.results/grants_search_excel_09_06_2024.json").exists(), "The JSON file should exist"
