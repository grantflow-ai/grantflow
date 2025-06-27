from typing import TYPE_CHECKING, Final, cast

from semantic_text_splitter import MarkdownSplitter, TextSplitter

from packages.shared_utils.src.logger import get_logger

if TYPE_CHECKING:
    from packages.db.src.json_objects import Chunk

logger = get_logger(__name__)

MAX_CHARACTERS: Final[int] = 2000
OVERLAP_CHARACTERS: Final[int] = 200


def get_splitter(mime_type: str) -> MarkdownSplitter | TextSplitter:
    logger.debug(
        "Selecting text splitter",
        mime_type=mime_type,
        max_chars=MAX_CHARACTERS,
        overlap_chars=OVERLAP_CHARACTERS,
    )

    if mime_type == "text/markdown":
        logger.debug("Using MarkdownSplitter for markdown content")
        return MarkdownSplitter(MAX_CHARACTERS, OVERLAP_CHARACTERS)

    logger.debug("Using TextSplitter for non-markdown content")
    return TextSplitter(MAX_CHARACTERS, OVERLAP_CHARACTERS)


def chunk_text(*, text: str, mime_type: str) -> list["Chunk"]:
    import time

    start_time = time.time()
    text_length = len(text)
    logger.debug("Starting text chunking", text_length=text_length, mime_type=mime_type)

    splitter = get_splitter(mime_type)

    chunks_raw = list(splitter.chunks(text))
    chunking_duration = time.time() - start_time

    chunks = [
        cast("Chunk", {"content": chunk}) for index, chunk in enumerate(chunks_raw)
    ]

    chunk_sizes = [len(chunk["content"]) for chunk in chunks]
    avg_chunk_size = round(sum(chunk_sizes) / len(chunk_sizes)) if chunk_sizes else 0
    min_chunk_size = min(chunk_sizes) if chunk_sizes else 0
    max_chunk_size = max(chunk_sizes) if chunk_sizes else 0

    logger.debug(
        "Text chunking completed",
        text_length=text_length,
        chunk_count=len(chunks),
        chunking_duration_ms=round(chunking_duration * 1000, 2),
        avg_chunk_size=avg_chunk_size,
        min_chunk_size=min_chunk_size,
        max_chunk_size=max_chunk_size,
        splitter_type="MarkdownSplitter"
        if mime_type == "text/markdown"
        else "TextSplitter",
    )

    return chunks
