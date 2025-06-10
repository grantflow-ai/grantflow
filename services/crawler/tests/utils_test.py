from unittest.mock import AsyncMock, Mock, patch

from bs4 import BeautifulSoup, Comment, Tag
from services.crawler.src.utils import (
    HTML_TAGS_TO_DECOMPOSE,
    download_file,
    download_page_html,
    safe_filename_from_url,
    sanitize_html,
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


def test_sanitize_html_removes_tags() -> None:
    html = """
    <html>
        <head>
            <title>Test Page</title>
            <script>alert('test');</script>
            <style>.test{color:red;}</style>
        </head>
        <body>
            <h1>Test Content</h1>
            <p>This is a test paragraph.</p>
            <iframe src="https://example.org"></iframe>
            <noscript>No script support</noscript>
        </body>
    </html>
    """
    soup = BeautifulSoup(html, "html.parser")
    sanitized = sanitize_html(soup)

    for tag_name in HTML_TAGS_TO_DECOMPOSE:
        assert not sanitized.find(tag_name)

    assert sanitized.find("h1")
    assert sanitized.find("p")


def test_sanitize_html_removes_attributes() -> None:
    html = """
    <html>
        <body>
            <h1 class="title" id="main-title" data-test="value">Test Content</h1>
            <p style="color:red;" title="Important paragraph">This is a test paragraph.</p>
            <a href="https://example.org" target="_blank" rel="noopener" onclick="alert('click');">Link</a>
        </body>
    </html>
    """
    soup = BeautifulSoup(html, "html.parser")
    sanitized = sanitize_html(soup)

    h1 = sanitized.find("h1")
    assert h1 is not None
    assert isinstance(h1, Tag)
    assert not h1.has_attr("class")
    assert not h1.has_attr("id")
    assert not h1.has_attr("data-test")

    p = sanitized.find("p")
    assert p is not None
    assert isinstance(p, Tag)
    assert not p.has_attr("style")
    assert p.has_attr("title")
    assert p["title"] == "Important paragraph"

    a = sanitized.find("a")
    assert a is not None
    assert isinstance(a, Tag)
    assert a.has_attr("href")
    assert a["href"] == "https://example.org"
    assert not a.has_attr("target")
    assert not a.has_attr("rel")
    assert not a.has_attr("onclick")


def test_sanitize_html_removes_comments() -> None:
    html = """
    <html>
        <body>
            <!-- This is a comment -->
            <h1>Test Content</h1>
            <!-- Another comment -->
            <p>This is a test paragraph.</p>
        </body>
    </html>
    """
    soup = BeautifulSoup(html, "html.parser")
    sanitized = sanitize_html(soup)

    comments = list(sanitized.find_all(string=lambda text: isinstance(text, Comment)))
    assert not comments


async def test_download_page_html() -> None:
    mock_response = Mock()
    mock_response.text = "<html><body>Test content</body></html>"
    mock_response.content = b"<html><body>Test content</body></html>"
    mock_response.status_code = 200
    mock_response.headers = {"content-type": "text/html"}
    mock_response.raise_for_status = Mock()

    with patch("services.crawler.src.utils.client.get", new_callable=AsyncMock) as mock_get:
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

    with patch("services.crawler.src.utils.client.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        result = await download_file("https://example.org/file.pdf")

        mock_get.assert_called_once_with("https://example.org/file.pdf", timeout=30, follow_redirects=True)
        assert result == b"File content bytes"
