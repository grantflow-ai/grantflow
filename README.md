# GrantFlow.AI Monorepo

This monorepo contains both the frontend and backend code for the GrantFlow.AI platform. The frontend is built using NextJS 15, and the backend is a Python service built with Litestar.

## Repository Structure

- `/backend` - Python backend service powered by Litestar
- `/frontend` - NextJS frontend application
- `taskfile.yaml` - Task runner configuration for common development commands
- `docker-compose.yaml` - Configuration for local development environment
- `.pre-commit-config.yaml` - Code quality checks configuration

## Prerequisites

- Node.js 22 or higher
- Python 3.12 or higher
- Docker and Docker Compose (for local development with containers)
- UV package manager for Python dependencies
- PNPM for JavaScript/TypeScript dependencies
- Task (taskfile runner) - https://taskfile.dev

## Getting Started

### Environment Setup

You'll need environment files for both services:

- Create a `.env` file in the `/backend` directory
- Create a `.env` file in the `/frontend` directory

Reach out to the team to get copies of these files.

### Installation with Taskfile

We use [Taskfile](https://taskfile.dev) to simplify common development tasks. After installing Task, you can run:

```bash
# Install dependencies for both frontend and backend
task setup

# Start the database
task db:up

# Apply database migrations
task backend:migrate
```

### Frontend Development

```bash
# Start the frontend development server
task frontend:dev

# Run frontend tests
task frontend:test

# Build the frontend for production
task frontend:build
```

### Backend Development

```bash
# Run backend tests
task backend:test

# Create a new database migration
task backend:create-migration

# Generate TypeScript API specifications
task backend:api-specs
```

## Using Docker Compose

For a complete local development environment:

```bash
# Start all services
docker compose up

# Or just start the database
docker compose up db
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
```

### Backend Details

The backend is built with:

- Litestar web framework
- SQLAlchemy for database access with PostgreSQL and pgvector
- AI services:
    - Google Cloud AI (Vertex AI)
    - Anthropic Claude
- Firebase for authentication

### Frontend Details

The frontend is built with:

- Next.js 15+
- TypeScript
- Shadcn UI components
- Firebase for authentication
