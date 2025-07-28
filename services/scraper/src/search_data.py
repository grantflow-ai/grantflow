from __future__ import annotations

import tempfile
from datetime import UTC, date, datetime
from json import dumps
from typing import TYPE_CHECKING, Final, cast

from anyio import Path as AsyncPath
from packages.shared_utils.src.logger import get_logger
from pandas import read_csv
from playwright.async_api import async_playwright
from services.scraper.src.exceptions import ScraperError
from services.scraper.src.gcs_utils import upload_blob

logger = get_logger(__name__)

if TYPE_CHECKING:
    from services.scraper.src.dtos import GrantInfo

NIH_GRANT_BASE_URL: Final[str] = "https://grants.nih.gov/funding/nih-guide-for-grants-and-contracts"
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

    # Log the date range being used
    logger.info("Creating query string for date range", from_date=from_date.isoformat(), to_date=to_date.isoformat())

    qs = {
        "type": "all",
        "spons": "true",
        "fields": "all",
    }

    return "&".join(f"{key}={','.join(value) if isinstance(value, list) else value}" for key, value in qs.items())


async def download_search_data(
    *, to_date: date = TODAY_DATE, from_date: date = DEFAULT_FROM_DATE
) -> list[GrantInfo]:
    """Download the CSV file from the NIH grant search page and
        return the data as a list of dictionaries.

    The NIH site has been redesigned and now uses a different download mechanism.
    This function navigates to the search page and attempts to trigger the download.

    Raises:
        ScraperError: If the download does not occur.

    Args:
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
            # First navigate to the main page
            url = NIH_GRANT_BASE_URL
            logger.info("Navigating to NIH grants page", url=url)

            await page.goto(url, wait_until="networkidle")
            logger.info("Page loaded, waiting for content")

            await page.wait_for_timeout(3000)

            # Look for search interface elements
            title = await page.title()
            current_url = page.url
            logger.info("Page loaded", title=title, current_url=current_url)

            # Try to find and click on "Search" or "Advanced Search" button
            search_selectors = [
                "text=Search the Guide",
                "button:has-text('Search')",
                "text=Advanced Search",
                "[aria-label*='Search']",
                "a[href*='search']",
                "button[id*='search']"
            ]

            search_clicked = False
            for selector in search_selectors:
                try:
                    logger.info("Looking for search element", selector=selector)
                    element = await page.wait_for_selector(selector, timeout=2000)
                    if element:
                        await element.click()
                        logger.info("Clicked search element", selector=selector)
                        search_clicked = True
                        await page.wait_for_timeout(2000)
                        break
                except Exception:
                    continue

            # Take screenshot for debugging
            await page.screenshot(path="scraper_debug_after_search.png")
            logger.info("Screenshot saved to scraper_debug_after_search.png")

            # If we're on the advanced search page, we need to fill in date fields and submit the search
            if search_clicked:
                # First, ensure "Active Opportunities" is checked (it should be by default)
                try:
                    active_checkbox = await page.wait_for_selector("input[type='checkbox'][value='Active Opportunities']", timeout=2000)
                    if active_checkbox:
                        is_checked = await active_checkbox.is_checked()
                        if not is_checked:
                            await active_checkbox.click()
                            logger.info("Checked 'Active Opportunities' checkbox")
                except Exception:
                    logger.debug("Could not find or check Active Opportunities checkbox")

                # Clear and fill the date fields if they exist
                try:
                    # Look for date input fields - they have default values but we need to ensure our dates are set
                    date_inputs = await page.query_selector_all("input[type='text'][value*='/']")

                    if len(date_inputs) >= 2:
                        from_date_input = date_inputs[0]
                        to_date_input = date_inputs[1]

                        # Clear and fill from date
                        await from_date_input.click()
                        await from_date_input.click(click_count=3)  # Triple-click to select all
                        await from_date_input.type(from_date.strftime("%m/%d/%Y"))
                        logger.info("Filled from_date", date=from_date.strftime("%m/%d/%Y"))

                        # Clear and fill to date
                        await to_date_input.click()
                        await to_date_input.click(click_count=3)  # Triple-click to select all
                        await to_date_input.type(to_date.strftime("%m/%d/%Y"))
                        logger.info("Filled to_date", date=to_date.strftime("%m/%d/%Y"))

                        await page.wait_for_timeout(500)
                    else:
                        logger.warning("Could not find date input fields", found_inputs=len(date_inputs))
                except Exception as e:
                    logger.warning("Could not fill date fields", error=str(e))

                # Look for the search/submit button in the modal
                submit_selectors = [
                    "button:has-text('Search')",
                    "button[type='submit']",
                    "[aria-label='Search']",
                    "text=Submit",
                    "button.btn-primary"
                ]

                for selector in submit_selectors:
                    try:
                        logger.info("Looking for submit button", selector=selector)
                        submit_btn = await page.wait_for_selector(selector, timeout=2000)
                        if submit_btn:
                            # Make sure it's visible and not the one we already clicked
                            is_visible = await submit_btn.is_visible()
                            btn_text = await submit_btn.text_content()
                            if is_visible and btn_text and "Advanced" not in btn_text:
                                logger.info("Clicking submit button", selector=selector, text=btn_text)
                                await submit_btn.click()
                                await page.wait_for_timeout(3000)
                                break
                    except Exception:
                        continue

                # Take another screenshot after submitting
                await page.screenshot(path="scraper_debug_after_submit.png")
                logger.info("Screenshot saved to scraper_debug_after_submit.png")

            download = None
            try:
                logger.info("Waiting for automatic download...")
                download = await page.wait_for_event("download", timeout=5000)
                logger.info("Download started automatically")
            except Exception:
                logger.info("No automatic download detected, looking for export button")
                export_selectors = [
                    "text=Export Results",
                    "text=Export",
                    "button:has-text('Export')",
                    "[aria-label*='Export']",
                    "[title*='Export']",
                ]

                for selector in export_selectors:
                    try:
                        logger.info("Trying selector", selector=selector)
                        button = await page.wait_for_selector(selector, timeout=2000)
                        if button:
                            logger.info("Found export button, clicking", selector=selector)
                            await button.click()
                            download = await page.wait_for_event("download", timeout=5000)
                            logger.info("Download started after button click")
                            break
                    except Exception:
                        logger.debug("Selector not found", selector=selector)
                        continue

            if not download:
                page_content = await page.content()
                logger.info("Checking page content for no results message")
                if "No results found" in page_content or "0 results" in page_content:
                    logger.info("No results found on page")
                    return []
                # Log a snippet of the page content for debugging
                logger.warning("Unable to download, page content snippet", content_snippet=page_content[:500])
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

            # Save to scraper bucket
            blob_path = f"scraper-results/grants_search_csv_{to_date.strftime('%d_%m_%Y')}.json"
            await upload_blob(blob_path, dumps(search_data).encode("utf-8"))
            logger.info("Saved search results to GCS", blob_path=blob_path)

            return search_data

        finally:
            await browser.close()
