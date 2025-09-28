import asyncio
import tempfile
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Final, cast

from anyio import Path as AsyncPath
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import ExternalOperationError
from packages.shared_utils.src.logger import get_logger
from pandas import read_csv
from playwright.async_api import Download, Page, async_playwright
from services.scraper.src.db_utils import batch_save_grants
from services.scraper.src.dtos import GrantInfo

logger = get_logger(__name__)


NIH_GRANT_BASE_URL: Final[str] = "https://grants.nih.gov/funding/nih-guide-for-grants-and-contracts"
DEFAULT_FROM_DATE: Final[date] = date(1991, 1, 2)
TODAY_DATE: Final[date] = datetime.now(UTC).date()

PAGE_LOAD_TIMEOUT: Final[int] = 1000
DIALOG_TIMEOUT: Final[int] = 2000
SEARCH_WAIT_TIMEOUT: Final[int] = 2000
EXPORT_TIMEOUT: Final[int] = 3000
DOWNLOAD_TIMEOUT: Final[int] = 3000
INPUT_WAIT_TIMEOUT: Final[int] = 300
FALLBACK_SELECTOR_TIMEOUT: Final[int] = 1000

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

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=10000)
        logger.info("Page loaded, waiting for content")
        await page.wait_for_timeout(PAGE_LOAD_TIMEOUT)

        title = await page.title()
        current_url = page.url
        logger.info("Page loaded", title=title, current_url=current_url)

        if "error" in title.lower() or "404" in title or "not found" in title.lower():
            raise ExternalOperationError(f"NIH page failed to load properly. Title: {title}, URL: {current_url}")

    except Exception as e:
        logger.error("Failed to navigate to NIH grants page", url=url, error=str(e))
        debug_path = TEMP_DIR / "scraper_debug_navigation_failed.png"
        await page.screenshot(path=str(debug_path), full_page=True)
        raise ExternalOperationError(f"Failed to navigate to NIH grants page {url}: {e}") from e

    try:
        logger.info("Looking for Advanced Search link")
        selectors = [
            "text=Advanced Search",
            "a:has-text('Advanced Search')",
            "[href*='advanced']",
            "[aria-label*='Advanced']",
        ]

        advanced_search = None
        for selector in selectors:
            try:
                advanced_search = await page.wait_for_selector(selector, timeout=DIALOG_TIMEOUT)
                if advanced_search:
                    logger.info("Found Advanced Search link", selector=selector)
                    break
            except Exception:
                logger.debug("Selector not found", selector=selector)
                continue

        if not advanced_search:
            page_content = await page.content()
            available_links = await page.evaluate(
                "() => Array.from(document.querySelectorAll('a')).map(a => ({ text: a.textContent?.trim(), href: a.href })).slice(0, 10)"
            )
            raise ExternalOperationError(
                f"Advanced Search link not found. Available links: {available_links[:5]}. "
                f"Page content snippet: {page_content[:500]}"
            )

        await advanced_search.click()
        logger.info("Clicked Advanced Search link")
        await page.wait_for_timeout(SEARCH_WAIT_TIMEOUT // 2)

    except Exception as e:
        logger.error("Failed to click Advanced Search", error=str(e))
        debug_path = TEMP_DIR / DEBUG_NO_ADVANCED_SEARCH
        await page.screenshot(path=str(debug_path), full_page=True)

        page_html = await page.content()
        logger.error("Page HTML snippet for debugging", html_snippet=page_html[:1000])

        raise ExternalOperationError(f"Failed to find or click Advanced Search link: {e}") from e

    debug_path = TEMP_DIR / DEBUG_AFTER_SEARCH
    await page.screenshot(path=str(debug_path), full_page=True)
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
        selectors = [
            "div[role='dialog'] button:has-text('Search')",
            "button:has-text('Search')",
            "input[type='submit'][value*='Search']",
            "button[type='submit']",
            "[aria-label*='Search']",
        ]

        search_button = None
        for selector in selectors:
            try:
                search_button = await page.wait_for_selector(selector, timeout=DIALOG_TIMEOUT)
                if search_button:
                    logger.info("Found Search button", selector=selector)
                    break
            except Exception:
                logger.debug("Search button selector not found", selector=selector)
                continue

        if not search_button:
            available_buttons = await page.evaluate(
                "() => Array.from(document.querySelectorAll('button, input[type=submit]')).map(b => ({ text: b.textContent?.trim() || b.value, type: b.type, disabled: b.disabled })).slice(0, 10)"
            )
            raise ExternalOperationError(f"Search button not found. Available buttons: {available_buttons}")

        await search_button.click()
        logger.info("Clicked Search button in dialog")
        await page.wait_for_timeout(SEARCH_WAIT_TIMEOUT)

    except Exception as e:
        logger.error("Failed to click Search button", error=str(e))
        debug_path = TEMP_DIR / DEBUG_NO_SEARCH_BUTTON
        await page.screenshot(path=str(debug_path), full_page=True)

        dialog_content = await page.evaluate(
            "() => { const dialog = document.querySelector('[role=dialog]'); return dialog ? dialog.innerHTML : 'No dialog found'; }"
        )
        logger.error("Dialog content for debugging", dialog_content=dialog_content[:500])

        raise ExternalOperationError(f"Failed to find or click Search button: {e}") from e

    debug_path = TEMP_DIR / DEBUG_AFTER_SUBMIT
    await page.screenshot(path=str(debug_path), full_page=True)
    logger.info("Screenshot saved", path=str(debug_path))


async def _export_and_download_results(page: Page) -> Download | None:
    download: Download | None = None

    try:
        page_content = await page.content()
        logger.info("Checking page content for results")

        no_results_patterns = [
            "No results found",
            "0 results",
            "no grants found",
            "Your search returned 0 results",
            "No matching results",
        ]

        for pattern in no_results_patterns:
            if pattern.lower() in page_content.lower():
                logger.info("No results found on page", pattern=pattern)
                return None

        results_count = await page.evaluate(
            "() => { const text = document.body.textContent || ''; const match = text.match(/(\\d+)\\s+results?/i); return match ? match[1] : null; }"
        )
        logger.info("Results count detected", count=results_count)

    except Exception as e:
        logger.warning("Could not check results count", error=str(e))

    try:
        logger.info("Looking for Export Results button")
        export_selectors = [
            "text=Export Results",
            "button:has-text('Export')",
            "a:has-text('Export')",
            "[aria-label*='Export']",
            "[title*='Export']",
            "input[value*='Export']",
        ]

        export_button = None
        for selector in export_selectors:
            try:
                export_button = await page.wait_for_selector(selector, timeout=EXPORT_TIMEOUT)
                if export_button:
                    logger.info("Found export button", selector=selector)
                    break
            except Exception:
                logger.debug("Export selector not found", selector=selector)
                continue

        if not export_button:
            clickable_elements = await page.evaluate(
                """() => {
                    const elements = Array.from(document.querySelectorAll('button, a[href], input[type=submit], [onclick]'));
                    return elements.map(el => ({
                        tag: el.tagName.toLowerCase(),
                        text: (el.textContent || el.value || '').trim().substring(0, 50),
                        href: el.href || '',
                        type: el.type || ''
                    })).slice(0, 15);
                }"""
            )

            raise ExternalOperationError(
                f"Export button not found. Available clickable elements: {clickable_elements}. "
                f"Page content snippet: {page_content[:300]}"
            )

        await export_button.click()
        logger.info("Clicked export button, waiting for download")

        try:
            download = await page.wait_for_event("download", timeout=DOWNLOAD_TIMEOUT)
            logger.info("Download started successfully")
        except Exception as download_error:
            pages = page.context.pages
            if len(pages) > 1:
                logger.info("New page opened instead of download, checking new page")
                new_page = pages[-1]
                await new_page.wait_for_load_state("networkidle", timeout=3000)
                new_content = await new_page.content()
                if "csv" in new_content.lower() or "export" in new_content.lower():
                    logger.warning("Export opened in new page instead of downloading")
                    raise ExternalOperationError(
                        "Export opened in new page - NIH site behavior may have changed"
                    ) from None

            raise ExternalOperationError(
                f"Download did not start after clicking export button: {download_error}"
            ) from download_error

    except Exception as e:
        logger.error("Failed to export results", error=str(e))
        debug_path = TEMP_DIR / "scraper_debug_export_failed.png"
        await page.screenshot(path=str(debug_path), full_page=True)

        final_url = page.url
        logger.error("Export failed - final page state", url=final_url, error=str(e))

        if not download:
            raise ExternalOperationError(
                f"Unable to download grant data from NIH site. Final URL: {final_url}. Error: {e}"
            ) from e

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
                raise ExternalOperationError("Invalid CSV structure: expected dictionary records")

        search_data = cast("list[GrantInfo]", records)
    except Exception as e:
        await tmp_path.unlink(missing_ok=True)
        raise ExternalOperationError(f"Failed to process downloaded CSV: {e!s}") from e

    return search_data


async def download_search_data(*, to_date: date = TODAY_DATE, from_date: date = DEFAULT_FROM_DATE) -> list[GrantInfo]:
    timeout_seconds = int(get_env("SCRAPER_E2E_TIMEOUT", fallback="60"))
    logger.info(
        "Starting scraper with timeout",
        timeout_seconds=timeout_seconds,
        from_date=from_date.isoformat(),
        to_date=to_date.isoformat(),
    )

    async def _run_scraper_with_timeout() -> list[GrantInfo]:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            context = await browser.new_context(
                accept_downloads=True,
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            )
            page = await context.new_page()

            try:
                await _navigate_to_search_page(page)
                await _fill_search_form(page, from_date, to_date)
                await _submit_search_form(page)

                download = await _export_and_download_results(page)
                if not download:
                    logger.info("No download available, returning empty results")
                    return []

                search_data = await _process_csv_download(download)

                if search_data:
                    await batch_save_grants(search_data)
                    logger.info("Saved search results to database", count=len(search_data))

                return search_data

            except Exception as e:
                debug_path = TEMP_DIR / f"scraper_debug_final_error_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.png"
                try:
                    await page.screenshot(path=str(debug_path), full_page=True)
                    logger.error("Final debug screenshot saved", path=str(debug_path), error=str(e))
                except Exception:
                    logger.warning("Could not take final debug screenshot")
                raise
            finally:
                try:
                    await browser.close()
                except Exception:
                    logger.warning("Error closing browser")

    try:
        return await asyncio.wait_for(_run_scraper_with_timeout(), timeout=timeout_seconds)
    except TimeoutError:
        logger.error(
            "Scraper timed out",
            timeout_seconds=timeout_seconds,
            from_date=from_date.isoformat(),
            to_date=to_date.isoformat(),
        )
        raise ExternalOperationError(
            f"Scraper operation timed out after {timeout_seconds} seconds. This likely indicates that the NIH website structure has changed and the scraper needs to be updated."
        ) from None
