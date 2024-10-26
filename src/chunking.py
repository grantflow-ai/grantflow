from __future__ import annotations

import logging
from json import dumps
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

    logger.info("Extracting text from response: %s", dumps(extracted_data))

    if pages := extracted_data.get("pages"):
        paged_chunks: list[Chunk] = []

        for page in pages:
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

            paged_chunks.extend(
                Chunk(
                    content=chunk,
                    page_number=page["pageNumber"],
                )
                for chunk in chunker.chunks(contents)
            )

        return paged_chunks

    return [Chunk(content=chunk, page_number=0) for chunk in chunker.chunks(extracted_data["content"])]
