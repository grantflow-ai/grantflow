from unittest.mock import MagicMock, patch

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

    with patch("services.backend.src.utils.pdf.HTML") as mock_html_class:
        mock_html = MagicMock()
        mock_html_class.return_value = mock_html
        mock_html.write_pdf.return_value = b"fake_pdf_content"

        await html_to_pdf(html_content)

        mock_html_class.assert_called_once()
        call_args = mock_html_class.call_args[1]["string"]

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

    with patch("services.backend.src.utils.pdf.CSS") as mock_css_class:
        mock_css = MagicMock()
        mock_css_class.return_value = mock_css

        with patch("services.backend.src.utils.pdf.HTML") as mock_html_class:
            mock_html = MagicMock()
            mock_html_class.return_value = mock_html
            mock_html.write_pdf.return_value = b"fake_pdf_content"

            await html_to_pdf(html_content)

            mock_css_class.assert_called_once()
            call_args = mock_css_class.call_args[1]

            assert "string" in call_args
            css_content = call_args["string"]
            assert "@page" in css_content
            assert "size: A4" in css_content
            assert "font-family: Arial" in css_content
            assert "h1, h2, h3" in css_content
            assert "table" in css_content


async def test_html_to_pdf_handles_memory_error() -> None:
    html_content = "<p>Test content</p>"

    with patch("services.backend.src.utils.pdf.HTML") as mock_html_class:
        mock_html = MagicMock()
        mock_html_class.return_value = mock_html
        mock_html.write_pdf.side_effect = MemoryError("Out of memory")

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
