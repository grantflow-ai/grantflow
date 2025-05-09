from asyncio import gather
from typing import Final

from packages.db.src.json_objects import Chunk
from packages.shared_utils.src.embeddings import generate_embeddings
from packages.shared_utils.src.exceptions import ExternalOperationError
from packages.shared_utils.src.logger import get_logger
from services.indexer.src.dto import VectorDTO

logger = get_logger(__name__)

CHUNKS_BATCH_SIZE: Final[int] = 30


async def create_vector_dto(
    *,
    chunk: Chunk,
    rag_source_id: str,
) -> VectorDTO:
    embedding = await generate_embeddings([chunk["content"]])

    if len(embedding) != 1:
        logger.error("Expected a single embedding to be generated for the content")
        raise ExternalOperationError("Expected a single embedding to be generated for the content")

    return VectorDTO(
        chunk=chunk,
        embedding=embedding[0],
        rag_source_id=rag_source_id,
    )


async def index_documents(
    *,
    chunks: list[Chunk],
    source_id: str,
) -> list[VectorDTO]:
    data: list[VectorDTO] = []
    for i in range(0, len(chunks), CHUNKS_BATCH_SIZE):
        results = await gather(
            *[
                create_vector_dto(
                    chunk=chunk,
                    rag_source_id=source_id,
                )
                for chunk in chunks[i : i + CHUNKS_BATCH_SIZE]
            ]
        )
        data.extend([result for result in results if result is not None])
    return data
