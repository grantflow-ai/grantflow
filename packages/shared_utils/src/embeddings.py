from asyncio import gather
from typing import Final

from sentence_transformers import SentenceTransformer

from packages.db.src.json_objects import Chunk
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.exceptions import ExternalOperationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.sync import run_sync

logger = get_logger(__name__)
embedding_model_ref = Ref[SentenceTransformer]()

EMBEDDING_MODEL_NAME: Final[str] = "sentence-transformers/all-MiniLM-L12-v2"
CHUNKS_BATCH_SIZE: Final[int] = 30


def get_embedding_model() -> SentenceTransformer:
    if embedding_model_ref.value is None:
        model = SentenceTransformer(EMBEDDING_MODEL_NAME, device="cpu")
        embedding_model_ref.value = model

    return embedding_model_ref.value


async def generate_embeddings(inputs: str | list[str]) -> list[list[float]]:
    if not isinstance(inputs, list):
        inputs = [inputs]

    model = await run_sync(get_embedding_model)

    return [[float(x) for x in embedding] for embedding in model.encode(inputs)]


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


async def index_chunks(
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
