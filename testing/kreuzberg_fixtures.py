
import hashlib
import json
from pathlib import Path
from typing import TYPE_CHECKING

from packages.shared_utils.src.extraction import extract_file_content

if TYPE_CHECKING:
    from kreuzberg._types import Metadata as DocumentMetadata
else:
    DocumentMetadata = dict

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
    cache_file = CACHE_DIR / f"{cache_key}.json"
    if not cache_file.exists():
        return None

    try:
        with cache_file.open() as f:
            data = json.load(f)
        return (
            data["content"],
            data["mime_type"],
            data.get("chunks"),
            data.get("metadata"),
        )
    except (json.JSONDecodeError, KeyError, OSError):
        return None


def _save_to_cache(
    cache_key: str,
    content: str,
    mime_type: str,
    chunks: list[str] | None,
    metadata: DocumentMetadata | None,
) -> None:
    cache_file = CACHE_DIR / f"{cache_key}.json"
    try:
        with cache_file.open("w") as f:
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
    cache_key = _compute_cache_key(
        content=content,
        mime_type=mime_type,
        enable_chunking=enable_chunking,
        enable_token_reduction=enable_token_reduction,
        enable_entity_extraction=enable_entity_extraction,
        enable_keyword_extraction=enable_keyword_extraction,
        enable_document_classification=enable_document_classification,
    )

    cached_result = _load_from_cache(cache_key)
    if cached_result is not None:
        return cached_result

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

    _save_to_cache(cache_key, *result)

    return result
