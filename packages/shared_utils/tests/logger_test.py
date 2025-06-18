from packages.shared_utils.src.logger import (
    configured_ref,
    error_detail_processor,
    get_logger,
    rag_log_processor,
    sanitize_string,
    truncate_value,
)


async def test_get_logger_returns_logger() -> None:
    configured_ref.value = None

    logger = get_logger("test_module")

    assert logger is not None
    assert hasattr(logger, "info")
    assert hasattr(logger, "error")
    assert hasattr(logger, "warning")
    assert hasattr(logger, "debug")

    assert configured_ref.value is True


async def test_get_logger_subsequent_calls() -> None:
    configured_ref.value = True

    logger1 = get_logger("test_module1")
    logger2 = get_logger("test_module2")

    assert logger1 is not None
    assert logger2 is not None

    assert configured_ref.value is True


def test_sanitize_string_removes_excessive_newlines() -> None:
    text = "Title\n\n\n\n\nContent with\n\n\n\n\n\n\nexcessive newlines"
    result = sanitize_string(text)
    assert result == "Title\n\nContent with\n\nexcessive newlines"
    assert "\n\n\n" not in result


def test_sanitize_string_removes_multiple_spaces() -> None:
    text = "Text   with     multiple      spaces"
    result = sanitize_string(text)
    assert result == "Text with multiple spaces"
    assert "  " not in result


def test_sanitize_string_truncates_long_text() -> None:
    text = "a" * 600
    result = sanitize_string(text)
    assert len(result) == 500 + len("... (truncated)")
    assert result.endswith("... (truncated)")


def test_truncate_value_handles_strings() -> None:
    value = "Some\n\n\n\ntext with   spaces"
    result = truncate_value(value)
    assert result == "Some\n\ntext with spaces"


def test_truncate_value_handles_lists() -> None:
    small_list = ["item1", "item2", "item3"]
    result = truncate_value(small_list)
    assert result == small_list

    large_list = [f"item{i}" for i in range(10)]
    result = truncate_value(large_list)
    assert len(result) == 6
    assert result[-1] == "... and 5 more items"


def test_truncate_value_handles_dicts() -> None:
    small_dict = {"key1": "value1", "key2": "value2"}
    result = truncate_value(small_dict)
    assert result == small_dict

    large_dict = {f"key{i}": f"value{i}" for i in range(15)}
    result = truncate_value(large_dict)
    assert len(result) == 11
    assert "_truncated" in result
    assert result["_truncated"] == "5 more keys"


def test_truncate_value_handles_nested_structures() -> None:
    nested = {
        "list": ["item1", "item2", "item3", "item4", "item5", "item6", "item7"],
        "dict": {f"key{i}": f"value{i}" for i in range(12)},
        "string": "Text\n\n\n\nwith issues",
    }
    result = truncate_value(nested)

    assert len(result["list"]) == 6
    assert result["list"][-1] == "... and 2 more items"

    assert len(result["dict"]) == 11
    assert "_truncated" in result["dict"]

    assert result["string"] == "Text\n\nwith issues"


def test_rag_log_processor_processes_long_content_keys() -> None:
    event_dict = {
        "timestamp": "2024-01-01T00:00:00",
        "level": "info",
        "message": "Processing",
        "response": "Very\n\n\n\nlong response",
        "chunks": [
            "chunk1",
            "chunk2",
            "chunk3",
            "chunk4",
            "chunk5",
            "chunk6",
            "chunk7",
        ],
        "normal_key": "normal value",
    }

    result = rag_log_processor(None, "method", event_dict)

    assert result["response"] == "Very\n\nlong response"

    assert len(result["chunks"]) == 6
    assert result["chunks"][-1] == "... and 2 more items"

    assert result["normal_key"] == "normal value"

    assert result["_log_processed"] is True


def test_rag_log_processor_handles_error_strings() -> None:
    event_dict = {"error": "Error\n\n\n\nwith excessive\n\n\n\n\nnewlines"}

    result = rag_log_processor(None, "method", event_dict)

    assert result["error"] == "Error\n\nwith excessive\n\nnewlines"


def test_error_detail_processor_handles_deserialization_error() -> None:
    event_dict = {
        "error": "DeserializationError: Failed to parse. Context: {large context data here}"
    }

    result = error_detail_processor(None, "method", event_dict)

    assert result["error"] == "DeserializationError: Failed to parse."
    assert result["error_has_context"] is True


def test_error_detail_processor_handles_truncated_input() -> None:
    event_dict = {
        "error": "DeserializationError: Failed. Context: Input data was truncated"
    }

    result = error_detail_processor(None, "method", event_dict)

    assert result["error_type"] == "truncated_input"
    assert result["error_has_context"] is True


def test_error_detail_processor_filters_error_context() -> None:
    event_dict = {
        "error_context": {
            "error_type": "validation",
            "message": "Invalid input",
            "field": "name",
            "value_length": 100,
            "extra_field": "should be removed",
            "another_extra": "also removed",
        }
    }

    result = error_detail_processor(None, "method", event_dict)

    assert len(result["error_context"]) == 4
    assert "extra_field" not in result["error_context"]
    assert "another_extra" not in result["error_context"]
    assert result["error_context"]["error_type"] == "validation"
