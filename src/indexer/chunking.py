"""Module for chunking document content from Azure Document Intelligence output."""

from collections.abc import Mapping
from itertools import chain
from typing import Final

from azure.ai.documentintelligence.models import (
    AnalyzeResult,
    DocumentPage,
)
from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.db.json_objects import Chunk
from src.utils.logger import get_logger

logger = get_logger(__name__)

MAX_CHARACTERS: Final[int] = 2000
OVERLAP_CHARACTERS: Final[int] = 200


def get_splitter(mime_type: str) -> MarkdownSplitter | TextSplitter:
    """Get the appropriate text splitter based on the MIME type.

    Args:
        mime_type: The MIME type of the text.

    Returns:
        The splitter to use.
    """
    if mime_type == "text/markdown":
        return MarkdownSplitter(MAX_CHARACTERS, OVERLAP_CHARACTERS)
    return TextSplitter(MAX_CHARACTERS, OVERLAP_CHARACTERS)


def extract_page_content(page: DocumentPage) -> str:
    """Extract content from a page, handling both lines and words.

    Args:
        page: Page object from OCR output

    Returns:
        Extracted text content with preserved line breaks
    """
    if lines := page.get("lines"):
        return "\n".join(line["content"] for line in lines)

    words_with_breaks: list[str] = []
    previous_offset: int | None = None

    for word in page.get("words") or []:
        span = word.get("span") or {}
        current_offset = span.get("offset", 0)

        if previous_offset is not None and current_offset > previous_offset + 10:
            words_with_breaks.append("\n")

        words_with_breaks.append(word["content"])
        previous_offset = current_offset + (span.get("length") or 0)

    return " ".join(words_with_breaks).replace(" \n ", "\n")


def process_page_chunks(
    page: DocumentPage,
    splitter: MarkdownSplitter | TextSplitter,
) -> list[Chunk]:
    """Process a page into chunks.

    Args:
        page: Page object from OCR output
        splitter: Text splitter instance

    Returns:
        List of chunks with preserved context
    """
    contents = extract_page_content(page)

    chunks = []
    for text_chunk in splitter.chunks(contents):
        chunk: Chunk = {"content": text_chunk}
        if page_number := page.get("pageNumber"):
            chunk["page_number"] = page_number

        chunks.append(chunk)

    return chunks


def chunk_text(*, text: str | AnalyzeResult, mime_type: str) -> list[Chunk]:
    """Chunk the text into smaller pieces.

    Args:
        text: The extracted data from the file.
        mime_type: The MIME type of the text.

    Returns:
        The list of chunks.
    """
    splitter = get_splitter(mime_type)

    if isinstance(text, (Mapping | dict)):
        return chunk_ocr_output(text, splitter)

    return [Chunk(content=chunk) for index, chunk in enumerate(splitter.chunks(text))]


def chunk_ocr_output(
    extracted_data: AnalyzeResult,
    splitter: MarkdownSplitter | TextSplitter,
) -> list[Chunk]:
    """Parse the OCR output and chunk the text into smaller pieces with preserved context.

    Args:
        extracted_data: The extracted data from the file
        splitter: The splitter to use for chunking the text

    Returns:
        List of enriched chunks with semantic context
    """
    chunks: list[Chunk] = list(
        chain(*[process_page_chunks(page, splitter) for page in extracted_data.get("pages", [])])
    )

    if not chunks and "content" in extracted_data:
        chunks = [Chunk(content=text_chunk) for text_chunk in splitter.chunks(extracted_data["content"])]

    return chunks
