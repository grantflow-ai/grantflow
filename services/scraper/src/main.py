from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from services.scraper.src.grant_pages import download_grant_pages
from services.scraper.src.search_data import DEFAULT_FROM_DATE, TODAY_DATE, download_search_data

if TYPE_CHECKING:
    from datetime import date

    from services.scraper.src.storage import Storage

logger = logging.getLogger(__name__)


async def run_scraper(storage: Storage, from_date: date = DEFAULT_FROM_DATE, to_date: date = TODAY_DATE) -> None:
    """Run the scraper.

    Args:
        storage: The storage object to save the data.
        from_date: The start date of the search.
        to_date: The end date of the search.

    Returns:
        None
    """
    search_results = await download_search_data(storage=storage, from_date=from_date, to_date=to_date)
    logger.info("Downloaded %d search results", len(search_results))
    existing_file_identifiers = await storage.get_existing_file_identifiers()
    logger.info("Found %d existing file identifiers", len(existing_file_identifiers))
    await download_grant_pages(
        storage=storage, search_results=search_results, existing_file_identifiers=existing_file_identifiers
    )
