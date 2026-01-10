# Contributing to GrantFlow.AI

Welcome to GrantFlow.AI! This guide provides everything you need to set up your development environment and contribute to the project effectively.

## Table of Contents

- [Welcome](#welcome)
- [Development Prerequisites](#development-prerequisites)
- [PostgreSQL Setup](#postgresql-setup)
- [Environment Configuration](#environment-configuration)
- [Local Development](#local-development)
- [Database Management](#database-management)
- [Docker Compose Profiles](#docker-compose-profiles)
- [Testing Guide](#testing-guide)
- [Code Quality Standards](#code-quality-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Architecture Resources](#architecture-resources)
- [Getting Help](#getting-help)

## Welcome

GrantFlow.AI is a comprehensive grant management platform built as a monorepo with a Next.js 15/React 19 frontend and Python microservices backend. This document covers everything needed to develop and contribute to the project.

Before you begin, please review our [Code of Conduct](./CODE_OF_CONDUCT.md) (if applicable) and ensure you understand the project structure described in the [README.md](./README.md).

## Development Prerequisites

Before you start, ensure you have the following installed on your system:

- **Node.js 22 or higher** - For frontend and editor development
- **Python 3.13** - For backend services
- **Docker and Docker Compose** - For containerized services
- **PostgreSQL 17 with pgvector extension** - Required for backend testing (local instance, not Docker)
- **UV** ([astral-sh/uv](https://github.com/astral-sh/uv)) - Python package manager
- **PNPM 10.17+** ([pnpm.io](https://pnpm.io/)) - JavaScript/TypeScript package manager
- **Task** ([taskfile.dev](https://taskfile.dev)) - Task automation runner
- **OpenTofu** ([opentofu.org](https://opentofu.org/)) - Infrastructure as Code tool
- **GCloud CLI** ([cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install)) - For GCP management
- **GCloud Pub/Sub Emulator** ([cloud.google.com/pubsub/docs/emulator](https://cloud.google.com/pubsub/docs/emulator)) - For local development
- **Firebase CLI** ([firebase.google.com/docs/cli](https://firebase.google.com/docs/cli)) - Required for both frontend and backend development

Verify your installations by checking their versions and confirming Task is working:

```bash
node --version      # Should be 22.x or higher
python --version    # Should be 3.13.x
docker --version
pnpm --version      # Should be 10.17 or higher
task --version
```

## PostgreSQL Setup

The project uses a local PostgreSQL instance for testing instead of Docker containers for better performance and isolation.

### macOS (using Homebrew)

```bash
brew install postgresql@17 pgvector

# Start the PostgreSQL service
brew services start postgresql@17
```

### Ubuntu/Debian

```bash
sudo apt-get install postgresql-17 postgresql-17-pgvector

# Start PostgreSQL service
sudo systemctl start postgresql
```

### Verify Installation

```bash
# Connect to PostgreSQL
psql --version

# Verify pgvector extension is available
psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Important**: Each test worker creates its own isolated database (`grantflow_test_{worker_id}_{process_id}`) to prevent conflicts during parallel test execution. These databases are automatically created and cleaned up by the test framework.

## Environment Configuration

The project uses a single `.env` file in the root directory for all services.

### Initial Setup

1. Copy the `.env.example` file to create your local configuration:

```bash
cp .env.example .env
```

2. Update the `.env` file with your actual values

3. Reach out to the team to obtain secret values for sensitive fields (API keys, Firebase credentials, etc.)

**Note**: The project uses a unified environment configuration in the root `.env` file. All services read from this single source of truth.

### Running Initial Setup

After installing Task and configuring your environment, run the setup command:

```bash
task setup
```

This will:
- Install all JavaScript/TypeScript dependencies via pnpm
- Install all Python dependencies via uv
- Set up git hooks using `prek`
- Configure your development environment

## Local Development

We use **Task** to manage development workflows. Here are the key commands for local development:

### Getting Started

First, list all available commands:

```bash
task --list-all
```

### Running All Services

```bash
# Start all services in development mode (database, backend, indexer, frontend)
task dev
```

This starts:
- PostgreSQL database
- Backend API service
- Indexer service
- Frontend development server

### Frontend-Only Development

```bash
# Start just the frontend
task frontend:dev
```

### Linting and Formatting

```bash
# Run all linters and formatters on all code
task lint

# Run linters by scope
task lint:frontend      # Biome, ESLint, TypeScript for frontend
task lint:python        # Ruff and MyPy for Python

# Run specific linters
task lint:biome         # Format and lint JS/TS/JSON/CSS with Biome
task lint:eslint        # Lint TypeScript/React with ESLint
task lint:typescript    # Type check TypeScript code
task lint:ruff          # Lint and format Python code
task lint:mypy          # Type check Python code
task lint:codespell     # Check for common misspellings
```

### Dead Code Analysis

```bash
# Check for unused dependencies and dead code in frontend/editor
task knip

# Check specific packages
task knip:frontend
task knip:editor
```

### Terraform Linting

```bash
task lint:terraform          # Run all Terraform linters
task lint:terraform:fmt      # Format Terraform code
task lint:terraform:validate # Validate Terraform syntax
task lint:terraform:tflint   # Lint Terraform best practices
task lint:terraform:trivy    # Security scan Terraform code
```

### Cloud Functions

```bash
# Generate requirements.txt files from pyproject.toml
task cloud-functions:generate-requirements
```

## Database Management

All database operations are managed through Task commands. These commands work with both local PostgreSQL and remote Cloud SQL.

### Local Database Operations

```bash
# Start the database (does not restart if already running)
task db:up

# Stop the database
task db:down

# Apply migrations to local database
task db:migrate

# Create a new migration
task db:create-migration -- <migration_name>

# Seed the database with initial data
task db:seed

# Drop and recreate database (WARNING: destroys all data)
task db:drop

# Drop database and re-run migrations (WARNING: destroys all data)
task db:reset
```

### Remote Database (Cloud SQL)

```bash
# Start Cloud SQL Proxy for remote database access
task db:proxy:start

# Stop Cloud SQL Proxy
task db:proxy:stop

# Check Cloud SQL Proxy status
task db:proxy:status

# Restart Cloud SQL Proxy
task db:proxy:restart

# Apply migrations to Cloud SQL (auto-starts proxy)
task db:migrate:remote
```

## Docker Compose Profiles

Our `docker-compose.yaml` uses profiles to organize services into logical groups. This allows you to run only the services you need for a specific task.

### Starting Services by Profile

```bash
# Start all services
docker compose --profile all up -d

# Start only backend-related services (backend, db, gcs-emulator)
docker compose --profile backend up -d

# Start only indexer-related services (indexer, db, gcs-emulator)
docker compose --profile indexer up -d

# Start only crawler-related services (crawler, db, gcs-emulator)
docker compose --profile crawler up -d

# Start only RAG service and its dependencies
docker compose --profile rag up -d

# Start only scraper service and its dependencies
docker compose --profile scraper up -d

# Start only frontend services
docker compose --profile frontend up -d

# Start all backend services and supporting infrastructure
docker compose --profile services up -d

# Stop all running services
docker compose down

# View logs for a specific service
docker compose logs -f backend
```

### Available Profiles

| Profile | Services | Use Case |
|---------|----------|----------|
| `all` | All services | Complete local environment |
| `backend` | Backend API + dependencies | Backend API development |
| `indexer` | Indexer + dependencies | Document processing |
| `crawler` | Crawler + dependencies | Web content extraction |
| `rag` | RAG + dependencies | AI-powered generation |
| `scraper` | Scraper + dependencies | Grant discovery |
| `frontend` | Frontend development server | Frontend development |
| `services` | All backend services | All microservices development |

## Testing Guide

The project follows a three-tier testing strategy optimized for performance and reliability: unit tests, integration tests with a real database, and end-to-end tests.

### Testing Philosophy

- **Unit Tests (80-95% coverage)**: Fast, isolated, test individual functions
- **Integration Tests**: Use real PostgreSQL database, never mocks
- **E2E Tests**: Validate complete workflows with actual services
- **Test Naming Convention**: `test_<function>_<scenario>_<outcome>`
- **Fixtures**: Use JSON/YAML schemas with parametrized tests

### Running Tests

```bash
# Run all tests (default, parallel execution)
task test

# Run tests in CI mode (serial execution)
task test:ci

# Run all end-to-end tests
task test:e2e
```

### Backend Testing

Tests use local PostgreSQL 17 with pgvector extension (not Docker) for performance:

```bash
# Run all unit tests
task test

# Run tests for specific services
PYTHONPATH=. uv run pytest services/backend/tests/
PYTHONPATH=. uv run pytest services/indexer/tests/
PYTHONPATH=. uv run pytest services/rag/tests/
PYTHONPATH=. uv run pytest services/crawler/tests/
PYTHONPATH=. uv run pytest services/scraper/tests/
```

**Database Isolation**:
- Each test worker gets an isolated database: `grantflow_test_{worker_id}_{process_id}`
- Fast cleanup with TRUNCATE instead of DROP/CREATE
- Parallel execution with pytest-xdist (max 4 workers locally, 2 in CI)

### Frontend Testing

```bash
# Run frontend tests
cd frontend && pnpm test

# Run specific test files
cd frontend && pnpm test src/utils/format.spec.ts
```

**Performance Configuration**:
- Vitest with thread-based parallelization (up to 8 concurrent threads)
- Disabled test isolation for faster execution
- Efficient caching with Vite cache directory
- Concurrent test execution within suites

### End-to-End Testing

E2E tests validate real functionality with actual services and APIs. They are categorized by execution speed and purpose:

```bash
# Run smoke tests (quick validation, <1 min)
E2E_TESTS=1 pytest -m "smoke"

# Run quality assessment tests (2-5 min)
E2E_TESTS=1 pytest -m "quality_assessment"

# Run full integration tests (10+ min)
E2E_TESTS=1 pytest -m "e2e_full"

# Run semantic evaluation tests
E2E_TESTS=1 pytest -m "semantic_evaluation"

# Run AI-powered evaluation tests
E2E_TESTS=1 pytest -m "ai_eval"

# Skip expensive AI tests in CI
E2E_TESTS=1 pytest -m "not (ai_eval or semantic_evaluation)"
```

#### Service-Specific E2E Tests

```bash
E2E_TESTS=1 pytest services/indexer/tests/e2e/
E2E_TESTS=1 pytest services/crawler/tests/e2e/
E2E_TESTS=1 pytest services/rag/tests/e2e/
E2E_TESTS=1 pytest services/scraper/tests/
```

#### Writing E2E Tests

Use the `@performance_test` decorator from the testing framework:

```python
from testing.performance_framework import TestExecutionSpeed, TestDomain, performance_test

@performance_test(execution_speed=TestExecutionSpeed.SMOKE, domain=TestDomain.EXAMPLE, timeout=60)
async def test_basic_functionality(logger: logging.Logger) -> None:
    # Test implementation here
    pass
```

**Test Categories**:
- `SMOKE`: Essential functionality checks
- `QUALITY_ASSESSMENT`: Quality validation tests
- `E2E_FULL`: Comprehensive pipeline tests
- `SEMANTIC_EVALUATION`: Embedding similarity tests
- `AI_EVAL`: AI-powered quality assessments

## Code Quality Standards

This project maintains high code quality standards using multiple tools enforced via git hooks.

### Type Safety Requirements

**Python**:
- Use `msgspec` TypedDict with `NotRequired[]` for optional fields
- Full type annotations (no `Any` type)
- `MyPy` strict mode enabled

**TypeScript**:
- TypeScript strict mode enabled (all flags)
- Use `unknown` with proper type guards
- Never use `any` or `object` types
- All API responses use typed models
- Generics with constraints

### Python Quality Tools

- **Ruff**: Fast Python linter and formatter
  - Enforces PEP 8 style guidelines
  - Auto-fixes formatting issues
  - Detects common errors

- **MyPy**: Static type checker for Python
  - Strict mode enabled
  - No implicit `Any` types allowed

- **Codespell**: Spell checker for code
  - Catches common misspellings

### Frontend/Editor Quality Tools

- **Biome**: Primary formatter and linter for JavaScript/TypeScript/JSON/CSS
  - Replaces Prettier for formatting
  - Comprehensive linting rules
  - Fast and opinionated

- **ESLint**: Additional TypeScript and React-specific rules
  - React hooks validation
  - Custom project rules

- **TypeScript**: Strict type checking
  - Full type inference
  - No implicit `any`

- **Knip**: Dead code elimination
  - Detects unused dependencies
  - Identifies dead code files

### Git Hooks (Prek)

We manage git hooks with **Prek**, which runs validations on every commit:

- Linting and formatting checks
- Type checking
- Commit message validation
- Test execution (if configured)

```bash
# Install/update git hooks
task setup

# Run all validations manually
uvx prek run --all-files
```

**Important**: All changes must pass linting and type checking before being committed. The git hooks will prevent commits that don't meet quality standards.

## Commit Guidelines

This project follows [Conventional Commits 1.0.0](https://www.conventionalcommits.org/) specification with strict enforcement via [commitlint](https://commitlint.js.org/).

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type | Scope | Description |
|------|-------|-------------|
| **feat** | Required | A new feature or enhancement |
| **fix** | Required | A bug fix |
| **docs** | Optional | Documentation updates only |
| **refactor** | Required | Code refactoring without feature changes |
| **test** | Required | Adding or updating tests |
| **chore** | Optional | Build scripts, dependencies, CI/CD configs |

### Scope Guidelines

Use specific scopes to indicate what part of the codebase is affected:

**Frontend/Editor**: `frontend`, `editor`, `ui`, `auth`, `state`

**Backend Services**: `backend`, `indexer`, `crawler`, `rag`, `scraper`

**Infrastructure**: `terraform`, `docker`, `ci`, `workflows`

**Packages**: `db`, `shared-utils`, `shared-testing`

### Subject Line Rules

- Use the imperative mood ("add" not "added" or "adds")
- Don't capitalize the first letter
- No period (.) at the end
- Limit to 50 characters
- Be specific and descriptive

### Example Commits

```bash
# Good
feat(backend): add grant recommendation engine
git commit -m "feat(backend): add grant recommendation engine"

fix(frontend): prevent form submission on validation error
git commit -m "fix(frontend): prevent form submission on validation error"

docs(contributing): update testing guidelines
git commit -m "docs(contributing): update testing guidelines"

refactor(db): simplify migration system
git commit -m "refactor(db): simplify migration system"

test(indexer): add PDF extraction tests
git commit -m "test(indexer): add PDF extraction tests"

chore(deps): upgrade Next.js to 15.1.0
git commit -m "chore(deps): upgrade Next.js to 15.1.0"
```

### CRITICAL: AI Signatures

**NEVER include AI signatures in commits.**

The following patterns are NEVER allowed:

```bash
# ❌ NEVER do this:
git commit -m "feat: add feature

Co-Authored-By: Claude <noreply@anthropic.com>"

# ❌ NEVER do this:
git commit -m "feat: add feature

Generated with Claude AI"

# ❌ NEVER do this:
git commit -m "feat: add feature

🤖 Generated with AI"
```

All commits must represent actual work done by human contributors. AI-generated code is acceptable as long as:
1. A human has reviewed and tested it thoroughly
2. The human takes responsibility for the code quality
3. The commit message reflects the human's actual contribution
4. No AI signatures are included

### Commit Best Practices

1. **Make atomic commits**: Each commit should represent one logical change
2. **Commit frequently**: Small, regular commits are easier to review and debug
3. **Write descriptive messages**: Future developers will thank you
4. **Reference issues**: Include issue numbers when applicable (e.g., "fixes #123")
5. **Test before committing**: Run tests locally before pushing
6. **Keep commits focused**: Don't mix unrelated changes in one commit

### Enforcement

Git hooks (via Prek) will automatically:
- Validate commit message format
- Run linting and formatting checks
- Check type safety
- Reject commits that don't meet standards

If a commit is rejected, fix the issues and try again. Use `git add` to stage changes and `git commit` to try again.

## Pull Request Process

### Before Creating a PR

1. **Create a feature branch** from `development`:
   ```bash
   git checkout development
   git pull origin development
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** and commit them following the [Commit Guidelines](#commit-guidelines)

3. **Run tests locally**:
   ```bash
   task test              # Run all tests
   task lint              # Run all linters
   ```

4. **Push to your branch**:
   ```bash
   git push origin feat/your-feature-name
   ```

### Creating the Pull Request

1. Go to the repository on GitHub and create a new Pull Request
2. Set the base branch to `development`
3. Write a clear, descriptive PR title following Conventional Commits format
4. Fill out the PR description with:
   - Summary of changes
   - Motivation and context
   - Type of change (feature, fix, refactor, etc.)
   - Testing done locally
   - Any breaking changes
   - Related issues (use "Closes #123")

### PR Requirements

All PRs must:
- [ ] Pass all CI/CD checks (linting, type checking, tests)
- [ ] Have code review approval from at least one maintainer
- [ ] Update documentation if necessary
- [ ] Include tests for new functionality
- [ ] Follow the commit and code quality standards outlined in this guide

### Review Process

1. **Automated checks** run automatically:
   - Linting and formatting
   - Type checking
   - Test suite
   - Code coverage

2. **Code review**: One or more maintainers will review your changes
   - Check code quality and design
   - Verify test coverage
   - Ensure documentation is updated

3. **Merge**: After approval and passing checks, a maintainer will merge your PR to `development`

## Architecture Resources

The monorepo is organized into several key areas. For detailed information, refer to:

- **Frontend Architecture**: See [`/frontend/README.md`](./frontend/README.md)
- **Editor Components**: See [`/editor/README.md`](./editor/README.md)
- **CRDT Server**: See [`/crdt/README.md`](./crdt/README.md)
- **Backend API**: See [`/services/backend/README.md`](./services/backend/README.md)
- **Indexer Service**: See [`/services/indexer/README.md`](./services/indexer/README.md)
- **Crawler Service**: See [`/services/crawler/README.md`](./services/crawler/README.md)
- **RAG Service**: See [`/services/rag/README.md`](./services/rag/README.md)
- **Scraper Service**: See [`/services/scraper/README.md`](./services/scraper/README.md)
- **Database Layer**: See [`/packages/db/README.md`](./packages/db/README.md)
- **Shared Utilities**: See [`/packages/shared_utils/README.md`](./packages/shared_utils/README.md)
- **Infrastructure**: See [`/terraform/README.md`](./terraform/README.md)
- **Cloud Functions**: See [`/functions/README.md`](./functions/README.md)
- **E2E Testing**: See [`/e2e/README.md`](./e2e/README.md)
- **Full Documentation**: See [`/docs/README.md`](./docs/README.md)

## Windows Setup (WSL)

> ⚠️ Windows has path compatibility issues (e.g., filenames containing `:` are not supported), which may cause Git operations to fail when working directly on the Windows file system.

### Recommended: Use WSL for Development

We strongly recommend using [WSL (Windows Subsystem for Linux)](https://learn.microsoft.com/en-us/windows/wsl/install) to create a Linux-native development environment on Windows.

WSL provides full compatibility with the tooling used in this monorepo (Node.js, Python, Docker, etc.) and avoids common filesystem issues on Windows.

### Installing Ubuntu on WSL

We suggest installing the latest **Ubuntu LTS** release (e.g., Ubuntu 24.04 or Ubuntu 22.04) for best compatibility and support.

Follow the official Ubuntu WSL guide:
👉 [Develop on Ubuntu with WSL](https://documentation.ubuntu.com/wsl/en/latest/tutorials/develop-with-ubuntu-wsl/)

Once WSL and Ubuntu are installed and configured, your environment is ready to mount and develop the repository using the instructions in the [Getting Started](#environment-configuration) section.

### WSL Setup Checklist

- [ ] Windows 10/11 with WSL 2 enabled
- [ ] Ubuntu LTS installed via WSL
- [ ] Repository cloned inside WSL (not in `/mnt/c/`)
- [ ] All prerequisites installed inside Ubuntu environment
- [ ] `.env` file configured
- [ ] `task setup` completed

## Getting Help

### Documentation

- **Project Documentation**: See [`/docs`](./docs/README.md)
- **Architecture Diagrams**: See [`/docs`](./docs/README.md)
- **API Specifications**: See [`/docs`](./docs/README.md)
- **Security Documentation**: See [`/docs`](./docs/README.md)

### Common Issues

**PostgreSQL not connecting**:
```bash
# Check if PostgreSQL is running
brew services list  # macOS
sudo systemctl status postgresql  # Ubuntu/Linux

# Verify pgvector extension
psql -U postgres -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

**Dependency issues**:
```bash
# Clear caches and reinstall
uv cache clean && pnpm install
task setup
```

**Git hooks failing**:
```bash
# Reinstall git hooks
uvx prek install
```

**Tests failing locally**:
```bash
# Check database is running and migrations applied
task db:up
task db:migrate
task test
```

### Getting Support

1. **Check existing issues**: Search the GitHub issues for similar problems
2. **Review documentation**: Refer to the relevant service README files
3. **Ask in discussions**: Use GitHub Discussions for questions
4. **Contact the team**: Reach out to maintainers for technical issues

### Reporting Bugs

When reporting bugs, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment information (OS, Node version, Python version, etc.)
- Error messages and stack traces
- Any relevant code snippets

## Summary

Thank you for contributing to GrantFlow.AI! By following this guide, you'll help maintain code quality, ensure consistency, and make the codebase easier for everyone to work with.

Remember:
- Follow Conventional Commits format
- Write clear, descriptive code
- Test thoroughly before submitting
- NEVER include AI signatures in commits
- Adhere to type safety requirements
- Respect the code quality standards

Happy coding!
