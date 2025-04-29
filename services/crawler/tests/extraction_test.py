from collections.abc import Generator
from unittest.mock import AsyncMock, patch

import pytest
from services.crawler.src.extraction import extract_webpage_content
from tenacity import RetryError, wait_none


@pytest.fixture
def mock_web_crawler() -> Generator[AsyncMock, None, None]:
    with patch("services.indexer.src.extraction.AsyncWebCrawler") as mock_crawler:
        instance = AsyncMock()
        mock_crawler.return_value.__aenter__.return_value = instance
        instance.arun.return_value.markdown = "mocked markdown"
        yield instance


async def test_extract_webpage_content_success(mock_web_crawler: AsyncMock) -> None:
    url = "https://example.com"

    result = await extract_webpage_content(url)

    assert result == "mocked markdown"
    mock_web_crawler.arun.assert_called_once_with(url=url)


async def test_extract_webpage_content_error(mock_web_crawler: AsyncMock) -> None:
    mock_web_crawler.arun.side_effect = ValueError("Crawling error")

    extract_webpage_content.retry.wait = wait_none()  # type: ignore

    with pytest.raises(RetryError):
        await extract_webpage_content("https://example.com")
