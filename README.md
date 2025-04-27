# GrantFlow.AI Monorepo

This monorepo contains both the frontend and backend code for the GrantFlow.AI platform. The frontend is built using Next.js 15, and the backend is a microservice-based Python architecture.

For detailed information on specific modules, refer to their dedicated documentation:

- [Backend Documentation](./services/backend/README.md) - API architecture, RAG components, and WebSocket flows
- [Indexer Documentation](./services/indexer/README.md) - Document processing and indexing service
- [Frontend Documentation](./frontend/README.md) - project structure, components, and UI development
- [Database Package](./packages/db/README.md) - shared database models and migrations
- [Shared Utilities](./packages/shared_utils/README.md) - common utilities used across services

## Repository Structure

- `/` - Root directory, contains shared configuration
- `/.github` - GitHub CI/CD workflows
- `/.idea` - Shared intellij configurations
- `/.vscode` - Shared vscode configurations
- [`/services/backend`](./services/backend/README.md) - Main Python API service powered by Litestar
- [`/services/indexer`](./services/indexer/README.md) - Document indexing and extraction service
- [`/packages/db`](./packages/db/README.md) - Shared database models and migrations
- [`/packages/shared_utils`](./packages/shared_utils/README.md) - Common utilities shared across services
- [`/frontend`](./frontend/README.md) - NextJS frontend application

## Prerequisites

- Node.js 22 or higher
- Python 3.12
- Docker and Docker Compose
- [UV](https://github.com/astral-sh/uv): package manager for Python dependencies
- [PNPM](https://pnpm.io/): package manager for JavaScript/TypeScript dependencies
- [Task](https://taskfile.dev): taskfile runner
- [pre-commit](https://pre-commit.com/): Linting and formatting tool
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install): for managing cloud resources and secrets
- [Firebase CLI](https://firebase.google.com/docs/cli): for Firebase deployments and secret access

Make sure to install all of these on your system.

## Getting Started

Begin by installing system dependencies mentioned above. Then verify the installation of taskfile by listing available commands:

```bash
task --list-all
```

### Environment Setup

You'll need environment files for the services:

- Copy the `.env.example` file and rename it to `.env` in the appropriate service directories
- Reach out to the team to get secret values for the obfuscated values

### Initial Setup

After installing Task and pre-commit, run:

```bash
task setup
```

This will install all dependencies and set up pre-commit hooks.

## Local Development

We use Task to manage development workflows. Here are the key commands:

```bash
# Start all services in development mode (database, backend, indexer, frontend)
task dev

# Run all tests
task test

# Run end-to-end tests
task test:e2e

# Run linters and formatters
task lint
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

### Service-Specific Development

You can also start individual services:

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

> ⚠️ Windows has path compatibility issues (e.g., filenames containing `:` are not supported), which may cause Git operations to fail when working directly on the Windows file system.

### Recommended: Use WSL for Development

We recommend using [WSL (Windows Subsystem for Linux)](https://learn.microsoft.com/en-us/windows/wsl/install) to create a Linux-native development environment on Windows.

WSL provides full compatibility with the tooling used in this monorepo (Node.js, Python, Docker, etc.) and avoids common filesystem issues on Windows.

### Installing Ubuntu on WSL

We suggest installing the latest **Ubuntu LTS** release (e.g., Ubuntu 22.04) for best compatibility and support.

Follow the official Ubuntu WSL guide here:
👉 [Develop on Ubuntu with WSL](https://documentation.ubuntu.com/wsl/en/latest/tutorials/develop-with-ubuntu-wsl/)

Once WSL and Ubuntu are installed and configured, your environment is ready to mount and develop the repository using the instructions in the [Getting Started](#getting-started) section.

## Commit Conventions

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for creating clear and structured commit messages. We enforce this using [commitlint](https://commitlint.js.org/).
