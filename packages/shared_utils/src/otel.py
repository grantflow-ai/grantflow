"""OpenTelemetry configuration for GrantFlow services."""

import os

from opentelemetry import metrics, trace
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from .env import get_env


def configure_otel(service_name: str) -> None:
    """Configure OpenTelemetry for a service.

    Args:
        service_name: Name of the service for identification in traces
    """
    project_id = get_env("GOOGLE_CLOUD_PROJECT", fallback="grantflow")
    environment = get_env("ENVIRONMENT", fallback="development")

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": get_env("SERVICE_VERSION", fallback="unknown"),
            "service.environment": environment,
            "cloud.provider": "gcp",
            "cloud.account.id": project_id,
        }
    )

    provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(provider)

    if environment != "development" or os.getenv("ENABLE_CLOUD_TRACE"):
        cloud_trace_exporter = CloudTraceSpanExporter(project_id=project_id)  # type: ignore[no-untyped-call]
        span_processor = BatchSpanProcessor(cloud_trace_exporter)
        provider.add_span_processor(span_processor)

    metric_provider = MeterProvider(resource=resource)
    metrics.set_meter_provider(metric_provider)

    SQLAlchemyInstrumentor().instrument()
    HTTPXClientInstrumentor().instrument()


def get_tracer(name: str | None = None) -> trace.Tracer:
    """Get a tracer instance.

    Args:
        name: Optional name for the tracer, defaults to __name__

    Returns:
        Configured tracer instance
    """
    return trace.get_tracer(name or __name__)


def get_meter(name: str | None = None) -> metrics.Meter:
    """Get a meter instance for metrics.

    Args:
        name: Optional name for the meter, defaults to __name__

    Returns:
        Configured meter instance
    """
    return metrics.get_meter(name or __name__)
