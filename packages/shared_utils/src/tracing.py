"""OpenTelemetry tracing utilities with trace_id integration."""

from contextlib import contextmanager
from typing import Any, Iterator

from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
from structlog.contextvars import bind_contextvars, clear_contextvars

from .otel import get_tracer


@contextmanager
def start_span_with_trace_id(
    span_name: str,
    trace_id: str | None = None,
    tracer_name: str | None = None,
    **attributes: Any,
) -> Iterator[trace.Span]:
    """Start a span and bind trace_id for logging patterns.

    Args:
        span_name: Name of the span
        trace_id: Optional trace ID to bind to logs
        tracer_name: Optional tracer name, defaults to module name
        **attributes: Additional span attributes

    Yields:
        The created span
    """
    tracer = get_tracer(tracer_name)

    with tracer.start_as_current_span(span_name) as span:
        if trace_id:
            span.set_attribute("trace_id", trace_id)
            bind_contextvars(trace_id=trace_id)

        for key, value in attributes.items():
            if value is not None:
                span.set_attribute(key, str(value))

        try:
            yield span
        except Exception as e:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise
        finally:
            if trace_id:
                clear_contextvars()


def add_span_attributes(**attributes: Any) -> None:
    """Add attributes to the current span.

    Args:
        **attributes: Key-value pairs to add as span attributes
    """
    span = trace.get_current_span()
    if span.is_recording():
        for key, value in attributes.items():
            if value is not None:
                span.set_attribute(key, str(value))


def record_exception(exception: Exception, escaped: bool = False) -> None:
    """Record an exception in the current span.

    Args:
        exception: The exception to record
        escaped: Whether the exception escaped (wasn't handled)
    """
    span = trace.get_current_span()
    if span.is_recording():
        span.record_exception(exception, escaped=escaped)
        if escaped:
            span.set_status(Status(StatusCode.ERROR, str(exception)))