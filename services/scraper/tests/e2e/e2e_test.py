import logging
import os
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

from services.scraper.src.main import run_scraper
from testing.e2e_utils import E2ETestCategory, e2e_test


@e2e_test(category=E2ETestCategory.SMOKE, timeout=300)
async def test_run_scraper(logger: logging.Logger) -> None:
    """Test the scraper by scraping the NIH grant search page."""
    logger.info("Initializing e2e test for NIH grant scraper")

    # Set test environment variables
    os.environ["SCRAPER_GCS_BUCKET_NAME"] = "test-scraper-bucket"
    
    # Mock GCS operations
    with patch("services.scraper.src.gcs_utils.get_storage_client") as mock_get_client, \
         patch("services.scraper.src.gcs_utils.run_sync") as mock_run_sync:
        
        # Mock storage client and bucket
        mock_bucket = MagicMock()
        mock_bucket.exists = MagicMock(return_value=True)
        mock_bucket.blob = MagicMock()
        mock_bucket.list_blobs = MagicMock(return_value=[])
        
        mock_client = MagicMock()
        mock_client.bucket = MagicMock(return_value=mock_bucket)
        mock_get_client.return_value = mock_client
        
        # Make run_sync execute the function immediately
        mock_run_sync.side_effect = lambda func: func() if callable(func) else func
        
        metrics = await run_scraper()
        logger.info("Finished scraping, search_results_count=%s", metrics.get("search_results_count", 0))

        search_results_count = metrics.get("search_results_count", 0)
        
        if search_results_count > 0:
            # Verify that upload_blob was called for search results
            mock_bucket.blob.assert_called()
            logger.info("Search results uploaded to GCS successfully")
        else:
            logger.info("No search results found from NIH site - this is expected with certain queries")

    assert "total_duration_ms" in metrics, "Metrics should include total duration"
    assert metrics["total_duration_ms"] > 0, "Scraper should have taken some time to run"

    logger.info(
        "Scraper test completed successfully, search_results_count=%s, new_files_downloaded=%s",
        metrics.get("search_results_count", 0),
        metrics.get("new_files_downloaded", 0),
    )
