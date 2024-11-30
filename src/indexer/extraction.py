from __future__ import annotations

import logging
from mimetypes import guess_type
from tempfile import NamedTemporaryFile
from typing import Final, cast

from charset_normalizer import detect
from pymupdf4llm.helpers.pymupdf_rag import to_markdown
from pypandoc import convert_text

from src.utils.exceptions import ValidationError
from src.utils.sync import as_async_callable

logger = logging.getLogger(__name__)

MARKDOWN_MIME_TYPE: Final[str] = "text/markdown"
PDF_MIMETYPE: Final[str] = "application/pdf"
PLAIN_TEXT_MIMETYPES: set[str] = {
    MARKDOWN_MIME_TYPE,
    "text/plain",
}
PANDOC_MIMETYPES = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/csv",
    "application/csv",
    "text/x-csv",
    "application/x-csv",
    "text/tab-separated-values",
    "text/x-tsv",
    "application/rtf",
    "text/rtf",
    "application/x-rtf",
    "text/x-rst",
    "text/rst",
    "application/vnd.oasis.opendocument.text",
    "application/x-vnd.oasis.opendocument.text",
    "application/x-latex",
    "text/x-latex",
    "application/latex",
    "text/latex",
}

MIME_TYPE_EXT_MAP = {
    "application/csv": "csv",
    "application/latex": "latex",
    "application/rtf": "rtf",
    "application/vnd.oasis.opendocument.text": "odt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/x-csv": "csv",
    "application/x-latex": "latex",
    "application/x-rtf": "rtf",
    "application/x-vnd.oasis.opendocument.text": "odt",
    "text/csv": "csv",
    "text/latex": "latex",
    "text/rst": "rst",
    "text/rtf": "rtf",
    "text/tab-separated-values": "tsv",
    "text/x-csv": "csv",
    "text/x-latex": "latex",
    "text/x-rst": "rst",
    "text/x-tsv": "tsv",
}

pandoc_handler = as_async_callable(convert_text)
pdf_handler = as_async_callable(to_markdown)


async def extract_with_pandoc(file_data: bytes, mime_type: str) -> str:
    """Extract text using pandoc.

    Args:
        file_data: The content of the file.
        mime_type: The mime type of the file.

    Returns:
        The extracted text.
    """
    ext = MIME_TYPE_EXT_MAP[mime_type]
    encoding = detect(file_data)["encoding"] or "utf-8"

    return cast(str, await pandoc_handler(file_data, to="md", format=ext, encoding=encoding))


async def extract_pdf(file_data: bytes) -> str:
    """Extract text from a PDF file.

    Args:
        file_data: The content of the file.

    Returns:
        The extracted text.
    """
    with NamedTemporaryFile(suffix=".pdf", delete=False, mode="wb+") as temp_file:
        temp_file.write(file_data)
        temp_file.flush()
        return cast(str, await pdf_handler(temp_file.name, show_progress=False))


async def parse_file_data(
    *,
    file_data: bytes,
    filename: str,
) -> tuple[str, str]:
    """Extract the contents of a file.

    Args:
        file_data: The contents of the file.
        filename: The name of the file.

    Raises:
        ValidationError: If the mime type is not supported.

    Returns:
        A tuple composed of the extracted text and mime_type.
    """
    if mime_type := guess_type(filename)[0]:
        if mime_type in PLAIN_TEXT_MIMETYPES or any(mime_type.startswith(value) for value in PLAIN_TEXT_MIMETYPES):
            return file_data.decode(), mime_type

        if mime_type in PANDOC_MIMETYPES:
            return await extract_with_pandoc(file_data, mime_type), MARKDOWN_MIME_TYPE

        if mime_type == PDF_MIMETYPE:
            return await extract_pdf(file_data), MARKDOWN_MIME_TYPE

    raise ValidationError(f"Unsupported mime type for file extraction: {mime_type}")
