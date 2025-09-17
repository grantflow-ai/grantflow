# CI/CD Workflows

## Overview

Our CI/CD pipeline follows a two-stage approach:
1. **Build Stage**: Individual services are built and pushed to Artifact Registry
2. **Deploy Stage**: Terraform applies infrastructure changes after all builds complete

## Build Workflows

Each service has its own build workflow that triggers on changes to relevant paths:

- `build-backend.yaml` - Backend API service
- `build-crawler.yaml` - Web crawler service
- `build-indexer.yaml` - Document indexing service
- `build-rag.yaml` - RAG processing service
- `build-scraper.yaml` - Grant scraper service
- `build-crdt.yaml` - CRDT collaboration server
- `build-frontend.yaml` - Next.js frontend application

All service builds use the shared `build-service.yaml` workflow template.

## Deploy Workflow

`deploy-terraform.yaml` handles all deployments via Terraform/OpenTofu:

### Triggers
- Automatically after ANY build workflow completes successfully
- Only deploys when ALL required services have successful builds for the commit
- Manual trigger via workflow_dispatch

### Environments
- `development` branch → `staging` environment
- `main` branch → `production` environment

### Process
1. Checks that all required build workflows succeeded
2. Runs `tofu plan` to preview changes
3. Requires manual approval for production deployments
4. Applies changes with `tofu apply`
5. Updates traffic routing to new revisions

## Key Features

### Separation of Concerns
- Build workflows ONLY build and push Docker images
- Deploy workflow ONLY handles infrastructure changes via Terraform
- No direct `gcloud run deploy` commands in CI

### Safety Mechanisms
- Waits for all builds to complete before deploying
- Manual approval gates for production
- Automatic rollback on deployment failures
- Concurrent deployment prevention via concurrency groups

### Terraform State Management
- Remote state stored in GCS bucket
- State locking prevents concurrent modifications
- Separate state files for staging and production

## Manual Deployment

To manually trigger a deployment:
1. Go to Actions → Deploy with Terraform
2. Click "Run workflow"
3. Select environment and options
4. Click "Run workflow"

## Troubleshooting

### Build Failures
- Check individual build workflow logs
- Verify Docker build context and Dockerfile
- Ensure all dependencies are available

### Deployment Failures
- Check Terraform plan output for errors
- Verify GCP permissions for service accounts
- Check for state lock conflicts
- Review Terraform logs in the workflow run

### Partial Deployments
The deploy workflow will NOT run if any required build fails. To force a deployment:
1. Fix the failing build
2. Re-run the failed workflow
3. Once all succeed, deployment will trigger automatically

## Development Workflow

1. Create feature branch from `development`
2. Make changes to services
3. Push changes - builds trigger automatically
4. Once all builds pass, Terraform deployment runs
5. Verify changes in staging environment
6. Create PR to `main` for production deployment