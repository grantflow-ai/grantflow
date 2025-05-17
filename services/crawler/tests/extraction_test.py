from collections.abc import Generator
from unittest.mock import AsyncMock, Mock, patch

import pytest
from anyio import Path
from services.crawler.src.extraction import crawl


@pytest.fixture
def temp_dir(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """Create a proper anyio.Path temporary directory for testing."""
    path = tmp_path_factory.mktemp("crawl_test")
    return Path(str(path))


@pytest.fixture
def mock_url() -> str:
    return "https://example.org/test-page"


@pytest.fixture
def mock_html_content() -> str:
    return """
    <html>
        <head><title>Test Page</title></head>
        <body>
            <h1>Test Content</h1>
            <p>This is a test paragraph with some content.</p>
            <a href="https://example.org/related-page">Related Page</a>
            <a href="https://example.org/files/document.pdf">Download PDF</a>
            <a href="https://example.org/files/spreadsheet.xlsx">Download Excel</a>
        </body>
    </html>
    """


@pytest.fixture
def mock_download_page_html() -> Generator[AsyncMock, None, None]:
    with patch("services.crawler.src.extraction.download_page_html") as mock:
        mock.return_value = """
        <html>
            <head><title>Test Page</title></head>
            <body>
                <h1>Test Content</h1>
                <p>This is a test paragraph with some content.</p>
                <a href="https://example.org/related-page">Related Page</a>
                <a href="https://example.org/files/document.pdf">Download PDF</a>
                <a href="https://example.org/files/spreadsheet.xlsx">Download Excel</a>
            </body>
        </html>
        """
        yield mock


@pytest.fixture
def mock_download_file() -> Generator[AsyncMock, None, None]:
    with patch("services.crawler.src.extraction.download_file") as mock:
        mock.return_value = b"Test file content"
        yield mock


@pytest.fixture
def mock_trafilatura_extract() -> Generator[Mock, None, None]:
    with patch("services.crawler.src.extraction.trafilatura.extract") as mock:
        mock.return_value = "Test Content\n\nThis is a test paragraph with some content."
        yield mock


@pytest.fixture
def mock_convert_to_markdown() -> Generator[Mock, None, None]:
    with patch("services.crawler.src.extraction.convert_to_markdown") as mock:
        mock.return_value = "# Test Content\n\nThis is a test paragraph with some content."
        yield mock


@pytest.fixture
def mock_generate_embeddings() -> Generator[AsyncMock, None, None]:
    with patch("services.crawler.src.extraction.generate_embeddings") as mock:
        mock.return_value = [[0.1, 0.2, 0.3, 0.4, 0.5]]
        yield mock


@pytest.fixture
def mock_cosine_similarity() -> Generator[Mock, None, None]:
    with patch("services.crawler.src.extraction.cosine_similarity") as mock:
        mock.return_value = [[0.95]]  # High similarity
        yield mock


@pytest.fixture
def mock_chunk_text() -> Generator[Mock, None, None]:
    with patch("services.crawler.src.extraction.chunk_text") as mock:
        mock.return_value = [
            {"content": "Test Content", "metadata": {"source": "https://example.org/test-page"}},
            {
                "content": "This is a test paragraph with some content.",
                "metadata": {"source": "https://example.org/test-page"},
            },
        ]
        yield mock


async def test_crawl_basic(
    temp_dir: Path,
    mock_url: str,
    mock_download_page_html: AsyncMock,
    mock_trafilatura_extract: Mock,
    mock_convert_to_markdown: Mock,
    mock_generate_embeddings: AsyncMock,
) -> None:
    results = await crawl(mock_url, temp_dir)

    assert len(results) == 2
    result = results[0]
    assert result["url"] == mock_url
    assert len(result["document_links"]) == 2  # Two document links in the mock HTML
    assert result["markdown_content"] == "# Test Content\n\nThis is a test paragraph with some content."
    assert result["text_content"] == "Test Content\n\nThis is a test paragraph with some content."
    assert "test-page.md" in result["saved_path"]

    mock_download_page_html.assert_any_call(mock_url)
    mock_download_page_html.assert_any_call("https://example.org/related-page")
    assert mock_download_page_html.call_count == 2

    mock_trafilatura_extract.assert_called()
    assert mock_trafilatura_extract.call_count == 2
    mock_convert_to_markdown.assert_called()
    assert mock_convert_to_markdown.call_count == 2
    mock_generate_embeddings.assert_called()
    assert mock_generate_embeddings.call_count == 2


async def test_crawl_with_downloaded_files(
    temp_dir: Path,
    mock_url: str,
    mock_download_page_html: AsyncMock,
    mock_download_file: AsyncMock,
    mock_trafilatura_extract: Mock,
    mock_convert_to_markdown: Mock,
    mock_generate_embeddings: AsyncMock,
) -> None:
    """Test crawling with file downloads."""
    results = await crawl(mock_url, temp_dir)

    assert len(results) == 2
    result = results[0]
    assert len(result["document_links"]) == 2

    assert mock_download_file.await_count == 2

    file_count = 0
    async for _ in temp_dir.glob("**/*"):
        file_count += 1
    assert file_count == 4


async def test_crawl_recursive(
    temp_dir: Path,
    mock_url: str,
    mock_download_page_html: AsyncMock,
    mock_trafilatura_extract: Mock,
    mock_convert_to_markdown: Mock,
    mock_generate_embeddings: AsyncMock,
    mock_cosine_similarity: Mock,
) -> None:
    """Test recursive crawling of related pages."""
    second_url = "https://example.org/related-page"

    main_page_html = """
    <html>
        <head><title>Test Page</title></head>
        <body>
            <h1>Test Content</h1>
            <p>This is a test paragraph with some content.</p>
            <a href="https://example.org/related-page">Related Page</a>
        </body>
    </html>
    """

    related_page_html = """
    <html>
        <head><title>Related Page</title></head>
        <body>
            <h1>Related Content</h1>
            <p>This is related content.</p>
        </body>
    </html>
    """

    mock_download_page_html.side_effect = None
    mock_download_page_html.return_value = None

    def download_side_effect(url: str) -> str:
        if url == mock_url:
            return main_page_html
        if url == second_url:
            return related_page_html
        return "Invalid URL HTML"

    mock_download_page_html.side_effect = download_side_effect

    mock_trafilatura_extract.side_effect = None
    mock_trafilatura_extract.return_value = None

    def trafilatura_side_effect(html: str) -> str:
        if html == main_page_html:
            return "Test Content\n\nThis is a test paragraph with some content."
        if html == related_page_html:
            return "Related Content\n\nThis is related content."
        return "Unknown content"

    mock_trafilatura_extract.side_effect = trafilatura_side_effect

    mock_convert_to_markdown.side_effect = None
    mock_convert_to_markdown.return_value = None

    def markdown_side_effect(html: str) -> str:
        if "Test Content" in str(html):
            return "# Test Content\n\nThis is a test paragraph with some content."
        if "Related Content" in str(html):
            return "# Related Content\n\nThis is related content."
        return "# Unknown content"

    mock_convert_to_markdown.side_effect = markdown_side_effect

    results = await crawl(mock_url, temp_dir)

    assert len(results) == 2, "Expected two results (main page and related page)"

    assert results[0]["url"] == mock_url, "First result should be the main URL"
    assert results[0]["text_content"] == "Test Content\n\nThis is a test paragraph with some content."

    assert results[1]["url"] == second_url, "Second result should be the related URL"
    assert results[1]["text_content"] == "Related Content\n\nThis is related content."


async def test_crawl_avoids_visited_urls(
    temp_dir: Path,
    mock_url: str,
    mock_download_page_html: AsyncMock,
    mock_trafilatura_extract: Mock,
    mock_convert_to_markdown: Mock,
    mock_generate_embeddings: AsyncMock,
) -> None:
    """Test that crawl doesn't revisit already visited URLs."""
    visited_urls = [mock_url]

    results = await crawl(mock_url, temp_dir, visited_urls=visited_urls, raw_html=None)

    assert len(results) == 0  # Nothing crawled because URL was in visited list
    mock_download_page_html.assert_not_called()


async def test_crawl_with_existing_html(
    temp_dir: Path,
    mock_url: str,
    mock_html_content: str,
    mock_download_page_html: AsyncMock,
    mock_trafilatura_extract: Mock,
    mock_convert_to_markdown: Mock,
    mock_generate_embeddings: AsyncMock,
) -> None:
    """Test crawl with already downloaded HTML content."""
    main_page_html = """
    <html>
        <head><title>Test Page</title></head>
        <body>
            <h1>Test Content</h1>
            <p>This is a test paragraph with some content.</p>
        </body>
    </html>
    """

    results = await crawl(mock_url, temp_dir, raw_html=main_page_html)

    # Assert
    assert len(results) == 1
    mock_download_page_html.assert_not_called()


async def test_crawl_handles_download_errors(
    temp_dir: Path,
    mock_url: str,
    mock_download_page_html: AsyncMock,
    mock_download_file: AsyncMock,
) -> None:
    """Test crawl handles errors during file downloads."""
    mock_download_file.return_value = None
    mock_download_file.side_effect = Exception("Download failed")

    results = await crawl(mock_url, temp_dir)

    assert len(results) == 2
    assert len(results[0]["document_links"]) == 2

    assert mock_download_file.await_count == 4

    file_count = 0
    async for _ in temp_dir.glob("**/*"):
        file_count += 1
    assert file_count == 2  # only the webpages were downloaded, not the 2 files


async def test_crawl_handles_similarity_errors(
    temp_dir: Path,
    mock_url: str,
    mock_download_page_html: AsyncMock,
    mock_trafilatura_extract: Mock,
    mock_generate_embeddings: AsyncMock,
    mock_cosine_similarity: Mock,
) -> None:
    """Test crawl handles errors during similarity comparison."""
    mock_cosine_similarity.side_effect = Exception("Similarity calculation failed")

    results = await crawl(mock_url, temp_dir)

    # No related pages should have been crawled due to the error
    assert len(results) == 1  # Main page was still processed
