# RAG Infinite Loop - Root Cause Analysis

## Exact Location of the Issue

The infinite loop occurs in the interaction between these files:
1. `services/rag/src/utils/job_manager.py` - Line 245+ (GrantTemplateJobManager.get_or_create_job)
2. `services/rag/src/grant_template/pipeline.py` - Line 89 (to_next_job_stage call)
3. `services/rag/src/utils/job_manager.py` - Line 382+ (publish_rag_task call)

## The Exact Loop Flow (Traced via 3300839d-6d39-430a-bf70-e2e0430ff1f8)

### Step 1: Job Retrieval (job_manager.py:245+)
```python
# GrantTemplateJobManager.get_or_create_job()
existing_job = await session.execute(
    select_active(GrantTemplateGenerationJob).where(
        GrantTemplateGenerationJob.grant_template_id == self.parent_id
    )
)
if existing_job:
    logger.info("Job already exists for template, returning existing job")  # ← This logs
    return existing_job  # ← Returns FAILED job!
```

### Step 2: Pipeline Execution (pipeline.py:89)
```python
# handle_grant_template_pipeline()
case GrantTemplateStageEnum.ANALYZE_CFP_CONTENT:
    analyzed_cfp = await handle_cfp_analysis_stage(...)
    await job_manager.to_next_job_stage(analyzed_cfp)  # ← This succeeds!
```

### Step 3: PubSub Publishing (job_manager.py:382+)
```python
# GrantApplicationJobManager.to_next_job_stage()
await publish_rag_task(
    parent_id=self.parent_id,
    parent_type=self.parent_type,
    stage=next_stage,  # ← Publishes next stage
    trace_id=self.trace_id,
)
```

### Step 4: Loop Restart
- PubSub message triggers new processing request
- Same FAILED job is returned again
- Pipeline processes successfully again
- Publishes another message → **INFINITE LOOP**

## The Core Problem

**The pipeline is treating FAILED jobs as valid for processing!**

Looking at the trace:
1. `16:35:52` - Job exists with status FAILED, but pipeline starts anyway
2. `16:37:11` - CFP analysis completes successfully, publishes next stage
3. `16:37:14` - New request processes same FAILED job again
4. `16:39:23` - Pattern repeats indefinitely

## Why This Happens

### Issue 1: No Status Check
In `pipeline.py:50`, the code calls:
```python
job = await job_manager.get_or_create_job()
```

But `get_or_create_job()` returns FAILED jobs without any status validation.

### Issue 2: Wrong Status Condition
In `pipeline.py:62`:
```python
if job.status == RagGenerationStatusEnum.PENDING:
    await job_manager.update_job_status(RagGenerationStatusEnum.PROCESSING)
```

This only updates PENDING jobs to PROCESSING, but FAILED jobs are never updated!

### Issue 3: Successful Processing of Failed Jobs
The pipeline successfully processes stages even when the overall job status is FAILED, leading to contradictory state.

## The Fix

The pipeline should handle FAILED jobs by either:

1. **Creating a new job** instead of reusing failed ones
2. **Resetting the failed job** to PENDING/PROCESSING before proceeding
3. **Refusing to process** FAILED jobs and logging the error

## Evidence from Logs

```
16:35:52 - "Job already exists for template, returning existing job" (status: FAILED)
16:35:52 - "Grant template pipeline started" (stage: EXTRACT_CFP_CONTENT)
16:37:11 - CFP analysis succeeds, publishes next stage
16:37:14 - "Job already exists for template, returning existing job" (status: FAILED)
16:37:14 - "Grant template pipeline started" (stage: ANALYZE_CFP_CONTENT)
```

The job status never changes from FAILED, but processing continues successfully.