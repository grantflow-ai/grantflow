from __future__ import annotations

import tempfile
from datetime import UTC, date, datetime
from json import dumps
from typing import TYPE_CHECKING, Final, cast

from anyio import Path as AsyncPath
from pandas import read_csv
from playwright.async_api import async_playwright
from services.scraper.src.exceptions import ScraperError

if TYPE_CHECKING:
    from services.scraper.src.dtos import GrantInfo
    from services.scraper.src.storage import Storage

NIH_GRANT_BASE_URL: Final[str] = "https://grants.nih.gov/funding/searchguide/index.html#"
DEFAULT_FROM_DATE: Final[date] = date(1991, 1, 2)
TODAY_DATE: Final[date] = datetime.now(UTC).date()


def create_query_string(from_date: date = DEFAULT_FROM_DATE, to_date: date = TODAY_DATE) -> str:
    """Create a query string for the NIH grant search page.

    The new NIH site automatically downloads results when navigating with search parameters.

    Args:
        from_date: The start date of the search.
        to_date: The end date of the search.

    Returns:
        The query string.
    """

    _ = from_date
    _ = to_date

    qs = {
        "type": "all",
        "spons": "true",
        "fields": "all",
    }

    return "&".join(f"{key}={','.join(value) if isinstance(value, list) else value}" for key, value in qs.items())


async def download_search_data(
    *, storage: Storage, to_date: date = TODAY_DATE, from_date: date = DEFAULT_FROM_DATE
) -> list[GrantInfo]:
    """Download the CSV file from the NIH grant search page and
        return the data as a list of dictionaries.

    The NIH site has been redesigned and now uses a different download mechanism.
    This function navigates to the search page and attempts to trigger the download.

    Raises:
        ScraperError: If the download does not occur.

    Args:
        storage: The storage object to save the data.
        to_date: The end date of the search.
        from_date: The start date of the search.

    Returns:
        The data as a list of dictionaries
    """
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(
            accept_downloads=True,
            extra_http_headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
        )
        page = await context.new_page()

        try:
            url = f"{NIH_GRANT_BASE_URL}?{create_query_string(from_date=from_date, to_date=to_date)}"

            await page.goto(url, wait_until="networkidle")

            await page.wait_for_timeout(2000)

            download = None
            try:
                download = await page.wait_for_event("download", timeout=5000)
            except Exception:
                export_selectors = [
                    "text=Export Results",
                    "text=Export",
                    "button:has-text('Export')",
                    "[aria-label*='Export']",
                    "[title*='Export']",
                ]

                for selector in export_selectors:
                    try:
                        button = await page.wait_for_selector(selector, timeout=2000)
                        if button:
                            await button.click()
                            download = await page.wait_for_event("download", timeout=5000)
                            break
                    except Exception:  # noqa: S112
                        continue

            if not download:
                page_content = await page.content()
                if "No results found" in page_content:
                    return []
                raise ScraperError("Unable to download grant data from NIH site")

            temp_dir = AsyncPath(tempfile.gettempdir())
            tmp_path = temp_dir / f"grants_export_{download.suggested_filename or 'NIH_Guide_Results.csv'}"
            await download.save_as(str(tmp_path))

            try:
                data_frame = read_csv(str(tmp_path)).fillna("")
                await tmp_path.unlink(missing_ok=True)
                data_frame.columns = data_frame.columns.str.lower()
                search_data = cast("list[GrantInfo]", data_frame.to_dict(orient="records"))
            except Exception as e:
                await tmp_path.unlink(missing_ok=True)
                raise ScraperError(f"Failed to process downloaded CSV: {e!s}") from e

            await storage.save_file(f"grants_search_csv_{to_date.strftime('%d_%m_%Y')}.json", dumps(search_data))

            return search_data

        finally:
            await browser.close()
