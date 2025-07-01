from unittest.mock import AsyncMock, Mock, patch

from services.crawler.src.utils import (
    download_file,
    download_page_html,
    safe_filename_from_url,
)


def test_safe_filename_from_url_with_filename() -> None:
    url = "https://example.org/path/to/document.pdf"
    assert safe_filename_from_url(url) == "document.pdf"


def test_safe_filename_from_url_with_filename_no_extension() -> None:
    url = "https://example.org/path/to/document"
    assert safe_filename_from_url(url) == "document.md"
    assert safe_filename_from_url(url, default_extension=".txt") == "document.txt"


def test_safe_filename_from_url_without_filename() -> None:
    url = "https://example.org/path/to/"
    filename = safe_filename_from_url(url)

    assert filename.endswith(".md")
    assert "to" in filename


def test_safe_filename_from_url_root() -> None:
    url = "https://example.org/"
    filename = safe_filename_from_url(url)

    assert filename.endswith(".md")
    assert "example" in filename


async def test_download_page_html() -> None:
    mock_response = Mock()
    mock_response.text = "<html><body>Test content</body></html>"
    mock_response.content = b"<html><body>Test content</body></html>"
    mock_response.status_code = 200
    mock_response.headers = {"content-type": "text/html"}
    mock_response.raise_for_status = Mock()

    with patch(
        "services.crawler.src.utils.client.get", new_callable=AsyncMock
    ) as mock_get:
        mock_get.return_value = mock_response

        result = await download_page_html("https://example.org")

        mock_get.assert_called_once_with("https://example.org", follow_redirects=True)
        assert result == "<html><body>Test content</body></html>"


async def test_download_file() -> None:
    mock_response = Mock()
    mock_response.content = b"File content bytes"
    mock_response.status_code = 200
    mock_response.headers = {"content-type": "application/pdf"}
    mock_response.raise_for_status = Mock()

    with patch(
        "services.crawler.src.utils.client.get", new_callable=AsyncMock
    ) as mock_get:
        mock_get.return_value = mock_response

        result = await download_file("https://example.org/file.pdf")

        mock_get.assert_called_once_with(
            "https://example.org/file.pdf", timeout=30, follow_redirects=True
        )
        assert result == b"File content bytes"
