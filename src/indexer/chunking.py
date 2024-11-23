from __future__ import annotations

import logging
from typing import Final

from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.indexer.dto import Chunk
from src.indexer.extraction import OCROutput

logger = logging.getLogger(__name__)

CHUNKS_BATCH_SIZE: Final[int] = 30
CHUNK_TOKENS: Final[int] = 700
OVERLAP_TOKENS: Final[int] = 100


def chunk_text(*, extracted_data: bytes | OCROutput, mime_type: str) -> list[Chunk]:
    """Chunk the text into smaller pieces.

    Args:
        extracted_data: The extracted data from the file.
        mime_type: The MIME type of the text.

    Returns:
        list[Chunk]: The list of chunks.
    """
    if mime_type == "text/markdown":
        splitter = MarkdownSplitter.from_tiktoken_model(model="gpt-4o", capacity=CHUNK_TOKENS, overlap=OVERLAP_TOKENS)
    else:
        splitter = TextSplitter.from_tiktoken_model(model="gpt-4o", capacity=CHUNK_TOKENS, overlap=OVERLAP_TOKENS)

    if isinstance(extracted_data, bytes):
        text = extracted_data.decode()
        return [Chunk(content=chunk, page_number=None) for chunk in splitter.chunks(text)]

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
            Chunk(content=chunk, page_number=page_number, element_type="page") for chunk in splitter.chunks(contents)
        )

    for table in extracted_data.get("tables", []):
        bounding_regions = table.get("boundingRegions", {})
        if isinstance(bounding_regions, list):
            bounding_regions = bounding_regions[0]

        page_number = bounding_regions.get("pageNumber", None) if bounding_regions else None
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
            Chunk(content=chunk, page_number=page_number, element_type="table")
            for chunk in splitter.chunks(table_content)
        )

    return chunks or [Chunk(content=extracted_data["content"], page_number=None, element_type=None)]
