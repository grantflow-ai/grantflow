from __future__ import annotations

import logging
from asyncio import gather
from hashlib import sha256
from typing import Final
from uuid import uuid4

from semantic_text_splitter import MarkdownSplitter, TextSplitter

from src.embeddings import generate_embeddings
from src.indexer.dto import Chunk, OCROutput, SearchSchema

logger = logging.getLogger(__name__)

CHUNKS_BATCH_SIZE: Final[int] = 30
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


def compute_hash(*, chunk: Chunk, workspace_id: str, filename: str) -> str:
    """Compute the hash for the chunk content and metadata.

    Args:
        chunk: The chunked element.
        workspace_id: The workspace ID.
        filename: The file ID of the file.

    Returns:
        str: Hash of the content.
    """
    value = chunk["content"] + workspace_id + filename
    return sha256(value.encode()).hexdigest()


async def process_chunk(
    *,
    chunk: Chunk,
    filename: str,
    parent_id: str,
    workspace_id: str,
) -> SearchSchema:
    """Process a single chunked element.

    Args:
        chunk: The chunked element.
        filename: The file ID of the file.
        parent_id: The ID of the parent element.
        workspace_id: The ID of the workspace.

    Returns:
        SearchSchema | None

    """
    content_hash = compute_hash(chunk=chunk, workspace_id=workspace_id, filename=filename)

    logger.debug(
        "Preparing chunk for indexing with filename: %s and chunk_id: %s",
    )
    embeddings = await generate_embeddings(
        text=chunk["content"],
    )
    return SearchSchema(
        id=str(uuid4()),
        content=chunk["content"],
        content_hash=content_hash,
        content_vector=embeddings,
        filename=filename,
        page_number=chunk["page_number"],
        parent_id=parent_id,
        workspace_id=workspace_id,
    )


async def create_embeddings(
    *, chunks: list[Chunk], filename: str, parent_id: str, workspace_id: str
) -> list[SearchSchema]:
    """Create embeddings for the given chunks.

    Args:
        chunks: The chunks to create embeddings for.
        filename: The name of the file from which the chunks were extracted.
        parent_id: The ID of the parent element.
        workspace_id: The ID of the workspace.

    Returns:
        The list of documents to index.
    """
    documents_to_index: list[SearchSchema] = []

    for i in range(0, len(chunks), CHUNKS_BATCH_SIZE):
        results = await gather(
            *[
                process_chunk(
                    chunk=chunk,
                    filename=filename,
                    workspace_id=workspace_id,
                    parent_id=parent_id,
                )
                for chunk in chunks[i : i + CHUNKS_BATCH_SIZE]
            ]
        )
        documents_to_index.extend([result for result in results if result is not None])

    logger.info("Finishing parsing file: %s, with %d documents to upload", filename, len(documents_to_index))
    return documents_to_index
