from collections.abc import Generator
from typing import Final

from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.indexer.dto import Chunk, OCROutput, Page, Paragraph, Position, Table, TableCell, TableContext
from src.utils.logging import get_logger

logger = get_logger(__name__)

MAX_CHARACTERS: Final[int] = 2000
OVERLAP_CHARACTERS: Final[int] = 200


def get_splitter(mime_type: str) -> MarkdownSplitter | TextSplitter:
    """Get the splitter based on the MIME type.

    Args:
        mime_type: The MIME type of the text.

    Returns:
        MarkdownSplitter | TextSplitter: The splitter to use.
    """
    if mime_type == "text/markdown":
        return MarkdownSplitter(MAX_CHARACTERS, OVERLAP_CHARACTERS)
    return TextSplitter(MAX_CHARACTERS, OVERLAP_CHARACTERS)


def chunk_text(*, text: str | OCROutput, mime_type: str) -> list[Chunk]:
    """Chunk the text into smaller pieces.

    Args:
        text: The extracted data from the file.
        mime_type: The MIME type of the text.

    Returns:
        list[Chunk]: The list of chunks.
    """
    splitter = get_splitter(mime_type)

    if isinstance(text, dict):
        return chunk_ocr_output(text, splitter)

    return [
        Chunk(
            content=chunk, position=None, element_type=None, index=index, parent_id=None, table_context=None, role=None
        )
        for index, chunk in enumerate(splitter.chunks(text))
    ]


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

        if previous_offset is not None and current_offset > previous_offset:
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
        Chunk: Generated chunks for the page
    """
    page_number = page.get("pageNumber")
    contents = extract_page_content(page)

    position = Position(page_number=page_number, bounding_regions=None, spans=None) if page_number is not None else None

    for text_chunk in splitter.chunks(contents):
        yield Chunk(
            content=text_chunk,
            index=-1,
            position=position,
            element_type="page",
            parent_id=None,
            table_context=None,
            role=None,
        )


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
        Chunk: Generated chunks for the table cell
    """
    position = Position(page_number=page_number, bounding_regions=cell.get("boundingRegions"), spans=cell.get("spans"))

    table_context = TableContext(
        row_index=cell.get("rowIndex"),
        column_index=cell.get("columnIndex"),
        row_span=cell.get("rowSpan"),
        column_span=cell.get("columnSpan"),
        table_dimensions=f"{table.get('rowCount')}x{table.get('columnCount')}",
    )

    for text_chunk in splitter.chunks(cell.get("content", "")):
        yield Chunk(
            content=text_chunk,
            index=-1,
            position=position,
            element_type="table_cell",
            parent_id=f"table_{table_idx}",
            table_context=table_context,
            role=cell.get("kind"),
        )


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
        Chunk: Generated chunks for the table
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
        Chunk: Generated chunks for the paragraph
    """
    bounding_regions = para.get("boundingRegions")
    position = Position(
        page_number=bounding_regions[0].get("pageNumber") if bounding_regions else None,
        bounding_regions=bounding_regions,
        spans=para.get("spans"),
    )

    for text_chunk in splitter.chunks(para.get("content", "")):
        yield Chunk(
            content=text_chunk,
            index=-1,
            position=position,
            element_type="paragraph",
            parent_id=f"para_{para_idx}",
            table_context=None,
            role=para.get("role"),
        )


def process_fallback_chunks(
    content: str,
    splitter: MarkdownSplitter | TextSplitter,
) -> Generator[Chunk, None, None]:
    """Process raw content when no structured elements are found.

    Args:
        content: Raw text content
        splitter: Text splitter instance

    Yields:
        Chunk: Generated chunks for the raw content
    """
    position = Position(page_number=None, bounding_regions=None, spans=None)

    for text_chunk in splitter.chunks(content):
        yield Chunk(
            content=text_chunk,
            index=-1,
            position=position,
            element_type="raw",
            parent_id=None,
            table_context=None,
            role=None,
        )


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
