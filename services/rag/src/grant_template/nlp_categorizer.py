"""
Async NLP categorizer for CFP text semantic analysis.

This module provides optimized text categorization using spaCy with async processing
to enhance CFP data extraction through semantic understanding.
"""

import asyncio
import re
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Final

import spacy
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)

# Pre-load spaCy model at module level for efficiency
nlp: Any
try:
    nlp = spacy.load("en_core_web_sm")
    logger.info("Loaded spaCy English model successfully")
except OSError:
    logger.error("spaCy English model not found. Install with: python -m spacy download en_core_web_sm")
    nlp = None

# Configuration constants
EXECUTOR_MAX_WORKERS: Final[int] = 3
DEFAULT_BATCH_SIZE: Final[int] = 32
DEFAULT_N_PROCESS: Final[int] = 2
MIN_SENTENCE_WORDS: Final[int] = 3
MIN_SENTENCE_CHARS: Final[int] = 15
LOOKAHEAD_WINDOW: Final[int] = 5
MAX_DISPLAY_ITEMS: Final[int] = 8

# Thread executor for async processing
_executor = ThreadPoolExecutor(max_workers=EXECUTOR_MAX_WORKERS)

# Compiled regex patterns for performance
_COMMAS_IN_DIGITS: Final[re.Pattern[str]] = re.compile(r"(?<=\d),(?=\d)")
_NUM_REGEX: Final[re.Pattern[str]] = re.compile(r"^\d{1,3}(,\d{3})*(\.\d+)?$")
_NOT_DONE_REGEX: Final[re.Pattern[str]] = re.compile(
    r"\b("
    r"not|no\b|never|no longer|won['']t|cannot|can['']t|isn['']t|aren['']t|"
    r"wasn['']t|weren['']t|hasn['']t|haven['']t|hadn['']t|will not|shall not|without"
    r")\b",
    re.IGNORECASE,
)
_EVALUATION_REGEX: Final[re.Pattern[str]] = re.compile(
    r"\b(("
    r"(will|shall)\s+be\s+(evaluated|assessed|reviewed|examined|scored|judged)"
    r")|evaluation\s+criteria|assessment\s+criteria)\b",
    re.IGNORECASE,
)

# Keyword sets for categorization
WRITING_KEYWORDS: Final[set[str]] = {
    "word",
    "words",
    "character",
    "characters",
    "letter",
    "letters",
    "sentence",
    "sentences",
}

MONEY_KEYWORDS: Final[set[str]] = {"dollar", "dollars", "euro", "euros", "pound", "pounds", "cent", "cents"}

MONEY_SYMBOLS: Final[set[str]] = {"$", "€", "£", "¥"}

RECOMMENDATION_KEYWORDS: Final[set[str]] = {
    "should",
    "recommend",
    "suggest",
    "advice",
    "advise",
    "could",
    "would",
    "might",
}

ORDER_KEYWORDS: Final[set[str]] = {"must", "need", "needs", "required", "require", "shall", "please", "have to"}

EVALUATION_KEYWORDS: Final[set[str]] = {
    "evaluation",
    "evaluations",
    "evaluate",
    "evaluated",
    "evaluating",
    "assessment",
    "assess",
    "assessed",
    "assessing",
    "criteria",
    "criterion",
    "scored",
    "score",
    "scoring",
    "review",
    "reviewed",
    "reviewing",
    "reviewers",
    "examined",
    "examines",
    "examine",
    "examination",
    "judged",
    "judging",
    "ranking",
    "ranked",
    "rank",
}

# Category mapping for output
CATEGORY_LABELS: Final[list[str]] = [
    "Money",
    "Date/Time",
    "Writing-related",
    "Other Numbers",
    "Recommendations",
    "Orders",
    "Positive Instructions",
    "Negative Instructions",
    "Evaluation Criteria",
]


def _strip_commas(text: str) -> str:
    """Strip commas that appear inside digit groups, so 2,000 → 2000."""
    return _COMMAS_IN_DIGITS.sub("", text)


def _is_number(token: Any) -> bool:
    """Check if a spaCy token represents a number."""
    return token.like_num or bool(_NUM_REGEX.match(token.text))


def _categorize_sentence(sentence: Any, buckets: dict[str, list[str]]) -> None:
    """
    Categorize a single spaCy sentence into semantic buckets.

    Args:
        sentence: spaCy Span object representing a sentence
        buckets: Dictionary to store categorized sentences
    """
    text = sentence.text.strip()

    # Skip stubs (< MIN_SENTENCE_WORDS words OR < MIN_SENTENCE_CHARS characters)
    if len(text.split()) < MIN_SENTENCE_WORDS or len(text) < MIN_SENTENCE_CHARS:
        return

    # Content-based flags
    has_money = any(symbol in text for symbol in MONEY_SYMBOLS) or any(
        token.text.lower() in MONEY_KEYWORDS for token in sentence
    )

    has_date_time = any(ent.label_ in {"DATE", "TIME"} for ent in sentence.ents)

    has_writing = False
    for idx, token in enumerate(sentence):
        if _is_number(token):
            # Look ahead ≤LOOKAHEAD_WINDOW tokens for writing keywords
            lookahead = sentence[idx + 1 : idx + LOOKAHEAD_WINDOW + 1]
            if any(t.text.lower() in WRITING_KEYWORDS for t in lookahead):
                has_writing = True
                break

    has_number = not has_writing and any(_is_number(token) for token in sentence) and not (has_money or has_date_time)

    # Action-based flags
    has_recommendation = any(token.text.lower() in RECOMMENDATION_KEYWORDS for token in sentence)

    first_token = sentence[0] if len(sentence) > 0 else None
    is_imperative = first_token and first_token.pos_ == "VERB" and first_token.tag_ == "VB"
    has_order = is_imperative or any(token.text.lower() in ORDER_KEYWORDS for token in sentence)

    has_negative = bool(_NOT_DONE_REGEX.search(text))
    has_evaluation = any(token.text.lower() in EVALUATION_KEYWORDS for token in sentence) or bool(
        _EVALUATION_REGEX.search(text)
    )

    # Populate buckets based on flags
    if has_money:
        buckets["Money"].append(text)
    if has_date_time:
        buckets["Date/Time"].append(text)
    if has_writing:
        buckets["Writing-related"].append(text)
    if has_number:
        buckets["Other Numbers"].append(text)
    if has_recommendation:
        buckets["Recommendations"].append(text)
    if has_order:
        buckets["Orders"].append(text)
    if has_order and not has_negative:
        buckets["Positive Instructions"].append(text)
    if has_negative:
        buckets["Negative Instructions"].append(text)
    if has_evaluation:
        buckets["Evaluation Criteria"].append(text)


def _categorize_text_sync(
    text: str, batch_size: int = DEFAULT_BATCH_SIZE, n_process: int = DEFAULT_N_PROCESS
) -> dict[str, list[str]]:
    """
    Synchronous text categorization using spaCy multi-processing.

    Args:
        text: Input text to categorize
        batch_size: Batch size for spaCy processing
        n_process: Number of processes for spaCy pipeline

    Returns:
        Dictionary mapping category names to lists of sentences
    """
    if not text or not text.strip():
        logger.warning("Empty text provided for NLP categorization")
        return {label: [] for label in CATEGORY_LABELS}

    if nlp is None:
        logger.error("spaCy model not available for categorization")
        return {label: [] for label in CATEGORY_LABELS}

    try:
        # Preprocess text
        processed_text = _strip_commas(text)

        # Process text lines with spaCy pipeline
        doc_stream = nlp.pipe(processed_text.splitlines(), batch_size=batch_size, n_process=n_process)

        # Initialize buckets
        buckets: dict[str, list[str]] = defaultdict(list)

        # Process each document and sentence
        sentence_count = 0
        for doc in doc_stream:
            for sentence in doc.sents:
                _categorize_sentence(sentence, buckets)
                sentence_count += 1

        # Convert to regular dict with all categories
        result = {label: buckets.get(label, []) for label in CATEGORY_LABELS}

        logger.debug(
            "NLP categorization completed",
            total_sentences=sentence_count,
            categories_found={k: len(v) for k, v in result.items() if v},
            batch_size=batch_size,
            n_process=n_process,
        )

        return result

    except Exception as e:
        logger.error("Error during NLP categorization", error=str(e), text_length=len(text))
        return {label: [] for label in CATEGORY_LABELS}


async def categorize_text_async(text: str) -> dict[str, list[str]]:
    """
    Async wrapper for text categorization with optimized performance.

    Args:
        text: Input text to categorize

    Returns:
        Dictionary mapping category names to lists of sentences
    """
    if not text or not text.strip():
        return {label: [] for label in CATEGORY_LABELS}

    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(_executor, _categorize_text_sync, text)

    except Exception as e:
        logger.error("Error in async NLP categorization", error=str(e), text_length=len(text))
        return {label: [] for label in CATEGORY_LABELS}


def format_nlp_analysis_for_prompt(analysis: dict[str, list[str]]) -> str:
    """
    Format NLP analysis results for inclusion in LLM prompts.

    Args:
        analysis: NLP categorization results

    Returns:
        Formatted string for prompt inclusion
    """
    if not analysis or all(not sentences for sentences in analysis.values()):
        return "No NLP analysis available for this content."

    sections = ["## Structured NLP Analysis"]

    # Count total categorized sentences
    total_sentences = sum(len(sentences) for sentences in analysis.values())
    sections.append(f"- Total categorized sentences: {total_sentences}")
    sections.append("")

    # Add categorized content sections
    for category in CATEGORY_LABELS:
        sentences = analysis.get(category, [])
        if sentences:
            # Limit to top MAX_DISPLAY_ITEMS per category for prompt efficiency
            display_sentences = sentences[:MAX_DISPLAY_ITEMS]
            sections.append(f"### {category} ({len(sentences)} items)")

            for i, sentence in enumerate(display_sentences, 1):
                sections.append(f"{i}. {sentence}")

            if len(sentences) > MAX_DISPLAY_ITEMS:
                sections.append(f"... and {len(sentences) - MAX_DISPLAY_ITEMS} more items")
            sections.append("")

    return "\n".join(sections)


def get_nlp_categorizer_status() -> dict[str, Any]:
    """
    Get status information about the NLP categorizer.

    Returns:
        Dictionary with categorizer status information
    """
    return {
        "spacy_model_loaded": nlp is not None,
        "model_name": "en_core_web_sm" if nlp else None,
        "executor_max_workers": EXECUTOR_MAX_WORKERS,
        "supported_categories": CATEGORY_LABELS,
    }
