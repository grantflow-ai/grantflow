from asyncio import gather
from typing import Final

from src.dto import VectorDTO
from src.indexer.chunking import logger
from src.indexer.dto import Chunk
from src.utils.embeddings import TaskType, generate_embeddings

CHUNKS_BATCH_SIZE: Final[int] = 30


async def create_vector_dto(
    *,
    chunk: Chunk,
) -> VectorDTO:
    """Process a single chunked element.

    Args:
        chunk: The chunked element.

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
        page_number=chunk["page_number"],
    )


async def index_documents(
    *,
    chunks: list[Chunk],
) -> list[VectorDTO]:
    """Create embeddings for the given chunks.

    Args:
        chunks: The list of chunks to index.

    Returns:
        The list of documents to index.
    """
    data: list[VectorDTO] = []
    for i in range(0, len(chunks), CHUNKS_BATCH_SIZE):
        results = await gather(
            *[
                create_vector_dto(
                    chunk=chunk,
                )
                for chunk in chunks[i : i + CHUNKS_BATCH_SIZE]
            ]
        )
        data.extend([result for result in results if result is not None])

    return data
