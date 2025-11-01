# Cloud Functions Architecture

## Overview

Cloud Functions use uv workspace dependencies with a hybrid deployment approach: external dependencies in `requirements.txt`, workspace packages (`db`, `shared-utils`) copied as source code.

## Dependency Management

### Structure

```
pyproject.toml (root)
└── [dependency-groups]
    └── functions = [
          "asyncpg>=0.30.0",
          "functions-framework>=3.8.2",
          ...
          "db",              # workspace package
          "shared-utils"     # workspace package
        ]
```

### Deployment Process

**CI Pipeline** (`deploy-terraform.yaml`):
```bash
# 1. Copy workspace packages
cp -r packages functions/

# 2. Generate requirements.txt (external deps only)
uv export --group functions > functions/dlq_manager/requirements.txt

# 3. Filter workspace packages (already copied)
grep -v "^\./packages/" requirements.txt

# 4. Terraform archives everything
# Result: dlq_manager.zip contains:
#   - main.py
#   - requirements.txt (external deps)
#   - packages/ (workspace code)
```

**Local Development**:
```bash
# Generate requirements.txt
task cloud-functions:generate-requirements

# Deploy
git push origin development  # triggers staging deployment
```

## Functions

### DLQ Manager

**Purpose**: Reconciles stuck jobs in RAG pipeline, monitors DLQs.

**Trigger**: Cloud Scheduler every 5 minutes

**Heuristics**:
- `RagSource` stuck in `INDEXING` > 10min → republish to `file-indexing`
- `RagSource` stuck in `CREATED` > 1hr → republish to indexing topics
- `RagGenerationJob` stuck in `PROCESSING` > 15min → republish to `rag-processing`
- `RagGenerationJob` stuck in `PENDING` > 1hr → republish to `rag-processing`
- DLQ messages detected → log alert (no auto-replay)

**Configuration**:
```hcl
# terraform/modules/cloud_functions/main.tf
resource "google_cloudfunctions2_function" "dlq_manager" {
  runtime     = "python313"
  entry_point = "handle_dlq_reconciliation"
  memory      = "512M"
  timeout     = 540  # 9 minutes
}
```

**Environment Variables**:
- `DATABASE_URL`: PostgreSQL connection string (Cloud SQL)
- `GCP_PROJECT_ID`: GCP project ID
- `ENVIRONMENT`: `staging` or `production`

**IAM Roles**:
- `roles/pubsub.publisher` - republish messages
- `roles/pubsub.subscriber` - check DLQ counts
- `roles/cloudsql.client` - database access

**Imports**:
```python
from packages.db.src.enums import SourceIndexingStatusEnum, RagGenerationStatusEnum
from packages.db.src.tables import RagSource, RagFile, RagUrl, RagGenerationJob
from packages.shared_utils.src.serialization import serialize
```

## File Structure

```
functions/
├── dlq_manager/
│   ├── __init__.py
│   ├── main.py                    # function code
│   ├── requirements.txt           # generated (gitignored)
│   ├── ERROR_CLASSIFICATION.md    # error taxonomy
│   └── README.md
└── packages/                      # copied during CI
    ├── db/
    │   └── src/
    │       ├── tables.py
    │       ├── enums.py
    │       └── utils.py
    └── shared_utils/
        └── src/
            ├── exceptions.py
            ├── serialization.py
            └── logger.py
```

## Terraform Module

**Location**: `terraform/modules/cloud_functions/`

**Resources**:
- `google_cloudfunctions2_function.dlq_manager` - Gen2 function
- `google_service_account.dlq_manager` - service account
- `google_storage_bucket.function_source` - source code bucket
- `google_storage_bucket_object.dlq_manager_source` - source zip
- `data.archive_file.dlq_manager_source` - archives function code

**Usage**:
```hcl
module "cloud_functions" {
  source = "../../modules/cloud_functions"

  project_id             = var.project_id
  region                 = var.region
  environment            = var.environment
  database_url           = module.database.connection_string
  vpc_connector_name     = module.network.vpc_connector_name
  scheduler_invoker_sa   = module.iam.scheduler_service_account_email
}
```

## Error Handling

Functions use categorized exceptions from `packages.shared_utils.src.exceptions`:

```python
class ErrorCategory:
    USER_ERROR = "user_error"        # Not retriable
    RETRIABLE = "retriable"          # Temporary failure
    INFRASTRUCTURE = "infrastructure" # Needs manual intervention
```

**User Errors** (not retriable):
- `FileParsingError` - corrupted/invalid file
- `ValidationError` - invalid data
- `InsufficientContextError` - missing required data

**Retriable Errors**:
- `LLMTimeoutError` - AI API timeout
- `ExternalOperationError` - transient external failure
- `DatabaseError` - temporary DB issue

**Infrastructure Errors** (alert required):
- `EvaluationError` - AI evaluation failure
- Repeated failures after retry limit

## Monitoring

**Logs**:
```bash
# View function logs
gcloud functions logs read dlq-manager-staging \
  --region us-central1 \
  --gen2 \
  --limit 50

# Filter by error
gcloud functions logs read dlq-manager-staging \
  --region us-central1 \
  --gen2 \
  --filter "severity=ERROR"
```

**Metrics**:
- Execution count: Cloud Functions console
- Error rate: `error_type` field in logs
- Republish rate: count of "Republished stuck" log entries

**Alerts**:
- DLQ message count > 0 (logged, not alerted)
- Function execution failures > 5% (Cloud Monitoring)
- Database connection failures (structlog errors)

## Development Workflow

**Add New Function**:
1. Create `functions/new_function/` directory
2. Add function code in `main.py`
3. Update `pyproject.toml` functions group if new deps needed
4. Run `task cloud-functions:generate-requirements`
5. Update terraform module to include new function
6. Deploy via `git push origin development`

**Update Dependencies**:
```bash
# 1. Edit pyproject.toml [dependency-groups] functions
# 2. Sync and regenerate
task update  # runs cloud-functions:generate-requirements automatically
```

**Test Locally**:
```bash
# Install dependencies
uv sync --group functions

# Run with functions-framework
cd functions/dlq_manager
functions-framework --target=handle_dlq_reconciliation --debug
```

## Constraints

- **Package naming**: Use `snake_case` (not `kebab-case`) for function directories
- **Python version**: 3.13 (matches workspace)
- **Import paths**: Use `from packages.db.src...` (not relative imports)
- **Memory limit**: 512MB default, increase for heavy operations
- **Timeout**: 540s default (Cloud Functions Gen2 max: 3600s)
- **Concurrency**: 1 per instance (set via `max_instance_request_concurrency`)

## CI/CD

**Triggers**:
- Push to `development` → staging deployment
- Push to `main` → production deployment
- Manual dispatch → any environment

**Workflow** (`.github/workflows/deploy-terraform.yaml`):
```yaml
- name: Prepare Cloud Functions for deployment
  run: |
    cp -r packages functions/
    uv export --group functions > functions/dlq_manager/requirements.txt
    grep -v "^\./packages/" requirements.txt > requirements.txt.tmp
    mv requirements.txt.tmp requirements.txt
```

**Verification**:
- Terraform detects source code changes via zip hash
- New deployment triggered only if code/config changed
- Plan output shows `google_cloudfunctions2_function.dlq_manager` update

## Troubleshooting

**Import errors** (`ModuleNotFoundError: No module named 'packages'`):
- Verify CI copied `packages/` directory
- Check terraform archive includes `packages/`
- Confirm `source_dir` in `data.archive_file` is correct

**Dependency errors** (`ModuleNotFoundError: No module named 'sqlalchemy'`):
- Regenerate requirements.txt: `task cloud-functions:generate-requirements`
- Verify workspace packages filtered from requirements.txt
- Check `uv export --group functions` includes all deps

**Deployment changes every run**:
- Expected: zip hash changes with any file modification
- Terraform will show update to source object
- Not an error, just terraform detecting code changes

**Function timeout**:
- Increase `timeout_seconds` in terraform config
- Max Gen2 timeout: 3600s (60 minutes)
- Check Cloud SQL connection pool not exhausted
