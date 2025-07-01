# OpenTelemetry Custom Instrumentation Guide

## Overview

This guide shows how to add custom OpenTelemetry instrumentation to GrantFlow services.

## Basic Instrumentation Patterns

### 1. Using the Tracing Utilities

```python
from packages.shared_utils.src.tracing import start_span_with_trace_id, add_span_attributes

async def process_grant_application(application_id: str, trace_id: str | None = None):
    """Example of custom span creation."""

    with start_span_with_trace_id(
        span_name="grant.process_application",
        trace_id=trace_id,
        application_id=application_id,
        operation_type="process",
    ) as span:
        # Your processing logic
        result = await do_processing()

        # Add attributes during execution
        add_span_attributes(
            result_status=result.status,
            items_processed=len(result.items),
        )

        return result
```

### 2. Using Custom Metrics

```python
from packages.shared_utils.src.metrics import grants_processed_total, processing_duration
import time

async def process_grant_with_metrics(grant_id: str):
    """Example of recording custom metrics."""
    start_time = time.time()
    status = "success"

    try:
        # Process the grant
        result = await process_grant(grant_id)

        if result.errors:
            status = "partial_success"

        return result

    except Exception as e:
        status = "error"
        raise

    finally:
        # Record metrics
        duration = time.time() - start_time

        grants_processed_total.add(
            1,
            attributes={
                "service": "rag",
                "grant_type": "application",
                "status": status,
            }
        )

        processing_duration.record(
            duration,
            attributes={
                "operation": "grant_processing",
                "service": "rag",
            }
        )
```

### 3. Instrumenting Database Operations

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

async def get_grant_with_tracing(grant_id: str, session: AsyncSession):
    """Example of manual database operation tracing."""

    with tracer.start_as_current_span("db.get_grant") as span:
        span.set_attribute("db.system", "postgresql")
        span.set_attribute("db.operation", "SELECT")
        span.set_attribute("grant.id", grant_id)

        try:
            result = await session.execute(
                select(GrantApplication).where(GrantApplication.id == grant_id)
            )
            grant = result.scalar_one_or_none()

            span.set_attribute("db.rows_affected", 1 if grant else 0)
            return grant

        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR))
            raise
```

### 4. Instrumenting External API Calls

```python
from packages.shared_utils.src.tracing import start_span_with_trace_id
import httpx

async def call_external_api_with_tracing(url: str, trace_id: str | None = None):
    """Example of tracing external API calls."""

    with start_span_with_trace_id(
        span_name="http.external_api",
        trace_id=trace_id,
        http_method="GET",
        http_url=url,
    ) as span:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url)

                span.set_attribute("http.status_code", response.status_code)
                span.set_attribute("http.response_size", len(response.content))

                response.raise_for_status()
                return response.json()

            except httpx.HTTPStatusError as e:
                span.set_attribute("http.status_code", e.response.status_code)
                span.record_exception(e)
                raise
```

### 5. Instrumenting Batch Operations

```python
from opentelemetry import trace
from packages.shared_utils.src.metrics import files_indexed_total

tracer = trace.get_tracer(__name__)

async def index_files_batch(files: list[dict]):
    """Example of instrumenting batch operations."""

    with tracer.start_as_current_span("indexer.batch_process") as parent_span:
        parent_span.set_attribute("batch.size", len(files))
        parent_span.set_attribute("batch.type", "file_indexing")

        success_count = 0
        error_count = 0

        for file in files:
            with tracer.start_as_current_span(
                "indexer.process_file",
                attributes={
                    "file.name": file["name"],
                    "file.type": file["type"],
                    "file.size": file["size"],
                }
            ) as span:
                try:
                    await process_file(file)
                    success_count += 1

                    files_indexed_total.add(
                        1,
                        attributes={
                            "file_type": file["type"],
                            "status": "success",
                        }
                    )

                except Exception as e:
                    error_count += 1
                    span.record_exception(e)
                    span.set_status(trace.Status(trace.StatusCode.ERROR))

                    files_indexed_total.add(
                        1,
                        attributes={
                            "file_type": file["type"],
                            "status": "error",
                        }
                    )

        parent_span.set_attribute("batch.success_count", success_count)
        parent_span.set_attribute("batch.error_count", error_count)
```

### 6. Instrumenting Long-Running Operations

```python
from opentelemetry import trace
import asyncio

tracer = trace.get_tracer(__name__)

async def long_running_operation_with_checkpoints(job_id: str):
    """Example of instrumenting long operations with checkpoints."""

    with tracer.start_as_current_span("job.long_running") as parent_span:
        parent_span.set_attribute("job.id", job_id)
        parent_span.set_attribute("job.type", "data_processing")

        # Checkpoint 1: Data Loading
        with tracer.start_as_current_span("job.checkpoint.load_data") as span:
            span.set_attribute("checkpoint", "load_data")
            data = await load_large_dataset()
            span.set_attribute("data.rows", len(data))

        # Checkpoint 2: Processing
        with tracer.start_as_current_span("job.checkpoint.process") as span:
            span.set_attribute("checkpoint", "process")
            processed = await process_data(data)
            span.set_attribute("processed.count", len(processed))

        # Checkpoint 3: Save Results
        with tracer.start_as_current_span("job.checkpoint.save") as span:
            span.set_attribute("checkpoint", "save_results")
            await save_results(processed)
            span.set_attribute("save.status", "completed")

        parent_span.set_attribute("job.status", "completed")
```

### 7. Context Propagation in Async Tasks

```python
from opentelemetry import trace, context
import asyncio

async def spawn_background_task_with_context(task_func, *args):
    """Example of propagating trace context to background tasks."""

    # Capture current context
    current_context = context.get_current()

    async def wrapped_task():
        # Attach context to the new task
        token = context.attach(current_context)
        try:
            return await task_func(*args)
        finally:
            context.detach(token)

    # Create background task with context
    return asyncio.create_task(wrapped_task())

# Usage
async def main_operation():
    with tracer.start_as_current_span("main.operation"):
        # This background task will inherit the trace context
        task = await spawn_background_task_with_context(
            process_in_background,
            "data"
        )

        # Continue with main operation
        await do_other_work()

        # Wait for background task
        result = await task
```

## Best Practices

### 1. Span Naming Conventions

Use hierarchical naming:
- `service.operation.suboperation`
- `db.query.select`
- `http.external.api_name`
- `pubsub.publish.topic_name`

### 2. Essential Span Attributes

Always include:
- Resource identifiers (IDs, names)
- Operation type
- Status/result
- Error information (if applicable)

### 3. Metric Naming Conventions

Follow Prometheus naming:
- `service_operation_total` (counters)
- `service_operation_duration_seconds` (histograms)
- `service_operation_active` (gauges)

### 4. Performance Considerations

- Use sampling for high-volume operations
- Batch span exports
- Limit attribute values to reasonable sizes
- Avoid creating spans in tight loops

### 5. Error Handling

```python
with tracer.start_as_current_span("operation") as span:
    try:
        result = await risky_operation()
        span.set_attribute("result", "success")
        return result
    except ValidationError as e:
        # Record exception but don't set error status for expected errors
        span.record_exception(e, escaped=False)
        span.set_attribute("result", "validation_error")
        raise
    except Exception as e:
        # Set error status for unexpected errors
        span.record_exception(e)
        span.set_status(trace.Status(trace.StatusCode.ERROR))
        span.set_attribute("result", "error")
        raise
```

## Testing Custom Instrumentation

```python
import pytest
from unittest.mock import MagicMock, patch
from opentelemetry import trace

@pytest.fixture
def mock_tracer():
    """Fixture for testing with mock tracer."""
    with patch('opentelemetry.trace.get_tracer') as mock_get_tracer:
        mock_tracer = MagicMock()
        mock_span = MagicMock()

        # Setup mock to work with context manager
        mock_tracer.start_as_current_span.return_value.__enter__.return_value = mock_span
        mock_tracer.start_as_current_span.return_value.__exit__.return_value = None

        mock_get_tracer.return_value = mock_tracer

        yield mock_tracer, mock_span

async def test_custom_instrumentation(mock_tracer):
    mock_tracer_instance, mock_span = mock_tracer

    # Test your instrumented function
    await your_instrumented_function()

    # Verify span was created with correct name
    mock_tracer_instance.start_as_current_span.assert_called_with("expected.span.name")

    # Verify attributes were set
    mock_span.set_attribute.assert_any_call("expected_key", "expected_value")
```