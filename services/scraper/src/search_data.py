from __future__ import annotations

from datetime import UTC, date, datetime
from json import dumps
from typing import TYPE_CHECKING, Final, cast

from services.scraper.src.exceptions import ScraperError

if TYPE_CHECKING:
    from playwright.async_api import Page

    from services.scraper.src.dtos import GrantInfo
    from services.scraper.src.storage import Storage

NIH_GRANT_BASE_URL: Final[str] = "https://grants.nih.gov/funding/searchguide/index.html#"
DEFAULT_FROM_DATE: Final[date] = date(1991, 1, 2)
TODAY_DATE: Final[date] = datetime.now(UTC).date()


def create_query_string(from_date: date = DEFAULT_FROM_DATE, to_date: date = TODAY_DATE) -> str:
    """Create a query string for the NIH grant search page.

    Args:
        from_date: The start date of the search.
        to_date: The end date of the search.

    Returns:
        The query string.
    """
    qs = {
        "query": "empty",
        "type": "all",  # ["active", "notices", "activenosis"],
        "foa": "all",
        "parent_orgs": "all",  # "NIH",
        "orgs": "all",
        "ac": "all",  # ["R00", "R01", "R03", "R13", "R15", "R16"],
        "ct": "all",
        "pfoa": "all",
        "date": f"{from_date.strftime("%m%d%Y")}-{to_date.strftime("%m%d%Y")}",
        "fields": "all",
        "spons": "true",
    }
    # we don't use urlencode's doseq=True because we want dont want whitespace and escape characters in the query string
    return "&".join(f"{key}={','.join(value) if isinstance(value, list) else value}" for key, value in qs.items())


async def handle_download_excel_export(page: Page) -> list[GrantInfo]:
    """Handle the download of the excel sheet from the NIH grant search page.

    Args:
        page: The page object to interact

    Returns:
        The data as a list of dictionaries.

    Raises:
        ScraperError: If the export button is not found.
    """
    if export_button := await page.wait_for_selector("text=Export", state="visible"):
        from aiofiles.tempfile import NamedTemporaryFile as AsyncNamedTemporaryFile
        from pandas import read_excel

        await export_button.click()
        download = await page.wait_for_event("download")
        async with AsyncNamedTemporaryFile(delete=False) as tmp_file:
            await download.save_as(tmp_file.name)

        data_frame = read_excel(tmp_file.name).fillna("")
        data_frame.columns = data_frame.columns.str.lower()

        return cast("list[GrantInfo]", data_frame.to_dict(orient="records"))

    raise ScraperError("Export button not found")


async def download_search_data(
    *, storage: Storage, to_date: date = TODAY_DATE, from_date: date = DEFAULT_FROM_DATE
) -> list[GrantInfo]:
    """Download the excel sheet from the NIH grant search page and
        return the data as a list of dictionaries.

    Raises:
        ScraperError: If the export button is not found.

    Args:
        storage: The storage object to save the data.
        to_date: The end date of the search.
        from_date: The start date of the search.

    Returns:
        The data as a list of dictionaries
    """
    from playwright.async_api import async_playwright

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()

        url = f"{NIH_GRANT_BASE_URL}?{create_query_string(
            from_date=from_date, to_date=to_date
        )}"
        await page.goto(url)
        await page.wait_for_timeout(3000)

        search_data = await handle_download_excel_export(page)
        await storage.save_file(f"grants_search_excel_{to_date.strftime('%d_%m_%Y')}.json", dumps(search_data))
        await browser.close()

    return search_data
