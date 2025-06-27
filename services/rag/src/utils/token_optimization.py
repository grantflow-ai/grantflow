"""Optimized token counting with batching, caching, and rate limiting."""

from functools import lru_cache
from typing import Any, TypedDict

from packages.shared_utils.src.ai import estimate_token_count
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=2000)
def cached_estimate_token_count(text: str) -> int:
    """Cached local token estimation - much faster than API calls."""
    return estimate_token_count(text)


async def batch_count_tokens(texts: list[str]) -> list[int]:
    """Batch token counting using local estimation for efficiency."""
    if not texts:
        return []

    # Use local estimation for all requests to avoid API rate limits
    return [cached_estimate_token_count(text) for text in texts]


async def optimized_count_tokens(text: str) -> int:
    """Optimized single token counting with caching."""
    if not text:
        return 0

    # Use local estimation to avoid API rate limits
    return cached_estimate_token_count(text)


class SentenceInfo(TypedDict):
    text: str
    processed_text: str
    content_word_ratio: float
    doc_idx: int
    relevance_score: float


async def smart_parse_documents_with_batched_tokens(
    sentence_infos: list[SentenceInfo],
    max_tokens: int
) -> tuple[list[str], int]:
    """Parse documents with batched token counting for efficiency."""
    if not sentence_infos:
        return [], 0

    # Extract all sentences for batch token counting
    sentences = [info["text"] for info in sentence_infos]

    # Batch count tokens for all sentences at once
    token_counts = await batch_count_tokens(sentences)

    # Now efficiently select sentences within token limit
    doc_contents: dict[int, list[str]] = {}
    total_tokens = 0

    for sentence_info, token_count in zip(sentence_infos, token_counts, strict=False):
        doc_idx = sentence_info["doc_idx"]
        sentence = sentence_info["text"]

        if total_tokens + token_count > max_tokens:
            break

        if doc_idx not in doc_contents:
            doc_contents[doc_idx] = []

        doc_contents[doc_idx].append(sentence)
        total_tokens += token_count

    # Reconstruct documents
    final_docs = [" ".join(sentences).strip() for sentences in doc_contents.values() if sentences]

    logger.debug(
        "Smart document parsing: %d sentences processed, %d tokens used, %d final docs",
        len([s for s, t in zip(sentences, token_counts, strict=False) if total_tokens >= t]),
        total_tokens,
        len(final_docs)
    )

    return final_docs, total_tokens
