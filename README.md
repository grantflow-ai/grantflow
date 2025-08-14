# GrantFlow.AI Monorepo

This monorepo contains both the frontend and backend code for the GrantFlow.AI platform. The frontend is built using
Next.js 15, and the backend is a microservice-based Python architecture.

## Repository Map

### 🏗️ Core Infrastructure
- **[`/.github`](./.github)** - GitHub Actions CI/CD workflows and reusable actions
- **[`/terraform`](./terraform/README.md)** - Infrastructure as Code using OpenTofu
  - `environments/` - Environment-specific configurations (staging, production)
  - `modules/` - Reusable Terraform modules
- **[`/cloud_functions`](./cloud_functions/README.md)** - Serverless monitoring & automation
  - `app_hosting_alerts/` - Firebase deployment notifications
  - `auth_blocking/` - User authentication validation
  - `budget_alerts/` - Cost monitoring alerts
  - `email_notifications/` - Transactional email service
  - `entity_cleanup/` - Automated data cleanup
  - `user_cleanup/` - User account lifecycle management

### 🎨 Frontend Applications
- **[`/frontend`](./frontend/README.md)** - Next.js 15 web application
  - Modern React 19 with TypeScript
  - Tailwind CSS for styling
  - Firebase Authentication
  - Zustand state management
- **[`/editor`](./editor/README.md)** - TipTap collaborative editor package
  - Rich text editing capabilities
  - Real-time collaboration support
- **[`/crdt`](./crdt/README.md)** - CRDT server for real-time collaboration
  - Hocuspocus WebSocket server
  - Y.js document synchronization

### 🔧 Backend Services
- **[`/services/backend`](./services/backend/README.md)** - Main API service
  - Litestar async framework
  - JWT authentication with Firebase
  - PostgreSQL with SQLAlchemy 2.0
  - Organization-based multi-tenancy
- **[`/services/indexer`](./services/indexer/README.md)** - Document processing pipeline
  - PDF/DOC/HTML extraction
  - Chunk generation and embeddings
  - Vector database indexing
- **[`/services/crawler`](./services/crawler/README.md)** - Web content extraction
  - Intelligent link following
  - Content extraction and cleaning
  - Rate limiting and robots.txt compliance
- **[`/services/rag`](./services/rag/README.md)** - AI-powered content generation
  - Retrieval Augmented Generation
  - Multi-model support (OpenAI, Anthropic, Vertex AI)
  - Grant template and application generation
- **[`/services/scraper`](./services/scraper/README.md)** - Grant opportunity discovery
  - NIH grants.gov integration
  - Automated opportunity monitoring
  - Discord notifications

### 📦 Shared Packages
- **[`/packages/db`](./packages/db/README.md)** - Database layer
  - SQLAlchemy models and migrations
  - Alembic migration management
  - Database utilities and helpers
- **[`/packages/shared_utils`](./packages/shared_utils/README.md)** - Common utilities
  - AI/LLM integrations
  - GCS storage operations
  - Pub/Sub messaging
  - OpenTelemetry instrumentation
  - Embeddings and NLP utilities

### 📚 Documentation & Testing
- **[`/docs`](./docs/README.md)** - Comprehensive technical documentation
  - Architecture diagrams
  - API specifications
  - Security documentation
  - Deployment guides
- **[`/e2e`](./e2e/README.md)** - End-to-end testing utilities
  - Monitoring test helpers
  - Webhook testing tools
  - Integration test fixtures

### 🛠️ Development Tools
- **`/.vscode`** - VS Code workspace settings and recommended extensions
- **`/.idea`** - IntelliJ IDEA project configuration
- **`/scripts`** - Utility scripts for development and deployment
- **`Taskfile.yaml`** - Task automation (replacement for Makefiles)
- **`docker-compose.yaml`** - Local development environment

## Prerequisites

- Node.js 22 or higher
- Python 3.13
- Docker and Docker Compose
- **PostgreSQL 17 with pgvector extension**: For local database testing (required for backend tests)
- [UV](https://github.com/astral-sh/uv): Package manager for Python dependencies
- [PNPM](https://pnpm.io/): Package manager for JavaScript/TypeScript dependencies
- [Task](https://taskfile.dev): Taskfile runner
- [OpenTofu](https://opentofu.org/): Infrastructure as Code tool for managing cloud resources
- [GCloud CLI](https://cloud.google.com/sdk/docs/install): For GCP management
- [GCloud CLI Pub/Sub Emulator](https://cloud.google.com/pubsub/docs/emulator): For local development
- [Firebase CLI](https://firebase.google.com/docs/cli): For Firebase and secret access (required for both frontend and
  backend development)

Make sure to install all of these on your system.

### PostgreSQL Setup for Testing

The project uses local PostgreSQL for testing instead of Docker containers for better performance and isolation:

```bash
# macOS (using Homebrew)
brew install postgresql@17 pgvector

# Ubuntu/Debian
sudo apt-get install postgresql-17 postgresql-17-pgvector

# Start PostgreSQL service
# macOS: brew services start postgresql@17
# Ubuntu: sudo systemctl start postgresql
```

**Important**: Each test worker creates its own isolated database (`grantflow_test_{worker_id}_{process_id}`) to prevent conflicts during parallel test execution.

## Getting Started

Begin by installing system dependencies mentioned above. Then verify the installation of taskfile by listing available
commands:

```bash
task --list-all
```

### Environment Setup

The project uses a single `.env` file in the root directory for all services:

1. Copy the `.env.example` file in the root directory:
   ```bash
   cp .env.example .env
   ```
2. Update the `.env` file with your actual values
3. Reach out to the team to get secret values for sensitive fields

**Note**: The project uses a unified environment configuration in the root `.env` file.

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

# Dead code analysis
task knip               # Check for unused dependencies and dead code in frontend/editor
task knip:frontend      # Check frontend package only
task knip:editor        # Check editor package only

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
- `scraper`: Scraper service and its dependencies
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

### Cloud Functions Development

```bash
# Generate requirements.txt files from pyproject.toml for cloud functions
task cloud-functions:generate-requirements

# Sync dependencies for cloud functions
task cloud-functions:sync

# Run tests for cloud functions
task cloud-functions:test
```

### Testing Variations

```bash
# Run all tests (default, parallel execution)
task test

# Run all tests in serial mode (no parallelization)
task test:serial

# Run tests in CI mode (serial execution)
task test:ci

# Run all end-to-end tests
task test:e2e

# Service-specific granular E2E testing
task service:indexer:test:e2e:smoke     # < 1 min
task service:indexer:test:e2e:quality   # 2-5 min
task service:indexer:test:e2e:full      # 10+ min
task service:indexer:test:e2e:semantic  # Semantic evaluation
task service:indexer:test:e2e:ai        # AI-powered evaluation

task service:rag:test:e2e:smoke         # < 1 min
task service:rag:test:e2e:quality       # 2-5 min
task service:rag:test:e2e:full          # 10+ min
task service:rag:test:e2e:semantic      # Semantic evaluation
task service:rag:test:e2e:ai            # AI evaluation
task service:rag:test:serial            # Serial mode for debugging
```

### GitHub Actions Deployment

```bash
# Deploy individual services via GitHub Actions
task gh:deploy:backend
task gh:deploy:crawler
task gh:deploy:indexer
task gh:deploy:rag
task gh:deploy:scraper
```

### Local Development Emulators

```bash
# Start individual emulators
task emulator:pubsub:up    # Pub/Sub emulator
task emulator:gcs:up       # Google Cloud Storage emulator
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

## Deployment Environments

### Frontend Deployments

- **Staging**: https://staging--grantflow-staging.us-central1.hosted.app
  - Firebase Project: `grantflow-staging`
  - Branch: `development` (auto-deploys)
  - Mock API/Auth enabled by default
  - Configuration: `apphosting.staging.yaml`

- **Production**: https://grantflow.ai
  - Firebase Project: `grantflow`
  - Branch: `main` (auto-deploys)
  - Real API/Auth integration
  - Configuration: `apphosting.production.yaml`

### Backend Services

Backend services are deployed to Cloud Run:
- API: `https://api-staging.grantflow.ai` (staging)
- Services: backend, indexer, crawler, rag, scraper
- Database: Cloud SQL PostgreSQL
- Storage: GCS buckets

## Code Quality and Linting

This project uses multiple tools to ensure code quality:

### Frontend & Editor

- **[Biome](https://biomejs.dev/)**: Primary formatter and linter for JS/TS/JSON/CSS files
- **[ESLint](https://eslint.org/)**: Additional TypeScript and React-specific rules
- **[Knip](https://knip.dev/)**: Dead code elimination and unused dependency detection
- **TypeScript**: Strict type checking

### Backend

- **[MyPy](https://mypy-lang.org/)**: Static type checker for Python
- **[Ruff](https://docs.astral.sh/ruff/)**: Fast Python linter and formatter
- **[Codespell](https://github.com/codespell-project/codespell)**: Spell checker for code

### Git Hooks

We use [Lefthook](https://github.com/evilmartians/lefthook) to run pre-commit checks automatically:

- Linters run on staged files with auto-fix
- Commit messages are validated against conventional commits format

## Testing

The project uses different testing strategies optimized for performance and reliability:

### Backend Testing

**Database Testing**:
- Uses local PostgreSQL 17 with pgvector extension (not Docker)
- Each test worker gets isolated database: `grantflow_test_{worker_id}_{process_id}`
- Fast cleanup with TRUNCATE instead of DROP/CREATE
- Parallel test execution with pytest-xdist (max 4 workers locally, 2 in CI)

**Running Backend Tests**:
```bash
# Run all unit tests (default, fast)
task test

# Run tests for specific services
PYTHONPATH=. uv run pytest services/backend/tests/
PYTHONPATH=. uv run pytest services/indexer/tests/
PYTHONPATH=. uv run pytest services/rag/tests/
PYTHONPATH=. uv run pytest services/crawler/tests/
PYTHONPATH=. uv run pytest services/scraper/tests/
```

### Frontend Testing

**Performance Configuration**:
- Vitest with thread-based parallelization (up to 8 concurrent threads)
- Disabled test isolation for faster execution
- Efficient caching with Vite cache directory
- Concurrent test execution within suites

**Running Frontend Tests**:
```bash
# Run frontend tests
cd frontend && pnpm test

# Run specific test files
cd frontend && pnpm test src/utils/format.spec.ts
```

### End-to-End Tests

E2E tests validate real functionality with actual services and APIs. They are categorized by duration and purpose:

**Running E2E Tests**:
```bash
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
E2E_TESTS=1 pytest services/scraper/tests/

# Skip expensive AI tests in CI
E2E_TESTS=1 pytest -m "not (ai_eval or semantic_evaluation)"
```

**Writing E2E Tests**:
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