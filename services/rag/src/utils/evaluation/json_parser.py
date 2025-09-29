"""JSON content parsing with proper generics."""

from typing import Any

from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import deserialize

logger = get_logger(__name__)


def parse_json_content[T](content: str, response_type: type[T]) -> tuple[bool, T | None]:
    """
    Parse content as JSON with proper typing.

    Args:
        content: Content to parse
        response_type: Target type for deserialization

    Returns:
        Tuple of (is_json, parsed_content or None)
    """
    try:
        # Try to deserialize directly with the target type
        parsed = deserialize(content.encode(), response_type)
        return True, parsed
    except Exception as e:
        logger.debug("JSON parsing failed", content_preview=content[:50], error=str(e))

    # Check for structured content patterns but couldn't parse
    content_stripped = content.strip()

    # Basic heuristics to detect JSON-like content
    if (content_stripped.startswith("{") and content_stripped.endswith("}")) or (
        content_stripped.startswith("[") and content_stripped.endswith("]")
    ):
        # Looks like JSON but failed to parse
        logger.debug("Content looks like JSON but failed parsing", content_preview=content[:100])
        return True, None

    return False, None


def _is_json_context(context: dict[str, Any]) -> bool:
    """Check if context indicates JSON content evaluation."""
    return context.get("content_type") == "json" or bool(context.get("json_data") or context.get("parsed_content"))
