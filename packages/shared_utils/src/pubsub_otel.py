"""Pub/Sub utilities with OpenTelemetry integration."""

from typing import TYPE_CHECKING, Any

from opentelemetry import trace
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

from .otel import get_tracer

if TYPE_CHECKING:
    from google.cloud.pubsub_v1.types import PubsubMessage


def inject_trace_context(attributes: dict[str, str] | None = None) -> dict[str, str]:
    """Inject OpenTelemetry trace context into Pub/Sub message attributes.

    Args:
        attributes: Existing message attributes

    Returns:
        Updated attributes with trace context
    """
    if attributes is None:
        attributes = {}

    propagator = TraceContextTextMapPropagator()
    propagator.inject(attributes)

    return attributes


def extract_trace_context(message: "PubsubMessage") -> Any:
    """Extract OpenTelemetry trace context from Pub/Sub message.

    Args:
        message: Pub/Sub message with attributes

    Returns:
        Extracted context for use with spans
    """
    attributes = dict(message.attributes) if message.attributes else {}

    propagator = TraceContextTextMapPropagator()
    return propagator.extract(attributes)


def create_pubsub_publish_span(
    topic_name: str, message_type: str | None = None
) -> trace.Span:
    """Create a span for publishing a Pub/Sub message.

    Args:
        topic_name: Name of the topic
        message_type: Optional message type for additional context

    Returns:
        Started span
    """
    tracer = get_tracer("pubsub.publisher")

    span = tracer.start_span("pubsub.publish")
    span.set_attribute("messaging.system", "pubsub")
    span.set_attribute("messaging.destination", topic_name)
    span.set_attribute("messaging.operation", "publish")

    if message_type:
        span.set_attribute("messaging.message.type", message_type)

    return span


def create_pubsub_receive_span(
    subscription_name: str,
    message: "PubsubMessage",
    context: Any | None = None,
) -> trace.Span:
    """Create a span for receiving a Pub/Sub message.

    Args:
        subscription_name: Name of the subscription
        message: The received message
        context: Optional extracted context from message

    Returns:
        Started span
    """
    tracer = get_tracer("pubsub.subscriber")

    span = tracer.start_span("pubsub.receive", context=context)
    span.set_attribute("messaging.system", "pubsub")
    span.set_attribute("messaging.source", subscription_name)
    span.set_attribute("messaging.operation", "receive")
    span.set_attribute("messaging.message.id", message.message_id)

    if message.attributes:
        if trace_id := message.attributes.get("trace_id"):
            span.set_attribute("trace_id", trace_id)

    return span
