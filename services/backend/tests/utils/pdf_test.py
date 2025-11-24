from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from packages.shared_utils.src.exceptions import FileParsingError

from services.backend.src.utils.pdf import html_to_pdf


async def test_html_to_pdf_creates_pdf() -> None:
    html_content = """
   <h1>Complex Document</h1>
    <p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
    <ul>
        <li>List item 1</li>
        <li>List item 2</li>
    </ul>
    <ol>
        <li>Numbered item 1</li>
        <li>Numbered item 2</li>
    </ol>
    <table>
        <tr>
            <th>Header 1</th>
            <th>Header 2</th>
        </tr>
        <tr>
            <td>Data 1</td>
            <td>Data 2</td>
        </tr>
    </table>
    """

    result = await html_to_pdf(html_content)

    assert isinstance(result, bytes)
    assert len(result) > 0

    assert result.startswith(b"%PDF")


async def test_html_to_pdf_uses_default_template() -> None:
    html_content = "<p>Simple content</p>"

    mock_page = AsyncMock()
    mock_page.set_content = AsyncMock()
    mock_page.pdf = AsyncMock(return_value=b"%PDF-fake-content")

    mock_browser = AsyncMock()
    mock_browser.new_page = AsyncMock(return_value=mock_page)
    mock_browser.close = AsyncMock()

    mock_playwright = MagicMock()
    mock_playwright.chromium.launch = AsyncMock(return_value=mock_browser)

    with patch("services.backend.src.utils.pdf.async_playwright") as mock_pw:
        mock_pw.return_value.__aenter__.return_value = mock_playwright

        await html_to_pdf(html_content)

        mock_page.set_content.assert_called_once()
        call_args = mock_page.set_content.call_args[0][0]

        assert "<!DOCTYPE html>" in call_args
        assert "<html>" in call_args
        assert "<head>" in call_args
        assert "<title>Converted Document</title>" in call_args
        assert "<body>" in call_args
        assert html_content in call_args
        assert "</body>" in call_args
        assert "</html>" in call_args


async def test_html_to_pdf_uses_default_css() -> None:
    html_content = "<p>Test content</p>"

    mock_page = AsyncMock()
    mock_page.set_content = AsyncMock()
    mock_page.pdf = AsyncMock(return_value=b"%PDF-fake-content")

    mock_browser = AsyncMock()
    mock_browser.new_page = AsyncMock(return_value=mock_page)
    mock_browser.close = AsyncMock()

    mock_playwright = MagicMock()
    mock_playwright.chromium.launch = AsyncMock(return_value=mock_browser)

    with patch("services.backend.src.utils.pdf.async_playwright") as mock_pw:
        mock_pw.return_value.__aenter__.return_value = mock_playwright

        await html_to_pdf(html_content)

        mock_page.set_content.assert_called_once()
        call_args = mock_page.set_content.call_args[0][0]

        assert "<style>" in call_args
        assert "@page" in call_args
        assert "size: A4" in call_args
        assert "font-family: Arial" in call_args
        assert "h1, h2, h3" in call_args
        assert "table" in call_args


async def test_html_to_pdf_handles_memory_error() -> None:
    html_content = "<p>Test content</p>"

    mock_playwright = MagicMock()
    mock_playwright.chromium.launch = AsyncMock(side_effect=MemoryError("Out of memory"))

    with patch("services.backend.src.utils.pdf.async_playwright") as mock_pw:
        mock_pw.return_value.__aenter__.return_value = mock_playwright

        with pytest.raises(FileParsingError) as exc_info:
            await html_to_pdf(html_content)

        assert "Memory error in PDF conversion" in str(exc_info.value)
        assert "Out of memory" in str(exc_info.value)
        assert exc_info.value.context["error_type"] == "memory_error"


async def test_html_to_pdf_handles_edge_cases() -> None:
    edge_cases = [
        "",
        "<p></p>",
        "<h1></h1>",
        "<div>Simple text without closing tag",
        "<p>Text with <strong>bold</strong> and <em>italic</em></p>",
        "<ul><li>Single item</li></ul>",
        "<ol><li>Single numbered item</li></ol>",
        "<table><tr><td>Single cell</td></tr></table>",
    ]

    for html_content in edge_cases:
        result = await html_to_pdf(html_content)
        assert isinstance(result, bytes)
        assert len(result) > 0
        assert result.startswith(b"%PDF")


async def test_html_to_pdf_handles_playwright_errors() -> None:
    html_content = "<p>Test content</p>"

    mock_playwright = MagicMock()
    mock_playwright.chromium.launch = AsyncMock(side_effect=Exception("Playwright launch failed"))

    with patch("services.backend.src.utils.pdf.async_playwright") as mock_pw:
        mock_pw.return_value.__aenter__.return_value = mock_playwright

        with pytest.raises(FileParsingError) as exc_info:
            await html_to_pdf(html_content)

        assert "Failed to convert HTML to PDF" in str(exc_info.value)
        assert "Playwright launch failed" in str(exc_info.value)


async def test_html_to_pdf_calls_playwright_with_correct_format() -> None:
    html_content = "<p>Test content</p>"

    mock_page = AsyncMock()
    mock_page.set_content = AsyncMock()
    mock_page.pdf = AsyncMock(return_value=b"%PDF-fake-content")

    mock_browser = AsyncMock()
    mock_browser.new_page = AsyncMock(return_value=mock_page)
    mock_browser.close = AsyncMock()

    mock_playwright = MagicMock()
    mock_playwright.chromium.launch = AsyncMock(return_value=mock_browser)

    with patch("services.backend.src.utils.pdf.async_playwright") as mock_pw:
        mock_pw.return_value.__aenter__.return_value = mock_playwright

        result = await html_to_pdf(html_content)

        mock_page.pdf.assert_called_once_with(format="A4")
        assert result == b"%PDF-fake-content"
