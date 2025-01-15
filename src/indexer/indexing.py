from asyncio import gather
from typing import Final

from src.db.json_objects import Chunk
from src.dto import VectorDTO
from src.utils.embeddings import TaskType, generate_embeddings
from src.utils.logger import get_logger

logger = get_logger(__name__)

CHUNKS_BATCH_SIZE: Final[int] = 30


async def create_vector_dto(
    *,
    chunk: Chunk,
    rag_file_id: str,
) -> VectorDTO:
    """Process a single chunked element.

    Args:
        chunk: The chunked element.
        rag_file_id: The ID of the file from which the chunk is derived.

    Returns:
        VectorDTO

    """
    embedding = await generate_embeddings([chunk["content"]], task=TaskType.RetrievalDocument)

    return VectorDTO(
        chunk=chunk,
        embedding=embedding,
        rag_file_id=rag_file_id,
    )


async def index_documents(
    *,
    chunks: list[Chunk],
    file_id: str,
) -> list[VectorDTO]:
    """Create embeddings for the given chunks.

    Args:
        chunks: The list of chunks to index.
        file_id: The ID of the file from which the chunks are derived.

    Returns:
        The list of documents to index.
    """
    data: list[VectorDTO] = []
    for i in range(0, len(chunks), CHUNKS_BATCH_SIZE):
        results = await gather(
            *[
                create_vector_dto(
                    chunk=chunk,
                    rag_file_id=file_id,
                )
                for chunk in chunks[i : i + CHUNKS_BATCH_SIZE]
            ]
        )
        data.extend([result for result in results if result is not None])
    return data
