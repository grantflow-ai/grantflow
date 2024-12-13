from asyncio import gather
from typing import Final

from src.indexer.chunking import logger
from src.indexer.db import upsert_application_vectors
from src.indexer.dto import Chunk, VectorDTO
from src.utils.embeddings import TaskType, generate_embeddings

CHUNKS_BATCH_SIZE: Final[int] = 30


async def create_vector_dto(
    *,
    chunk: Chunk,
    file_id: str,
) -> VectorDTO:
    """Process a single chunked element.

    Args:
        chunk: The chunked element.
        file_id: The ID of the file from which the chunk is derived.

    Returns:
        VectorDTO

    """
    logger.debug(
        "Preparing chunk for indexing with filename: %s and chunk_id: %s",
    )

    embedding = await generate_embeddings([chunk["content"]], task=TaskType.RetrievalDocument)

    return VectorDTO(
        chunk_index=chunk["index"],
        content=chunk["content"],
        element_type=chunk["element_type"],
        embedding=embedding,
        file_id=file_id,
        page_number=chunk["page_number"],
    )


async def index_documents(
    *,
    chunks: list[Chunk],
    file_id: str,
    application_id: str,
) -> None:
    """Create embeddings for the given chunks.

    Args:
        chunks: The list of chunks to index.
        file_id: The ID of the file from which the chunks are derived.
        application_id: The ID of the application the chunks belong to.

    Returns:
        The list of documents to index.
    """
    data: list[VectorDTO] = []
    for i in range(0, len(chunks), CHUNKS_BATCH_SIZE):
        results = await gather(
            *[
                create_vector_dto(
                    chunk=chunk,
                    file_id=file_id,
                )
                for chunk in chunks[i : i + CHUNKS_BATCH_SIZE]
            ]
        )
        data.extend([result for result in results if result is not None])

    await upsert_application_vectors(vectors=data, application_id=application_id)
    logger.info("Successfully indexed file_id: %s", file_id)
