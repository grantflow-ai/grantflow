from __future__ import annotations

from typing import Any, Final

from packages.shared_utils.src.exceptions import FileParsingError
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)

try:  # pragma: no cover - exercised indirectly in tests
    from weasyprint import CSS as _CSS
    from weasyprint import HTML as _HTML
    from weasyprint.text.fonts import FontConfiguration as _FontConfiguration
except Exception:  # pragma: no cover
    _CSS = None
    _HTML = None
    _FontConfiguration = None

CSS: Any | None = _CSS
HTML: Any | None = _HTML
FontConfiguration: Any | None = _FontConfiguration

DEFAULT_HTML_TEMPLATE: Final[str] = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Converted Document</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.4;
            margin: 0;
            padding: 0.5cm;
            color: #333;
        }}
        h1, h2, h3, h4, h5, h6 {{
            color: #2c3e50;
            margin-top: 0.8em;
            margin-bottom: 0.3em;
        }}
        h1 {{ font-size: 1.8em; }}
        h2 {{ font-size: 1.4em; }}
        h3 {{ font-size: 1.2em; }}
        p {{
            margin-bottom: 0.6em;
            text-align: left;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 0.5em 0;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 4px 6px;
            text-align: left;
        }}
        th {{
            background-color: #f8f8f8;
            font-weight: bold;
        }}
        img {{
            max-width: 100%;
            height: auto;
        }}
        .page-break {{
            page-break-before: always;
        }}
        ul, ol {{
            margin: 0.3em 0;
            padding-left: 1.5em;
        }}
        li {{
            margin-bottom: 0.2em;
        }}
    </style>
</head>
<body>
{html_content}
</body>
</html>
"""

DEFAULT_CSS: Final[str] = """
            @page {
                size: A4;
                margin: 1.5cm;
                @bottom-center {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 9pt;
                    color: #999;
                }
            }
            body {
                font-family: Arial, sans-serif;
                line-height: 1.4;
                color: #333;
                margin: 0;
                padding: 0.5cm;
            }
            h1, h2, h3, h4, h5, h6 {
                color: #2c3e50;
                margin-top: 0.8em;
                margin-bottom: 0.3em;
            }
            h1 { font-size: 1.8em; }
            h2 { font-size: 1.4em; }
            h3 { font-size: 1.2em; }
            p {
                margin-bottom: 0.6em;
                text-align: left;
            }
            table {
                border-collapse: collapse;
                width: 100%;
                margin: 0.5em 0;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 4px 6px;
                text-align: left;
            }
            th {
                background-color: #f8f8f8;
                font-weight: bold;
            }
            img {
                max-width: 100%;
                height: auto;
            }
            .page-break {
                page-break-before: always;
            }
            ul, ol {
                margin: 0.3em 0;
                padding-left: 1.5em;
            }
            li {
                margin-bottom: 0.2em;
            }
        """


def _ensure_weasyprint() -> tuple[Any, Any, Any]:
    """Import WeasyPrint lazily so test patches can override the classes."""
    global HTML, CSS, FontConfiguration  # noqa: PLW0603 - cache module-level references

    if HTML is None or CSS is None or FontConfiguration is None:
        try:
            import weasyprint  # noqa: PLC0415
            import weasyprint.text.fonts as weasy_fonts  # noqa: PLC0415
        except Exception as e:  # pragma: no cover
            logger.error("Failed to import WeasyPrint", error=str(e))
            raise FileParsingError("PDF conversion dependencies missing", context={"error": str(e)}) from e

        CSS = weasyprint.CSS
        HTML = weasyprint.HTML
        FontConfiguration = weasy_fonts.FontConfiguration

    return HTML, CSS, FontConfiguration


def is_weasyprint_runtime_available() -> bool:
    try:
        _, _, font_configuration_cls = _ensure_weasyprint()
        font_configuration_cls()
    except Exception:
        return False
    return True


async def html_to_pdf(html_content: str) -> bytes:
    try:
        html_cls, css_cls, font_configuration_cls = _ensure_weasyprint()

        html_content = DEFAULT_HTML_TEMPLATE.format(html_content=html_content)
        font_config = font_configuration_cls()
        css = css_cls(
            string=DEFAULT_CSS,
            font_config=font_config,
        )

        html_doc = html_cls(string=html_content)
        pdf_bytes: bytes = html_doc.write_pdf(stylesheets=[css], font_config=font_config)

        return pdf_bytes
    except (ImportError, OSError) as e:
        logger.error(
            "WeasyPrint dependencies missing for PDF conversion",
            error_type=type(e).__name__,
            error=str(e),
        )
        raise FileParsingError("PDF conversion dependencies missing", context={"error": str(e)}) from e
    except MemoryError as e:
        logger.error(
            "Memory error during PDF conversion",
            error_type=type(e).__name__,
            error=str(e),
        )
        raise FileParsingError(
            f"Memory error in PDF conversion: {e!s}", context={"error": str(e), "error_type": "memory_error"}
        ) from e
