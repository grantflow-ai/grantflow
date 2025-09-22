from typing import Any, cast

from kreuzberg import (
    KreuzbergError,
    extract_bytes,
    ExtractionConfig,
    TokenReductionConfig,
    TesseractConfig,
    PSMMode,
)
from packages.db.src.json_objects import DocumentMetadata

from packages.shared_utils.src.exceptions import FileParsingError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.stopwords import ACADEMIC_STOP_WORDS

logger = get_logger(__name__)

# Scientific document optimized configuration using shared academic stopwords
# Note: ACADEMIC_STOP_WORDS already contains overlapping terms, so we only add scientific-specific terms
SCIENTIFIC_STOPWORDS = {
    "en": list(ACADEMIC_STOP_WORDS)
    + [
        # Publication metadata specific to scientific documents
        "doi",
        "et",
        "al",
        "fig",
        "figure",
        "table",
        "supplementary",
        "supporting",
        "information",
        "manuscript",
        "article",
        "publication",
        "journal",
        "volume",
        "issue",
        "page",
        "pages",
        "ref",
        "reference",
        "references",
        "abstract",
        "introduction",
        "methodology",
        "results",
        "discussion",
        "conclusion",
        "acknowledgments",
        "funding",
        "corresponding",
        "email",
        # Academic institutions
        "university",
        "department",
        "institute",
        "laboratory",
        "lab",
        "center",
        "school",
        "college",
        "faculty",
        # Research-specific terms not in ACADEMIC_STOP_WORDS
        "research",
        "study",
        "analysis",
        "data",
        "experiment",
        "experimental",
        "investigation",
        "observation",
        "measurement",
        "evaluation",
        "assessment",
        "validation",
        "protocol",
    ]
}


def get_scientific_extraction_config(
    chunk_content: bool = True,
    max_chars: int = 2000,
    max_overlap: int = 200,
    enable_token_reduction: bool = True,
    enable_entity_extraction: bool = False,
    enable_keyword_extraction: bool = False,
    enable_document_classification: bool = False,
    language_hint: str = "en",
) -> ExtractionConfig:
    """
    Get optimized Kreuzberg configuration for scientific documents.

    Based on testing with scientific papers and grant documents:
    - 2000 char chunks provide good balance of context and granularity
    - 200 char overlap ensures semantic continuity
    - Moderate token reduction with scientific stopwords reduces size by ~35%
    - PSM AUTO_ONLY works well for scientific documents
    - Markdown output preserves document structure
    """

    token_reduction = None
    if enable_token_reduction:
        token_reduction = TokenReductionConfig(
            mode="moderate",  # 35% average reduction
            preserve_markdown=True,  # Keep document structure
            language_hint=language_hint,
            custom_stopwords=SCIENTIFIC_STOPWORDS,
        )

    # OCR configuration optimized for scientific documents
    ocr_config = TesseractConfig(
        output_format="markdown",  # Better structure preservation
        psm=PSMMode.AUTO_ONLY,  # PSM AUTO - automatic page segmentation
        language="eng",  # Can be overridden per document
        tessedit_enable_dict_correction=True,  # Better accuracy for technical terms
        language_model_ngram_on=False,  # Disabled for better performance on modern docs
    )

    return ExtractionConfig(
        chunk_content=chunk_content,
        max_chars=max_chars,
        max_overlap=max_overlap,
        token_reduction=token_reduction,
        force_ocr=False,  # Let Kreuzberg decide if OCR is needed
        ocr_config=ocr_config,
        auto_detect_language=True,  # Now enabled with langdetect dependency
    )


def _get_extraction_config(
    enable_chunking: bool, enable_token_reduction: bool, language_hint: str
) -> ExtractionConfig | None:
    """Get extraction configuration if needed, None for basic extraction."""
    if enable_chunking or enable_token_reduction:
        return get_scientific_extraction_config(
            chunk_content=enable_chunking,
            enable_token_reduction=enable_token_reduction,
            language_hint=language_hint,
        )
    return None


def _extract_chunks_from_result(result: Any) -> list[str] | None:
    """Extract chunks from Kreuzberg result if available."""
    return result.chunks if hasattr(result, "chunks") and result.chunks else None


async def extract_file_content(
    *,
    content: bytes,
    mime_type: str,
    enable_chunking: bool = False,
    enable_token_reduction: bool = False,
    enable_entity_extraction: bool = False,
    enable_keyword_extraction: bool = False,
    enable_document_classification: bool = False,
    language_hint: str = "en",
) -> tuple[str, str, list[str] | None, DocumentMetadata | None]:
    """
    Extract content from file with optimized settings for scientific documents.

    Args:
        content: File content as bytes
        mime_type: MIME type of the content
        enable_chunking: Whether to enable text chunking (default: False)
        enable_token_reduction: Whether to apply token reduction (default: False)
        language_hint: Language hint for processing (default: "en")

    Returns:
        Tuple containing:
        - Extracted text content (str)
        - Detected/processed MIME type (str)
        - List of chunks if chunking enabled, None otherwise (list[str] | None)
        - Document metadata from Kreuzberg extraction (DocumentMetadata | None)
    """
    import time

    start_time = time.time()
    logger.debug(
        "Starting file content extraction",
        mime_type=mime_type,
        content_size=len(content),
        enable_chunking=enable_chunking,
        enable_token_reduction=enable_token_reduction,
    )

    try:
        # Use optimized configuration for scientific documents
        if enable_chunking or enable_token_reduction:
            config = get_scientific_extraction_config(
                chunk_content=enable_chunking,
                enable_token_reduction=enable_token_reduction,
                language_hint=language_hint,
            )
            result = await extract_bytes(
                content=content, mime_type=mime_type, config=config
            )
        else:
            # Use basic extraction for backward compatibility
            result = await extract_bytes(content=content, mime_type=mime_type)

        extraction_duration = time.time() - start_time
        chunks = result.chunks if hasattr(result, "chunks") and result.chunks else None
        metadata = (
            cast(DocumentMetadata, result.metadata)
            if hasattr(result, "metadata") and result.metadata
            else None
        )

        logger.debug(
            "File content extraction successful",
            original_mime_type=mime_type,
            detected_mime_type=result.mime_type,
            content_size=len(content),
            extracted_length=len(result.content),
            chunks_count=len(chunks) if chunks else 0,
            metadata_fields=len(metadata) if metadata else 0,
            token_reduction_enabled=enable_token_reduction,
            extraction_duration_ms=round(extraction_duration * 1000, 2),
        )

        return result.content, result.mime_type, chunks, metadata
    except KreuzbergError as e:
        extraction_duration = time.time() - start_time
        logger.warning(
            "File content extraction failed",
            mime_type=mime_type,
            content_size=len(content),
            error_type=type(e).__name__,
            error_message=str(e),
            extraction_duration_ms=round(extraction_duration * 1000, 2),
        )

        raise FileParsingError(
            "Error extracting content from file",
            context={
                "mime_type": mime_type,
                "error": str(e),
                "content_size": len(content),
            },
        ) from e
