from __future__ import annotations

import time
from typing import TYPE_CHECKING

from litestar import post
from packages.shared_utils.src.discord import send_scraper_report
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.otel import configure_otel
from packages.shared_utils.src.server import create_litestar_app
from services.scraper.src.grant_pages import download_grant_pages
from services.scraper.src.search_data import DEFAULT_FROM_DATE, TODAY_DATE, download_search_data
from services.scraper.src.storage import GCSStorage, SimpleFileStorage

if TYPE_CHECKING:
    from datetime import date

    from services.scraper.src.storage import Storage

configure_otel("scraper")


logger = get_logger(__name__)


async def run_scraper(storage: Storage, from_date: date = DEFAULT_FROM_DATE, to_date: date = TODAY_DATE) -> dict[str, int | float]:
    """Run the scraper.

    Args:
        storage: The storage object to save the data.
        from_date: The start date of the search.
        to_date: The end date of the search.

    Returns:
        Dictionary with scraper run metrics
    """
    start_time = time.time()

    logger.info(
        "Starting scraper run",
        from_date=from_date.isoformat(),
        to_date=to_date.isoformat(),
        storage_type=type(storage).__name__,
    )

    search_results = await download_search_data(storage=storage, from_date=from_date, to_date=to_date)
    logger.info("Downloaded %d search results", len(search_results))

    existing_file_identifiers = await storage.get_existing_file_identifiers()
    logger.info("Found %d existing file identifiers", len(existing_file_identifiers))

    new_files_downloaded = await download_grant_pages(
        storage=storage, search_results=search_results, existing_file_identifiers=existing_file_identifiers
    )

    total_duration = time.time() - start_time
    total_duration_ms = round(total_duration * 1000, 2)
    
    # Calculate derived metrics
    search_results_count = len(search_results)
    existing_files_count = len(existing_file_identifiers)
    existing_files_skipped = search_results_count - new_files_downloaded
    
    logger.info(
        "Scraper run completed",
        from_date=from_date.isoformat(),
        to_date=to_date.isoformat(),
        search_results_count=search_results_count,
        new_files_downloaded=new_files_downloaded,
        existing_files_skipped=existing_files_skipped,
        existing_identifiers_count=existing_files_count,
        total_duration_ms=total_duration_ms,
    )
    
    return {
        "search_results_count": search_results_count,
        "new_files_downloaded": new_files_downloaded,
        "existing_files_skipped": existing_files_skipped,
        "existing_files_count": existing_files_count,
        "total_duration_ms": total_duration_ms,
    }


@post("/")
async def handle_scraper_request() -> dict[str, str]:
    """Handle HTTP scraper requests from cloud scheduler.

    Returns:
        Response indicating success.
    """
    start_time = time.time()
    logger.info("Received scraper request")
    
    # Get Discord webhook URL and environment
    discord_webhook_url = get_env("DISCORD_WEBHOOK_URL", raise_on_missing=False, fallback="")
    environment = get_env("ENVIRONMENT", fallback="staging")

    try:
        if get_env("STORAGE_EMULATOR_HOST", fallback="") or get_env("DEBUG", fallback="False").lower() == "true":
            storage: Storage = SimpleFileStorage()
            bucket_name = "local-storage"
            logger.info("Using local file storage for development")
        else:
            storage = GCSStorage()
            bucket_name = get_env("SCRAPER_BUCKET_NAME", fallback="grantflow-scraper")
            logger.info("Using GCS storage for production")

        metrics = await run_scraper(storage=storage)

        total_duration = time.time() - start_time
        logger.info(
            "Scraper request completed successfully",
            total_duration_ms=round(total_duration * 1000, 2),
        )

        # Send Discord notification if webhook URL is configured
        if discord_webhook_url:
            try:
                # Get total files count if using GCS storage
                total_files_in_bucket = None
                if isinstance(storage, GCSStorage):
                    try:
                        all_files = await storage.get_existing_file_identifiers()
                        total_files_in_bucket = len(all_files)
                    except Exception:
                        logger.warning("Could not get total file count from storage")
                
                await send_scraper_report(
                    webhook_url=discord_webhook_url,
                    environment=environment,
                    date_range=f"{DEFAULT_FROM_DATE.isoformat()} to {TODAY_DATE.isoformat()}",
                    search_results_found=metrics["search_results_count"],
                    new_files_downloaded=metrics["new_files_downloaded"],
                    existing_files_skipped=metrics["existing_files_skipped"],
                    total_processing_time_ms=metrics["total_duration_ms"],
                    bucket_name=bucket_name,
                    total_files_in_bucket=total_files_in_bucket,
                    success=True,
                )
                logger.info("Discord notification sent successfully")
            except Exception:
                logger.exception("Failed to send Discord notification")
        else:
            logger.info("Discord webhook URL not configured, skipping notification")

        return {"status": "success", "message": "Scraper completed successfully"}

    except Exception as e:
        error_duration = time.time() - start_time
        logger.exception(
            "Scraper request failed",
            error_type=type(e).__name__,
            error_duration_ms=round(error_duration * 1000, 2),
        )
        
        # Send failure notification to Discord if webhook URL is configured
        if discord_webhook_url:
            try:
                await send_scraper_report(
                    webhook_url=discord_webhook_url,
                    environment=environment,
                    date_range=f"{DEFAULT_FROM_DATE.isoformat()} to {TODAY_DATE.isoformat()}",
                    search_results_found=0,
                    new_files_downloaded=0,
                    existing_files_skipped=0,
                    total_processing_time_ms=round(error_duration * 1000, 2),
                    bucket_name=bucket_name if "bucket_name" in locals() else "unknown",
                    success=False,
                    error_message=str(e),
                )
                logger.info("Discord failure notification sent")
            except Exception:
                logger.exception("Failed to send Discord failure notification")
        
        raise


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_scraper_request,
    ],
    add_session_maker=False,
)
