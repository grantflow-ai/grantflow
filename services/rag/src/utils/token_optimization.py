from functools import lru_cache
from typing import TypedDict

from packages.shared_utils.src.ai import estimate_token_count
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)


def estimate_performance_improvement(baseline_time: float, objectives_count: int) -> float:
    base_improvement = 30.0
    per_objective_improvement = 5.0

    time_factor = min(baseline_time / 10.0, 1.0)

    improvement = base_improvement * time_factor + (objectives_count * per_objective_improvement)

    return min(improvement, 80.0)


@lru_cache(maxsize=2000)
def cached_estimate_token_count(text: str) -> int:
    return estimate_token_count(text)


async def batch_count_tokens(texts: list[str]) -> list[int]:
    if not texts:
        return []

    return [cached_estimate_token_count(text) for text in texts]


async def optimized_count_tokens(text: str) -> int:
    if not text:
        return 0

    return cached_estimate_token_count(text)


def estimate_prompt_tokens(text: str) -> int:
    if not text:
        return 0

    return cached_estimate_token_count(text)


class SentenceInfo(TypedDict):
    text: str
    processed_text: str
    content_word_ratio: float
    doc_idx: int
    relevance_score: float


async def smart_parse_documents_with_batched_tokens(
    sentence_infos: list[SentenceInfo],
    max_tokens: int,
    trace_id: str,  # noqa: ARG001
) -> tuple[list[str], int]:
    if not sentence_infos:
        return [], 0

    sentences = [info["text"] for info in sentence_infos]

    token_counts = await batch_count_tokens(sentences)

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

    final_docs = [" ".join(sentences).strip() for sentences in doc_contents.values() if sentences]

    return final_docs, total_tokens
