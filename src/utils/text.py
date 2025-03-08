import math
from functools import lru_cache
from re import compile as re_compile
from typing import Final

from src.constants import ANTHROPIC_SONNET_MODEL
from src.utils.ai import get_google_ai_client
from src.utils.nlp import get_spacy_model, get_word_count


def count_words(text: str) -> int:
    """Count the number of words in a text string.

    Args:
        text: The text to count words for

    Returns:
        The number of words in the text
    """
    return len(text.split())


CHARS_PER_TOKEN: Final[float] = 4.0


SINGLE_QUOTE_PATTERN = re_compile(r"[\u2018\u2019]")
DOUBLE_QUOTE_PATTERN = re_compile(r"[\u201C\u201D\u201F]")
DASH_PATTERN = re_compile(r"[\u2013\u2014\u2015]")
ELLIPSIS_PATTERN = re_compile(r"\u2026")
BROKEN_MARKDOWN_BOLD_PATTERN = re_compile(r"(\*\*)(.*?)\s+\*\*")
HEADING_PATTERN = re_compile(r"^#{1,6}\s+\S+")
LIST_ITEM_PATTERN = re_compile(r"^\s*(?:[*+-]|\d+\.)\s+\S+")


def concatenate_segments_with_spacy_coherence(segments: list[str]) -> str:
    """Concatenate text segments while ensuring coherence between sentences using spaCy.

    Args:
        segments: The text segments to concatenate.

    Returns:
        The concatenated text.
    """
    nlp = get_spacy_model()

    concatenated_text: list[str] = []
    context_buffer: list[str] = []

    for segment in segments:
        doc = nlp(segment)
        sentences = [sent.text for sent in doc.sents]

        overlap_index = 0
        if context_buffer and sentences:
            for overlap_count in range(1, min(len(context_buffer), 2) + 1):
                if sentences[:overlap_count] == context_buffer[-overlap_count:]:
                    overlap_index = overlap_count
                    break

            sentences = sentences[overlap_index:]

        concatenated_text.append(" ".join(sentences).strip())
        context_buffer = sentences[-2:]

    return " ".join(concatenated_text).strip()


def normalize_punctuation(text: str) -> str:
    """Normalize Unicode punctuation in text to ASCII equivalents.

    Args:
        text: The text to normalize.

    Returns:
        The normalized text.
    """
    text = SINGLE_QUOTE_PATTERN.sub("'", text)
    text = DOUBLE_QUOTE_PATTERN.sub('"', text)
    text = DASH_PATTERN.sub("-", text)
    return ELLIPSIS_PATTERN.sub("...", text)


def normalize_markdown(markdown_string: str) -> str:
    """Normalize Markdown text to improve readability and consistency.

    Args:
        markdown_string: The Markdown-formatted text to normalize.

    Returns:
        The normalized Markdown text.
    """
    if not markdown_string.strip():
        return ""

    markdown_string = _fix_broken_bold(markdown_string)
    lines = _split_and_strip_lines(markdown_string)
    normalized_lines = _process_lines(lines)
    return _finalize_normalized_lines(normalized_lines)


def _fix_broken_bold(markdown_string: str) -> str:
    """Fix broken bold Markdown patterns."""
    if "**" in markdown_string:
        markdown_string = BROKEN_MARKDOWN_BOLD_PATTERN.sub(r"\1\2**", markdown_string)
    return markdown_string


def _split_and_strip_lines(markdown_string: str) -> list[str]:
    """Split the Markdown string into stripped lines."""
    return [line.strip() for line in markdown_string.splitlines()]


def _process_lines(lines: list[str]) -> list[str]:
    """Process lines to normalize headers, list items, and general content."""
    normalized_lines: list[str] = []
    current_list_items: list[str] = []

    for i, line in enumerate(lines):
        if not line:
            _handle_empty_line(normalized_lines, current_list_items)
            continue

        normalized_line = _normalize_line(line)
        is_header = HEADING_PATTERN.match(normalized_line)
        is_list_item = LIST_ITEM_PATTERN.match(normalized_line)

        if is_header:
            _handle_header(normalized_lines, current_list_items, normalized_line)
            continue

        if is_list_item:
            current_list_items.append(normalized_line)
            continue

        _handle_regular_line(normalized_lines, current_list_items, normalized_line, i, lines)

    if current_list_items:
        normalized_lines.extend(current_list_items)

    return normalized_lines


def _handle_empty_line(normalized_lines: list[str], current_list_items: list[str]) -> None:
    """Handle an empty line during processing."""
    if current_list_items:
        normalized_lines.extend(current_list_items)
        current_list_items.clear()
    if normalized_lines and normalized_lines[-1] != "":
        normalized_lines.append("")


def _normalize_line(line: str) -> str:
    """Normalize a single line by applying punctuation normalization."""
    return " ".join(normalize_punctuation(word) for word in line.split())


def _handle_header(normalized_lines: list[str], current_list_items: list[str], normalized_line: str) -> None:
    """Handle a header line during processing."""
    if current_list_items:
        normalized_lines.extend(current_list_items)
        current_list_items.clear()
    if normalized_lines and normalized_lines[-1] != "":
        normalized_lines.append("")
    normalized_lines.append(normalized_line)
    normalized_lines.append("")


def _handle_regular_line(
    normalized_lines: list[str], current_list_items: list[str], normalized_line: str, i: int, lines: list[str]
) -> None:
    """Handle a regular line during processing."""
    if current_list_items:
        normalized_lines.extend(current_list_items)
        normalized_lines.append("")
        current_list_items.clear()
    normalized_lines.append(normalized_line)
    if i < len(lines) - 1:
        normalized_lines.append("")


def _finalize_normalized_lines(normalized_lines: list[str]) -> str:
    """Finalize the normalized lines by removing trailing blank lines."""
    result: list[str] = []
    for line in normalized_lines:
        if line or (result and result[-1]):
            result.append(line)
    while result and not result[-1]:
        result.pop()
    return "\n".join(result)


@lru_cache(maxsize=1000)
def estimate_token_count(text: str) -> int:
    """Estimate token count without making an API call.

    This uses character count and word count to approximate token count.
    It's less accurate than the API but doesn't count against rate limits.

    Args:
        text: The text to estimate tokens for

    Returns:
        Estimated token count
    """
    if not text:
        return 0

    if len(text) < 100:
        return math.ceil(len(text) / CHARS_PER_TOKEN)

    word_count = get_word_count(text)
    char_count = len(text)

    char_tokens = char_count / CHARS_PER_TOKEN
    word_tokens = word_count * 1.3

    return math.ceil((char_tokens + word_tokens) / 2)


async def count_tokens(text: str, model: str = ANTHROPIC_SONNET_MODEL) -> int:
    """Count the number of tokens in a text string.

    Uses a fast local estimation for Anthropic models to avoid rate limits.
    Uses Google AI client for other models.

    Args:
        text: The text to count tokens for
        model: The model to use for counting tokens

    Returns:
        The number of tokens in the text
    """
    if not text:
        return 0

    if ANTHROPIC_SONNET_MODEL in model:
        return estimate_token_count(text)

    try:
        client = get_google_ai_client(prompt_identifier="", system_instructions="", model=model)
        response = client.count_tokens(text)
        return int(response.total_tokens)
    except (ValueError, KeyError, AttributeError):
        return estimate_token_count(text)
