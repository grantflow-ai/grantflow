from typing import Any

from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import deserialize

logger = get_logger(__name__)


def parse_json_content[T](content: str, response_type: type[T]) -> tuple[bool, T | None]:
    try:
        parsed = deserialize(content.encode(), response_type)
        return True, parsed
    except Exception as e:
        logger.debug("JSON parsing failed", content_preview=content[:50], error=str(e))

    content_stripped = content.strip()

    if (content_stripped.startswith("{") and content_stripped.endswith("}")) or (
        content_stripped.startswith("[") and content_stripped.endswith("]")
    ):
        logger.debug("Content looks like JSON but failed parsing", content_preview=content[:100])
        return True, None

    return False, None


def _is_json_context(context: dict[str, Any]) -> bool:
    return context.get("content_type") == "json" or bool(context.get("json_data") or context.get("parsed_content"))
