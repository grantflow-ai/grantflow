"""Text processing utilities for cleaning and sanitizing content."""

import re
from typing import Final

from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)

# Compiled regex patterns for text sanitization
ESCAPED_CRLF_PATTERN: Final[re.Pattern[str]] = re.compile(r"\\+r\\+n")
ESCAPED_LF_PATTERN: Final[re.Pattern[str]] = re.compile(r"\\+n")
ESCAPED_CR_PATTERN: Final[re.Pattern[str]] = re.compile(r"\\+r")
REPETITIVE_PATTERN: Final[re.Pattern[str]] = re.compile(r"(.{1,10})\1{20,}")
MULTIPLE_NEWLINES_PATTERN: Final[re.Pattern[str]] = re.compile(r"\n{3,}")
MULTIPLE_SPACES_PATTERN: Final[re.Pattern[str]] = re.compile(r" {2,}")
CONTROL_CHARS_PATTERN: Final[re.Pattern[str]] = re.compile(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]")


def sanitize_text_content(text: str) -> str:
    """
    Sanitize text content by normalizing line endings, removing repetitive patterns,
    and cleaning up excessive whitespace and control characters.

    Args:
        text: Raw text content to sanitize

    Returns:
        Cleaned and sanitized text content
    """
    # Normalize line endings
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")
    text = ESCAPED_CRLF_PATTERN.sub("\n", text)
    text = ESCAPED_LF_PATTERN.sub("\n", text)
    text = ESCAPED_CR_PATTERN.sub("\n", text)

    # Handle repetitive patterns
    repetitive_pattern = REPETITIVE_PATTERN.search(text)
    if repetitive_pattern:
        start_pos = repetitive_pattern.start()
        logger.warning(
            "Detected repetitive pattern in text content",
            pattern=repetitive_pattern.group(1)[:20],
            original_length=len(text),
            truncated_length=start_pos,
        )
        text = text[:start_pos] + "\n[Content truncated due to repetitive pattern]"

    # Clean up excessive whitespace
    text = MULTIPLE_NEWLINES_PATTERN.sub("\n\n", text)
    text = MULTIPLE_SPACES_PATTERN.sub(" ", text)

    # Remove trailing whitespace from lines
    lines = text.split("\n")
    lines = [line.rstrip() for line in lines]
    text = "\n".join(lines)

    # Remove null bytes and control characters
    text = text.replace("\x00", "")
    text = CONTROL_CHARS_PATTERN.sub("", text)

    return text.strip()
