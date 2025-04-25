from collections.abc import Generator
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

import pytest
from azure.core.exceptions import HttpResponseError
from packages.shared_utils.src.exceptions import FileParsingError, ValidationError
from services.indexer.src.extraction import (
    extract_file_content,
    extract_webpage_content,
    extract_with_azure_document_intelligence,
)
from tenacity import RetryError, wait_none
from testing import TEST_DATA_SOURCES


@pytest.fixture
def mock_document_intelligence_client() -> Generator[AsyncMock, None, None]:
    with patch("src.utils.extraction.DocumentIntelligenceClient") as mock_client:
        instance = AsyncMock()
        mock_client.return_value = instance
        mock_poller = AsyncMock()
        instance.begin_analyze_document.return_value = mock_poller
        mock_result = Mock()
        mock_result.as_dict.return_value = {"content": "mocked content"}
        mock_poller.result.return_value = mock_result
        yield instance


@pytest.fixture
def mock_web_crawler() -> Generator[AsyncMock, None, None]:
    with patch("src.utils.extraction.AsyncWebCrawler") as mock_crawler:
        instance = AsyncMock()
        mock_crawler.return_value.__aenter__.return_value = instance
        instance.arun.return_value.markdown = "mocked markdown"
        yield instance


async def test_extract_plain_text() -> None:
    content = b"Hello, World!"
    mime_type = "text/plain"

    result, output_mime_type = await extract_file_content(content=content, mime_type=mime_type)

    assert isinstance(result, str)
    assert result == "Hello, World!"
    assert output_mime_type == mime_type


async def test_extract_markdown() -> None:
    content = b"# Hello\n\nWorld!"
    mime_type = "text/markdown"

    result, output_mime_type = await extract_file_content(content=content, mime_type=mime_type)

    assert isinstance(result, str)
    assert result == "# Hello\n\nWorld!"
    assert output_mime_type == mime_type


async def test_extract_csv() -> None:
    content = b"a,b,c\n1,2,3"
    mime_type = "text/csv"

    result, output_mime_type = await extract_file_content(content=content, mime_type=mime_type)

    assert isinstance(result, str)
    assert "a" in result
    assert "b" in result
    assert "c" in result
    assert output_mime_type == "text/markdown"


async def test_extract_pdf_with_azure(mock_document_intelligence_client: AsyncMock) -> None:
    content = b"PDF content"
    mime_type = "application/pdf"

    result, output_mime_type = await extract_file_content(content=content, mime_type=mime_type, use_azure=True)

    assert isinstance(result, dict)
    assert result["content"] == "mocked content"
    assert output_mime_type == "text/markdown"
    mock_document_intelligence_client.begin_analyze_document.assert_called_once()
    mock_document_intelligence_client.close.assert_called_once()


async def test_extract_docx_with_azure(mock_document_intelligence_client: AsyncMock) -> None:
    content = b"DOCX content"
    mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    result, output_mime_type = await extract_file_content(content=content, mime_type=mime_type, use_azure=True)

    assert isinstance(result, dict)
    assert result["content"] == "mocked content"
    assert output_mime_type == "text/markdown"
    mock_document_intelligence_client.begin_analyze_document.assert_called_once()
    mock_document_intelligence_client.close.assert_called_once()


@pytest.mark.parametrize("document", TEST_DATA_SOURCES)
async def test_extract_with_kreuzberg(document: Path) -> None:
    content = document.read_bytes()
    mime_type = (
        "application/pdf"
        if document.suffix == ".pdf"
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

    result, output_mime_type = await extract_file_content(content=content, mime_type=mime_type)

    assert isinstance(result, str)
    assert output_mime_type == "text/markdown" if mime_type != "application/pdf" else "text/plain"


async def test_extract_with_azure_error(mock_document_intelligence_client: AsyncMock) -> None:
    mock_document_intelligence_client.begin_analyze_document.side_effect = HttpResponseError(message="API Error")

    with pytest.raises(FileParsingError):
        await extract_with_azure_document_intelligence(b"content", "application/pdf")


async def test_extract_unsupported_mime_type() -> None:
    content = b"Some content"
    mime_type = "application/unsupported"

    with pytest.raises(ValidationError):
        await extract_file_content(content=content, mime_type=mime_type)


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
