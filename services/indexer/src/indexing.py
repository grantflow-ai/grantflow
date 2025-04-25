from asyncio import gather
from typing import Final

from shared_utils.src.logger import get_logger

from db.src.json_objects import Chunk
from src.dto import VectorDTO
from src.exceptions import ExternalOperationError
from src.utils.embeddings import generate_embeddings

logger = get_logger(__name__)

CHUNKS_BATCH_SIZE: Final[int] = 30


async def create_vector_dto(
    *,
    chunk: Chunk,
    rag_file_id: str,
) -> VectorDTO:
    embedding = await generate_embeddings([chunk["content"]])

    if len(embedding) != 1:
        logger.error("Expected a single embedding to be generated for the content")
        raise ExternalOperationError("Expected a single embedding to be generated for the content")

    return VectorDTO(
        chunk=chunk,
        embedding=embedding[0],
        rag_file_id=rag_file_id,
    )


async def index_documents(
    *,
    chunks: list[Chunk],
    file_id: str,
) -> list[VectorDTO]:
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
