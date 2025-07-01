# OpenTelemetry Implementation Summary

## Overview

This document summarizes the OpenTelemetry implementation added to GrantFlow services. While the codebase currently uses `correlation_id` throughout, the OpenTelemetry infrastructure is ready to support the transition to `trace_id` when needed.

## What Was Implemented

### 1. Core OpenTelemetry Configuration

**File**: `packages/shared_utils/src/otel.py`
- Configures OpenTelemetry for each service with proper resource attributes
- Sets up Google Cloud Trace exporter (enabled via environment variable)
- Auto-instruments SQLAlchemy and HTTPX clients
- Provides helper functions for getting tracers and meters

### 2. Tracing Utilities

**File**: `packages/shared_utils/src/tracing.py`
- `start_span_with_trace_id()` - Context manager for creating spans with trace ID binding
- `add_span_attributes()` - Helper to add attributes to current span
- `record_exception()` - Helper to record exceptions in spans
- Integration with structlog for context propagation

### 3. Pub/Sub OpenTelemetry Integration

**File**: `packages/shared_utils/src/pubsub_otel.py`
- `inject_trace_context()` - Injects OTEL context into Pub/Sub message attributes
- `extract_trace_context()` - Extracts OTEL context from incoming messages
- `create_pubsub_publish_span()` - Creates spans for publishing operations
- `create_pubsub_receive_span()` - Creates spans for receiving operations

### 4. Enhanced Logging

**File**: `packages/shared_utils/src/logger.py`
- Added `add_otel_context()` processor to structlog
- Automatically includes OpenTelemetry trace_id and span_id in logs
- Works alongside existing correlation_id system

### 5. Custom Metrics

**File**: `packages/shared_utils/src/metrics.py`
- Pre-configured counters and histograms for:
  - HTTP requests and duration
  - Business metrics (grants processed, files indexed, RAG queries)
  - Infrastructure metrics (Pub/Sub messages, database operations)

### 6. Service Integration

All services now call `configure_otel()` at startup:
- `services/backend/src/main.py` - Configured with Litestar plugin attempt
- `services/crawler/src/main.py` - Basic OTEL configuration
- `services/indexer/src/main.py` - Basic OTEL configuration
- `services/rag/src/main.py` - Basic OTEL configuration
- `services/scraper/src/main.py` - Basic OTEL configuration

### 7. Documentation

- `docs/OTEL_TESTING_GUIDE.md` - Comprehensive testing guide
- `docs/OTEL_CUSTOM_INSTRUMENTATION.md` - Guide for adding custom instrumentation
- `scripts/test_otel_integration.py` - Test script for verification

## Configuration

### Environment Variables

```bash
# Enable Cloud Trace export (default: disabled in development)
ENABLE_CLOUD_TRACE=1

# Google Cloud project (required for Cloud Trace)
GOOGLE_CLOUD_PROJECT=grantflow-staging

# Service version (optional)
SERVICE_VERSION=1.0.0

# Environment name
ENVIRONMENT=staging
```

### Dependencies Added

Added to `packages/shared_utils/pyproject.toml` under `server` extras:
```toml
"litestar[opentelemetry]>=2.16",
"opentelemetry-exporter-gcp-trace>=1.6.0",
"opentelemetry-exporter-gcp-monitoring>=1.6.0",
"opentelemetry-instrumentation-sqlalchemy>=0.41b0",
"opentelemetry-instrumentation-httpx>=0.41b0",
```

## Usage Examples

### Basic Tracing

```python
from packages.shared_utils.src.tracing import start_span_with_trace_id

async def process_request(correlation_id: str):
    with start_span_with_trace_id(
        "process.request",
        trace_id=correlation_id,  # Can use correlation_id as trace_id
        operation="process",
    ):
        # Your code here
        pass
```

### Recording Metrics

```python
from packages.shared_utils.src.metrics import grants_processed_total

# Record a metric
grants_processed_total.add(
    1,
    attributes={
        "service": "rag",
        "status": "success",
    }
)
```

## Migration Path

When ready to rename `correlation_id` to `trace_id`:

1. Update all TypedDict definitions in `pubsub.py`
2. Update middleware in `backend/src/api/middleware.py`
3. Update all logging statements
4. The OpenTelemetry infrastructure will automatically work with the new naming

## Testing

Run the test script to verify OpenTelemetry is working:

```bash
# Without Cloud export (local testing)
python scripts/test_otel_integration.py

# With Cloud export
ENABLE_CLOUD_TRACE=1 python scripts/test_otel_integration.py
```

## Next Steps

1. **Complete correlation_id → trace_id rename** when ready
2. **Add custom instrumentation** to key business operations
3. **Set up Cloud Monitoring dashboards** based on OTEL metrics
4. **Configure alerts** for critical issues only
5. **Implement sampling** for high-volume endpoints

## Notes

- The implementation is fully backward compatible
- No performance impact when OTEL is disabled
- Cloud Trace export only happens when explicitly enabled
- All services are configured but instrumentation can be enhanced