import logging
from datetime import UTC, datetime

from anyio import Path
from services.scraper.src.main import run_scraper
from services.scraper.src.storage import SimpleFileStorage
from testing.e2e_utils import E2ETestCategory, e2e_test


@e2e_test(category=E2ETestCategory.SMOKE, timeout=300)
async def test_run_scraper(logger: logging.Logger) -> None:
    """Test the scraper by scraping the NIH grant search page."""
    logger.info("Initializing e2e test for NIH grant scraper")

    metrics = await run_scraper(SimpleFileStorage())
    logger.info("Finished scraping", search_results_count=metrics.get("search_results_count", 0))  # type: ignore[call-arg]

    today = datetime.now(UTC).date()
    expected_filename = f"grants_search_csv_{today.strftime('%d_%m_%Y')}.json"

    search_results_count = metrics.get("search_results_count", 0)

    if search_results_count > 0:
        assert await Path("./.results").exists(), "The results folder should exist"

        results_path = Path("./.results") / expected_filename
        assert await results_path.exists(), f"The JSON file {expected_filename} should exist"
    else:
        logger.info("No search results found from NIH site - this is expected with certain queries")

    assert "total_duration_ms" in metrics, "Metrics should include total duration"
    assert metrics["total_duration_ms"] > 0, "Scraper should have taken some time to run"

    logger.info(
        "Scraper test completed successfully",
        search_results_count=metrics.get("search_results_count", 0),
        new_files_downloaded=metrics.get("new_files_downloaded", 0),
    )  # type: ignore[call-arg]
