from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from packages.shared_utils.src.exceptions import ExternalOperationError
from services.crawler.src.extraction import CrawlResult, crawl_url


class MockCrawlResult:
    """Type for mocked crawl results from AsyncWebCrawler."""

    success: bool
    url: str
    markdown: str
    metadata: dict[str, Any]


@pytest.mark.asyncio
class TestCrawlUrl:
    @patch("services.crawler.src.extraction.AsyncWebCrawler")
    @patch("services.crawler.src.extraction.TemporaryDirectory")
    async def test_crawl_url_success(self, mock_temp_dir: MagicMock, mock_crawler: MagicMock) -> None:
        mock_temp_dir_instance: MagicMock = MagicMock()
        mock_temp_dir_instance.__enter__.return_value = "/fake/temp/dir"
        mock_temp_dir.return_value = mock_temp_dir_instance

        mock_crawler_instance: AsyncMock = AsyncMock()
        mock_crawler_instance.__aenter__.return_value = mock_crawler_instance
        mock_crawler.return_value = mock_crawler_instance

        mock_result1: MagicMock = MagicMock(spec=MockCrawlResult)
        mock_result1.success = True
        mock_result1.url = "https://example.com/page1"
        mock_result1.markdown = ""
        mock_result1.metadata = {
            "score": 10,
            "depth": 1,
            "author": "Test Author",
            "title": "Test Title",
            "description": "Test Description",
            "keywords": ["test", "example"],
            "parent_url": "https://example.com",
        }

        mock_result2: MagicMock = MagicMock(spec=MockCrawlResult)
        mock_result2.success = True
        mock_result2.url = "https://example.com/page2"
        mock_result2.markdown = ""
        mock_result2.metadata = {"score": 5, "depth": 2}

        mock_result3: MagicMock = MagicMock(spec=MockCrawlResult)
        mock_result3.success = False

        mock_crawler_instance.arun.return_value = [mock_result1, mock_result2, mock_result3]

        mock_file1: AsyncMock = AsyncMock()
        mock_file1.name = "document1.pdf"
        mock_file1.is_file.return_value = True
        mock_file1.read_bytes.return_value = b"fake pdf content"

        mock_file2: AsyncMock = AsyncMock()
        mock_file2.name = "document2.docx"
        mock_file2.is_file.return_value = True
        mock_file2.read_bytes.return_value = b"fake docx content"

        mock_dir: AsyncMock = AsyncMock()
        mock_dir.is_file.return_value = False

        with patch("services.crawler.src.extraction.Path") as mock_path:
            mock_path_instance: MagicMock = MagicMock()
            mock_path.return_value = mock_path_instance
            mock_path_instance.glob.return_value.__aiter__.return_value = [mock_file1, mock_file2, mock_dir]

            result: CrawlResult = await crawl_url("https://example.com")

            assert isinstance(result, CrawlResult)
            assert len(result.results) == 2

            assert result.results[0]["url"] == "https://example.com/page1"
            assert result.results[0]["content"] == ""
            assert result.results[0]["score"] == 10
            assert result.results[0]["depth"] == 1
            assert result.results[0]["author"] == "Test Author"
            assert result.results[0]["title"] == "Test Title"
            assert result.results[0]["description"] == "Test Description"
            assert result.results[0]["keywords"] == ["test", "example"]
            assert result.results[0]["parent_url"] == "https://example.com"

            assert result.results[1]["url"] == "https://example.com/page2"
            assert result.results[1]["content"] == ""
            assert result.results[1]["score"] == 5
            assert result.results[1]["depth"] == 2
            assert "author" not in result.results[1]
            assert "title" not in result.results[1]
            assert "description" not in result.results[1]
            assert "keywords" not in result.results[1]
            assert "parent_url" not in result.results[1]

            assert len(result.files) == 2
            assert result.files[0]["filename"] == "document1.pdf"
            assert result.files[0]["content"] == b"fake pdf content"
            assert result.files[1]["filename"] == "document2.docx"
            assert result.files[1]["content"] == b"fake docx content"

            mock_crawler.assert_called_once()
            mock_crawler_instance.arun.assert_called_once()

            assert mock_crawler_instance.arun.call_args[1]["url"] == "https://example.com"

    @patch("services.crawler.src.extraction.AsyncWebCrawler")
    @patch("services.crawler.src.extraction.TemporaryDirectory")
    async def test_crawl_url_empty_results(self, mock_temp_dir: MagicMock, mock_crawler: MagicMock) -> None:
        mock_temp_dir_instance: MagicMock = MagicMock()
        mock_temp_dir_instance.__enter__.return_value = "/fake/temp/dir"
        mock_temp_dir.return_value = mock_temp_dir_instance

        mock_crawler_instance: AsyncMock = AsyncMock()
        mock_crawler_instance.__aenter__.return_value = mock_crawler_instance
        mock_crawler.return_value = mock_crawler_instance

        mock_crawler_instance.arun.return_value = []

        with patch("services.crawler.src.extraction.Path") as mock_path:
            mock_path_instance: MagicMock = MagicMock()
            mock_path.return_value = mock_path_instance
            mock_path_instance.glob.return_value.__aiter__.return_value = []

            result: CrawlResult = await crawl_url("https://example.com")

            assert isinstance(result, CrawlResult)
            assert len(result.results) == 0
            assert len(result.files) == 0

    @patch("services.crawler.src.extraction.AsyncWebCrawler")
    async def test_crawl_url_exception(self, mock_crawler: MagicMock) -> None:
        """Test that when the crawler raises a ValueError, it's wrapped in an ExternalOperationError."""
        mock_crawler_instance: AsyncMock = AsyncMock()
        mock_crawler_instance.__aenter__.side_effect = ValueError("Crawl failed")
        mock_crawler.return_value = mock_crawler_instance

        with pytest.raises(ExternalOperationError) as excinfo:
            await crawl_url("https://example.com")

        assert "Failed to crawl URL" in str(excinfo.value)
        assert isinstance(excinfo.value.__cause__, ValueError)
