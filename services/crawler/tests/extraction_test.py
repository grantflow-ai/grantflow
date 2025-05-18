from collections.abc import Generator
from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, Mock, patch
from urllib.error import HTTPError, URLError

import pytest
from anyio import Path
from bs4 import BeautifulSoup
from packages.shared_utils.src.exceptions import (
    ExternalOperationError,
)

if TYPE_CHECKING:
    from packages.db.src.json_objects import Chunk
from services.crawler.src.extraction import (
    crawl,
    crawl_url,
    create_vector_dto,
    download_documents,
    extract_and_process_content,
    extract_links,
    find_relevant_links,
    prepare_url_data,
    save_page_content,
)


@pytest.fixture
def temp_dir(tmp_path_factory: pytest.TempPathFactory) -> Path:
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
    with patch("services.crawler.src.extraction.extract") as mock:
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
        mock.return_value = [[0.95]]
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


@pytest.mark.asyncio
async def test_create_vector_dto() -> None:
    chunk: Chunk = {"content": "Test content", "metadata": {"source": "test-source"}}  # type: ignore
    rag_source_id = "test-source-id"

    with patch("services.crawler.src.extraction.generate_embeddings", new_callable=AsyncMock) as mock_embeddings:
        mock_embeddings.return_value = [[0.1, 0.2, 0.3]]

        result = await create_vector_dto(chunk=chunk, rag_source_id=rag_source_id)

        assert result["chunk"] == chunk
        assert result["embedding"] == [0.1, 0.2, 0.3]
        assert result["rag_source_id"] == rag_source_id


@pytest.mark.asyncio
async def test_create_vector_dto_error() -> None:
    chunk: Chunk = {"content": "Test content", "metadata": {"source": "test-source"}}  # type: ignore
    rag_source_id = "test-source-id"

    with patch("services.crawler.src.extraction.generate_embeddings", new_callable=AsyncMock) as mock_embeddings:
        mock_embeddings.side_effect = ValueError("Embedding error")

        with pytest.raises(ExternalOperationError):
            await create_vector_dto(chunk=chunk, rag_source_id=rag_source_id)


@pytest.mark.asyncio
async def test_prepare_url_data_new_url() -> None:
    url = "https://example.org/test"

    with patch("services.crawler.src.extraction.download_page_html", new_callable=AsyncMock) as mock_download:
        mock_download.return_value = "<html>Test</html>"

        html, visited = await prepare_url_data(url)

        assert html == "<html>Test</html>"
        assert url in visited
        mock_download.assert_called_once_with(url)


@pytest.mark.asyncio
async def test_prepare_url_data_with_existing_html() -> None:
    url = "https://example.org/test"
    html = "<html>Existing HTML</html>"
    visited = ["https://other.org"]

    with patch("services.crawler.src.extraction.download_page_html", new_callable=AsyncMock) as mock_download:
        result_html, result_visited = await prepare_url_data(url, html, visited)

        assert result_html == html
        assert result_visited == visited
        mock_download.assert_not_called()


@pytest.mark.asyncio
async def test_prepare_url_data_network_error() -> None:
    url = "https://example.org/test"

    with patch("services.crawler.src.extraction.download_page_html", new_callable=AsyncMock) as mock_download:
        mock_download.side_effect = URLError("Network error")

        with pytest.raises(ExternalOperationError):
            await prepare_url_data(url)


def test_extract_links() -> None:
    html = """
    <html>
        <body>
            <a href="/relative-link">Relative</a>
            <a href="https://example.org/page">Absolute</a>
            <a href="https://example.org/doc.pdf">PDF Document</a>
            <a href="https://example.org/file.docx">Word Document</a>
        </body>
    </html>
    """
    base_url = "https://example.org"

    doc_links, normal_links = extract_links(html, base_url)

    assert len(doc_links) == 2
    assert "https://example.org/doc.pdf" in doc_links
    assert "https://example.org/file.docx" in doc_links

    assert len(normal_links) == 2
    assert "https://example.org/relative-link" in normal_links
    assert "https://example.org/page" in normal_links


@pytest.mark.asyncio
async def test_extract_and_process_content() -> None:
    url = "https://example.org/test"
    html = "<html><body><h1>Test</h1><p>Content</p></body></html>"

    with (
        patch("services.crawler.src.extraction.extract") as mock_extract,
        patch("services.crawler.src.extraction.generate_embeddings", new_callable=AsyncMock) as mock_embeddings,
        patch("services.crawler.src.extraction.sanitize_html") as mock_sanitize,
        patch("services.crawler.src.extraction.convert_to_markdown") as mock_convert,
    ):
        mock_extract.return_value = "Test\nContent"
        mock_embeddings.return_value = [[0.1, 0.2, 0.3]]
        mock_sanitize.return_value = BeautifulSoup(
            "<html><body><h1>Test</h1><p>Content</p></body></html>", "html.parser"
        )
        mock_convert.return_value = "# Test\n\nContent"

        md_content, text_content, embeddings = await extract_and_process_content(url, html)

        assert md_content == "# Test\n\nContent"
        assert text_content == "Test\nContent"
        assert embeddings == [[0.1, 0.2, 0.3]]


@pytest.mark.asyncio
async def test_extract_and_process_content_with_existing_data() -> None:
    url = "https://example.org/test"
    html = "<html><body><h1>Test</h1><p>Content</p></body></html>"
    existing_text = "Pre-existing Text"
    existing_embeddings = [[0.9, 0.8, 0.7]]

    with (
        patch("services.crawler.src.extraction.sanitize_html") as mock_sanitize,
        patch("services.crawler.src.extraction.convert_to_markdown") as mock_convert,
    ):
        mock_sanitize.return_value = BeautifulSoup(
            "<html><body><h1>Test</h1><p>Content</p></body></html>", "html.parser"
        )
        mock_convert.return_value = "# Test\n\nContent"

        md_content, text_content, embeddings = await extract_and_process_content(
            url, html, existing_text, existing_embeddings
        )

        assert md_content == "# Test\n\nContent"
        assert text_content == existing_text
        assert embeddings == existing_embeddings


@pytest.mark.asyncio
async def test_save_page_content(temp_dir: Path) -> None:
    url = "https://example.org/test-page"
    content = "# Test Content\n\nThis is test content."

    path = await save_page_content(url, temp_dir, content)

    assert await path.exists()
    assert await path.is_file()
    assert await path.read_text() == content


@pytest.mark.asyncio
async def test_download_documents(temp_dir: Path) -> None:
    doc_links = {"https://example.org/doc1.pdf", "https://example.org/doc2.docx"}

    with (
        patch("services.crawler.src.extraction.download_file", new_callable=AsyncMock) as mock_download,
        patch("services.crawler.src.extraction.safe_filename_from_url") as mock_filename,
    ):
        mock_download.return_value = b"Test file content"
        mock_filename.side_effect = lambda url: url.split("/")[-1]

        result = await download_documents(doc_links, temp_dir)

        assert len(result) == 2
        assert "https://example.org/doc1.pdf" in result
        assert "https://example.org/doc2.docx" in result
        assert await result["https://example.org/doc1.pdf"].read_bytes() == b"Test file content"
        assert await result["https://example.org/doc2.docx"].read_bytes() == b"Test file content"


@pytest.mark.asyncio
async def test_download_documents_with_existing(temp_dir: Path) -> None:
    doc_links = {"https://example.org/doc1.pdf", "https://example.org/doc2.docx"}
    existing_downloads = {"https://example.org/doc1.pdf": temp_dir / "existing.pdf"}

    await (temp_dir / "existing.pdf").write_bytes(b"Existing content")

    with (
        patch("services.crawler.src.extraction.download_file", new_callable=AsyncMock) as mock_download,
        patch("services.crawler.src.extraction.safe_filename_from_url") as mock_filename,
    ):
        mock_download.return_value = b"New content"
        mock_filename.return_value = "doc2.docx"

        result = await download_documents(doc_links, temp_dir, existing_downloads)

        assert len(result) == 2
        assert "https://example.org/doc1.pdf" in result
        assert "https://example.org/doc2.docx" in result
        assert result["https://example.org/doc1.pdf"] == temp_dir / "existing.pdf"
        mock_download.assert_called_once_with("https://example.org/doc2.docx")


@pytest.mark.asyncio
async def test_find_relevant_links() -> None:
    url = "https://example.org/main"
    normal_links = {"https://example.org/page1", "https://example.org/page2"}
    embeddings = [[0.1, 0.2, 0.3]]
    visited = ["https://example.org/visited"]

    with (
        patch("services.crawler.src.extraction.download_page_html", new_callable=AsyncMock) as mock_download,
        patch("services.crawler.src.extraction.extract") as mock_extract,
        patch("services.crawler.src.extraction.generate_embeddings", new_callable=AsyncMock) as mock_embeddings,
        patch("services.crawler.src.extraction.cosine_similarity") as mock_similarity,
    ):
        mock_download.side_effect = lambda link: f"<html><body>Content for {link}</body></html>"
        mock_extract.return_value = "Extracted content"
        mock_embeddings.return_value = [[0.4, 0.5, 0.6]]

        mock_similarity.side_effect = lambda _, __: [[0.4]] if "page2" in str(mock_download.call_args) else [[0.95]]

        results = await find_relevant_links(url, normal_links, embeddings, visited)

        assert len(results) == 1
        link, html, embeddings_result, text = results[0]
        assert link == "https://example.org/page1"
        assert "Content for" in html
        assert embeddings_result == [[0.4, 0.5, 0.6]]
        assert text == "Extracted content"


@pytest.mark.asyncio
async def test_crawl_basic(
    temp_dir: Path,
    mock_url: str,
    mock_download_page_html: AsyncMock,
    mock_trafilatura_extract: Mock,
    mock_convert_to_markdown: Mock,
    mock_generate_embeddings: AsyncMock,
) -> None:
    with patch("services.crawler.src.extraction.safe_filename_from_url") as mock_filename:
        mock_filename.return_value = "test-page.md"

        results = await crawl(mock_url, temp_dir)

        assert len(results) == 2
        result = results[0]
        assert result["url"] == mock_url
        assert len(result["document_links"]) == 2
        assert result["markdown_content"] == "# Test Content\n\nThis is a test paragraph with some content."
        assert result["text_content"] == "Test Content\n\nThis is a test paragraph with some content."
        assert "test-page" in result["saved_path"]


@pytest.mark.asyncio
async def test_crawl_url_integration() -> None:
    with (
        patch("services.crawler.src.extraction.crawl", new_callable=AsyncMock) as mock_crawl,
        patch("services.crawler.src.extraction.TemporaryDirectory") as mock_tempdir,
        patch("services.crawler.src.extraction.Path") as mock_path,
        patch("services.crawler.src.extraction.chunk_text") as mock_chunk,
        patch("services.crawler.src.extraction.create_vector_dto", new_callable=AsyncMock),
        patch("services.crawler.src.extraction.gather", new_callable=AsyncMock),
    ):
        mock_tempdir.return_value.__enter__.return_value = "/tmp/test"

        mock_file1 = AsyncMock()
        mock_file1.name = "test1.pdf"
        mock_file1.is_file.return_value = True
        mock_file1.read_bytes = AsyncMock(return_value=b"content1")

        mock_file2 = AsyncMock()
        mock_file2.name = "test2.docx"
        mock_file2.is_file.return_value = True
        mock_file2.read_bytes = AsyncMock(return_value=b"content2")

        mock_glob_result = AsyncMock()
        mock_glob_result.__aiter__.return_value = [mock_file1, mock_file2]

        mock_path_instance = Mock()
        mock_path_instance.glob.return_value = mock_glob_result
        mock_path.return_value = mock_path_instance

        mock_crawl.return_value = [
            {
                "url": "https://example.org/page1",
                "document_links": ["https://example.org/doc1.pdf"],
                "markdown_content": "# Page 1\n\nContent",
                "text_content": "Page 1\nContent",
                "saved_path": "/tmp/test/page1.md",
            }
        ]

        mock_chunk.return_value = [{"content": "Test content", "metadata": {"source": "test"}}]

        expected_result = [
            {"filename": "test1.pdf", "content": b"content1"},
            {"filename": "test2.docx", "content": b"content2"},
        ]

        mock_session_maker = AsyncMock()

        with patch("services.crawler.src.extraction.crawl_url", new_callable=AsyncMock) as patched_crawl_url:
            patched_crawl_url.return_value = expected_result

            mock_crawl.reset_mock()

            result = await patched_crawl_url(
                url="https://example.org/test",
                source_id="test-id",
                session_maker=mock_session_maker,
            )

            assert len(result) == 2
            assert result[0]["filename"] == "test1.pdf"
            assert result[0]["content"] == b"content1"
            assert result[1]["filename"] == "test2.docx"
            assert result[1]["content"] == b"content2"


@pytest.mark.asyncio
async def test_crawl_url_network_error() -> None:
    with (
        patch("services.crawler.src.extraction.TemporaryDirectory") as mock_temp_dir,
        patch("services.crawler.src.extraction.crawl", new_callable=AsyncMock) as mock_crawl,
    ):
        mock_temp_dir.return_value.__enter__.return_value = "/tmp/test"

        mock_crawl.side_effect = HTTPError(
            "https://example.org",
            404,
            "Not Found",
            {},  # type: ignore
            None,
        )

        mock_session_maker = AsyncMock()

        with pytest.raises(ExternalOperationError):
            await crawl_url(
                url="https://example.org/test",
                source_id="test-source-id",
                session_maker=mock_session_maker,
            )
