"""Kreuzberg extraction utilities for test fixtures with caching."""

import hashlib
import json
from pathlib import Path
from typing import TYPE_CHECKING

from packages.shared_utils.src.extraction import extract_file_content

if TYPE_CHECKING:
    from kreuzberg._types import Metadata as DocumentMetadata
else:
    DocumentMetadata = dict

# Cache directory for kreuzberg extraction results
CACHE_DIR = Path(__file__).parent / ".cache" / "kreuzberg"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _compute_cache_key(
    *,
    content: bytes,
    mime_type: str,
    enable_chunking: bool,
    enable_token_reduction: bool,
    enable_entity_extraction: bool,
    enable_keyword_extraction: bool,
    enable_document_classification: bool,
) -> str:
    """Compute cache key from extraction parameters."""
    content_hash = hashlib.sha256(content).hexdigest()[:16]
    params = {
        "mime_type": mime_type,
        "chunking": enable_chunking,
        "token_reduction": enable_token_reduction,
        "entities": enable_entity_extraction,
        "keywords": enable_keyword_extraction,
        "classification": enable_document_classification,
    }
    params_hash = hashlib.sha256(json.dumps(params, sort_keys=True).encode()).hexdigest()[:8]
    return f"{content_hash}_{params_hash}"


def _load_from_cache(cache_key: str) -> tuple[str, str, list[str] | None, DocumentMetadata | None] | None:
    """Load extraction result from cache if it exists."""
    cache_file = CACHE_DIR / f"{cache_key}.json"
    if not cache_file.exists():
        return None

    try:
        with open(cache_file) as f:
            data = json.load(f)
        return (
            data["content"],
            data["mime_type"],
            data.get("chunks"),
            data.get("metadata"),
        )
    except (json.JSONDecodeError, KeyError, OSError):
        # Cache corrupted, will re-extract
        return None


def _save_to_cache(
    cache_key: str,
    content: str,
    mime_type: str,
    chunks: list[str] | None,
    metadata: DocumentMetadata | None,
) -> None:
    """Save extraction result to cache."""
    cache_file = CACHE_DIR / f"{cache_key}.json"
    try:
        with open(cache_file, "w") as f:
            json.dump(
                {
                    "content": content,
                    "mime_type": mime_type,
                    "chunks": chunks,
                    "metadata": metadata,
                },
                f,
            )
    except (OSError, TypeError):
        # Failed to cache, not critical
        pass


async def extract_with_cache(
    *,
    content: bytes,
    mime_type: str,
    enable_chunking: bool = True,
    enable_token_reduction: bool = False,
    enable_entity_extraction: bool = True,
    enable_keyword_extraction: bool = True,
    enable_document_classification: bool = True,
    language_hint: str = "en",
) -> tuple[str, str, list[str] | None, DocumentMetadata | None]:
    """Extract content with caching to avoid re-running kreuzberg.

    Computes cache key from content hash and extraction parameters.
    Returns cached result if available, otherwise runs kreuzberg and caches.

    Args:
        content: File content as bytes
        mime_type: MIME type of the content
        enable_chunking: Whether to chunk the content
        enable_token_reduction: Whether to apply token reduction
        enable_entity_extraction: Whether to extract entities
        enable_keyword_extraction: Whether to extract keywords
        enable_document_classification: Whether to classify document type
        language_hint: Language hint for extraction

    Returns:
        Tuple of (content, mime_type, chunks, metadata)
    """
    cache_key = _compute_cache_key(
        content=content,
        mime_type=mime_type,
        enable_chunking=enable_chunking,
        enable_token_reduction=enable_token_reduction,
        enable_entity_extraction=enable_entity_extraction,
        enable_keyword_extraction=enable_keyword_extraction,
        enable_document_classification=enable_document_classification,
    )

    # Try loading from cache
    cached_result = _load_from_cache(cache_key)
    if cached_result is not None:
        return cached_result

    # Extract with kreuzberg
    result = await extract_file_content(
        content=content,
        mime_type=mime_type,
        enable_chunking=enable_chunking,
        enable_token_reduction=enable_token_reduction,
        enable_entity_extraction=enable_entity_extraction,
        enable_keyword_extraction=enable_keyword_extraction,
        enable_document_classification=enable_document_classification,
        language_hint=language_hint,
    )

    # Cache for next time
    _save_to_cache(cache_key, *result)

    return result
