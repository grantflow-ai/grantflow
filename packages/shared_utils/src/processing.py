from asyncio import gather
from typing import cast

from kreuzberg import ExtractionResult, extract_bytes

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

logger = get_logger(__name__)


async def _extract_document_content(
    content: bytes,
    mime_type: str,
    filename: str,
    enable_token_reduction: bool,
    language_hint: str,
) -> tuple[list[Chunk], str, DocumentMetadata]:
    config = get_scientific_extraction_config(
        chunk_content=True,
        enable_token_reduction=enable_token_reduction,
        enable_entity_extraction=True,
        enable_keyword_extraction=True,
        enable_document_classification=True,
        language_hint=language_hint,
    )

    result: ExtractionResult = await extract_bytes(
        content=content, mime_type=mime_type, config=config
    )

    metadata = cast(DocumentMetadata, result.metadata)

    entities_count, keywords_count = enrich_metadata_with_entities_keywords(
        extraction_result=result,
        metadata=metadata,
        context=f"processing:{filename}",
    )

    logger.debug(
        "Text extraction completed",
        filename=filename,
        text_length=len(result.content),
        chunk_count=len(result.chunks),
        entities_extracted=entities_count,
        keywords_extracted=keywords_count,
    )

    chunk_dtos = [Chunk(content=chunk) for chunk in result.chunks]

    return chunk_dtos, result.content, metadata


async def _run_concurrent_processing(
    chunks: list[Chunk],
    text_content: str,
    source_id: str,
    filename: str,
    model_name: str | None,
    enable_scientific_analysis: bool,
) -> tuple[list[VectorDTO], ScientificAnalysisResult | None]:
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

    logger.debug(
        "Concurrent processing completed",
        source_id=source_id,
        vector_count=len(vectors),
        has_analysis=analysis is not None,
    )

    return vectors, analysis


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
        "Starting source processing", filename=filename, content_size=len(content)
    )

    chunks, text_content, metadata = await _extract_document_content(
        content=content,
        mime_type=mime_type,
        filename=filename,
        enable_token_reduction=enable_token_reduction,
        language_hint=language_hint,
    )

    vectors, analysis = await _run_concurrent_processing(
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
        vectors=len(vectors),
        has_analysis=analysis is not None,
    )

    return vectors, text_content, metadata, analysis
