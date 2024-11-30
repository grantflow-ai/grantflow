from __future__ import annotations

import logging
from typing import Final

from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.indexer.dto import Chunk

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


def chunk_text(*, text: str, mime_type: str) -> list[Chunk]:
    """Chunk the text into smaller pieces.

    Args:
        text: The extracted data from the file.
        mime_type: The MIME type of the text.

    Returns:
        list[Chunk]: The list of chunks.
    """
    splitter = get_splitter(mime_type)
    return [
        Chunk(content=chunk, page_number=None, element_type=None, index=index)
        for index, chunk in enumerate(splitter.chunks(text))
    ]
