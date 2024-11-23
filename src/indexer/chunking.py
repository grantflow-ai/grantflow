from __future__ import annotations

import logging
from typing import Final

from semantic_text_splitter import MarkdownSplitter, TextSplitter
from tokenizers import Tokenizer

from src.embeddings import EMBEDDING_MODEL
from src.indexer.dto import Chunk, OCROutput
from src.utils.ref import Ref

logger = logging.getLogger(__name__)

CHUNKS_BATCH_SIZE: Final[int] = 30
CHUNK_TOKENS: Final[int] = 700
OVERLAP_TOKENS: Final[int] = 100

ref = Ref[Tokenizer]()


def get_tokenizer() -> Tokenizer:
    """Get the Hugging Face tokenizer. Initializing it if it is not already loaded."""
    if ref.value is None:
        ref.value = Tokenizer.from_pretrained(EMBEDDING_MODEL)
    return ref.value


def chunk_text(*, extracted_data: bytes | OCROutput, mime_type: str) -> list[Chunk]:
    """Chunk the text into smaller pieces.

    Args:
        extracted_data: The extracted data from the file.
        mime_type: The MIME type of the text.

    Returns:
        list[Chunk]: The list of chunks.
    """
    if mime_type == "text/markdown":
        splitter = MarkdownSplitter.from_huggingface_tokenizer(
            tokenizer=get_tokenizer(), capacity=CHUNK_TOKENS, overlap=OVERLAP_TOKENS
        )
    else:
        splitter = TextSplitter.from_huggingface_tokenizer(
            tokenizer=get_tokenizer(), capacity=CHUNK_TOKENS, overlap=OVERLAP_TOKENS
        )

    if isinstance(extracted_data, bytes):
        text = extracted_data.decode()
        chunks = splitter.chunks(text)
        return [Chunk(content=chunk, page_number=None) for chunk in chunks]

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

            chunks = splitter.chunks(contents)
            paged_chunks.extend(Chunk(content=chunk, page_number=page["pageNumber"]) for chunk in chunks)

        return paged_chunks

    text = extracted_data["content"]
    chunks = splitter.chunks(text)
    return [Chunk(content=chunk, page_number=0) for chunk in chunks]
