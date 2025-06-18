import logging
import re
from typing import Any, Final, cast

from structlog import get_logger as get_structlog_logger
from structlog.typing import EventDict, FilteringBoundLogger

from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.serialization import serialize

configured_ref = Ref[bool]()

MAX_STRING_LENGTH: Final[int] = 500
MAX_LIST_ITEMS: Final[int] = 5
MAX_DICT_KEYS: Final[int] = 10


def sanitize_string(value: str) -> str:
    value = re.sub(r"\n{3,}", "\n\n", value)

    value = re.sub(r" {2,}", " ", value)

    if len(value) > MAX_STRING_LENGTH:
        return value[:MAX_STRING_LENGTH] + "... (truncated)"

    return value


def truncate_value(value: Any) -> Any:
    if isinstance(value, str):
        return sanitize_string(value)

    if isinstance(value, list):
        if len(value) > MAX_LIST_ITEMS:
            return [truncate_value(item) for item in value[:MAX_LIST_ITEMS]] + [
                f"... and {len(value) - MAX_LIST_ITEMS} more items"
            ]
        return [truncate_value(item) for item in value]

    if isinstance(value, dict):
        if len(value) > MAX_DICT_KEYS:
            truncated = {
                k: truncate_value(v)
                for i, (k, v) in enumerate(value.items())
                if i < MAX_DICT_KEYS
            }
            truncated["_truncated"] = f"{len(value) - MAX_DICT_KEYS} more keys"
            return truncated
        return {k: truncate_value(v) for k, v in value.items()}

    if isinstance(value, (int, float, bool, type(None))):
        return value

    return sanitize_string(str(value))


def rag_log_processor(_: Any, __: str, event_dict: EventDict) -> EventDict:
    long_content_keys = {
        "response",
        "result",
        "content",
        "text_content",
        "chunks",
        "formatted_sources",
        "prompt",
        "messages",
        "error_context",
        "data",
        "extraction_result",
        "sections",
        "metadata",
    }

    for key, value in list(event_dict.items()):
        if key == "error" and isinstance(value, str):
            event_dict[key] = sanitize_string(value)

        elif key in long_content_keys:
            event_dict[key] = truncate_value(value)

        elif isinstance(value, str):
            if "\n\n\n" in value or "  " in value or len(value) > MAX_STRING_LENGTH:
                event_dict[key] = sanitize_string(value)

        elif isinstance(value, (list, dict)) and (
            (isinstance(value, list) and len(value) > MAX_LIST_ITEMS)
            or (isinstance(value, dict) and len(value) > MAX_DICT_KEYS)
        ):
            event_dict[key] = truncate_value(value)

    event_dict["_log_processed"] = True

    return event_dict


def error_detail_processor(_: Any, __: str, event_dict: EventDict) -> EventDict:
    if "error" in event_dict and "DeserializationError" in str(
        event_dict.get("error", "")
    ):
        error_str = str(event_dict["error"])

        if "Context:" in error_str:
            parts = error_str.split("Context:", 1)
            event_dict["error"] = parts[0].strip()

            event_dict["error_has_context"] = True

            if "Input data was truncated" in error_str:
                event_dict["error_type"] = "truncated_input"

    if "error_context" in event_dict and isinstance(event_dict["error_context"], dict):
        essential_fields = {"error_type", "message", "field", "value_length"}
        if isinstance(event_dict["error_context"], dict):
            event_dict["error_context"] = {
                k: v
                for k, v in event_dict["error_context"].items()
                if k in essential_fields
            }

    return event_dict


def get_logger(name: str) -> FilteringBoundLogger:
    if configured_ref.value is None:
        from structlog import (
            BytesLoggerFactory,
            PrintLoggerFactory,
            configure_once,
            make_filtering_bound_logger,
        )
        from structlog.contextvars import merge_contextvars
        from structlog.dev import ConsoleRenderer
        from structlog.processors import (
            JSONRenderer,
            TimeStamper,
            add_log_level,
            format_exc_info,
        )

        configure_once(
            cache_logger_on_first_use=True,
            wrapper_class=make_filtering_bound_logger(
                logging.DEBUG
                if get_env("DEBUG", raise_on_missing=False)
                else logging.INFO,
            ),
            processors=[
                merge_contextvars,
                add_log_level,
                format_exc_info,
                TimeStamper(fmt="iso"),
                ConsoleRenderer(colors=True)
                if get_env("DEBUG", raise_on_missing=False)
                else JSONRenderer(serializer=serialize),
            ],
            logger_factory=PrintLoggerFactory()
            if get_env("DEBUG", raise_on_missing=False)
            else BytesLoggerFactory(),
        )

        configured_ref.value = True

    return cast("FilteringBoundLogger", get_structlog_logger(name))
