# CI/CD Architecture

## Overview

GrantFlow uses a modern GitOps approach with GitHub Actions for continuous integration and deployment. The architecture emphasizes reusable components, parallel execution, and environment-specific deployments.

## Core Principles

### 1. Actions-First Architecture
- Reusable composite actions in `.github/actions/`
- DRY principle - no duplicate workflow logic
- Standardized patterns across all services

### 2. Branch-Based Deployment Strategy
- `development` → Staging environment (auto-deploy)
- `main` → Production environment (auto-deploy)
- Feature branches → CI only (no deployment)

### 3. Service Independence
- Each service has its own build/deploy workflow
- Path-based triggers for efficient CI
- Parallel deployments with independent lifecycles

## Workflow Categories

### Build & Deploy Workflows (`build-service-*.yaml`)

These workflows handle the complete build and deployment pipeline for each service:

```yaml
Pattern: build-service-{service}.yaml
Services: backend, crawler, indexer, rag, scraper, frontend, crdt
```

**Key Features:**
- Triggered on push to main/development branches
- Path-based filtering for efficiency
- Docker image building with caching
- Automatic deployment to Cloud Run
- Environment-specific tagging

**Image Tagging Convention:**
```
development branch → staging-{sha}, staging-latest
main branch → {sha}, latest
release → {release-tag}
```

### CI Workflows (`ci-*.yaml`)

Continuous integration workflows run on pull requests and pushes:

```yaml
Pattern: ci-service-{service}.yaml, ci-package-{package}.yaml
Coverage: All services and shared packages
```

**Standard CI Jobs:**
- `test` - Unit and integration tests
- `typecheck` - Type validation (Python/TypeScript)
- `lint` - Code quality checks
- `build` - Build verification

### E2E Test Workflows (`e2e-service-*.yaml`)

Long-running end-to-end tests with multiple test categories:

```yaml
Pattern: e2e-service-{service}.yaml
Services: rag, indexer, crawler, scraper
Test Markers:
  - smoke (< 1 min) - Essential functionality validation
  - quality_assessment (2-5 min) - Moderate quality checks
  - e2e_full (10+ min) - Complete integration testing
  - semantic_evaluation - Semantic similarity validation
  - ai_eval - AI-powered quality assessment
```

**Features:**
- Manual trigger via workflow_dispatch with marker selection
- PostgreSQL service container (pgvector/pgvector:pg17)
- Environment-specific secrets for LLM access
- Separate jobs for different test categories
- Timeout configuration per test category

### Validation Workflows

#### `validate.yaml`
- Runs on all PRs to main
- Comprehensive linting across all languages
- Path-based change detection
- Cached dependencies for speed

#### `pr-title.yaml`
- Validates PR titles follow conventional commits
- Ensures clean commit history
- Automatic feedback on non-compliant titles

## Reusable Actions

### Setup Actions

#### `setup-gcp`
- Authenticates with Google Cloud
- Uses Workload Identity Federation
- No long-lived credentials
- Returns access token for other steps

#### `setup-task`
- Installs Task runner
- Cached for performance
- Used across all workflows

#### `setup-node-workspace`
- Sets up Node.js environment
- Installs pnpm
- Caches dependencies
- Workspace-aware setup

### Build & Deploy Actions

#### `build-service`
```yaml
Inputs:
  - service: Service name
  - image_tag: Docker tag
  - workload_identity_provider: WIF provider
  - service_account: GCP service account
  - build_args: Docker build arguments

Process:
  1. Free disk space (removes unnecessary tools)
  2. Setup GCP authentication
  3. Configure Docker Buildx
  4. Login to Artifact Registry
  5. Build with layer caching
  6. Push to registry with multiple tags
```

#### `deploy-cloud-run`
```yaml
Inputs:
  - service: Service name
  - image_tag: Image to deploy
  - environment: staging/production
  - project_id: GCP project

Process:
  1. Authenticate with GCP
  2. Deploy to Cloud Run with --no-traffic
  3. Health check new revision
  4. Migrate traffic to new revision
  5. Tag as latest for environment
```

### Test Actions

#### `run-python-tests`
- Sets up Python environment with uv
- Installs dependencies
- Runs pytest with coverage
- Uploads coverage reports

#### `run-python-e2e-tests`
- Extended version for E2E tests
- Configures test markers
- Sets up environment variables
- Handles longer timeouts

#### `run-frontend-e2e-tests`
- Playwright browser setup
- Mock environment configuration
- Screenshot and video artifacts
- Test result uploading

## Environment Configuration

### Workload Identity Federation

```yaml
WIF_PROVIDER: projects/362880548799/locations/global/workloadIdentityPools/github/providers/github-actions-pool
WIF_SERVICE_ACCOUNT: githubactions@grantflow.iam.gserviceaccount.com
```

- No stored credentials
- Short-lived tokens
- Automatic rotation
- Audit trail in GCP

### Environment Variables

**Build-time Variables:**
- Set in workflow files
- Used for Docker build args
- Frontend requires all NEXT_PUBLIC_* vars

**Runtime Variables:**
- Stored in GCP Secret Manager
- Mounted to Cloud Run services
- Never exposed in logs

### Secrets Management

**GitHub Secrets:**
- `DISCORD_WEBHOOK_URL` - Alert notifications
- `LLM_SERVICE_ACCOUNT_CREDENTIALS` - AI service auth
- `GOOGLE_CLOUD_PROJECT` - Project ID
- `GOOGLE_CLOUD_REGION` - Deployment region

**Secret Usage Pattern:**
```yaml
env:
  SENSITIVE_VAR: ${{ secrets.SECRET_NAME }}
```

## Deployment Pipeline

### 1. Code Push
```
Developer → Push to branch → GitHub
```

### 2. CI Pipeline (Pull Requests)
```
PR Created → CI Workflows → Tests/Lint/Build → Status Checks → Ready for Review
```

### 3. Build Pipeline (main/development)
```
Merge to branch → Build Service → Push to Registry → Tag Images
```

### 4. Deployment Pipeline
```
Image Ready → Deploy to Cloud Run → Health Check → Traffic Migration → Complete
```

### 5. Monitoring
```
Deployment → Cloud Monitoring → Alerts → Discord Notifications
```

## Performance Optimizations

### Caching Strategy

**Docker Layer Caching:**
```yaml
cache-from: type=registry,ref=.../service:buildcache
cache-to: type=registry,ref=.../service:buildcache,mode=max
```

**Dependency Caching:**
- pnpm store caching
- uv cache for Python
- Task binary caching
- Linter cache persistence

**Disk Space Management:**
```bash
# Aggressive cleanup in build actions
sudo rm -rf /usr/share/dotnet /opt/ghc
docker system prune -af --volumes
```

### Parallel Execution

**Matrix Builds:**
- Services deployed in parallel
- Independent test suites
- Fail-fast disabled for resilience

**Concurrent Jobs:**
- Separate jobs for test/lint/build
- Path filtering to skip unchanged code
- Resource-optimized runner selection

## Workflow Triggers

### Push Triggers
```yaml
on:
  push:
    branches: [main, development]
    paths:
      - 'services/backend/**'
      - 'packages/**'
```

### Pull Request Triggers
```yaml
on:
  pull_request:
    branches: [main, development]
    types: [opened, synchronize, reopened]
```

### Manual Triggers
```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]
```

### Scheduled Triggers
```yaml
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC (scheduled-smoke-tests.yaml)
```

**Scheduled Workflows:**
- `scheduled-smoke-tests.yaml` - Daily smoke tests with Discord notifications
- Runs against development branch by default
- Can be manually triggered with branch selection

## Deployment Strategies

### Blue-Green Deployment
1. Deploy new version with `--no-traffic`
2. Run health checks on new revision
3. Gradually shift traffic (optional)
4. Full traffic migration
5. Keep old revision for rollback

### Rollback Strategy
```bash
# Automatic rollback on health check failure
gcloud run services update-traffic $SERVICE \
  --to-revisions=PREVIOUS=100

# Manual rollback via GitHub Actions re-run
```

### Feature Flags
- Environment variables for feature toggling
- Mock modes for testing (`NEXT_PUBLIC_MOCK_API`)
- Gradual rollout capabilities

## Security Considerations

### Supply Chain Security
- Pinned action versions (`@v5`)
- Dependency scanning in CI
- Container scanning with Trivy
- SBOM generation for releases

### Secret Protection
- No secrets in workflow logs
- Masked sensitive outputs
- Short-lived tokens only
- Audit logging enabled

### Access Control
- Branch protection rules
- Required status checks
- PR reviews required
- Admin bypass disabled

## Monitoring & Observability

### Build Metrics
- Workflow run duration
- Success/failure rates
- Resource utilization
- Cache hit rates

### Deployment Metrics
- Deployment frequency
- Lead time for changes
- Mean time to recovery
- Change failure rate

### Alerting
- Failed deployments → Discord
- Long-running workflows → Timeout
- Security issues → Immediate notification

## Best Practices

### Workflow Design
1. Keep workflows focused and single-purpose
2. Use reusable actions for common tasks
3. Implement proper error handling
4. Add meaningful job names and descriptions

### Testing Strategy
1. Run fast tests first (unit → integration → E2E)
2. Use test markers for categorization
3. Parallelize where possible
4. Cache test dependencies

### Deployment Safety
1. Always deploy with `--no-traffic` first
2. Implement comprehensive health checks
3. Keep previous revisions available
4. Document rollback procedures

### Cost Optimization
1. Use path filters to avoid unnecessary runs
2. Implement aggressive caching
3. Clean up resources after use
4. Use appropriate runner sizes

## Troubleshooting

### Common Issues

**Docker Space Issues:**
```bash
# Add to workflow
- name: Free Disk Space
  run: |
    docker system prune -af
    sudo rm -rf /usr/share/dotnet
```

**Cache Misses:**
```yaml
# Use multiple restore keys
restore-keys: |
  cache-${{ runner.os }}-${{ hashFiles('**/lock') }}
  cache-${{ runner.os }}-
  cache-
```

**Authentication Failures:**
```yaml
# Verify WIF configuration
- name: Debug Auth
  run: |
    gcloud auth list
    gcloud config list
```

## Future Improvements

### Planned Enhancements
- Deployment previews for PRs
- Automated dependency updates
- Performance regression testing
- Cost analysis per deployment

### Optimization Opportunities
- Incremental builds for monorepo
- Distributed caching system
- Self-hosted runners for heavy workloads
- GitOps with Flux/ArgoCD integration