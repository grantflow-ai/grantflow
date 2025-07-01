# OpenTelemetry Testing and Validation Guide

## Overview

This guide provides instructions for testing and validating the OpenTelemetry implementation in GrantFlow services.

## Prerequisites

1. **Environment Setup**:
   ```bash
   # Install dependencies
   task setup

   # Set up environment variables
   export GOOGLE_CLOUD_PROJECT=grantflow-staging
   export ENABLE_CLOUD_TRACE=1
   ```

2. **Google Cloud Authentication**:
   ```bash
   gcloud auth application-default login
   ```

## Testing Scenarios

### 1. Local Testing Without Cloud Export

Run services locally without exporting to Cloud Trace:

```bash
# Start services without cloud export
task dev

# Run test script
python scripts/test_otel_integration.py
```

Expected output:
- Logs should contain `trace_id` and `span_id` fields
- No errors about missing Cloud Trace permissions

### 2. Local Testing With Cloud Export

Enable Cloud Trace export locally:

```bash
# Enable cloud trace
export ENABLE_CLOUD_TRACE=1

# Start services
task dev

# Run test script
python scripts/test_otel_integration.py
```

Verify in Cloud Console:
1. Go to [Cloud Trace](https://console.cloud.google.com/traces)
2. Select your project
3. Look for traces from services: `backend`, `crawler`, `indexer`, `rag`, `scraper`

### 3. End-to-End Trace Test

Test distributed tracing across services:

```bash
# 1. Start all services
task dev

# 2. Create a test application with trace ID
curl -X POST http://localhost:8000/projects/{project_id}/applications \
  -H "Authorization: Bearer {token}" \
  -H "X-Trace-ID: test-trace-123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Application",
    "grant_template_id": "{template_id}"
  }'

# 3. Trigger URL crawling
curl -X POST http://localhost:8000/sources/crawl \
  -H "Authorization: Bearer {token}" \
  -H "X-Trace-ID: test-trace-456" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "project_id": "{project_id}"
  }'
```

### 4. Pub/Sub Trace Propagation Test

Verify trace context flows through Pub/Sub:

```python
# Test script for Pub/Sub tracing
import asyncio
from uuid import uuid4
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_rag_task

async def test_pubsub_trace():
    logger = get_logger(__name__)
    trace_id = str(uuid4())

    # Publish with trace ID
    message_id = await publish_rag_task(
        logger=logger,
        parent_type="grant_application",
        parent_id=str(uuid4()),
        trace_id=trace_id,
    )

    logger.info("Message published", message_id=message_id, trace_id=trace_id)

asyncio.run(test_pubsub_trace())
```

## Validation Checklist

### 1. Service Startup
- [ ] All services start without OTEL errors
- [ ] Log output includes: "DB connection established"
- [ ] No warnings about missing OTEL configuration

### 2. Request Tracing
- [ ] Backend API requests create spans
- [ ] Spans include HTTP attributes (method, url, status)
- [ ] Database queries appear as child spans

### 3. Pub/Sub Integration
- [ ] Published messages include trace context attributes
- [ ] Subscriber services extract and continue traces
- [ ] Message processing appears as child spans

### 4. Log Correlation
- [ ] All logs include `trace_id` when available
- [ ] Logs include `span_id` for active spans
- [ ] Trace IDs match between services

### 5. Cloud Trace Export
- [ ] Traces appear in Cloud Trace console
- [ ] Service names are correct
- [ ] Span relationships are preserved

## Debugging Tips

### 1. Enable Debug Logging

```python
# In any service
import logging
logging.getLogger("opentelemetry").setLevel(logging.DEBUG)
```

### 2. Check Span Attributes

```python
from opentelemetry import trace

span = trace.get_current_span()
print(f"Span ID: {span.get_span_context().span_id}")
print(f"Trace ID: {span.get_span_context().trace_id}")
print(f"Is Valid: {span.get_span_context().is_valid}")
```

### 3. Verify Exporter Configuration

```python
from opentelemetry import trace

provider = trace.get_tracer_provider()
print(f"Provider: {provider}")
print(f"Resource: {provider.resource.attributes}")
```

## Performance Monitoring

### 1. Check Overhead

Monitor service performance with OTEL enabled vs disabled:

```bash
# Without OTEL
OTEL_SDK_DISABLED=true task dev

# With OTEL
OTEL_SDK_DISABLED=false task dev
```

Expected overhead: < 2% CPU, < 100MB memory per service

### 2. Batch Processing

Verify span batching is working:

```bash
# Check exporter stats
curl http://localhost:8000/metrics | grep otel
```

## Common Issues

### 1. Missing Traces in Cloud Trace

**Symptom**: Traces not appearing in Cloud Console

**Solutions**:
- Verify `ENABLE_CLOUD_TRACE=1` is set
- Check GCP authentication: `gcloud auth list`
- Ensure service account has `roles/cloudtrace.agent`

### 2. Broken Trace Context

**Symptom**: New traces start instead of continuing

**Solutions**:
- Check Pub/Sub attributes include trace context
- Verify `extract_trace_context` is called
- Ensure spans are created with extracted context

### 3. High Memory Usage

**Symptom**: Memory grows over time

**Solutions**:
- Check span batch size configuration
- Verify spans are being exported/closed
- Look for span leaks in long-running operations

## Integration Tests

### 1. Unit Test Example

```python
import pytest
from unittest.mock import patch, MagicMock
from packages.shared_utils.src.tracing import start_span_with_trace_id

@pytest.mark.asyncio
async def test_span_creation():
    with patch('opentelemetry.trace.get_tracer') as mock_tracer:
        mock_span = MagicMock()
        mock_tracer.return_value.start_as_current_span.return_value.__enter__.return_value = mock_span

        with start_span_with_trace_id("test.operation", trace_id="test-123"):
            pass

        mock_span.set_attribute.assert_called_with("trace_id", "test-123")
```

### 2. Integration Test Example

```python
@pytest.mark.asyncio
async def test_pubsub_trace_propagation(async_session_maker):
    # Test that trace context propagates through Pub/Sub
    from packages.shared_utils.src.pubsub import publish_rag_task

    trace_id = str(uuid4())
    logger = get_logger(__name__)

    with start_span_with_trace_id("test.parent", trace_id=trace_id):
        message_id = await publish_rag_task(
            logger=logger,
            parent_type="grant_application",
            parent_id=str(uuid4()),
            trace_id=trace_id,
        )

    assert message_id is not None
    # Verify span was created and exported
```

## Monitoring Dashboard

Create custom dashboard in Cloud Monitoring:

1. **Trace Metrics**:
   - Trace count by service
   - Average trace duration
   - Error rate by service

2. **Span Metrics**:
   - Span count by operation
   - P95 latency by endpoint
   - Database query performance

3. **Custom Metrics**:
   - `grants_processed_total`
   - `files_indexed_total`
   - `rag_queries_total`

## Next Steps

1. **Set up alerts** for high error rates or latency
2. **Create SLOs** based on trace data
3. **Implement sampling** for high-volume endpoints
4. **Add custom instrumentation** for business operations