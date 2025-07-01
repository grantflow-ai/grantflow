# Monitoring & Observability Implementation Plan

## Overview

This plan implements comprehensive observability for GrantFlow services using OpenTelemetry while preserving and enhancing the existing correlation ID system and structlog configuration.

## Current State Analysis

### ✅ Existing Correlation ID System
- **Frontend**: Generates UUID correlation IDs, sends via `X-Correlation-ID` header
- **Backend**: `CorrelationIdMiddleware` extracts/generates correlation IDs, stores in request state
- **Pub/Sub**: All message types include optional `correlation_id` field
- **Services**: Crawler, Indexer, RAG receive and propagate correlation IDs
- **Logging**: Structured logging with correlation_id throughout pipeline

### ✅ Existing Structured Logging
- **Framework**: structlog with JSON output in production, console in debug
- **Processors**: sanitization, truncation, timestamp, log level
- **Usage**: Consistent key=value logging across all services
- **Context**: `merge_contextvars` for request-scoped context

### 🔄 Integration Strategy
- **Simplify by renaming** correlation_id → trace_id throughout codebase
- **Maintain existing flow patterns** with new naming
- **Add OpenTelemetry spans** for distributed tracing
- **Preserve existing logging patterns**

---

## Implementation Plan

### Phase 1: Rename correlation_id → trace_id (Week 1)

#### 1.1 Rename correlation_id throughout codebase

**Goal**: Simplify integration by using trace_id naming consistently everywhere

**Components to update**:
- Frontend correlation ID generation and headers
- Backend middleware and request state
- Pub/Sub message attributes and handling
- All service logging and context propagation
- Database schema and API responses (if applicable)

#### 1.2 Shared OpenTelemetry Configuration

**Create**: `packages/shared_utils/src/otel.py`
```python
from opentelemetry import trace, metrics
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.exporter.cloud_monitoring import CloudMonitoringMetricsExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

def configure_otel(service_name: str) -> None:
    """Configure OpenTelemetry for a service."""
    # Set up tracing
    provider = TracerProvider(
        resource=Resource.create({"service.name": service_name})
    )
    trace.set_tracer_provider(provider)

    # Add Cloud Trace exporter
    cloud_trace_exporter = CloudTraceSpanExporter()
    span_processor = BatchSpanProcessor(cloud_trace_exporter)
    provider.add_span_processor(span_processor)

    # Set up metrics
    metric_provider = MeterProvider(
        resource=Resource.create({"service.name": service_name})
    )
    metrics.set_meter_provider(metric_provider)

    # Auto-instrumentation
    SQLAlchemyInstrumentor().instrument()
    HTTPXClientInstrumentor().instrument()
```

#### 1.3 Enhanced Structlog Configuration (after rename)

**Update**: `packages/shared_utils/src/logger.py`
```python
def add_otel_context(logger, method_name, event_dict):
    """Add OpenTelemetry context to log entries."""
    from opentelemetry import trace

    span = trace.get_current_span()
    if span.get_span_context().is_valid:
        span_context = span.get_span_context()
        event_dict["trace_id"] = format(span_context.trace_id, "032x")
        event_dict["span_id"] = format(span_context.span_id, "016x")

    return event_dict

# Add to processors list in configure_once()
processors=[
    merge_contextvars,
    add_otel_context,  # Add this new processor
    add_log_level,
    # ... rest of existing processors
]
```

#### 1.4 Trace ID Span Integration

**Create**: `packages/shared_utils/src/tracing.py` (renamed from correlation.py)
```python
from opentelemetry import trace
from opentelemetry.trace import TraceFlags
from structlog.contextvars import bind_contextvars

def start_span_with_trace_id(
    span_name: str,
    trace_id: str | None = None,
    **attributes
) -> trace.Span:
    """Start a span and bind trace_id for logging patterns."""
    tracer = trace.get_tracer(__name__)

    span = tracer.start_span(span_name)

    if trace_id:
        span.set_attribute("trace_id", trace_id)
        # Bind to structlog context for existing logging patterns
        bind_contextvars(trace_id=trace_id)

    for key, value in attributes.items():
        span.set_attribute(key, str(value))

    return span
```

### Phase 2: Service Integration (Week 1-2)

#### 2.1 Backend Service Enhancement

**Update**: `services/backend/src/main.py`
```python
from packages.shared_utils.src.otel import configure_otel
from opentelemetry.instrumentation.asgi import AsgiInstrumentor

# Configure OTEL before creating app
configure_otel("backend")

app = create_litestar_app(
    logger=logger,
    route_handlers=api_routes,
    on_startup=[before_server_start],
    middleware=[TraceIdMiddleware, AuthMiddleware],  # Keep existing middleware
)

# Use ASGI auto-instrumentation since Litestar 2.16.0 doesn't have built-in OTEL plugin
app = AsgiInstrumentor().instrument_app(app)
```

**Note**: Litestar 2.16.0 does not have a built-in OpenTelemetry plugin (`litestar.contrib.opentelemetry` does not exist). We'll use ASGI instrumentation instead, which provides automatic HTTP request tracing.

**Update**: `services/backend/src/api/middleware.py` (after rename)
```python
from packages.shared_utils.src.tracing import start_span_with_trace_id

class TraceIdMiddleware:  # Renamed from CorrelationIdMiddleware
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive, send)
            trace_id = self.get_or_create_trace_id(request)  # Renamed method

            # Start root span with trace ID
            with start_span_with_trace_id(
                f"{request.method} {request.url.path}",
                trace_id=trace_id,
                **{
                    "http.method": request.method,
                    "http.url": str(request.url),
                    "http.scheme": request.url.scheme,
                    "http.host": request.headers.get("host", ""),
                }
            ):
                # Updated trace ID logic
                scope["state"]["trace_id"] = trace_id  # Renamed field
                await self.app(scope, receive, send)
```

#### 2.2 Pub/Sub Message Tracing

**Update**: `packages/shared_utils/src/pubsub.py`
```python
from opentelemetry import trace
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

async def publish_message(topic_name: str, message_data: dict, trace_id: str | None = None):
    """Publish message with OpenTelemetry context propagation."""
    tracer = trace.get_tracer(__name__)

    with tracer.start_span("pubsub.publish") as span:
        span.set_attribute("pubsub.topic", topic_name)
        span.set_attribute("message.type", message_data.get("type", "unknown"))

        if trace_id:
            span.set_attribute("trace_id", trace_id)

        # Inject trace context into message attributes
        carrier = {}
        TraceContextTextMapPropagator().inject(carrier)

        # Add trace context to existing message attributes
        attributes = {
            "trace_id": trace_id or "",  # Renamed from correlation_id
            **carrier,  # OTel trace context
        }

        # Existing publish logic with enhanced attributes
        # ...
```

#### 2.3 Service Consumer Tracing

**Update**: Consumer pattern for all services
```python
# In each service's message handler
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

async def handle_message(message: PubSubMessage):
    """Handle Pub/Sub message with trace context extraction."""

    # Extract existing trace_id (renamed from correlation_id)
    trace_id = message.attributes.get("trace_id")

    # Extract OpenTelemetry context
    carrier = dict(message.attributes)
    ctx = TraceContextTextMapPropagator().extract(carrier)

    tracer = trace.get_tracer(__name__)

    # Start child span with extracted context
    with tracer.start_span(
        f"process_{message_type}",
        context=ctx
    ) as span:
        span.set_attribute("pubsub.subscription", subscription_name)
        span.set_attribute("message.id", message.message_id)

        if trace_id:
            span.set_attribute("trace_id", trace_id)
            bind_contextvars(trace_id=trace_id)  # Renamed from correlation_id

        # Existing message processing logic
        await process_message_logic(message)
```

### Phase 3: Custom Metrics (Week 2)

#### 3.1 Business Metrics Definition

**Create**: `packages/shared_utils/src/metrics.py`
```python
from opentelemetry import metrics

meter = metrics.get_meter(__name__)

# Request metrics
http_requests_total = meter.create_counter(
    "http_requests_total",
    description="Total HTTP requests by service, method, status"
)

http_request_duration = meter.create_histogram(
    "http_request_duration_seconds",
    description="HTTP request duration",
    unit="s"
)

# Business metrics
grants_processed_total = meter.create_counter(
    "grants_processed_total",
    description="Total grants processed by service and status"
)

files_indexed_total = meter.create_counter(
    "files_indexed_total",
    description="Total files indexed by type and status"
)

rag_queries_total = meter.create_counter(
    "rag_queries_total",
    description="Total RAG queries by type and status"
)

processing_duration = meter.create_histogram(
    "processing_duration_seconds",
    description="Processing duration by operation type",
    unit="s"
)

# Infrastructure metrics
pubsub_messages_total = meter.create_counter(
    "pubsub_messages_total",
    description="Pub/Sub messages by topic, subscription, status"
)

database_operations_total = meter.create_counter(
    "database_operations_total",
    description="Database operations by type and status"
)
```

#### 3.2 Metrics Integration

**Backend routes example**:
```python
from packages.shared_utils.src.metrics import http_requests_total, http_request_duration
import time

@get("/sources")
async def get_sources(request: Request) -> list[Source]:
    start_time = time.time()
    status = "success"

    try:
        # Existing logic
        sources = await fetch_sources()
        return sources
    except Exception as e:
        status = "error"
        raise
    finally:
        # Record metrics
        duration = time.time() - start_time

        http_requests_total.add(1, {
            "service": "backend",
            "method": "GET",
            "endpoint": "/sources",
            "status": status
        })

        http_request_duration.record(duration, {
            "service": "backend",
            "endpoint": "/sources"
        })
```

### Phase 4: Alert Configuration (Week 2)

#### 4.1 Minimal Discord Alerts Only

**Create**: `terraform/modules/monitoring/`

**Core principle**: Only alert on complete service failures, not performance issues.

**Alert Policies**:
1. **Service Completely Down** - Zero 2xx responses for 5+ minutes
2. **Database Disconnected** - No successful DB connections for 3+ minutes
3. **Critical Job Failure** - Scraper hasn't succeeded in 48+ hours
4. **Pub/Sub Dead** - All subscriptions failing for 20+ minutes

**Implementation**:
```hcl
# terraform/modules/monitoring/critical_alerts.tf
resource "google_monitoring_alert_policy" "service_down" {
  for_each = toset(["backend", "crawler", "indexer", "rag", "scraper"])

  display_name = "${title(each.key)} Service Completely Down"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Zero successful responses"

    condition_threshold {
      filter = join(" AND ", [
        "resource.type=\"cloud_run_revision\"",
        "resource.label.service_name=\"${each.key}\"",
        "metric.type=\"run.googleapis.com/request_count\"",
        "metric.label.response_code_class=\"2xx\""
      ])

      duration        = "300s"  # 5 minutes
      comparison      = "COMPARISON_EQUAL"
      threshold_value = 0  # Zero 2xx responses

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.discord.name]
}
```

#### 4.2 Discord Webhook Function

**Simple, focused messages**:
```python
def format_critical_alert(alert_data):
    incident = alert_data.get('incident', {})
    policy_name = incident.get('policy_name', 'Unknown')

    # Extract service name from policy name
    service = policy_name.split()[0].lower()

    return {
        "content": f"🚨 **CRITICAL**: {service.upper()} service is completely down\n"
                  f"Duration: Started {incident.get('started_at', 'unknown')}\n"
                  f"Check logs: https://console.cloud.google.com/run/detail/us-central1/{service}",
        "username": "GrantFlow Monitor"
    }
```

### Phase 5: Dashboard Creation (Week 3)

#### 5.1 Service Health Dashboard

**Cloud Monitoring Dashboard with**:
- Request rate, error rate, latency per service
- Database connection pool status
- Pub/Sub message flow and backlog
- Resource utilization (CPU, memory)
- Custom business metrics

#### 5.2 Distributed Tracing

**Cloud Trace Integration**:
- Full request traces from frontend → backend → services
- Database query traces within request context
- Pub/Sub message flow visualization
- Performance bottleneck identification

---

## Dependencies & Setup

### Package Dependencies
```toml
# Add to root pyproject.toml [dependency-groups] dev section
"opentelemetry-api>=1.20.0",
"opentelemetry-sdk>=1.20.0",
"opentelemetry-instrumentation>=0.41b0",
"opentelemetry-instrumentation-asgi>=0.41b0",  # For Litestar ASGI instrumentation
"opentelemetry-instrumentation-sqlalchemy>=0.41b0",
"opentelemetry-instrumentation-httpx>=0.41b0",
"opentelemetry-exporter-gcp-trace>=1.6.0",
"opentelemetry-exporter-gcp-monitoring>=1.6.0",
```

### Environment Variables
```bash
# Add to service .env files
OTEL_SERVICE_NAME=backend  # or crawler, indexer, rag, scraper
OTEL_RESOURCE_ATTRIBUTES=service.name=backend,service.version=1.0.0
GOOGLE_CLOUD_PROJECT=grantflow
```

### GCP Permissions
```bash
# Service accounts need these roles
roles/cloudtrace.agent
roles/monitoring.metricWriter
roles/logging.logWriter
```

---

## Success Metrics

### Observability Goals
- **Trace Coverage**: 100% of requests traced end-to-end
- **Service Map**: Complete dependency visualization
- **Error Attribution**: Every error traced to specific request/correlation_id
- **Performance Baselines**: p50/p95/p99 established for all endpoints

### Alert Quality Goals
- **Signal/Noise Ratio**: >95% of Discord alerts require immediate action
- **False Positives**: <1 per week in healthy system
- **MTTR**: <10 minutes from alert to root cause identification
- **Coverage**: 100% of service-down scenarios detected

### Backward Compatibility
- **Existing correlation_id flows**: Continue working unchanged
- **Current logging patterns**: Enhanced, not replaced
- **Pub/Sub message formats**: Additive changes only
- **API contracts**: No breaking changes

---

## Implementation Timeline

### Week 1: Rename correlation_id → trace_id
- [x] Rename correlation_id → trace_id throughout frontend
- [x] Rename correlation_id → trace_id in backend middleware
- [x] Rename correlation_id → trace_id in Pub/Sub messages
- [x] Rename correlation_id → trace_id in all services
- [x] Update logging context variables
- [x] Run tests and validate flow

### Week 2: Service Integration
- [x] All services OTEL-enabled
- [x] Pub/Sub trace propagation
- [x] Custom business metrics
- [ ] Critical alerts configuration

### Week 3: Dashboards & Polish
- [ ] Cloud Monitoring dashboards
- [ ] Discord webhook refinement
- [ ] Documentation updates
- [ ] Performance optimization

### Week 4: Validation & Rollout
- [ ] End-to-end trace validation
- [ ] Alert testing and tuning
- [ ] Team training
- [ ] Production deployment

---

## Cost Estimation

### GCP Services
- **Cloud Trace**: First 2M spans/month free (~$0.20/million after)
- **Cloud Monitoring**: First 150 metrics free (~$0.258/metric after)
- **Cloud Logging**: First 50GB/month free (~$0.50/GB after)

### Expected Usage
- **Traces**: ~500K spans/month (well within free tier)
- **Metrics**: ~50 custom metrics (within free tier)
- **Logs**: ~20GB/month (within free tier)

**Total estimated cost: $5-10/month**

---

## Risk Mitigation

### Performance Impact
- **OTEL Overhead**: <2% CPU, <100MB memory per service
- **Batched Exports**: Minimize network impact
- **Sampling**: Can reduce to 10% in high-volume scenarios

### Rollback Strategy
- **Feature Flags**: OTEL can be disabled via environment variable
- **Backward Compatibility**: Existing correlation system continues working
- **Gradual Rollout**: Service-by-service deployment

### Dependencies
- **GCP Service Health**: Monitor Cloud Trace/Monitoring availability
- **Network Connectivity**: Ensure egress to GCP APIs
- **Authentication**: Service account key rotation procedures