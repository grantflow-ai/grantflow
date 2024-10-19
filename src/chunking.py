from __future__ import annotations

import logging
from typing import Final

from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.dto import Chunk, OCROutput

logger = logging.getLogger(__name__)

MAX_CHARS: Final[int] = 2000


def chunk_text(*, extracted_data: bytes | OCROutput, mime_type: str) -> list[Chunk]:
    """Chunk the text into smaller pieces.

    Args:
        extracted_data: The extracted data from the file.
        mime_type: The MIME type of the text.

    Returns:
        list[str]: The list of chunks.
    """
    if mime_type == "text/markdown":
        chunker: MarkdownSplitter | TextSplitter = MarkdownSplitter(capacity=MAX_CHARS)
    else:
        chunker = TextSplitter(capacity=MAX_CHARS)

    if isinstance(extracted_data, bytes):
        return [
            Chunk(
                content=chunk,
                page_number=None,
            )
            for chunk in chunker.chunks(extracted_data.decode())
        ]

    paged_chunks: list[Chunk] = []

    for page in extracted_data["pages"]:
        line_contents = "\n".join([line["content"] for line in page["lines"]])
        paged_chunks.extend(
            Chunk(
                content=chunk,
                page_number=page["pageNumber"],
            )
            for chunk in chunker.chunks(line_contents)
        )

    return paged_chunks
