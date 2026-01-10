# CI/CD Workflows

## Overview

This directory contains GitHub Actions workflows focused on continuous integration and validation. Deployment to production is now handled manually via Terraform/OpenTofu for greater control and flexibility in self-hosted environments.

## CI Workflows

### Service CI Workflows

Each service has its own CI workflow that runs tests, linting, and type checking:

- `ci-service-backend.yaml` - Backend API service
- `ci-service-crawler.yaml` - Web crawler service
- `ci-service-crdt.yaml` - CRDT collaboration server
- `ci-service-indexer.yaml` - Document indexing service
- `ci-service-rag.yaml` - RAG processing service
- `ci-service-scraper.yaml` - Grant scraper service

### Package CI Workflows

- `ci-package-db.yaml` - Database models package
- `ci-package-shared-utils.yaml` - Shared utilities package

### Frontend Workflows

- `ci-frontend.yaml` - Next.js frontend (type checking, linting, build)
- `ci-editor.yaml` - Collaborative editor (type checking, linting, build)

### Cloud Functions

- `ci-cloud-functions.yaml` - Firebase Cloud Functions

### Infrastructure Validation

- `ci-terraform.yaml` - Terraform/OpenTofu validation
  - Checks syntax with `tofu fmt`
  - Validates configuration with `tofu validate`
  - Runs TFLint for best practices
  - **Note**: Local state only, does not deploy

### Utility Workflows

- `validate.yaml` - Root-level validation for workspace
- `pr-title.yaml` - Validates PR titles follow Conventional Commits

### E2E Testing Workflows

- `e2e-service-crawler.yaml` - Crawler end-to-end tests
- `e2e-service-indexer.yaml` - Indexer end-to-end tests
- `e2e-service-rag.yaml` - RAG end-to-end tests
- `e2e-service-scraper.yaml` - Scraper end-to-end tests

## Testing Strategy

### Unit & Integration Testing
- Services: 80-95% coverage via pytest
- Packages: 80-95% coverage via pytest
- Frontend: 80% coverage via Vitest/Jest

### Real Database Testing
- Integration tests use real PostgreSQL, never mocks
- Fixtures use JSON/YAML schemas
- Tests are parametrized where applicable

### E2E Testing
- Smoke tests on key service integrations
- Full integration tests with real dependencies

## Manual Deployment

For information on deploying to production environments, see `/terraform/README.md`.

The Terraform CI workflow (`ci-terraform.yaml`) validates configuration syntax and structure but does not deploy. Actual infrastructure changes must be applied manually using the OpenTofu CLI.

### Quick Reference

```bash
# Validate without deploying
cd terraform/environments/staging
tofu init -backend=false
tofu validate

# Deploy to staging
cd terraform/environments/staging
tofu init -backend-config="bucket=grantflow-terraform-state" -backend-config="prefix=staging"
tofu plan -out=tfplan
tofu apply tfplan

# Deploy to production
cd terraform/environments/production
tofu init -backend-config="bucket=grantflow-terraform-state" -backend-config="prefix=production"
tofu plan -out=tfplan
tofu apply tfplan
```

## Self-Hosting Guide

If you're self-hosting GrantFlow:

1. **Fork the repository** to your own GitHub account
2. **Disable automatic deployments** (all build/deploy workflows are already removed)
3. **Use CI for validation**: Push code and let workflows validate tests and configuration
4. **Manual deployment**: Follow the manual deployment process in `/terraform/README.md`
5. **Adapt for your infrastructure**: Modify Terraform modules in `/terraform/modules/` for your environment

For detailed self-hosting setup, see `/terraform/README.md`.

## Workflow Triggers

### Pull Requests
- All CI workflows run on pull requests to `main` or `development*` branches
- Workflow run is required before merge
- Status checks must pass

### Push Events
- CI workflows run on merge to main branches
- Useful for validation before releases

## Best Practices

### Before Committing
- Run tests locally: `pnpm test` or `task test`
- Run linters: `pnpm lint` or `task lint`
- Format code: `pnpm format` or `task format`
- All formatting and checks are enforced by prek pre-commit hooks

### Debugging Workflow Failures

1. **Check the workflow run logs** in GitHub Actions
2. **Look for specific error messages** in the failed step
3. **Reproduce locally** if possible using the same commands from the workflow
4. **Check dependencies** are properly installed and configured

### Common Issues

- **Type errors**: Run `pnpm type-check` locally
- **Linting failures**: Run `pnpm lint --fix` locally
- **Test failures**: Run `pnpm test` with the failing test name
- **Build failures**: Check for missing dependencies or configuration issues

## Removed Workflows

Several workflows have been removed as of 2026-01-10 to streamline the CI/CD process:

- Build workflows (replaced by CI workflows with testing)
- Deployment workflows (replaced with manual Terraform process)
- Setup-GCP action (no longer needed for CI-only pipelines)

See `REMOVED_WORKFLOWS.md` for details on what was removed and why.

## Contributing

When adding new workflows:

1. Follow the naming convention: `ci-<component>.yaml` for CI workflows
2. Use existing actions in `.github/actions/` for consistency
3. Ensure workflow runs quickly (aim for < 10 minutes for CI)
4. Add documentation to this README
5. Reference the workflow in the appropriate section above
