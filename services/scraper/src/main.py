from __future__ import annotations

import time
from typing import TYPE_CHECKING

from litestar import post
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.server import create_litestar_app
from services.scraper.src.grant_pages import download_grant_pages
from services.scraper.src.search_data import DEFAULT_FROM_DATE, TODAY_DATE, download_search_data
from services.scraper.src.storage import GCSStorage, SimpleFileStorage

if TYPE_CHECKING:
    from datetime import date

    from services.scraper.src.storage import Storage

logger = get_logger(__name__)


async def run_scraper(storage: Storage, from_date: date = DEFAULT_FROM_DATE, to_date: date = TODAY_DATE) -> None:
    """Run the scraper.

    Args:
        storage: The storage object to save the data.
        from_date: The start date of the search.
        to_date: The end date of the search.

    Returns:
        None
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

    await download_grant_pages(
        storage=storage, search_results=search_results, existing_file_identifiers=existing_file_identifiers
    )

    total_duration = time.time() - start_time
    logger.info(
        "Scraper run completed",
        from_date=from_date.isoformat(),
        to_date=to_date.isoformat(),
        search_results_count=len(search_results),
        existing_identifiers_count=len(existing_file_identifiers),
        total_duration_ms=round(total_duration * 1000, 2),
    )


@post("/")
async def handle_scraper_request() -> dict[str, str]:
    """Handle HTTP scraper requests from cloud scheduler.

    Returns:
        Response indicating success.
    """
    start_time = time.time()
    logger.info("Received scraper request")

    try:

        if get_env("STORAGE_EMULATOR_HOST", fallback="") or get_env("DEBUG", fallback="False").lower() == "true":
            storage: Storage = SimpleFileStorage()
            logger.info("Using local file storage for development")
        else:
            storage = GCSStorage()
            logger.info("Using GCS storage for production")

        await run_scraper(storage=storage)

        total_duration = time.time() - start_time
        logger.info(
            "Scraper request completed successfully",
            total_duration_ms=round(total_duration * 1000, 2),
        )

        return {"status": "success", "message": "Scraper completed successfully"}

    except Exception as e:
        error_duration = time.time() - start_time
        logger.exception(
            "Scraper request failed",
            error_type=type(e).__name__,
            error_duration_ms=round(error_duration * 1000, 2),
        )
        raise


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_scraper_request,
    ],
    add_session_maker=False,
)
