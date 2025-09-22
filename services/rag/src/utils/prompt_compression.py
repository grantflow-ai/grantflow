"""
Text compression utilities for prompt optimization.

This module provides functions to compress prompt text by removing stop words,
deduplicating content, and normalizing whitespace while preserving scientific
terminology and important information.
"""

import re
from functools import lru_cache
from typing import TYPE_CHECKING

from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.nlp import get_spacy_model
from packages.shared_utils.src.stopwords import ACADEMIC_STOP_WORDS

if TYPE_CHECKING:
    from spacy.tokens import Token

logger = get_logger(__name__)


def compress_whitespace(text: str) -> str:
    """Normalize and compress whitespace."""
    if not text.strip():
        return ""

    # Replace multiple spaces with single space
    text = re.sub(r"\s+", " ", text)

    # Remove excessive newlines (more than 2 consecutive)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Clean up common formatting issues
    text = re.sub(r"\s*\.\s*\.", ".", text)  # Fix double periods
    text = re.sub(r"\s*,\s*,", ",", text)  # Fix double commas

    return text.strip()


def _should_keep_token(token: "Token", academic_stop_words: set[str]) -> bool:
    """Determine if a token should be kept during stop word removal."""
    # Skip basic stop words, punctuation, and whitespace
    if token.is_stop or token.is_punct or token.is_space:
        return False

    # Skip academic-specific stop words
    if token.text.lower() in academic_stop_words:
        return False

    # Always keep named entities
    if token.ent_type_:
        return True

    # Keep numbers, symbols, and hyphenated terms
    if not token.is_alpha or ("-" in token.text and len(token.text) > 3):
        return True

    # Keep important POS tags with reasonable length
    return len(token.text) > 2 and token.pos_ in {"NOUN", "VERB", "ADJ", "PROPN", "NUM"}


@lru_cache(maxsize=1000)
def remove_stop_words(text: str) -> str:
    """Remove stop words while preserving scientific terminology and numbers."""
    if not text.strip():
        return ""

    nlp = get_spacy_model()
    doc = nlp(text)

    filtered_tokens = []
    tokens = list(doc)
    i = 0

    while i < len(tokens):
        token = tokens[i]

        # Handle percentage patterns (number + %)
        if token.pos_ == "NUM" and i + 1 < len(tokens) and tokens[i + 1].text == "%" and not tokens[i + 1].is_space:
            filtered_tokens.append(token.text + "%")
            i += 2  # Skip both number and % tokens
            continue

        # Check if token should be kept
        if _should_keep_token(token, ACADEMIC_STOP_WORDS):
            filtered_tokens.append(token.text)

        i += 1

    return " ".join(filtered_tokens)


def _split_into_sentences(text: str) -> list[str]:
    """Split text into sentences while preserving decimal numbers."""
    # Pattern matches periods that are sentence boundaries, not decimals
    # Matches periods followed by space and any letter (not just capitals) or end of string
    sentence_pattern = r"(?<!\d)\.(?=\s+[a-zA-Z])|(?<!\d)\.(?=\s*$)"
    sentences = re.split(sentence_pattern, text)
    return [s.strip() for s in sentences if s.strip()]


def _find_duplicate_ngrams(words: list[str]) -> str | None:
    """Find and remove duplicate n-grams from word list."""
    if len(words) < 10:
        return None

    # Try different phrase lengths to find duplicates
    for phrase_len in range(min(8, len(words) // 3), 2, -1):
        seen_phrases = {}

        # Create overlapping n-grams
        for i in range(len(words) - phrase_len + 1):
            phrase = " ".join(words[i : i + phrase_len])
            phrase_normalized = phrase.lower()

            if phrase_normalized in seen_phrases:
                # Found duplicate - remove from end if it's a trailing duplicate
                later_pos = i
                if later_pos + phrase_len >= len(words) - 2:  # Near the end
                    result_words = words[:later_pos]
                    return " ".join(result_words).strip()

            seen_phrases[phrase_normalized] = i

    return None


def compress_repetitive_phrases(text: str) -> str:
    """Remove repetitive phrases and duplicate sentences."""
    if not text.strip():
        return ""

    # First try sentence-based deduplication
    sentences = _split_into_sentences(text)

    if len(sentences) > 1:
        # Remove duplicate sentences (case-insensitive)
        seen_sentences = set()
        unique_sentences = []

        for sentence in sentences:
            sentence_clean = sentence.strip()
            # Normalize whitespace for comparison
            sentence_key = " ".join(sentence_clean.lower().split())
            if sentence_key and sentence_key not in seen_sentences:
                seen_sentences.add(sentence_key)
                unique_sentences.append(sentence_clean)

        result = ". ".join(unique_sentences)
        if unique_sentences and not result.endswith("."):
            result += "."
        return result

    # No clear sentences found, try n-gram based deduplication
    words = text.split()
    deduplicated = _find_duplicate_ngrams(words)
    return deduplicated or text


def compress_prompt_text(text: str, aggressive: bool = False) -> str:
    """
    Compress prompt text using multiple techniques.

    Args:
        text: The prompt text to compress
        aggressive: If True, applies more aggressive compression including stop word removal

    Returns:
        Compressed text with reduced token count
    """
    if not text.strip():
        return ""

    original_length = len(text)

    # Step 1: Always normalize whitespace
    compressed = compress_whitespace(text)

    if aggressive and len(compressed.split()) > 30:
        # Step 2: Remove stop words first for better duplicate detection
        compressed = remove_stop_words(compressed)

        # Step 3: Remove duplicates after stop words are gone
        compressed = compress_repetitive_phrases(compressed)
    else:
        # For non-aggressive or short text, just remove duplicates
        compressed = compress_repetitive_phrases(compressed)

    # Log compression statistics
    if original_length > 0:
        reduction_percent = round((1 - len(compressed) / original_length) * 100, 1)
        logger.debug(
            "Compressed prompt text",
            original_length=original_length,
            compressed_length=len(compressed),
            reduction_percent=reduction_percent,
        )

    return compressed


def estimate_compression_ratio(text: str) -> float:
    """Estimate potential compression ratio without actually compressing."""
    if not text.strip():
        return 1.0

    words = text.split()
    word_count = len(words)
    unique_words = len({word.lower() for word in words})

    if word_count == 0:
        return 1.0

    # Estimate based on word repetition
    repetition_ratio = unique_words / word_count

    # Ensure minimum compression ratio
    return max(0.3, repetition_ratio)
