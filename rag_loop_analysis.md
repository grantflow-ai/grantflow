# RAG Pipeline Infinite Loop Analysis

## Problem Summary
The RAG service is stuck in an infinite loop where it continuously processes the same grant template job but never completes successfully.

## Key Loop Pattern

### 1. Job Status Issue
- Job ID: `aac75e3b-e00a-4b2a-89a8-7251f2e77d2e`
- Template ID: `b54344d7-1083-441c-b759-991408680bb5`
- **Status: FAILED** (but pipeline keeps trying to process it)

### 2. Repetitive Processing Cycle
```
Processing request → Job already exists (FAILED) → Grant template pipeline started → PubSub message → Processing request...
```

### 3. Timeline Evidence (16:35-16:42)
```
16:41:59 - Processing request (trace: dc2193dc-815f-4969-bb63-998a518ffa5f)
16:41:59 - Job already exists for template, returning existing job (status: FAILED)
16:41:59 - Grant template pipeline started (stage: ANALYZE_CFP_CONTENT)
16:42:01 - Published message to process RAG (message_id: 79)
16:42:01 - Processing request (trace: 5f18799b-4243-436e-a913-bd0a84e4962f)
16:42:01 - Job already exists for template, returning existing job (status: FAILED)
16:42:01 - Grant template pipeline started (stage: ANALYZE_CFP_CONTENT)
```

## Root Cause Analysis

### Issue 1: Failed Job Retry Logic
- The system finds an existing FAILED job
- Instead of handling the failure or creating a new job, it restarts the same failed job
- The job fails again, creating an infinite retry loop

### Issue 2: Stage Inconsistency
- Job shows `FAILED` status
- But pipeline restarts at `ANALYZE_CFP_CONTENT` stage (should be checking why it failed)
- No failure reason/error handling visible in logs

### Issue 3: PubSub Self-Triggering
- Each pipeline iteration publishes a new PubSub message
- This message triggers another processing cycle
- No circuit breaker or max retry limit

## Recommended Fixes

1. **Add Retry Limits**: Implement maximum retry count for failed jobs
2. **Failure Analysis**: Before retrying failed jobs, analyze and log the failure reason
3. **Job Reset Logic**: Either create new jobs for retries or properly reset failed job state
4. **Circuit Breaker**: Add PubSub message deduplication/rate limiting
5. **Error Visibility**: Improve error logging to understand why jobs are failing

## Current State
- Service is consuming resources in infinite processing loop
- Same job processed ~every 2-3 seconds
- No actual progress being made on grant template generation
- Multiple trace IDs indicate separate processing attempts for same job