from typing import TYPE_CHECKING, Any

from kreuzberg import (
    KreuzbergError,
    extract_bytes,
    ExtractionConfig,
    TokenReductionConfig,
    TesseractConfig,
    PSMMode,
)

if TYPE_CHECKING:
    from kreuzberg._types import Metadata as DocumentMetadata
else:
    DocumentMetadata = dict

from packages.shared_utils.src.exceptions import FileParsingError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.stopwords import ACADEMIC_STOP_WORDS

logger = get_logger(__name__)

SCIENTIFIC_STOPWORDS = {
    "en": list(ACADEMIC_STOP_WORDS)
    + [
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
        "university",
        "department",
        "institute",
        "laboratory",
        "lab",
        "center",
        "school",
        "college",
        "faculty",
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
    enable_entity_extraction: bool = True,
    enable_keyword_extraction: bool = True,
    enable_document_classification: bool = True,
    language_hint: str = "en",
) -> ExtractionConfig:
    token_reduction = None
    if enable_token_reduction:
        token_reduction = TokenReductionConfig(
            mode="moderate",
            preserve_markdown=True,
            language_hint=language_hint,
            custom_stopwords=SCIENTIFIC_STOPWORDS,
        )

    ocr_config = TesseractConfig(
        output_format="markdown",
        psm=PSMMode.AUTO_ONLY,
        language="eng",
        tessedit_enable_dict_correction=True,
        language_model_ngram_on=False,
    )

    return ExtractionConfig(
        chunk_content=chunk_content,
        max_chars=max_chars,
        max_overlap=max_overlap,
        token_reduction=token_reduction,
        force_ocr=False,
        ocr_config=ocr_config,
        auto_detect_language=True,
        extract_entities=enable_entity_extraction,
        extract_keywords=enable_keyword_extraction,
        keyword_count=10,
        auto_detect_document_type=enable_document_classification,
        document_classification_mode="text",
        document_type_confidence_threshold=0.4,
    )


def _get_extraction_config(
    enable_chunking: bool, enable_token_reduction: bool, language_hint: str
) -> ExtractionConfig | None:
    if enable_chunking or enable_token_reduction:
        return get_scientific_extraction_config(
            chunk_content=enable_chunking,
            enable_token_reduction=enable_token_reduction,
            language_hint=language_hint,
        )
    return None


def _extract_chunks_from_result(result: Any) -> list[str] | None:
    return result.chunks if hasattr(result, "chunks") and result.chunks else None


async def extract_file_content(
    *,
    content: bytes,
    mime_type: str,
    enable_chunking: bool = False,
    enable_token_reduction: bool = False,
    enable_entity_extraction: bool = True,
    enable_keyword_extraction: bool = True,
    enable_document_classification: bool = True,
    language_hint: str = "en",
) -> tuple[str, str, list[str] | None, DocumentMetadata | None]:
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
        if (
            enable_chunking
            or enable_token_reduction
            or enable_entity_extraction
            or enable_keyword_extraction
            or enable_document_classification
        ):
            config = get_scientific_extraction_config(
                chunk_content=enable_chunking,
                enable_token_reduction=enable_token_reduction,
                enable_entity_extraction=enable_entity_extraction,
                enable_keyword_extraction=enable_keyword_extraction,
                enable_document_classification=enable_document_classification,
                language_hint=language_hint,
            )
            result = await extract_bytes(
                content=content, mime_type=mime_type, config=config
            )
        else:
            result = await extract_bytes(content=content, mime_type=mime_type)

        extraction_duration = time.time() - start_time
        chunks = result.chunks if hasattr(result, "chunks") and result.chunks else None
        metadata = (
            result.metadata if hasattr(result, "metadata") and result.metadata else None
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
