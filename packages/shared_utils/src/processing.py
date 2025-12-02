import time
from asyncio import gather
from typing import cast

from kreuzberg import extract_bytes

from packages.db.src.json_objects import Chunk, ScientificAnalysisResult
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.embeddings import index_chunks
from packages.shared_utils.src.extraction import (
    DocumentMetadata,
    enrich_metadata_with_entities_keywords,
    get_scientific_extraction_config,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.scientific_analysis import analyze_scientific_content
from packages.shared_utils.src.serialization import serialize

logger = get_logger(__name__)


async def _extract_document_content(
    content: bytes,
    mime_type: str,
    filename: str,
    enable_token_reduction: bool,
    language_hint: str,
) -> tuple[list[Chunk], str, DocumentMetadata, float]:
    """Extract text content, create chunks, and enrich metadata."""
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
    chunks = result.chunks if hasattr(result, "chunks") and result.chunks else None

    metadata = cast(
        "DocumentMetadata",
        dict(result.metadata)
        if hasattr(result, "metadata") and result.metadata
        else {},
    )

    entities_count, keywords_count = enrich_metadata_with_entities_keywords(
        extraction_result=result,
        metadata=metadata,
        context=f"processing:{filename}",
    )

    extraction_duration = time.time() - extraction_start

    text_length = (
        len(extracted_text)
        if isinstance(extracted_text, str)
        else len(str(extracted_text))
    )
    logger.debug(
        "Text extraction completed",
        filename=filename,
        extraction_duration_ms=round(extraction_duration * 1000, 2),
        text_length=text_length,
        chunk_count=len(chunks) if chunks else 0,
        entities_extracted=entities_count,
        keywords_extracted=keywords_count,
    )

    if chunks:
        chunk_dtos = [Chunk(content=chunk) for chunk in chunks]
    else:
        chunk_dtos = [Chunk(content=extracted_text)]
        logger.warning("Chunking not available, using full text", filename=filename)

    text_content = (
        extracted_text
        if isinstance(extracted_text, str)
        else serialize(extracted_text).decode()
    )

    return chunk_dtos, text_content, metadata, extraction_duration


async def _run_parallel_processing(
    chunks: list[Chunk],
    text_content: str,
    source_id: str,
    filename: str,
    model_name: str | None,
    enable_scientific_analysis: bool,
) -> tuple[list[VectorDTO], ScientificAnalysisResult | None, float]:
    """Run embedding and scientific analysis in parallel."""
    start_time = time.time()

    async def _embed() -> list[VectorDTO]:
        if model_name is not None:
            return await index_chunks(
                chunks=chunks, source_id=source_id, model_name=model_name
            )
        return await index_chunks(chunks=chunks, source_id=source_id)

    async def _analyze() -> ScientificAnalysisResult | None:
        if not enable_scientific_analysis:
            return None
        try:
            return await analyze_scientific_content(text_content, source_id=source_id)
        except Exception:
            logger.exception(
                "Scientific analysis failed", source_id=source_id, filename=filename
            )
            return None

    vectors, analysis = await gather(_embed(), _analyze())
    duration = time.time() - start_time

    logger.debug(
        "Parallel processing completed",
        source_id=source_id,
        duration_ms=round(duration * 1000, 2),
        vector_count=len(vectors),
        has_analysis=analysis is not None,
    )

    return vectors, analysis, duration


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
    """Process a source document: extract content, generate embeddings, run scientific analysis."""
    logger.debug(
        "Starting source processing", filename=filename, content_size=len(content)
    )

    chunks, text_content, metadata, extraction_time = await _extract_document_content(
        content=content,
        mime_type=mime_type,
        filename=filename,
        enable_token_reduction=enable_token_reduction,
        language_hint=language_hint,
    )

    vectors, analysis, processing_time = await _run_parallel_processing(
        chunks=chunks,
        text_content=text_content,
        source_id=source_id,
        filename=filename,
        model_name=model_name,
        enable_scientific_analysis=enable_scientific_analysis,
    )

    logger.info(
        "Source processing completed",
        filename=filename,
        source_id=source_id,
        total_ms=round((extraction_time + processing_time) * 1000, 2),
        vectors=len(vectors),
        has_analysis=analysis is not None,
    )

    return vectors, text_content, metadata, analysis
