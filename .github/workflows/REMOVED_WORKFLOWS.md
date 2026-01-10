# Removed Workflows Documentation

This document tracks all GitHub Actions workflows that have been removed and the rationale behind their removal.

## Removed Workflow Files

### 1. `build-service.yaml`
- **Purpose**: Shared workflow template for building service Docker images
- **Reason for Removal**: Not used in current CI/CD architecture. Individual service builds were replaced with unified CI workflows per service (e.g., `ci-service-backend.yaml`, `ci-service-crawler.yaml`, etc.)
- **Removal Date**: 2026-01-10

### 2. `build-backend.disabled.yaml`
- **Purpose**: Build and push backend service to Artifact Registry
- **Reason for Removal**: Replaced by `ci-service-backend.yaml` which handles both testing and validation. Deployment to GCP has been moved to manual processes with self-hosting guidance
- **Removal Date**: 2026-01-10

### 3. `build-crawler.disabled.yaml`
- **Purpose**: Build and push crawler service to Artifact Registry
- **Reason for Removal**: Replaced by `ci-service-crawler.yaml`. Cloud Run deployment removed for simplified self-hosting
- **Removal Date**: 2026-01-10

### 4. `build-crdt.disabled.yaml`
- **Purpose**: Build and push CRDT collaboration server to Artifact Registry
- **Reason for Removal**: Replaced by `ci-service-crdt.yaml`
- **Removal Date**: 2026-01-10

### 5. `build-frontend.disabled.yaml`
- **Purpose**: Build and push Next.js frontend to Firebase App Hosting
- **Reason for Removal**: Replaced by `ci-frontend.yaml`. Firebase deployment functionality removed for manual deployment guidance
- **Removal Date**: 2026-01-10

### 6. `build-indexer.disabled.yaml`
- **Purpose**: Build and push indexer service to Artifact Registry
- **Reason for Removal**: Replaced by `ci-service-indexer.yaml`
- **Removal Date**: 2026-01-10

### 7. `build-rag.disabled.yaml`
- **Purpose**: Build and push RAG processing service to Artifact Registry
- **Reason for Removal**: Replaced by `ci-service-rag.yaml`
- **Removal Date**: 2026-01-10

### 8. `build-scraper.disabled.yaml`
- **Purpose**: Build and push grant scraper service to Artifact Registry
- **Reason for Removal**: Replaced by `ci-service-scraper.yaml`
- **Removal Date**: 2026-01-10

### 9. `deploy-terraform.disabled.yaml`
- **Purpose**: Automatic deployment via Terraform/OpenTofu after builds complete
- **Reason for Removal**: Infrastructure deployment is now manual via Terraform CLI. CI pipelines focus on validation only (`ci-terraform.yaml`). See `/terraform/README.md` for manual deployment instructions
- **Removal Date**: 2026-01-10

### 10. `deploy-storybook.yaml`
- **Purpose**: Deploy Storybook documentation to hosting
- **Reason for Removal**: Not actively used in current development workflow. Can be re-added when Storybook is part of the design system strategy
- **Removal Date**: 2026-01-10

### 11. `scheduled-smoke-tests.disabled.yaml`
- **Purpose**: Scheduled smoke tests on staging/production environments
- **Reason for Removal**: Can be re-implemented when environment status and monitoring dashboards are available. Currently replaced by on-demand E2E test workflows
- **Removal Date**: 2026-01-10

### 12. `sync-services.disabled.yaml`
- **Purpose**: Sync service metadata or versioning
- **Reason for Removal**: Unclear purpose and not actively maintained. Service versioning is now managed through standard release processes
- **Removal Date**: 2026-01-10

## Removed Actions

### `.github/actions/setup-gcp/`
- **Purpose**: Authenticate to Google Cloud and set up GCP tools via Workload Identity Federation
- **Reason for Removal**: No longer needed as CI workflows focus on validation and testing only. GCP authentication and deployment are now manual processes for self-hosting
- **Removal Date**: 2026-01-10

## Changes to Retained Workflows

### `ci-terraform.yaml`
- Removed `id-token: write` permission (no longer needed for GCP auth)
- Removed reference to removed `setup-gcp` action from paths
- Removed `Setup GCP` step (lines 70-71)
- Changed `tofu init` from remote state backend to local state (`-backend=false`)
- Now serves as validation-only for Terraform configuration syntax and structure

## Migration Path

If any of these workflows need to be restored:

1. **For CI/Build Workflows**: Use the `ci-*` equivalents which include testing
2. **For Deployment**: Reference `/terraform/README.md` for manual deployment instructions
3. **For GCP Auth**: Use standard GitHub Actions `google-github-actions/auth@v2` directly if needed

## References

- Updated `.github/workflows/README.md` - CI/testing focused documentation
- Updated `/terraform/README.md` - Manual deployment and self-hosting guidance
