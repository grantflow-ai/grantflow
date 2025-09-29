# DLQ Manager Cloud Function

Automated monitoring and reconciliation service for stuck jobs in the RAG pipeline.

## Overview

The DLQ Manager runs every 5 minutes via Cloud Scheduler to detect and fix stuck jobs that haven't progressed through the RAG pipeline.

## Heuristics

### 1. Stuck Indexing Sources (>10 minutes)
**Status**: `INDEXING`
**Timeout**: 10 minutes since `indexing_started_at`
**Action**: Republish to `file-indexing` or `url-crawling` topic

### 2. Stuck Created Sources (>1 hour)
**Status**: `CREATED`
**Timeout**: 60 minutes since `created_at`
**Action**: Republish to `file-indexing` or `url-crawling` topic

### 3. Stuck Processing Jobs (>15 minutes)
**Status**: `PROCESSING`
**Timeout**: 15 minutes since `started_at`
**Action**: Republish to `rag-processing` topic

### 4. Stuck Pending Jobs (>1 hour)
**Status**: `PENDING`
**Timeout**: 60 minutes since `created_at`
**Action**: Republish to `rag-processing` topic

### 5. DLQ Monitoring
**Condition**: Messages exist in DLQ
**Action**: Log warning (manual investigation required)

## Architecture

```
Cloud Scheduler (*/5 * * * *)
    ↓
DLQ Manager Cloud Function
    ↓
Queries PostgreSQL
    ↓
Republishes to Pub/Sub Topics:
  - file-indexing
  - url-crawling
  - rag-processing
```

## Deployment

The function is deployed via Terraform as part of the staging/production infrastructure.

### Source Code Sharing

Uses monorepo pattern with shared packages:
- `packages/db` - Database models and enums
- `packages/shared_utils` - Logging and serialization

Deployment includes these packages via `.gcloudignore` configuration.

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `GCP_PROJECT_ID` - Google Cloud project ID
- `ENVIRONMENT` - staging or production

### IAM Permissions

Service account `dlq-manager-{environment}` has:
- `roles/pubsub.publisher` - Republish messages
- `roles/pubsub.subscriber` - Check DLQ status
- `roles/cloudsql.client` - Database access

## Testing Locally

```bash
# Install dependencies
cd functions/dlq-manager
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql+asyncpg://..."
export GCP_PROJECT_ID="grantflow"
export ENVIRONMENT="staging"

# Run locally with Functions Framework
functions-framework --target=handle_dlq_reconciliation --debug
```

## Monitoring

View logs in Cloud Console:
```
gcloud functions logs read dlq-manager-staging \
  --region=us-central1 \
  --limit=50
```

View scheduler job status:
```
gcloud scheduler jobs describe dlq-reconciliation-staging \
  --location=us-central1
```

## Manual Trigger

```bash
# Trigger via Cloud Scheduler
gcloud scheduler jobs run dlq-reconciliation-staging \
  --location=us-central1

# Or invoke function directly
curl -X POST "$(gcloud functions describe dlq-manager-staging \
  --region=us-central1 --format='value(serviceConfig.uri)')" \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)"
```

## Alerts

When DLQ messages exceed threshold (currently just logs warning):
- Check Cloud Console → Pub/Sub → Subscriptions → DLQ subscriptions
- Manually inspect messages to identify root cause
- Purge DLQ after fixing root cause

## Future Enhancements

1. **Slack/Discord Alerts** - Notify team when DLQ threshold exceeded
2. **Metrics Dashboard** - Track reconciliation stats over time
3. **Automatic DLQ Replay** - Safely replay DLQ messages when count is low
4. **Stuck Job Patterns** - ML-based detection of recurring issues