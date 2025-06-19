# GrantFlow.AI Monorepo

This monorepo contains both the frontend and backend code for the GrantFlow.AI platform. The frontend is built using
Next.js 15, and the backend is a microservice-based Python architecture.

## Repository Structure

- `/` - Root directory, contains shared configuration
- `/.github` - GitHub CI/CD workflows
- `/.idea` - Shared intellij configurations
- `/.vscode` - Shared vscode configurations
- [`/diagrams`](./diagrams/README.md) - Architecture and data model diagrams
- [`/services/backend`](./services/backend/README.md) - Main Python API service powered by Litestar
- [`/services/indexer`](./services/indexer/README.md) - Document indexing and extraction service
- [`/services/crawler`](./services/crawler/README.md) - Website crawling and document extraction service
- [`/services/rag`](./services/rag/README.md) - Retrieval Augmented Generation service
- [`/packages/db`](./packages/db/README.md) - Shared database models and migrations
- [`/packages/shared_utils`](./packages/shared_utils/README.md) - Common utilities shared across services
- [`/frontend`](./frontend/README.md) - NextJS frontend application
- [`/terraform`](./terraform/README.md) - Terraform configuration for GCP infrastructure

## Prerequisites

- Node.js 22 or higher
- Python 3.13
- Docker and Docker Compose
- [UV](https://github.com/astral-sh/uv): Package manager for Python dependencies
- [PNPM](https://pnpm.io/): Package manager for JavaScript/TypeScript dependencies
- [Task](https://taskfile.dev): Taskfile runner
- [OpenTofu](https://opentofu.org/): Infrastructure as Code tool for managing cloud resources
- [GCloud CLI](https://cloud.google.com/sdk/docs/install): For GCP management
- [GCloud CLI Pub/Sub Emulator](https://cloud.google.com/pubsub/docs/emulator): For local development
- [Firebase CLI](https://firebase.google.com/docs/cli): For Firebase and secret access (required for both frontend and
  backend development)

Make sure to install all of these on your system.

## Getting Started

Begin by installing system dependencies mentioned above. Then verify the installation of taskfile by listing available
commands:

```bash
task --list-all
```

### Environment Setup

You'll need environment files for the services:

- Copy the `.env.example` file and rename it to `.env` in the appropriate service directories
- Reach out to the team to get secret values for the obfuscated values

### Initial Setup

After installing Task, run:

```bash
task setup
```

This will install all dependencies and set up git hooks using Lefthook.

## Local Development

We use Task to manage development workflows. Here are the key commands:

```bash
# Start all services in development mode (database, backend, indexer, frontend)
task dev

# Run all tests
task test

# Run all linters and formatters
task lint               # Equivalent to task lint:all

# Run linters by scope
task lint:all           # Run all linters on all files
task lint:frontend      # Run Biome, ESLint, and TypeScript for frontend
task lint:python        # Run Ruff and MyPy for Python

# Run specific linters
task lint:biome         # Format and lint JS/TS/JSON/CSS with Biome
task lint:eslint        # Lint TypeScript/React with ESLint
task lint:typescript    # Type check TypeScript code
task lint:ruff          # Lint and format Python code
task lint:mypy          # Type check Python code
task lint:codespell     # Check for common misspellings

# Terraform linters (specialized - not included in lint:all)
task lint:terraform     # Run all Terraform linters
task lint:terraform:fmt # Format Terraform code
task lint:terraform:validate # Validate Terraform syntax
task lint:terraform:tflint   # Lint Terraform best practices
task lint:terraform:trivy    # Security scan Terraform code
```

### Database Management

```bash
# Start the database (does not restart if already running)
task db:up

# Stop the database
task db:down

# Apply migrations
task db:migrate

# Create a new migration
task db:create-migration -- <migration_name>

# Seed the database
task db:seed
```

### Docker Compose Commands

Our docker-compose.yaml uses profiles to organize services into logical groups. This allows you to run only the services
you need for a specific task.

```bash
# Start all services
docker compose --profile all up -d

# Start only backend-related services (backend, db, gcs-emulator)
docker compose --profile backend up -d

# Start only indexer-related services (indexer, db, gcs-emulator)
docker compose --profile indexer up -d

# Start only crawler-related services (crawler, db, gcs-emulator)
docker compose --profile crawler up -d

# Start only frontend services
docker compose --profile frontend up -d

# Start only database and supporting services for backend development
docker compose --profile services up -d

# Stop all running services
docker compose down

# View logs for a specific service
docker compose logs -f backend
```

Available profiles:

- `all`: All services
- `backend`: Backend API service and its dependencies
- `indexer`: Indexer service and its dependencies
- `crawler`: Crawler service and its dependencies
- `rag`: RAG service and its dependencies
- `frontend`: Frontend service
- `services`: All backend services

### Service-Specific Development

You can also start individual services using Task:

```bash
# Start just the backend service
task service:backend:dev

# Start just the indexer service
task service:indexer:dev

# Start just the frontend
task frontend:dev
```

For a complete list of available commands:

```bash
task --list
```

## Windows Setup (WSL)

> ⚠️ Windows has path compatibility issues (e.g., filenames containing `:` are not supported), which may cause Git
> operations to fail when working directly on the Windows file system.

### Recommended: Use WSL for Development

We recommend using [WSL (Windows Subsystem for Linux)](https://learn.microsoft.com/en-us/windows/wsl/install) to create
a Linux-native development environment on Windows.

WSL provides full compatibility with the tooling used in this monorepo (Node.js, Python, Docker, etc.) and avoids common
filesystem issues on Windows.

### Installing Ubuntu on WSL

We suggest installing the latest **Ubuntu LTS** release (e.g., Ubuntu 22.04) for best compatibility and support.

Follow the official Ubuntu WSL guide here:
👉 [Develop on Ubuntu with WSL](https://documentation.ubuntu.com/wsl/en/latest/tutorials/develop-with-ubuntu-wsl/)

Once WSL and Ubuntu are installed and configured, your environment is ready to mount and develop the repository using
the instructions in the [Getting Started](#getting-started) section.

## Code Quality and Linting

This project uses multiple tools to ensure code quality:

### Frontend

- **[Biome](https://biomejs.dev/)**: Primary formatter and linter for JS/TS/JSON/CSS files
- **[ESLint](https://eslint.org/)**: Additional TypeScript and React-specific rules
- **TypeScript**: Strict type checking

### Backend

- **[MyPy](https://mypy-lang.org/)**: Static type checker for Python
- **[Ruff](https://docs.astral.sh/ruff/)**: Fast Python linter and formatter
- **[Codespell](https://github.com/codespell-project/codespell)**: Spell checker for code

### Git Hooks

We use [Lefthook](https://github.com/evilmartians/lefthook) to run pre-commit checks automatically:

- Linters run on staged files with auto-fix
- Commit messages are validated against conventional commits format

## End-to-End Tests

E2E tests validate real functionality with actual services and APIs. They are categorized by duration and purpose:

### Running E2E Tests

```bash
# Run all unit tests (default, fast)
task test

# Run E2E tests by category
E2E_TESTS=1 pytest -m "smoke"              # Quick validation (<1 min)
E2E_TESTS=1 pytest -m "quality_assessment" # Moderate quality checks (2-5 min)
E2E_TESTS=1 pytest -m "e2e_full"          # Complete integration tests (10+ min)
E2E_TESTS=1 pytest -m "semantic_evaluation" # Semantic similarity tests
E2E_TESTS=1 pytest -m "ai_eval"           # AI-powered evaluation tests

# Run specific service E2E tests
E2E_TESTS=1 pytest services/indexer/tests/e2e/
E2E_TESTS=1 pytest services/crawler/tests/e2e/
E2E_TESTS=1 pytest services/rag/tests/e2e/

# Skip expensive AI tests in CI
E2E_TESTS=1 pytest -m "not (ai_eval or semantic_evaluation)"
```

### Writing E2E Tests

Use the `@e2e_test` decorator from `testing.e2e_utils`:

```python
from testing.e2e_utils import E2ETestCategory, e2e_test

@e2e_test(category=E2ETestCategory.SMOKE, timeout=60)
async def test_basic_functionality(logger: logging.Logger) -> None:
    # Test implementation
```

Categories:
- `SMOKE`: Essential functionality checks
- `QUALITY_ASSESSMENT`: Quality validation tests
- `E2E_FULL`: Comprehensive pipeline tests
- `SEMANTIC_EVALUATION`: Embedding similarity tests
- `AI_EVAL`: AI-powered quality assessments

## Commit Conventions

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for creating clear
and structured commit messages. We enforce this using [commitlint](https://commitlint.js.org/).
