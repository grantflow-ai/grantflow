import asyncio
import time
from typing import cast

from kreuzberg import extract_bytes
from packages.db.src.json_objects import Chunk
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.embeddings import index_chunks
from packages.shared_utils.src.extraction import (
    DocumentMetadata,
    enrich_metadata_with_entities_keywords,
    get_scientific_extraction_config,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.scientific_analysis import ScientificAnalysisResult, analyze_scientific_content
from packages.shared_utils.src.serialization import serialize

logger = get_logger(__name__)


async def process_source(
    *,
    content: bytes,
    source_id: str,
    filename: str,
    mime_type: str,
    model_name: str | None = None,
    enable_token_reduction: bool = False,
    language_hint: str = "en",
    enable_scientific_analysis: bool = True,
) -> tuple[list[VectorDTO], str, DocumentMetadata, ScientificAnalysisResult | None]:
    logger.debug(
        "Starting optimized scientific document processing",
        filename=filename,
        mime_type=mime_type,
        content_size=len(content),
        enable_token_reduction=enable_token_reduction,
    )

    extraction_start = time.time()

    config = get_scientific_extraction_config(
        chunk_content=True,
        enable_token_reduction=enable_token_reduction,
        enable_entity_extraction=True,
        enable_keyword_extraction=True,
        enable_document_classification=True,
        language_hint=language_hint,
    )

    result = await extract_bytes(content=content, mime_type=mime_type, config=config)

    extracted_text = result.content
    processed_mime_type = result.mime_type
    chunks = result.chunks if hasattr(result, "chunks") and result.chunks else None

    metadata = cast(
        "DocumentMetadata",
        dict(result.metadata) if hasattr(result, "metadata") and result.metadata else {},
    )

    entities_count, keywords_count = enrich_metadata_with_entities_keywords(
        extraction_result=result,
        metadata=metadata,
        context=f"indexer:{filename}",
    )

    extraction_duration = time.time() - extraction_start

    text_length = len(extracted_text) if isinstance(extracted_text, str) else len(str(extracted_text))
    logger.debug(
        "Optimized text extraction completed with entity/keyword extraction",
        filename=filename,
        extraction_duration_ms=round(extraction_duration * 1000, 2),
        text_length=text_length,
        original_mime_type=mime_type,
        processed_mime_type=processed_mime_type,
        chunk_count=len(chunks) if chunks else 0,
        metadata_fields=len(metadata) if metadata else 0,
        entities_extracted=entities_count,
        keywords_extracted=keywords_count,
        token_reduction_enabled=enable_token_reduction,
    )

    if chunks:
        chunk_dtos = [Chunk(content=chunk) for chunk in chunks]
    else:
        chunk_dtos = [Chunk(content=extracted_text)]
        logger.warning(
            "Chunking not available, using full text as single chunk",
            filename=filename,
            text_length=text_length,
        )

    text_content = extracted_text if isinstance(extracted_text, str) else serialize(extracted_text).decode()

    embedding_start = time.time()

    async def _run_embedding() -> list[VectorDTO]:
        if model_name is not None:
            return await index_chunks(chunks=chunk_dtos, source_id=source_id, model_name=model_name)
        return await index_chunks(chunks=chunk_dtos, source_id=source_id)

    async def _run_scientific_analysis() -> ScientificAnalysisResult | None:
        if not enable_scientific_analysis:
            return None
        try:
            return await analyze_scientific_content(text_content, source_id=source_id)
        except Exception:
            logger.exception(
                "Scientific analysis failed, continuing without it",
                source_id=source_id,
                filename=filename,
            )
            return None

    vectors, scientific_analysis = await asyncio.gather(
        _run_embedding(),
        _run_scientific_analysis(),
    )

    embedding_duration = time.time() - embedding_start

    logger.debug(
        "Embedding and scientific analysis completed",
        source_id=source_id,
        embedding_duration_ms=round(embedding_duration * 1000, 2),
        vector_count=len(vectors),
        scientific_analysis_available=scientific_analysis is not None,
    )

    total_processing_time = extraction_duration + embedding_duration
    logger.info(
        "Optimized source processing completed",
        filename=filename,
        source_id=source_id,
        total_processing_ms=round(total_processing_time * 1000, 2),
        final_text_length=len(text_content),
        final_vector_count=len(vectors),
        token_reduction_savings="~35%" if enable_token_reduction else "0%",
        scientific_analysis_enabled=enable_scientific_analysis,
        scientific_analysis_success=scientific_analysis is not None,
    )

    return vectors, text_content, metadata, scientific_analysis
