import tempfile
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Final, cast

from anyio import Path as AsyncPath
from packages.shared_utils.src.logger import get_logger
from pandas import read_csv
from playwright.async_api import Download, Page, async_playwright
from services.scraper.src.db_utils import batch_save_grants
from services.scraper.src.dtos import GrantInfo
from services.scraper.src.exceptions import ScraperError

logger = get_logger(__name__)


NIH_GRANT_BASE_URL: Final[str] = "https://grants.nih.gov/funding/nih-guide-for-grants-and-contracts"
DEFAULT_FROM_DATE: Final[date] = date(1991, 1, 2)
TODAY_DATE: Final[date] = datetime.now(UTC).date()

PAGE_LOAD_TIMEOUT: Final[int] = 3000
DIALOG_TIMEOUT: Final[int] = 5000
SEARCH_WAIT_TIMEOUT: Final[int] = 5000
EXPORT_TIMEOUT: Final[int] = 10000
DOWNLOAD_TIMEOUT: Final[int] = 10000
INPUT_WAIT_TIMEOUT: Final[int] = 500
FALLBACK_SELECTOR_TIMEOUT: Final[int] = 2000

TEMP_DIR: Final[Path] = Path(tempfile.gettempdir())
DEBUG_NO_ADVANCED_SEARCH: Final[str] = "scraper_debug_no_advanced_search.png"
DEBUG_AFTER_SEARCH: Final[str] = "scraper_debug_after_search.png"
DEBUG_NO_SEARCH_BUTTON: Final[str] = "scraper_debug_no_search_button.png"
DEBUG_AFTER_SUBMIT: Final[str] = "scraper_debug_after_submit.png"


def create_query_string(from_date: date = DEFAULT_FROM_DATE, to_date: date = TODAY_DATE) -> str:
    logger.info("Creating query string for date range", from_date=from_date.isoformat(), to_date=to_date.isoformat())

    qs = {
        "type": "all",
        "spons": "true",
        "fields": "all",
    }

    return "&".join(f"{key}={','.join(value) if isinstance(value, list) else value}" for key, value in qs.items())


async def _navigate_to_search_page(page: Page) -> None:
    url = NIH_GRANT_BASE_URL
    logger.info("Navigating to NIH grants page", url=url)

    await page.goto(url, wait_until="networkidle")
    logger.info("Page loaded, waiting for content")
    await page.wait_for_timeout(PAGE_LOAD_TIMEOUT)

    title = await page.title()
    current_url = page.url
    logger.info("Page loaded", title=title, current_url=current_url)

    try:
        logger.info("Looking for Advanced Search link")
        advanced_search = await page.wait_for_selector("text=Advanced Search", timeout=DIALOG_TIMEOUT)
        if advanced_search:
            await advanced_search.click()
            logger.info("Clicked Advanced Search link")
            await page.wait_for_timeout(SEARCH_WAIT_TIMEOUT // 2.5)
        else:
            raise ScraperError("Could not find Advanced Search link")
    except Exception as e:
        logger.error("Failed to click Advanced Search", error=str(e))
        debug_path = TEMP_DIR / DEBUG_NO_ADVANCED_SEARCH
        await page.screenshot(path=str(debug_path))
        raise ScraperError(f"Failed to find Advanced Search link: {e}") from e

    debug_path = TEMP_DIR / DEBUG_AFTER_SEARCH
    await page.screenshot(path=str(debug_path))
    logger.info("Screenshot saved", path=str(debug_path))


async def _fill_search_form(page: Page, from_date: date, to_date: date) -> None:
    try:
        logger.info("Waiting for search dialog to open")
        await page.wait_for_selector("div[role='dialog']", timeout=DIALOG_TIMEOUT)

        date_inputs = await page.query_selector_all("input[placeholder*='mm/dd/yyyy']")

        if len(date_inputs) >= 2:
            from_date_input = date_inputs[0]
            to_date_input = date_inputs[1]

            await from_date_input.click()
            await from_date_input.click(click_count=3)
            await page.keyboard.press("Control+A")
            await from_date_input.type(from_date.strftime("%m/%d/%Y"))
            logger.info("Filled from_date", date=from_date.strftime("%m/%d/%Y"))

            await to_date_input.click()
            await to_date_input.click(click_count=3)
            await page.keyboard.press("Control+A")
            await to_date_input.type(to_date.strftime("%m/%d/%Y"))
            logger.info("Filled to_date", date=to_date.strftime("%m/%d/%Y"))

            await page.wait_for_timeout(INPUT_WAIT_TIMEOUT)
        else:
            logger.warning("Could not find date input fields", found_inputs=len(date_inputs))
    except Exception as e:
        logger.warning("Could not fill date fields", error=str(e))


async def _submit_search_form(page: Page) -> None:
    try:
        logger.info("Looking for Search button in dialog")
        search_button = await page.wait_for_selector(
            "div[role='dialog'] button:has-text('Search')", timeout=DIALOG_TIMEOUT
        )
        if search_button:
            await search_button.click()
            logger.info("Clicked Search button in dialog")
            await page.wait_for_timeout(SEARCH_WAIT_TIMEOUT)
        else:
            logger.warning("Could not find Search button in dialog")
    except Exception as e:
        logger.error("Failed to click Search button", error=str(e))
        debug_path = TEMP_DIR / DEBUG_NO_SEARCH_BUTTON
        await page.screenshot(path=str(debug_path))

    debug_path = TEMP_DIR / DEBUG_AFTER_SUBMIT
    await page.screenshot(path=str(debug_path))
    logger.info("Screenshot saved", path=str(debug_path))


async def _export_and_download_results(page: Page) -> Download | None:
    download: Download | None = None
    try:
        logger.info("Looking for Export Results button")
        export_button = await page.wait_for_selector("text=Export Results", timeout=EXPORT_TIMEOUT)
        if export_button:
            logger.info("Found Export Results button, clicking")
            await export_button.click()
            download = await page.wait_for_event("download", timeout=DOWNLOAD_TIMEOUT)
            logger.info("Download started after clicking Export Results")
        else:
            logger.warning("Could not find Export Results button")
    except Exception as e:
        logger.error("Failed to export results", error=str(e))
        export_selectors = [
            "button:has-text('Export')",
            "[aria-label*='Export']",
            "[title*='Export']",
        ]

        for selector in export_selectors:
            try:
                logger.info("Trying alternative selector", selector=selector)
                button = await page.wait_for_selector(selector, timeout=FALLBACK_SELECTOR_TIMEOUT)
                if button:
                    logger.info("Found export button with alternative selector", selector=selector)
                    await button.click()
                    download = await page.wait_for_event("download", timeout=DIALOG_TIMEOUT)
                    logger.info("Download started after button click")
                    break
            except Exception:
                logger.debug("Alternative selector not found", selector=selector)
                continue

    if not download:
        page_content = await page.content()
        logger.info("Checking page content for no results message")
        if "No results found" in page_content or "0 results" in page_content:
            logger.info("No results found on page")
            return None
        logger.warning("Unable to download, page content snippet", content_snippet=page_content[:500])
        raise ScraperError("Unable to download grant data from NIH site")

    return download


async def _process_csv_download(download: Download) -> list[GrantInfo]:
    temp_dir = AsyncPath(tempfile.gettempdir())
    tmp_path = temp_dir / f"grants_export_{download.suggested_filename or 'NIH_Guide_Results.csv'}"
    await download.save_as(str(tmp_path))

    try:
        data_frame = read_csv(str(tmp_path)).fillna("")
        await tmp_path.unlink(missing_ok=True)
        data_frame.columns = data_frame.columns.str.lower()

        records = data_frame.to_dict(orient="records")
        if not records:
            logger.warning("No records found in CSV")
            return []

        for record in records[:1]:
            if not isinstance(record, dict):
                raise ScraperError("Invalid CSV structure: expected dictionary records")

        search_data = cast("list[GrantInfo]", records)
    except Exception as e:
        await tmp_path.unlink(missing_ok=True)
        raise ScraperError(f"Failed to process downloaded CSV: {e!s}") from e

    return search_data


async def download_search_data(*, to_date: date = TODAY_DATE, from_date: date = DEFAULT_FROM_DATE) -> list[GrantInfo]:
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
            await _navigate_to_search_page(page)
            await _fill_search_form(page, from_date, to_date)
            await _submit_search_form(page)

            download = await _export_and_download_results(page)
            if not download:
                return []

            search_data = await _process_csv_download(download)

            if search_data:
                await batch_save_grants(search_data)
                logger.info("Saved search results to Firestore", count=len(search_data))

            return search_data

        finally:
            await browser.close()
