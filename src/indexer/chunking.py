from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Final

from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.indexer.dto import Chunk

if TYPE_CHECKING:
    from src.indexer.extraction import OCROutput

logger = logging.getLogger(__name__)

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


def chunk_text(*, extracted_data: bytes | OCROutput, mime_type: str) -> list[Chunk]:
    """Chunk the text into smaller pieces.

    Args:
        extracted_data: The extracted data from the file.
        mime_type: The MIME type of the text.

    Returns:
        list[Chunk]: The list of chunks.
    """
    splitter = get_splitter(mime_type)
    text = extracted_data.decode() if isinstance(extracted_data, bytes) else extracted_data["text"]
    return [
        Chunk(content=chunk, page_number=None, element_type=None, index=index)
        for index, chunk in enumerate(splitter.chunks(text))
    ]
