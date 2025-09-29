# Error Classification for DLQ Manager

## Overview

Based on analysis of indexer, crawler, and RAG services, errors fall into three categories:
1. **User Errors** - Communicated to user, NOT retriable
2. **Retriable Errors** - Temporary failures, SHOULD retry
3. **Alert-Worthy Errors** - Infrastructure issues, need Discord alert

## Indexer Service (`services/indexer`)

### User Errors (NOT Retriable)
- **FileParsingError** - Invalid file format, corrupted PDF, unsupported content
  - Example: PDF with no extractable text, encrypted documents
  - **Action**: Already marked as FAILED with notification to user
  - **DLQ Manager**: Skip republishing

- **ValidationError** - Missing source_id, rag_file not found, source already deleted
  - Example: "Rag file not found", "Rag source not found"
  - **Action**: Already marked as FAILED with notification
  - **DLQ Manager**: Skip republishing

### Retriable Errors (SHOULD Retry)
- **ExternalOperationError** - GCS download failure, embedding API timeout
  - Example: "Failed to download blob", "OpenAI API timeout"
  - **Action**: Marked as FAILED but can be retried
  - **DLQ Manager**: Republish to `file-indexing` topic

- **Generic Exception** - Unexpected errors (database connection loss, etc.)
  - Example: Network timeouts, temporary database issues
  - **Action**: Marked as FAILED, logged
  - **DLQ Manager**: Republish with max retry limit

### Alert-Worthy Errors
- **Repeated ExternalOperationError** - If same source fails > 3 times
  - **Action**: Discord alert "Indexer infrastructure issue"
  - Example: "GCS consistently unavailable", "Embedding service down"

### Current Behavior
```python
# services/indexer/src/main.py:305
is_retryable_error=isinstance(e, (FileParsingError, ExternalOperationError, ValidationError))
```

**Problem**: This is WRONG - FileParsingError and ValidationError are NOT retriable

## Crawler Service (`services/crawler`)

### User Errors (NOT Retriable)
- **ValidationError** - Invalid message format, missing required fields
  - Example: "Invalid PubSub message"
  - **Action**: Acknowledged without retry
  - **DLQ Manager**: Skip republishing

- **DatabaseError** - Failed to create RagFile entry (constraint violation)
  - Example: Unique constraint on bucket/object path
  - **Action**: Logged, might be duplicate
  - **DLQ Manager**: Skip republishing (likely duplicate)

### Retriable Errors (SHOULD Retry)
- **Generic Exception** - Network failures, temporary crawler issues
  - Example: Firecrawl API timeout, GCS upload failure
  - **Action**: Marked as FAILED
  - **DLQ Manager**: Republish to `url-crawling` topic

### Alert-Worthy Errors
- **Repeated crawling failures** - Same URL fails > 3 times
  - **Action**: Discord alert "Crawler infrastructure issue"

### Current Behavior
Crawler ALWAYS marks failures as FAILED and moves on - proper behavior.

## RAG Service (`services/rag`)

### User Errors (NOT Retriable)
- **ValidationError** - Missing/invalid grant application, insufficient sources
  - Example: "Grant application not found", "No sources indexed"
  - **Action**: Acknowledged without retry (line 318-329 in main.py)
  - **DLQ Manager**: Skip republishing

- **RagJobCancelledError** - User manually cancelled job
  - **Action**: Acknowledged, job stays CANCELLED
  - **DLQ Manager**: Skip republishing

- **InsufficientContextError** - Not enough documents for autofill
  - Example: "Documents don't contain sufficient information"
  - **Action**: User notification sent, job marked FAILED
  - **DLQ Manager**: Skip republishing

### Retriable Errors (SHOULD Retry)
- **LLMTimeoutError** - OpenAI/Anthropic/Vertex API timeout
  - **Action**: Job marked FAILED with error_details
  - **DLQ Manager**: Republish to `rag-processing` topic
  - **Max Retries**: 3 attempts (check retry_count in job)

- **RagError** - Generic RAG processing failure
  - **Action**: Job marked FAILED with error_details
  - **DLQ Manager**: Republish if retry_count < 3

- **Generic Exception** - Unexpected errors
  - **Action**: Raised (Pub/Sub will retry automatically)
  - **DLQ Manager**: Republish if job retry_count < 3

### Alert-Worthy Errors
- **Repeated LLMTimeoutError** - Same job fails > 3 times
  - **Action**: Discord alert "LLM service degraded"

- **EvaluationError** - Quality evaluation failing repeatedly
  - **Action**: Discord alert "RAG quality issues"

### Current Behavior
```python
# services/rag/src/grant_template/pipeline.py:214-221
await job_manager.update_job_status(
    status=RagGenerationStatusEnum.FAILED,
    error_message=detailed_error_message,
    error_details={
        "error_type": e.__class__.__name__,
        "error_message": str(e),
        "context": error_context,
        "traceback": error_traceback,
        "stage": current_stage.value,
    }
)
```

RAG stores detailed error information - we can use this!

## DLQ Manager Decision Logic

### Query Database for Error Type
```python
# For RagSource
if source.indexing_status == SourceIndexingStatusEnum.FAILED:
    # NO error_type stored - must use heuristics
    # If stuck in FAILED > 24 hours → assume user error, skip
    # If recently failed → retry once

# For RagGenerationJob
if job.status == RagGenerationStatusEnum.FAILED:
    error_type = job.error_details.get("error_type") if job.error_details else None

    if error_type in ["ValidationError", "RagJobCancelledError", "InsufficientContextError"]:
        # User error - skip
        return False

    if error_type in ["LLMTimeoutError", "RagError", "ExternalOperationError"]:
        # Retriable - check retry count
        if job.retry_count >= 3:
            # Alert and skip
            alert_discord(f"Job {job.id} failed {job.retry_count} times")
            return False
        return True  # Republish

    # Unknown error - retry once with caution
    if job.retry_count == 0:
        return True
    return False
```

### Timeouts for Stuck Jobs

**Current Heuristics** (too aggressive):
- INDEXING > 10 minutes → retry ❌ (should be 30 minutes)
- CREATED > 1 hour → retry ❌ (should be 4 hours)
- PROCESSING > 15 minutes → retry ❌ (should be 60 minutes)
- PENDING > 1 hour → retry ✅ (correct)

**Why?**
- Indexer can take 10-30 minutes for large PDFs
- RAG processing can take 30-60 minutes for complex generation
- False positives cause duplicate processing

## Proposed Database Changes

### Add error tracking to RagSource
```sql
ALTER TABLE rag_sources
ADD COLUMN error_type VARCHAR(255),
ADD COLUMN error_message TEXT,
ADD COLUMN retry_count INTEGER DEFAULT 0,
ADD COLUMN last_retry_at TIMESTAMP WITH TIME ZONE;
```

### Update services to log error_type
Both indexer and crawler should store `error_type` on failure:
```python
# In indexer/crawler exception handler
await session.execute(
    update(RagSource)
    .where(RagSource.id == source_id)
    .values(
        indexing_status=SourceIndexingStatusEnum.FAILED,
        error_type=type(e).__name__,
        error_message=str(e),
    )
)
```

## Implementation Priority

### Phase 1: Fix Timeouts (Immediate)
- INDEXING timeout: 10 min → 30 min
- PROCESSING timeout: 15 min → 60 min
- CREATED timeout: 60 min → 4 hours

### Phase 2: Add Error Type Checking (Next)
- Add `error_type`, `retry_count` to `rag_sources`
- Update indexer/crawler to store error_type
- DLQ manager checks error_type before republishing

### Phase 3: Discord Alerts (After Phase 2)
- Alert on retry_count > 3
- Alert on specific infrastructure errors
- Daily summary of DLQ status

### Phase 4: Smart Retry Logic
- Exponential backoff based on error type
- Different timeouts for different error types
- Circuit breaker for infrastructure failures