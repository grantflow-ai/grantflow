from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from services.scraper.src.exceptions import ScraperError
from services.scraper.src.search_data import (
    DEFAULT_FROM_DATE,
    NIH_GRANT_BASE_URL,
    TODAY_DATE,
    create_query_string,
    download_search_data,
)


def test_create_query_string() -> None:
    from_date = date(2020, 1, 1)
    to_date = date(2020, 12, 31)

    query_string = create_query_string(from_date, to_date)

    expected_query = "type=all&spons=true&fields=all"

    assert query_string == expected_query


def test_create_query_string_defaults() -> None:
    query_string = create_query_string()

    expected_query = "type=all&spons=true&fields=all"

    assert query_string == expected_query


def test_constants() -> None:
    assert NIH_GRANT_BASE_URL == "https://grants.nih.gov/funding/nih-guide-for-grants-and-contracts"
    assert date(1991, 1, 2) == DEFAULT_FROM_DATE
    assert isinstance(TODAY_DATE, date)


@pytest.mark.asyncio
async def test_download_search_data_success() -> None:
    mock_download = AsyncMock()
    mock_download.suggested_filename = "test_grants.csv"

    mock_page = AsyncMock()
    mock_page.goto = AsyncMock()
    mock_page.title = AsyncMock(return_value="NIH Grants")
    mock_page.url = "https://grants.nih.gov/test"
    mock_page.wait_for_timeout = AsyncMock()
    mock_page.wait_for_selector = AsyncMock()
    mock_page.query_selector_all = AsyncMock(return_value=[AsyncMock(), AsyncMock()])
    mock_page.keyboard.press = AsyncMock()
    mock_page.wait_for_event = AsyncMock(return_value=mock_download)
    mock_page.screenshot = AsyncMock()

    mock_context = AsyncMock()
    mock_context.new_page = AsyncMock(return_value=mock_page)

    mock_browser = AsyncMock()
    mock_browser.new_context = AsyncMock(return_value=mock_context)
    mock_browser.close = AsyncMock()

    mock_playwright = AsyncMock()
    mock_playwright.chromium.launch = AsyncMock(return_value=mock_browser)

    mock_data_frame = MagicMock()
    mock_data_frame.fillna.return_value = mock_data_frame
    mock_data_frame.columns = MagicMock()
    mock_data_frame.columns.str.lower.return_value = ["title", "url", "organization"]
    mock_data_frame.to_dict.return_value = [{"title": "Test Grant", "url": "https://test.gov", "organization": "NIH"}]

    with (
        patch("services.scraper.src.search_data.async_playwright") as mock_async_playwright,
        patch("services.scraper.src.search_data.read_csv", return_value=mock_data_frame),
        patch("services.scraper.src.search_data.batch_save_grants", new_callable=AsyncMock) as mock_batch_save,
        patch("services.scraper.src.search_data.AsyncPath") as mock_async_path,
    ):
        mock_async_playwright.return_value.__aenter__.return_value = mock_playwright
        mock_path_instance = AsyncMock()
        mock_path_instance.unlink = AsyncMock()
        mock_async_path.return_value.__truediv__.return_value = mock_path_instance

        mock_batch_save.return_value = 1

        result = await download_search_data(from_date=date(2020, 1, 1), to_date=date(2020, 12, 31))

        assert len(result) == 1
        assert result[0]["title"] == "Test Grant"

        mock_batch_save.assert_called_once()
        called_grants = mock_batch_save.call_args[0][0]
        assert len(called_grants) == 1
        assert called_grants[0]["title"] == "Test Grant"


@pytest.mark.asyncio
async def test_download_search_data_no_advanced_search_link() -> None:
    mock_page = AsyncMock()
    mock_page.goto = AsyncMock()
    mock_page.title = AsyncMock(return_value="NIH Grants")
    mock_page.url = "https://grants.nih.gov/test"
    mock_page.wait_for_timeout = AsyncMock()
    mock_page.wait_for_selector = AsyncMock(side_effect=Exception("Selector not found"))
    mock_page.screenshot = AsyncMock()

    mock_context = AsyncMock()
    mock_context.new_page = AsyncMock(return_value=mock_page)

    mock_browser = AsyncMock()
    mock_browser.new_context = AsyncMock(return_value=mock_context)
    mock_browser.close = AsyncMock()

    mock_playwright = AsyncMock()
    mock_playwright.chromium.launch = AsyncMock(return_value=mock_browser)

    with patch("services.scraper.src.search_data.async_playwright") as mock_async_playwright:
        mock_async_playwright.return_value.__aenter__.return_value = mock_playwright

        with pytest.raises(ScraperError, match="Failed to find Advanced Search link"):
            await download_search_data()


@pytest.mark.asyncio
async def test_download_search_data_no_results() -> None:
    mock_page = AsyncMock()
    mock_page.goto = AsyncMock()
    mock_page.title = AsyncMock(return_value="NIH Grants")
    mock_page.url = "https://grants.nih.gov/test"
    mock_page.wait_for_timeout = AsyncMock()
    mock_page.wait_for_selector = AsyncMock()
    mock_page.query_selector_all = AsyncMock(return_value=[AsyncMock(), AsyncMock()])
    mock_page.keyboard.press = AsyncMock()
    mock_page.wait_for_event = AsyncMock(side_effect=Exception("No download"))
    mock_page.screenshot = AsyncMock()
    mock_page.content = AsyncMock(return_value="No results found for your search")

    mock_context = AsyncMock()
    mock_context.new_page = AsyncMock(return_value=mock_page)

    mock_browser = AsyncMock()
    mock_browser.new_context = AsyncMock(return_value=mock_context)
    mock_browser.close = AsyncMock()

    mock_playwright = AsyncMock()
    mock_playwright.chromium.launch = AsyncMock(return_value=mock_browser)

    with patch("services.scraper.src.search_data.async_playwright") as mock_async_playwright:
        mock_async_playwright.return_value.__aenter__.return_value = mock_playwright

        result = await download_search_data()

        assert result == []


@pytest.mark.asyncio
async def test_download_search_data_export_fails() -> None:
    mock_page = AsyncMock()
    mock_page.goto = AsyncMock()
    mock_page.title = AsyncMock(return_value="NIH Grants")
    mock_page.url = "https://grants.nih.gov/test"
    mock_page.wait_for_timeout = AsyncMock()
    mock_page.wait_for_selector = AsyncMock()
    mock_page.query_selector_all = AsyncMock(return_value=[AsyncMock(), AsyncMock()])
    mock_page.keyboard.press = AsyncMock()
    mock_page.wait_for_event = AsyncMock(side_effect=Exception("No download"))
    mock_page.screenshot = AsyncMock()
    mock_page.content = AsyncMock(return_value="Some other content without no results")

    mock_context = AsyncMock()
    mock_context.new_page = AsyncMock(return_value=mock_page)

    mock_browser = AsyncMock()
    mock_browser.new_context = AsyncMock(return_value=mock_context)
    mock_browser.close = AsyncMock()

    mock_playwright = AsyncMock()
    mock_playwright.chromium.launch = AsyncMock(return_value=mock_browser)

    with patch("services.scraper.src.search_data.async_playwright") as mock_async_playwright:
        mock_async_playwright.return_value.__aenter__.return_value = mock_playwright

        with pytest.raises(ScraperError, match="Unable to download grant data from NIH site"):
            await download_search_data()
