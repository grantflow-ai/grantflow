"""OpenTelemetry metrics for GrantFlow services."""

from .otel import get_meter


meter = get_meter("grantflow.metrics")


http_requests_total = meter.create_counter(
    "http_requests_total",
    description="Total HTTP requests by service, method, status",
)

http_request_duration = meter.create_histogram(
    "http_request_duration_seconds",
    description="HTTP request duration",
    unit="s",
)


grants_processed_total = meter.create_counter(
    "grants_processed_total",
    description="Total grants processed by service and status",
)

files_indexed_total = meter.create_counter(
    "files_indexed_total",
    description="Total files indexed by type and status",
)

rag_queries_total = meter.create_counter(
    "rag_queries_total",
    description="Total RAG queries by type and status",
)

processing_duration = meter.create_histogram(
    "processing_duration_seconds",
    description="Processing duration by operation type",
    unit="s",
)


pubsub_messages_total = meter.create_counter(
    "pubsub_messages_total",
    description="Pub/Sub messages by topic, subscription, status",
)

database_operations_total = meter.create_counter(
    "database_operations_total",
    description="Database operations by type and status",
)
