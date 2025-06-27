import time

from packages.shared_utils.src.chunking import chunk_text
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.embeddings import index_chunks
from packages.shared_utils.src.extraction import extract_file_content
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import serialize

logger = get_logger(__name__)


async def process_source(
    *,
    content: bytes,
    source_id: str,
    filename: str,
    mime_type: str,
) -> tuple[list[VectorDTO], str]:
    logger.debug("Starting text extraction", filename=filename, mime_type=mime_type, content_size=len(content))

    extraction_start = time.time()
    extracted_text, processed_mime_type = await extract_file_content(
        content=content,
        mime_type=mime_type,
    )
    extraction_duration = time.time() - extraction_start

    text_length = len(extracted_text) if isinstance(extracted_text, str) else len(str(extracted_text))
    logger.debug(
        "Text extraction completed",
        filename=filename,
        extraction_duration_ms=round(extraction_duration * 1000, 2),
        text_length=text_length,
        original_mime_type=mime_type,
        processed_mime_type=processed_mime_type,
    )

    chunking_start = time.time()
    chunks = chunk_text(text=extracted_text, mime_type=processed_mime_type)
    chunking_duration = time.time() - chunking_start

    logger.debug(
        "Text chunking completed",
        filename=filename,
        chunking_duration_ms=round(chunking_duration * 1000, 2),
        chunk_count=len(chunks),
        avg_chunk_size=round(sum(len(chunk["content"]) for chunk in chunks) / len(chunks)) if chunks else 0,
    )

    embedding_start = time.time()
    vectors = await index_chunks(
        chunks=chunks,
        source_id=source_id,
    )
    embedding_duration = time.time() - embedding_start

    logger.debug(
        "Embedding generation completed",
        source_id=source_id,
        embedding_duration_ms=round(embedding_duration * 1000, 2),
        vector_count=len(vectors),
    )

    text_content = extracted_text if isinstance(extracted_text, str) else serialize(extracted_text).decode()

    total_processing_time = extraction_duration + chunking_duration + embedding_duration
    logger.info(
        "Source processing completed",
        filename=filename,
        source_id=source_id,
        total_processing_ms=round(total_processing_time * 1000, 2),
        final_text_length=len(text_content),
        final_vector_count=len(vectors),
    )

    return vectors, text_content
