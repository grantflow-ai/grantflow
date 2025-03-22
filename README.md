# GrantFlow.AI Monorepo

This monorepo contains both the frontend and backend code for the GrantFlow.AI platform. The frontend is built using NextJS 15, and the backend is a Python service built with Litestar.

For detailed information on specific modules, refer to their dedicated documentation:

- [Backend Documentation](./backend/README.md) - architecture, components, and development workflow
- [Frontend Documentation](./frontend/README.md) - project structure, components, and UI development

## Repository Structure

- [`/backend`](./backend/README.md) - Python backend service powered by Litestar
- [`/frontend`](./frontend/README.md) - NextJS frontend application
- `taskfile.yaml` - Task runner configuration for common development commands
- `docker-compose.yaml` - Configuration for local development environment
- `.pre-commit-config.yaml` - Code quality checks configuration

## Prerequisites

- Node.js 22 or higher
- Python 3.12 or higher
- Docker and Docker Compose
- [UV](https://github.com/astral-sh/uv): package manager for Python dependencies
- [PNPM](https://pnpm.io/): package manager for JavaScript/TypeScript dependencies
- [Task](https://taskfile.dev): taskfile runner
- [Atlas](https://atlasgo.io/): DB migration tool
- [pre-commit](https://pre-commit.com/): Linting and formatting tool

Make sure to install all of these on your system.

## Getting Started

Begin by installing Task and pre-commit on your system. Then verify the installation by listing available commands:

```bash
task --list
```

### Environment Setup

You'll need environment files for both services:

- Copy the `.env.example` file and rename it to `.env` file in the `/backend` directory
- Copy the `.env.example` file and rename it to `.env` file in the `/frontend` directory

Reach out to the team to get secret values for the obfuscated values.

### Setup

After installing Task and pre-commit, run:

```bash
task setup
```

At this point it's recommended you migrate and seed the database (see the [Database](#database) section).

## Local Development

### Quick Start

To start the entire development environment with one command:

```bash
# Start both frontend and backend servers with database
task dev
```

This will start the database, backend server, and frontend development server in parallel.

### Repository Commands

```bash
# Run all tests (backend and frontend)
task test

# Run linters and formatters
task lint

# Update all dependencies
task update
```

### Database

We are using Postgresql 17 with pgvector.
We manage migrations using Atlas, which you should install on your system.
We also use docker-compose to manage our local development environment.

Available Commands:

```bash
# Start the database
task db:up

# Tear down the database
task db:down

# Apply database migrations (requires atlas, does not require db:up)
task db:migrate

# Create a new database migration (requires atlas, does not require db:up)
task db:create-migration -- <migration_name>

# Seed the database with initial data
task db:seed

# Completely reset database (down, up, migrate, seed)
task db:reset
```

### Frontend Development

You can develop the frontend using either docker or using your local environment. If you are developing locally, make sure
to adjust the value for `NEXT_PUBLIC_BACKEND_API_BASE_URL` in the `.env` file to point at the backend API.

```bash
# Run frontend locally in development mode
task frontend:dev

# Run frontend tests
task frontend:test

# Run frontend tests without watch mode
task frontend:test -- --run

# Build the frontend for production
task frontend:build

# Install frontend dependencies only
task frontend:install

# Update frontend dependencies
task frontend:update

# Run ESLint on frontend code
task frontend:lint

# Run TypeScript type checking
task frontend:typecheck
```

### Backend Development

You can develop the backend using either docker or using your local environment. If you are developing locally, make sure
to adjust the value for `DATABASE_CONNECTION_STRING` in the `.env` file to point at your local database.

```bash
# Start the backend server with hot reload
task backend:dev

# Run backend tests
task backend:test

# Run backend end-to-end tests
task backend:test:e2e

# Run specific backend tests
task backend:test -- tests/path/to/test.py -v

# Generate TypeScript API types from backend
task backend:api-specs

# Run mypy type checking
task backend:typecheck

# Run Ruff linter
task backend:lint

# Format code with Ruff
task backend:format

# Run both linting and type checking
task backend:check

# Install backend dependencies only
task backend:install

# Update backend dependencies
task backend:update
```

## Using Docker Compose

For a complete local development environment:

```bash
# Start all services
docker compose up

# Or just start the database
docker compose up db

# Or a single service
docker compose up backend # or frontend
```

This will start:

- PostgreSQL database with pgvector extension
- Backend API on port 8000
- Frontend on port 3000

## Development Workflow

### Code Quality

We use pre-commit hooks to maintain code quality. Our pre-commit configuration includes:

- Commit message linting (using conventional commits)
- Code formatting (Prettier for frontend, Ruff for backend)
- TypeScript/JavaScript linting (ESLint)
- Python type checking (mypy)
- Style linting (stylelint)
- General checks (YAML, JSON, trailing whitespace, etc.)

You can run pre-commit manually using:

```bash
# Run all pre-commit hooks
task lint

# Or directly with pre-commit
pre-commit run --all-files

# Update project dependencies
task update
```

## Commit Conventions

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for creating clear and structured commit messages. We enforce this using [commitlint](https://commitlint.js.org/).

### Commit Message Format

Each commit message consists of a **header**, an optional **body**, and an optional **footer**:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

#### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to our CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

#### Examples

```
feat(frontend): add workspace creation wizard
fix(backend): resolve issue with document indexing
docs: update API documentation
refactor(api): simplify authentication flow
```

### Pre-commit Hooks

Our pre-commit hooks will automatically check your commit messages against these conventions. If your commit message doesn't follow the convention, the commit will be rejected.
