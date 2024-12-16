from typing import Final

from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.indexer.dto import Chunk
from src.indexer.extraction import BoundingRegion, OCROutput
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


def chunk_ocr_output(extracted_data: OCROutput, splitter: MarkdownSplitter | TextSplitter) -> list[Chunk]:
    """Parse the OCR output and chunk the text into smaller pieces.

    Args:
        extracted_data: The extracted data from the file.
        splitter: The splitter to use for chunking the text.

    Returns:
        list[Chunk]: The list of chunks.
    """
    chunks: list[Chunk] = []
    for page in extracted_data.get("pages", []):
        page_number = page.get("pageNumber", None)
        if lines := page.get("lines"):
            contents = "\n".join([line["content"] for line in lines])
        else:
            words_with_breaks = []
            previous_offset = None

            for word in page["words"]:
                span = word["span"]
                if previous_offset is not None and span["offset"] > previous_offset:
                    # Add a line break if there's a gap between spans
                    words_with_breaks.append("\n")

                words_with_breaks.append(word["content"])
                previous_offset = span["offset"] + span["length"]

            contents = " ".join(words_with_breaks).replace(" \n ", "\n")

        chunks.extend(
            Chunk(content=chunk, page_number=page_number, element_type="page", index=0)
            for chunk in splitter.chunks(contents)
        )

    for table in extracted_data.get("tables", []):
        bounding_regions: list[BoundingRegion] = table.get("boundingRegions", [])
        page_numbers = list(
            filter(lambda x: x is not None, [region.get("pageNumber", None) for region in bounding_regions])
        )
        page_number = page_numbers[0] if page_numbers else None
        cells = table.get("cells", [])
        content_matrix: list[list[str]] = []

        for cell in cells:
            row = cell.get("rowIndex", 0)
            col = cell.get("columnIndex", 0)
            content = cell.get("content", "")

            while len(content_matrix) <= row:
                content_matrix.append([])

            while len(content_matrix[row]) <= col:
                content_matrix[row].append("")

            content_matrix[row][col] = content

        table_content = "\n".join("\t".join(cell for cell in row) for row in content_matrix)
        chunks.extend(
            Chunk(content=chunk, page_number=page_number, element_type="table", index=0)
            for chunk in splitter.chunks(table_content)
        )

    chunks = chunks or [
        Chunk(content=chunk, page_number=None, element_type=None, index=0)
        for chunk in splitter.chunks(extracted_data["content"])
    ]

    for index, chunk in enumerate(chunks):
        chunk["index"] = index

    return chunks


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
        Chunk(content=chunk, page_number=None, element_type=None, index=index)
        for index, chunk in enumerate(splitter.chunks(text))
    ]
