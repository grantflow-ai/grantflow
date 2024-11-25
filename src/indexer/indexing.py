from __future__ import annotations

from asyncio import gather
from itertools import chain
from uuid import uuid4

from src.embeddings import generate_embeddings
from src.indexer.chunking import CHUNKS_BATCH_SIZE, logger
from src.indexer.dto import BlobFileMetadata, Chunk, SearchSchema
from src.utils.nlp import extract_keywords, extract_labels


async def process_chunk(
    *,
    chunk: Chunk,
    metadata: BlobFileMetadata,
) -> SearchSchema:
    """Process a single chunked element.

    Args:
        chunk: The chunked element.
        metadata: The metadata of the file.

    Returns:
        SearchSchema | None

    """
    logger.debug(
        "Preparing chunk for indexing with filename: %s and chunk_id: %s",
    )

    embeddings = await generate_embeddings(chunk["content"])
    keywords = extract_keywords(chunk["content"])
    labels = extract_labels(chunk["content"])

    return SearchSchema(
        application_id=metadata.application_id,
        content=chunk["content"],
        content_vector=list(chain(*embeddings)),
        element_type=chunk["element_type"],
        filename=metadata.filename,
        id=str(uuid4()),
        keywords=keywords,
        labels=labels,
        page_number=chunk["page_number"],
        section_name=metadata.section_name,
        workspace_id=metadata.workspace_id,
    )


async def index_documents(*, chunks: list[Chunk], metadata: BlobFileMetadata) -> list[SearchSchema]:
    """Create embeddings for the given chunks.

    Args:
        chunks: The chunks to create embeddings for.
        metadata: The metadata of the file.

    Returns:
        The list of documents to index.
    """
    documents_to_index: list[SearchSchema] = []

    for i in range(0, len(chunks), CHUNKS_BATCH_SIZE):
        results = await gather(
            *[
                process_chunk(
                    chunk=chunk,
                    metadata=metadata,
                )
                for chunk in chunks[i : i + CHUNKS_BATCH_SIZE]
            ]
        )
        documents_to_index.extend([result for result in results if result is not None])

    logger.info("Finishing parsing file: %s, with %d documents to upload", metadata.filename, len(documents_to_index))
    return documents_to_index
