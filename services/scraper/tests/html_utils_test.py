from unittest.mock import AsyncMock, patch

import pytest
from services.scraper.src.html_utils import download_page_html, sanitize_html
from services.scraper.src.url_utils import get_identifier_from_nih_url


async def test_download_page_html() -> None:
    url = "http://example.com"

    with patch("services.scraper.src.html_utils.client.get", new_callable=AsyncMock) as mock_get:
        mock_response = AsyncMock()
        mock_response.text = "<html><body>Test Page</body></html>"
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "text/html"}
        mock_response.content = b"<html><body>Test Page</body></html>"
        mock_get.return_value = mock_response

        html = await download_page_html(url)

        assert html == "<html><body>Test Page</body></html>"
        mock_get.assert_called_once_with(url, follow_redirects=True)


def test_sanitize_html() -> None:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup("<html><body><script>alert('Test');</script><p>Hello World</p></body></html>", "html.parser")

    sanitized = sanitize_html(soup)

    assert "<script>" not in sanitized
    assert "<p>\n   Hello World\n  </p>" in sanitized


def test_extract_result_name_from_url() -> None:
    url = "http://example.com/results/test-result.html"

    result_name = get_identifier_from_nih_url(url)

    assert result_name == "test-result"


@pytest.mark.parametrize(
    "url, expected",
    [
        ("http://example.com/results/result1.html", "result1"),
        ("http://example.com/test/result2.html", "result2"),
        ("http://example.com/result3.html", "result3"),
    ],
)
def test_extract_result_name_from_url_parametrized(url: str, expected: str) -> None:
    result_name = get_identifier_from_nih_url(url)
    assert result_name == expected
