from asyncio import Lock, gather
from os import getenv
from pathlib import Path
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
model_load_lock = Lock()

EMBEDDING_MODEL_NAME: Final[str] = "sentence-transformers/all-MiniLM-L12-v2"
CHUNKS_BATCH_SIZE: Final[int] = 30


def get_embedding_model() -> SentenceTransformer:
    import time

    if embedding_model_ref.value is None:
        start_time = time.time()
        model_dir = getenv("MODEL_DIR")

        logger.debug(
            "Initializing embedding model",
            model_dir=model_dir,
            model_name=EMBEDDING_MODEL_NAME,
        )

        if model_dir and Path(model_dir).exists():
            logger.debug("Loading model from local directory", model_dir=model_dir)
            model = SentenceTransformer(
                model_dir, device="cpu", trust_remote_code=False
            )
            model_source = "local_directory"
        else:
            logger.debug(
                "Loading model from default cache", model_name=EMBEDDING_MODEL_NAME
            )
            model = SentenceTransformer(
                EMBEDDING_MODEL_NAME, device="cpu", trust_remote_code=False
            )
            model_source = "default_cache"

        load_duration = time.time() - start_time
        embedding_model_ref.value = model

        logger.info(
            "Embedding model loaded successfully",
            model_name=EMBEDDING_MODEL_NAME,
            model_source=model_source,
            load_duration_ms=round(load_duration * 1000, 2),
            device="cpu",
        )
    else:
        logger.debug("Using cached embedding model")

    return embedding_model_ref.value


async def generate_embeddings(inputs: str | list[str]) -> list[list[float]]:
    import time

    start_time = time.time()
    if not isinstance(inputs, list):
        inputs = [inputs]

    logger.debug(
        "Starting embedding generation",
        input_count=len(inputs),
        total_text_length=sum(len(text) for text in inputs),
    )

    model_load_start = time.time()
    async with model_load_lock:
        model = await run_sync(get_embedding_model)
    model_load_duration = time.time() - model_load_start

    if model_load_duration > 0.001:
        logger.debug(
            "Model loading completed",
            model_load_duration_ms=round(model_load_duration * 1000, 2),
        )

    encoding_start = time.time()
    embeddings_raw = model.encode(inputs)
    encoding_duration = time.time() - encoding_start

    embeddings = [[float(x) for x in embedding] for embedding in embeddings_raw]

    total_duration = time.time() - start_time
    logger.debug(
        "Embedding generation completed",
        input_count=len(inputs),
        embedding_count=len(embeddings),
        embedding_dimension=len(embeddings[0]) if embeddings else 0,
        encoding_duration_ms=round(encoding_duration * 1000, 2),
        total_duration_ms=round(total_duration * 1000, 2),
    )

    return embeddings


async def create_vector_dto(
    *,
    chunk: Chunk,
    rag_source_id: str,
) -> VectorDTO:
    embedding = await generate_embeddings([chunk["content"]])

    if len(embedding) != 1:
        logger.error("Expected a single embedding to be generated for the content")
        raise ExternalOperationError(
            "Expected a single embedding to be generated for the content"
        )

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
    import time

    start_time = time.time()
    total_chunks = len(chunks)
    logger.debug(
        "Starting chunk indexing",
        chunk_count=total_chunks,
        batch_size=CHUNKS_BATCH_SIZE,
        source_id=source_id,
    )

    if not chunks:
        logger.warning("No chunks provided for indexing", source_id=source_id)
        return []

    data: list[VectorDTO] = []
    batch_count = (total_chunks + CHUNKS_BATCH_SIZE - 1) // CHUNKS_BATCH_SIZE

    for batch_idx, i in enumerate(range(0, len(chunks), CHUNKS_BATCH_SIZE)):
        batch_start = time.time()
        batch_chunks = chunks[i : i + CHUNKS_BATCH_SIZE]

        logger.debug(
            "Processing chunk batch",
            batch_index=batch_idx + 1,
            total_batches=batch_count,
            batch_size=len(batch_chunks),
            chunk_range=f"{i}-{i + len(batch_chunks) - 1}",
        )

        results = await gather(
            *[
                create_vector_dto(
                    chunk=chunk,
                    rag_source_id=source_id,
                )
                for chunk in batch_chunks
            ]
        )

        valid_results = [result for result in results if result is not None]
        data.extend(valid_results)

        batch_duration = time.time() - batch_start
        logger.debug(
            "Batch processing completed",
            batch_index=batch_idx + 1,
            processed_chunks=len(valid_results),
            batch_duration_ms=round(batch_duration * 1000, 2),
        )

    total_duration = time.time() - start_time
    logger.info(
        "Chunk indexing completed",
        source_id=source_id,
        total_chunks=total_chunks,
        total_vectors=len(data),
        total_batches=batch_count,
        total_duration_ms=round(total_duration * 1000, 2),
        avg_duration_per_chunk_ms=round((total_duration * 1000) / total_chunks, 2)
        if total_chunks > 0
        else 0,
    )

    return data
