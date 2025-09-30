from collections.abc import Generator
from unittest.mock import AsyncMock, Mock, patch

import pytest
from anyio import Path
from litestar.stores.base import Store

from services.crawler.src.extraction import (
    crawl,
    crawl_url,
    download_documents,
    extract_and_process_content,
    extract_links,
    find_relevant_links,
    save_page_content,
)
from packages.shared_utils.src.url_utils import normalize_url


@pytest.fixture
def temp_dir(tmp_path_factory: pytest.TempPathFactory) -> Path:
    path = tmp_path_factory.mktemp("crawl_test")
    return Path(str(path))


@pytest.fixture
def mock_url() -> str:
    return "https://example.org/test-page"


@pytest.fixture
def memory_store() -> AsyncMock:
    mock_store = AsyncMock(spec=Store)
    mock_store.get.return_value = None
    mock_store.set = AsyncMock()
    return mock_store


@pytest.fixture
def session_key() -> str:
    return "test_session_key"


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
def mock_download_page_html() -> Generator[AsyncMock]:
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
def mock_download_file() -> Generator[AsyncMock]:
    with patch("services.crawler.src.extraction.download_file") as mock:
        mock.return_value = b"Test file content"
        yield mock


@pytest.fixture
def mock_trafilatura_extract() -> Generator[Mock]:
    with patch("services.crawler.src.extraction.extract") as mock:
        mock.return_value = (
            "Test Content\n\nThis is a test paragraph with some content."
        )
        yield mock


@pytest.fixture
def mock_extract_file_content() -> Generator[AsyncMock]:
    with patch("services.crawler.src.extraction.extract_file_content") as mock:
        mock.return_value = (
            "# Test Content\n\nThis is a test paragraph with some content.",
            "text/html",
            None,
            None,
        )
        yield mock


@pytest.fixture
def mock_generate_embeddings() -> Generator[AsyncMock]:
    with patch("services.crawler.src.extraction.generate_embeddings") as mock:
        mock.return_value = [[0.1, 0.2, 0.3, 0.4, 0.5]]
        yield mock


@pytest.fixture
def mock_cosine_similarity() -> Generator[Mock]:
    with patch("services.crawler.src.extraction.cosine_similarity") as mock:
        mock.return_value = [[0.95]]
        yield mock


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


async def test_extract_and_process_content() -> None:
    url = "https://example.org/test"
    html = "<html><body><h1>Test</h1><p>Content</p></body></html>"

    with (
        patch("services.crawler.src.extraction.extract") as mock_extract,
        patch(
            "services.crawler.src.extraction.generate_embeddings",
            new_callable=AsyncMock,
        ) as mock_embeddings,
        patch(
            "services.crawler.src.extraction.extract_file_content",
            new_callable=AsyncMock,
        ) as mock_extract_file,
    ):
        mock_extract.side_effect = [
            "Test\nContent",
            "<html><body><h1>Test</h1><p>Content</p></body></html>",
        ]
        mock_embeddings.return_value = [[0.1, 0.2, 0.3]]
        mock_extract_file.return_value = (
            "# Test\n\nContent",
            "text/html",
            None,
            None,
        )

        (
            md_content,
            text_content,
            embeddings,
            metadata,
        ) = await extract_and_process_content(url, html)

        assert md_content == "# Test\n\nContent"
        assert text_content == "Test\nContent"
        assert embeddings == [[0.1, 0.2, 0.3]]
        assert metadata is None


async def test_extract_and_process_content_with_existing_data() -> None:
    url = "https://example.org/test"
    html = "<html><body><h1>Test</h1><p>Content</p></body></html>"
    existing_text = "Pre-existing Text"
    existing_embeddings = [[0.9, 0.8, 0.7]]

    with (
        patch("services.crawler.src.extraction.extract") as mock_extract,
        patch(
            "services.crawler.src.extraction.extract_file_content",
            new_callable=AsyncMock,
        ) as mock_extract_file,
    ):
        mock_extract.return_value = (
            "<html><body><h1>Test</h1><p>Content</p></body></html>"
        )
        mock_extract_file.return_value = (
            "# Test\n\nContent",
            "text/html",
            None,
            None,
        )

        (
            md_content,
            text_content,
            embeddings,
            metadata,
        ) = await extract_and_process_content(
            url, html, existing_text, existing_embeddings
        )

        assert md_content == "# Test\n\nContent"
        assert text_content == existing_text
        assert embeddings == existing_embeddings
        assert metadata is None


async def test_save_page_content(temp_dir: Path) -> None:
    url = "https://example.org/test-page"
    content = "# Test Content\n\nThis is test content."

    path = await save_page_content(url, temp_dir, content)

    assert await path.exists()
    assert await path.is_file()
    assert await path.read_text() == content


async def test_download_documents(temp_dir: Path) -> None:
    doc_links = {"https://example.org/doc1.pdf", "https://example.org/doc2.docx"}

    with (
        patch(
            "services.crawler.src.extraction.download_file", new_callable=AsyncMock
        ) as mock_download,
        patch(
            "services.crawler.src.extraction.safe_filename_from_url"
        ) as mock_filename,
    ):
        mock_download.return_value = b"Test file content"
        mock_filename.side_effect = lambda url: url.split("/")[-1]

        result = await download_documents(doc_links, temp_dir)

        assert len(result) == 2
        assert "https://example.org/doc1.pdf" in result
        assert "https://example.org/doc2.docx" in result
        assert (
            await result["https://example.org/doc1.pdf"].read_bytes()
            == b"Test file content"
        )
        assert (
            await result["https://example.org/doc2.docx"].read_bytes()
            == b"Test file content"
        )


async def test_download_documents_with_existing(temp_dir: Path) -> None:
    doc_links = {"https://example.org/doc1.pdf", "https://example.org/doc2.docx"}
    existing_downloads = {"https://example.org/doc1.pdf": temp_dir / "existing.pdf"}

    await (temp_dir / "existing.pdf").write_bytes(b"Existing content")

    with (
        patch(
            "services.crawler.src.extraction.download_file", new_callable=AsyncMock
        ) as mock_download,
        patch(
            "services.crawler.src.extraction.safe_filename_from_url"
        ) as mock_filename,
    ):
        mock_download.return_value = b"New content"
        mock_filename.return_value = "doc2.docx"

        result = await download_documents(doc_links, temp_dir, existing_downloads)

        assert len(result) == 2
        assert "https://example.org/doc1.pdf" in result
        assert "https://example.org/doc2.docx" in result
        assert result["https://example.org/doc1.pdf"] == temp_dir / "existing.pdf"
        mock_download.assert_called_once_with("https://example.org/doc2.docx")


async def test_find_relevant_links() -> None:
    from packages.shared_utils.src.serialization import serialize

    normal_links = {"https://example.org/page1", "https://example.org/page2"}
    embeddings = [[0.1, 0.2, 0.3]]

    mock_memory_store = AsyncMock()
    mock_memory_store.get.return_value = serialize(["https://example.org/visited"])
    mock_memory_store.set = AsyncMock()

    with (
        patch(
            "services.crawler.src.extraction.download_page_html", new_callable=AsyncMock
        ) as mock_download,
        patch("services.crawler.src.extraction.extract") as mock_extract,
        patch(
            "services.crawler.src.extraction.generate_embeddings",
            new_callable=AsyncMock,
        ) as mock_embeddings,
        patch("services.crawler.src.extraction.cosine_similarity") as mock_similarity,
    ):
        mock_download.side_effect = (
            lambda link: f"<html><body>Content for {link}</body></html>"
        )
        mock_extract.return_value = "Extracted content"
        mock_embeddings.return_value = [[0.4, 0.5, 0.6]]

        mock_similarity.side_effect = (
            lambda _, __: [[0.4]]
            if "page2" in str(mock_download.call_args)
            else [[0.95]]
        )

        results = await find_relevant_links(
            normal_links, embeddings, mock_memory_store, "test_session"
        )

        assert len(results) == 1
        link, html, embeddings_result, text = results[0]
        assert link == "https://example.org/page1"
        assert "Content for" in html
        assert embeddings_result == [[0.4, 0.5, 0.6]]
        assert text == "Extracted content"


async def test_crawl_basic(
    temp_dir: Path,
    mock_url: str,
    mock_download_page_html: AsyncMock,
    mock_trafilatura_extract: Mock,
    mock_extract_file_content: AsyncMock,
    mock_generate_embeddings: AsyncMock,
    mock_download_file: AsyncMock,
    memory_store: AsyncMock,
    session_key: str,
) -> None:
    with patch(
        "services.crawler.src.extraction.safe_filename_from_url"
    ) as mock_filename:
        mock_filename.return_value = "test-page.md"

        results = await crawl(
            url=mock_url,
            temp_dir=temp_dir,
            memory_store=memory_store,
            session_key=session_key,
        )

        assert len(results) == 1
        result = results[0]
        assert result["url"] == mock_url
        assert len(result["document_links"]) == 0
        assert (
            result["markdown_content"]
            == "# Test Content\n\nThis is a test paragraph with some content."
        )
        assert (
            result["text_content"]
            == "Test Content\n\nThis is a test paragraph with some content."
        )
        assert "test-page" in result["saved_path"]


async def test_crawl_url_integration(
    temp_dir: Path, memory_store: AsyncMock, session_key: str
) -> None:
    await (temp_dir / "test1.pdf").write_bytes(b"content1")
    await (temp_dir / "test2.docx").write_bytes(b"content2")

    with (
        patch(
            "services.crawler.src.extraction.crawl", new_callable=AsyncMock
        ) as mock_crawl,
        patch("services.crawler.src.extraction.TemporaryDirectory") as mock_tempdir,
        patch(
            "services.crawler.src.extraction.index_chunks", new_callable=AsyncMock
        ) as mock_index_chunks,
    ):
        mock_tempdir.return_value.__aenter__.return_value = str(temp_dir)

        mock_crawl.return_value = [
            {
                "url": "https://example.org/page1",
                "document_links": ["https://example.org/doc1.pdf"],
                "markdown_content": "# Page 1\n\nContent",
                "text_content": "Page 1\nContent",
                "saved_path": str(temp_dir / "page1.md"),
            }
        ]

        mock_index_chunks.return_value = [
            {
                "chunk": {"content": "Test content", "metadata": {"source": "test"}},
                "embedding": [0.1, 0.2],
                "rag_source_id": "test-id",
            }
        ]

        result = await crawl_url(
            url="https://example.org/test",
            source_id="test-id",
            memory_store=memory_store,
            session_key=session_key,
        )

        assert len(result) == 4
        vectors, content, files, metadata = result
        assert len(vectors) == 1
        assert content == "\n\n# Page 1\n\nContent"
        assert len(files) == 2
        assert metadata is not None

        filenames = sorted([f["filename"] for f in files])
        assert filenames == ["test1.pdf", "test2.docx"]
        file_contents = {f["filename"]: f["content"] for f in files}
        assert file_contents["test1.pdf"] == b"content1"
        assert file_contents["test2.docx"] == b"content2"

        mock_index_chunks.assert_called_once_with(
            chunks=[{"content": "# Page 1\n\nContent"}],
            source_id="test-id",
        )


async def test_find_relevant_links_url_normalization() -> None:
    from packages.shared_utils.src.serialization import serialize

    normal_links = {
        "https://Example.com/page?param=1",
        "https://example.com/page#section",
        "https://example.com/page/",
    }
    embeddings = [[0.1, 0.2, 0.3]]

    mock_memory_store = AsyncMock()
    visited_urls = [normalize_url("https://example.com/page")]
    mock_memory_store.get.return_value = serialize(visited_urls)
    mock_memory_store.set = AsyncMock()

    with (
        patch(
            "services.crawler.src.extraction.download_page_html", new_callable=AsyncMock
        ) as mock_download,
        patch("services.crawler.src.extraction.extract") as mock_extract,
        patch(
            "services.crawler.src.extraction.generate_embeddings",
            new_callable=AsyncMock,
        ) as mock_embeddings,
        patch("services.crawler.src.extraction.cosine_similarity") as mock_similarity,
    ):
        mock_download.side_effect = (
            lambda link: f"<html><body>Content for {link}</body></html>"
        )
        mock_extract.return_value = "Extracted content"
        mock_embeddings.return_value = [[0.4, 0.5, 0.6]]
        mock_similarity.return_value = [[0.95]]

        results = await find_relevant_links(
            normal_links, embeddings, mock_memory_store, "test_session"
        )

        assert len(results) == 0, "All URLs should be deduplicated due to normalization"


async def test_crawl_with_memory_store_url_normalization(temp_dir: Path) -> None:
    from packages.shared_utils.src.serialization import deserialize

    mock_memory_store = AsyncMock()
    mock_memory_store.get.return_value = None
    mock_memory_store.set = AsyncMock()

    url = "https://Example.COM/Page/?param=1#section"
    normalized_url = normalize_url(url)

    with (
        patch(
            "services.crawler.src.extraction.download_page_html", new_callable=AsyncMock
        ) as mock_download,
        patch("services.crawler.src.extraction.extract") as mock_extract,
        patch(
            "services.crawler.src.extraction.generate_embeddings",
            new_callable=AsyncMock,
        ) as mock_embeddings,
    ):
        mock_download.return_value = "<html><body><h1>Test</h1></body></html>"
        mock_extract.side_effect = [
            "Test Content",
            "<html><body><h1>Test</h1></body></html>",
        ]
        mock_embeddings.return_value = [[0.1, 0.2, 0.3]]

        from services.crawler.src.extraction import crawl

        await crawl(
            url=url,
            temp_dir=temp_dir,
            memory_store=mock_memory_store,
            session_key="test-session",
            raw_html=None,
        )

        mock_memory_store.set.assert_called()
        set_calls = mock_memory_store.set.call_args_list

        stored_visited_urls = None
        for call in set_calls:
            if call[0][0] == "test-session":
                stored_visited_urls = deserialize(call[0][1], list[str])
                break

        assert stored_visited_urls is not None, "Visited URLs should be stored"
        assert normalized_url in stored_visited_urls, (
            f"Normalized URL {normalized_url} should be in visited URLs: {stored_visited_urls}"
        )
