"""Tests for OpenTelemetry tracing utilities."""

from unittest.mock import Mock, patch

import pytest
from opentelemetry.trace import StatusCode

from packages.shared_utils.src.tracing import (
    add_span_attributes,
    record_exception,
    start_span_with_trace_id,
)


def test_start_span_with_trace_id_success() -> None:
    """Test successful span creation with trace ID."""
    with (
        patch("packages.shared_utils.src.tracing.get_tracer") as mock_get_tracer,
        patch("packages.shared_utils.src.tracing.bind_contextvars") as mock_bind,
        patch("packages.shared_utils.src.tracing.clear_contextvars") as mock_clear,
    ):
        mock_tracer = Mock()
        mock_span = Mock()
        mock_get_tracer.return_value = mock_tracer
        mock_tracer.start_as_current_span.return_value.__enter__ = Mock(
            return_value=mock_span
        )
        mock_tracer.start_as_current_span.return_value.__exit__ = Mock(
            return_value=None
        )

        trace_id = "test-trace-123"

        with start_span_with_trace_id(
            "test_operation",
            trace_id=trace_id,
            tracer_name="custom-tracer",
            user_id="user123",
            operation_type="test",
        ) as span:
            assert span == mock_span

        mock_get_tracer.assert_called_once_with("custom-tracer")
        mock_tracer.start_as_current_span.assert_called_once_with("test_operation")

        mock_bind.assert_called_once_with(trace_id=trace_id)
        mock_span.set_attribute.assert_any_call("trace_id", trace_id)
        mock_span.set_attribute.assert_any_call("user_id", "user123")
        mock_span.set_attribute.assert_any_call("operation_type", "test")

        mock_clear.assert_called_once()


def test_start_span_with_trace_id_without_trace_id() -> None:
    """Test span creation without trace ID."""
    with (
        patch("packages.shared_utils.src.tracing.get_tracer") as mock_get_tracer,
        patch("packages.shared_utils.src.tracing.bind_contextvars") as mock_bind,
        patch("packages.shared_utils.src.tracing.clear_contextvars") as mock_clear,
    ):
        mock_tracer = Mock()
        mock_span = Mock()
        mock_get_tracer.return_value = mock_tracer
        mock_tracer.start_as_current_span.return_value.__enter__ = Mock(
            return_value=mock_span
        )
        mock_tracer.start_as_current_span.return_value.__exit__ = Mock(
            return_value=None
        )

        with start_span_with_trace_id("test_operation") as span:
            assert span == mock_span

        mock_bind.assert_not_called()
        mock_clear.assert_not_called()

        calls = [call[0] for call in mock_span.set_attribute.call_args_list]
        assert ("trace_id", "test-trace-123") not in calls


def test_start_span_with_trace_id_exception_handling() -> None:
    """Test span exception handling and status setting."""
    with (
        patch("packages.shared_utils.src.tracing.get_tracer") as mock_get_tracer,
        patch("packages.shared_utils.src.tracing.bind_contextvars"),
        patch("packages.shared_utils.src.tracing.clear_contextvars") as mock_clear,
    ):
        mock_tracer = Mock()
        mock_span = Mock()
        mock_get_tracer.return_value = mock_tracer
        mock_tracer.start_as_current_span.return_value.__enter__ = Mock(
            return_value=mock_span
        )
        mock_tracer.start_as_current_span.return_value.__exit__ = Mock(
            return_value=None
        )

        test_exception = ValueError("Test error")

        with pytest.raises(ValueError, match="Test error"):
            with start_span_with_trace_id("test_operation", trace_id="test-123"):
                raise test_exception

        mock_span.record_exception.assert_called_once_with(test_exception)
        mock_span.set_status.assert_called_once()
        status_call = mock_span.set_status.call_args[0][0]
        assert status_call.status_code == StatusCode.ERROR
        assert "Test error" in str(status_call.description)

        mock_clear.assert_called_once()


def test_start_span_with_none_attributes() -> None:
    """Test span creation with None attribute values."""
    with patch("packages.shared_utils.src.tracing.get_tracer") as mock_get_tracer:
        mock_tracer = Mock()
        mock_span = Mock()
        mock_get_tracer.return_value = mock_tracer
        mock_tracer.start_as_current_span.return_value.__enter__ = Mock(
            return_value=mock_span
        )
        mock_tracer.start_as_current_span.return_value.__exit__ = Mock(
            return_value=None
        )

        with start_span_with_trace_id(
            "test_operation", valid_attr="value", none_attr=None
        ):
            pass

        mock_span.set_attribute.assert_called_once_with("valid_attr", "value")


def test_add_span_attributes_with_current_span() -> None:
    """Test adding attributes to current span."""
    with patch(
        "packages.shared_utils.src.tracing.trace.get_current_span"
    ) as mock_get_span:
        mock_span = Mock()
        mock_span.is_recording.return_value = True
        mock_get_span.return_value = mock_span

        add_span_attributes(operation="test_op", user_id="user123", none_value=None)

        mock_span.set_attribute.assert_any_call("operation", "test_op")
        mock_span.set_attribute.assert_any_call("user_id", "user123")

        calls = [call[0] for call in mock_span.set_attribute.call_args_list]
        assert ("none_value", None) not in calls


def test_add_span_attributes_with_non_recording_span() -> None:
    """Test adding attributes when span is not recording."""
    with patch(
        "packages.shared_utils.src.tracing.trace.get_current_span"
    ) as mock_get_span:
        mock_span = Mock()
        mock_span.is_recording.return_value = False
        mock_get_span.return_value = mock_span

        add_span_attributes(operation="test_op")

        mock_span.set_attribute.assert_not_called()


def test_record_exception_with_recording_span() -> None:
    """Test recording exception in current span."""
    with patch(
        "packages.shared_utils.src.tracing.trace.get_current_span"
    ) as mock_get_span:
        mock_span = Mock()
        mock_span.is_recording.return_value = True
        mock_get_span.return_value = mock_span

        test_exception = RuntimeError("Test runtime error")

        record_exception(test_exception, escaped=True)

        mock_span.record_exception.assert_called_once_with(test_exception, escaped=True)
        mock_span.set_status.assert_called_once()
        status_call = mock_span.set_status.call_args[0][0]
        assert status_call.status_code == StatusCode.ERROR
        assert "Test runtime error" in str(status_call.description)


def test_record_exception_not_escaped() -> None:
    """Test recording exception without escaped flag."""
    with patch(
        "packages.shared_utils.src.tracing.trace.get_current_span"
    ) as mock_get_span:
        mock_span = Mock()
        mock_span.is_recording.return_value = True
        mock_get_span.return_value = mock_span

        test_exception = ValueError("Test value error")

        record_exception(test_exception, escaped=False)

        mock_span.record_exception.assert_called_once_with(
            test_exception, escaped=False
        )
        mock_span.set_status.assert_not_called()


def test_record_exception_with_non_recording_span() -> None:
    """Test recording exception when span is not recording."""
    with patch(
        "packages.shared_utils.src.tracing.trace.get_current_span"
    ) as mock_get_span:
        mock_span = Mock()
        mock_span.is_recording.return_value = False
        mock_get_span.return_value = mock_span

        test_exception = Exception("Test exception")

        record_exception(test_exception)

        mock_span.record_exception.assert_not_called()
        mock_span.set_status.assert_not_called()