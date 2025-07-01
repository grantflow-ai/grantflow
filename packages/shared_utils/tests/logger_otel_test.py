"""Tests for OpenTelemetry context in logger."""

from unittest.mock import Mock, patch
from typing import Any

from packages.shared_utils.src.logger import add_otel_context


def test_add_otel_context_with_valid_span() -> None:
    """Test adding OTEL context when valid span exists."""
    with patch("opentelemetry.trace") as mock_trace:
        mock_span = Mock()
        mock_span_context = Mock()
        mock_span_context.trace_id = 0x12345678901234567890123456789012
        mock_span_context.span_id = 0x1234567890123456
        mock_span_context.is_valid = True
        mock_span.get_span_context.return_value = mock_span_context
        mock_trace.get_current_span.return_value = mock_span

        event_dict: dict[str, Any] = {"message": "test log"}
        logger = Mock()
        method_name = "info"

        result = add_otel_context(logger, method_name, event_dict)

        expected_trace_id = "12345678901234567890123456789012"
        expected_span_id = "1234567890123456"

        assert result["trace_id"] == expected_trace_id
        assert result["span_id"] == expected_span_id
        assert result["message"] == "test log"


def test_add_otel_context_with_invalid_span() -> None:
    """Test adding OTEL context when span is invalid."""
    with patch("opentelemetry.trace") as mock_trace:
        mock_span = Mock()
        mock_span_context = Mock()
        mock_span_context.is_valid = False
        mock_span.get_span_context.return_value = mock_span_context
        mock_trace.get_current_span.return_value = mock_span

        event_dict: dict[str, Any] = {"message": "test log"}
        logger = Mock()
        method_name = "info"

        result = add_otel_context(logger, method_name, event_dict)

        assert "trace_id" not in result
        assert "span_id" not in result
        assert result["message"] == "test log"


def test_add_otel_context_import_error() -> None:
    """Test handling when OpenTelemetry import fails."""
    with patch(
        "builtins.__import__",
        side_effect=ImportError("No module named opentelemetry"),
    ):
        event_dict: dict[str, Any] = {"message": "test log"}
        logger = Mock()
        method_name = "info"

        result = add_otel_context(logger, method_name, event_dict)

        assert result == event_dict
        assert "trace_id" not in result
        assert "span_id" not in result


def test_add_otel_context_preserves_existing_fields() -> None:
    """Test that existing log fields are preserved."""
    with patch("opentelemetry.trace") as mock_trace:
        mock_span = Mock()
        mock_span_context = Mock()
        mock_span_context.trace_id = 0xABCDEF123456789012345678901234AB
        mock_span_context.span_id = 0xABCDEF1234567890
        mock_span_context.is_valid = True
        mock_span.get_span_context.return_value = mock_span_context
        mock_trace.get_current_span.return_value = mock_span

        event_dict: dict[str, Any] = {
            "message": "test log",
            "level": "info",
            "timestamp": "2023-01-01T00:00:00Z",
            "user_id": "user123",
        }
        logger = Mock()
        method_name = "info"

        result = add_otel_context(logger, method_name, event_dict)

        assert result["message"] == "test log"
        assert result["level"] == "info"
        assert result["timestamp"] == "2023-01-01T00:00:00Z"
        assert result["user_id"] == "user123"

        assert "trace_id" in result
        assert "span_id" in result
        assert len(result["trace_id"]) == 32
        assert len(result["span_id"]) == 16


def test_add_otel_context_trace_id_formatting() -> None:
    """Test proper formatting of trace_id and span_id."""
    with patch("opentelemetry.trace") as mock_trace:
        mock_span = Mock()
        mock_span_context = Mock()
        mock_span_context.trace_id = 0x123
        mock_span_context.span_id = 0x456
        mock_span_context.is_valid = True
        mock_span.get_span_context.return_value = mock_span_context
        mock_trace.get_current_span.return_value = mock_span

        event_dict: dict[str, Any] = {"message": "test log"}
        logger = Mock()
        method_name = "info"

        result = add_otel_context(logger, method_name, event_dict)

        assert result["trace_id"] == "00000000000000000000000000000123"
        assert result["span_id"] == "0000000000000456"


def test_add_otel_context_with_zero_ids() -> None:
    """Test handling of zero trace_id and span_id."""
    with patch("opentelemetry.trace") as mock_trace:
        mock_span = Mock()
        mock_span_context = Mock()
        mock_span_context.trace_id = 0
        mock_span_context.span_id = 0
        mock_span_context.is_valid = True
        mock_span.get_span_context.return_value = mock_span_context
        mock_trace.get_current_span.return_value = mock_span

        event_dict: dict[str, Any] = {"message": "test log"}
        logger = Mock()
        method_name = "info"

        result = add_otel_context(logger, method_name, event_dict)

        assert result["trace_id"] == "00000000000000000000000000000000"
        assert result["span_id"] == "0000000000000000"