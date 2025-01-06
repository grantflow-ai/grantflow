"""Module for chunking document content from Azure Document Intelligence output."""

import hashlib
from collections.abc import Generator
from typing import Final

from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.dto import Chunk, TableContext
from src.utils.extraction import Formula, OCROutput, Page, Paragraph, Table, TableCell
from src.utils.logging import get_logger

logger = get_logger(__name__)

MAX_CHARACTERS: Final[int] = 2000
OVERLAP_CHARACTERS: Final[int] = 200


def compute_hash(content: str) -> str:
    """Compute a hash of the content for deduplication.

    Args:
        content: The text content to hash

    Returns:
        str: Hash string of the content
    """
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


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


def extract_page_content(page: Page) -> str:
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
    page: Page,
    splitter: MarkdownSplitter | TextSplitter,
) -> Generator[Chunk, None, None]:
    """Process a page into chunks.

    Args:
        page: Page object from OCR output
        splitter: Text splitter instance

    Yields:
        Chunk: for the page
    """
    page_number = page.get("pageNumber")
    languages = page.get("languages", [])
    language_codes = [lang["locale"] for lang in languages if "locale" in lang] if languages else []
    contents = extract_page_content(page)

    for text_chunk in splitter.chunks(contents):
        chunk: Chunk = {
            "content": text_chunk,
            "content_hash": compute_hash(text_chunk),
            "index": -1,
            "element_type": "page",
            "languages": language_codes,
        }
        if page_number is not None:
            chunk["page_number"] = page_number

        yield chunk

    for formula_idx, formula in enumerate(page.get("formulas", [])):
        yield from process_formula_chunks(formula, formula_idx, splitter, page_number)


def process_table_cell(
    cell: TableCell,
    table_idx: int,
    table: Table,
    page_number: int | None,
    splitter: MarkdownSplitter | TextSplitter,
) -> Generator[Chunk, None, None]:
    """Process a table cell into chunks.

    Args:
        cell: Table cell object
        table_idx: Index of the parent table
        table: Parent table object
        page_number: Page number where the table appears
        splitter: Text splitter instance

    Yields:
        Chunk: for the table cell
    """
    table_context = TableContext(
        row_index=cell.get("rowIndex"),
        column_index=cell.get("columnIndex"),
        table_dimensions=f"{table.get('rowCount')}x{table.get('columnCount')}",
    )

    for text_chunk in splitter.chunks(cell.get("content", "")):
        chunk: Chunk = {
            "content": text_chunk,
            "content_hash": compute_hash(text_chunk),
            "index": -1,
            "element_type": "table_cell",
            "parent": f"table_{table_idx}",
            "table_context": table_context,
        }
        if page_number is not None:
            chunk["page_number"] = page_number
        if cell.get("kind"):
            chunk["role"] = cell["kind"]

        yield chunk


def process_table_chunks(
    table: Table,
    table_idx: int,
    splitter: MarkdownSplitter | TextSplitter,
) -> Generator[Chunk, None, None]:
    """Process a table into chunks.

    Args:
        table: Table object from OCR output
        table_idx: Index of the table in document order
        splitter: Text splitter instance

    Yields:
        Chunk: for the table
    """
    bounding_regions = table.get("boundingRegions") or []
    page_numbers = [region.get("pageNumber") for region in bounding_regions if region.get("pageNumber") is not None]
    page_number = page_numbers[0] if page_numbers else None

    for cell in table.get("cells") or []:
        yield from process_table_cell(cell, table_idx, table, page_number, splitter)


def process_paragraph_chunks(
    para: Paragraph,
    para_idx: int,
    splitter: MarkdownSplitter | TextSplitter,
) -> Generator[Chunk, None, None]:
    """Process a paragraph into chunks.

    Args:
        para: Paragraph object from OCR output
        para_idx: Index of the paragraph in document order
        splitter: Text splitter instance

    Yields:
        Chunk: for the paragraph
    """
    page_number = None
    if bounding_regions := para.get("boundingRegions"):
        page_number = next(
            (region.get("pageNumber") for region in bounding_regions if region.get("pageNumber") is not None), None
        )

    for text_chunk in splitter.chunks(para.get("content", "")):
        chunk: Chunk = {
            "content": text_chunk,
            "content_hash": compute_hash(text_chunk),
            "index": -1,
            "element_type": "paragraph",
            "parent": f"para_{para_idx}",
        }
        if page_number is not None:
            chunk["page_number"] = page_number
        if para.get("role"):
            chunk["role"] = para["role"]

        yield chunk


def process_formula_chunks(
    formula: Formula,
    formula_idx: int,
    splitter: MarkdownSplitter | TextSplitter,
    page_number: int | None,
) -> Generator[Chunk, None, None]:
    """Process a formula into chunks.

    Args:
        formula: Formula object from OCR output
        formula_idx: Index of the formula in document order
        splitter: Text splitter instance
        page_number: Page number where the formula appears

    Yields:
        Chunk: for the formula
    """
    for text_chunk in splitter.chunks(formula.get("value", "")):
        chunk: Chunk = {
            "content": text_chunk,
            "content_hash": compute_hash(text_chunk),
            "index": -1,
            "element_type": "formula",
            "parent": f"formula_{formula_idx}",
        }
        if page_number is not None:
            chunk["page_number"] = page_number
        if formula.get("kind"):
            chunk["role"] = formula["kind"]
        if formula.get("confidence"):
            chunk["confidence"] = formula["confidence"]

        yield chunk


def process_fallback_chunks(
    content: str,
    splitter: MarkdownSplitter | TextSplitter,
) -> Generator[Chunk, None, None]:
    """Process raw content when no structured elements are found.

    Args:
        content: Raw text content
        splitter: Text splitter instance

    Yields:
        Chunk: for the raw content
    """
    for text_chunk in splitter.chunks(content):
        yield Chunk(
            content=text_chunk,
            content_hash=compute_hash(text_chunk),
            index=-1,
            element_type="raw",
        )


def chunk_text(*, text: str | OCROutput, mime_type: str) -> list[Chunk]:
    """Chunk the text into smaller pieces.

    Args:
        text: The extracted data from the file.
        mime_type: The MIME type of the text.

    Returns:
        The list of chunks.
    """
    splitter = get_splitter(mime_type)

    if isinstance(text, dict):
        return chunk_ocr_output(text, splitter)

    return [
        Chunk(
            content=chunk,
            content_hash=compute_hash(chunk),
            index=index,
            element_type="raw",
        )
        for index, chunk in enumerate(splitter.chunks(text))
    ]


def chunk_ocr_output(
    extracted_data: OCROutput,
    splitter: MarkdownSplitter | TextSplitter,
) -> list[Chunk]:
    """Parse the OCR output and chunk the text into smaller pieces with preserved context.

    Args:
        extracted_data: The extracted data from the file
        splitter: The splitter to use for chunking the text

    Returns:
        List of enriched chunks with semantic context
    """
    chunks: list[Chunk] = []

    for page in extracted_data.get("pages", []):
        chunks.extend(process_page_chunks(page, splitter))

    for table_idx, table in enumerate(extracted_data.get("tables", [])):
        chunks.extend(process_table_chunks(table, table_idx, splitter))

    for para_idx, para in enumerate(extracted_data.get("paragraphs", [])):
        chunks.extend(process_paragraph_chunks(para, para_idx, splitter))

    if not chunks and "content" in extracted_data:
        chunks.extend(process_fallback_chunks(extracted_data["content"], splitter))

    for idx, chunk in enumerate(chunks):
        chunk["index"] = idx

    return chunks
