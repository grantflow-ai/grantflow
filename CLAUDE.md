# GrantFlow.AI Monorepo Guidelines

This document provides development guidelines and common commands for working with the GrantFlow.AI monorepo.

## Monorepo Structure

- `/services` - Python backend services:
    - `/services/backend` - Main API service powered by Litestar
    - `/services/indexer` - Document indexing service
- `/packages` - Shared Python packages:
    - `/packages/db` - Database models and migrations
    - `/packages/shared_utils` - Common utilities
- `/frontend` - NextJS frontend application
- `taskfile.yaml` - Task runner configuration for common development commands
- `docker-compose.yaml` - Configuration for local development environment

## Package Managers

- **Backend**: Use `uv` for Python dependency management
- **Frontend**: Use `pnpm` for Node.js dependency management

## Development Tools

We use [Task](https://taskfile.dev) as our task runner to standardize commands across the monorepo. All common development tasks are defined in `taskfile.yaml`.

## Common Commands

### Setup & Dependencies

```bash
# Install all dependencies (both frontend and backend)
task setup

# Backend dependencies for all services/packages
uv sync --all-packages --dev

# Frontend-specific dependencies
cd frontend && pnpm install

# Update dependencies
task update
```

### Development

```bash
# Start the database
task db:up

# Apply migrations
task db:migrate

# Start frontend development server
task frontend:dev

# Backend server (if not using task)
cd services/backend && PYTHONPATH=. uvicorn src.api.main:app --reload

# Indexer server (if not using task)
cd services/indexer && PYTHONPATH=. uvicorn src.main:app --reload
```

### Testing

```bash
# Run all tests
task test

# Run backend tests
task backend:test

# Run frontend tests
task frontend:test

# Specific backend tests with pytest
cd services/backend && uv run python -m pytest tests/path/to/test.py -v
cd services/indexer && uv run python -m pytest tests/path/to/test.py -v
```

### Code Quality

```bash
# Run all linters and formatters
task lint

# Or directly with pre-commit
pre-commit run --all-files
```

## Backend Architecture

The backend is now split into multiple services and packages for better separation of concerns:

### Services

1. **Backend API Service** (`/services/backend`):

    - `/src/api`: HTTP routes and WebSocket endpoints
    - `/src/rag`: Retrieval augmented generation features
    - `/src/utils`: Service-specific utilities

2. **Indexer Service** (`/services/indexer`):
    - Document processing and extraction
    - Text chunking and vector indexing
    - File parsing and metadata extraction

### Packages

1. **DB Package** (`/packages/db`):

    - Database models in `src/tables.py`
    - Migrations using Alembic
    - Database connection and utility functions

2. **Shared Utils Package** (`/packages/shared_utils`):
    - Common utilities used across services
    - Embedding utilities
    - Serialization helpers
    - Logging configuration

## Data Model & Serialization

- Uses **TypedDict** for DTOs instead of Pydantic
- Uses `NotRequired` for optional fields with complete docstrings
- Uses **msgspec** for high-performance serialization (from shared_utils)
- For tests, uses polyfactory's TypedDictFactory and SQLAlchemyFactory

## Testing Strategy

- **Docker-based PostgreSQL** container with pgvector extension for test database
- **End-to-End Tests**: Controlled with `E2E_TESTS` environment variable
- **API Tests**: Uses Litestar's test client
- **Test Data**:
    - Fixtures in `testing/test_data/fixtures/`
    - Factory pattern with polyfactory
- **Async Testing**:
    - Uses pytest-asyncio
    - Async fixtures for database operations

### Database Testing Patterns

#### Test Database Setup

- Uses an async SQLAlchemy engine and session maker provided as fixtures
- Database is set up with a temporary PostgreSQL container for each test session
- Database schema is created using SQLAlchemy's metadata.create_all
- Fixtures in conftest.py provide database objects needed for tests

#### Common Database Testing Patterns

1. **Creating Test Data**:

    ```python
    async with async_session_maker() as session, session.begin():
        session.add(test_object)
        # or
        await session.execute(insert(Table).values(...))
        await session.commit()
    ```

2. **Verifying API Changes**:

    ```python
    async with async_session_maker() as session:
        result = await session.scalar(select(Table).where(Table.id == object_id))
        assert result.field == expected_value
    ```

3. **Checking Deletion**:
    ```python
    with pytest.raises(NoResultFound):
        async with async_session_maker() as session, session.begin():
            await session.get_one(Table, object_id)
    ```

#### Test Fixtures

- Standard objects like `workspace`, `grant_application`, `funding_organization` defined as async fixtures
- User role fixtures (`workspace_member_user`, `workspace_admin_user`, `workspace_owner_user`) set up appropriate permissions
- Fixtures handle database cleanup after tests

#### Factory Pattern

- `factories.py` provides factories for both SQLAlchemy models and TypedDict objects
- `SQLAlchemyFactory` creates database model instances
- `TypedDictFactory` creates DTO objects for API requests/responses
- Factory methods like `.build()` and `.batch()` are used to create test data

#### Database Transaction Management

- Tests use async context managers with explicit transaction control
- Transactions are committed explicitly in test code
- Tests rely on database cleanup fixture to reset state between tests

#### Available Fixtures

- **CFP Fixtures**: Raw markdown files, extracted data, and sections in `/testing/test_data/fixtures/cfps/`
- **Grant Template Fixtures**: Examples in directories like `/testing/test_data/fixtures/43b4aed5-8549-461f-9290-5ee9a630ac9a/grant_template.json`
- **Application Files Fixtures**: Various RAG-indexed files and documents
- **Organization Files Fixtures**: Organization-specific files in `/testing/test_data/fixtures/organization_files/`
- **Results Fixtures**: Generated outputs in `/testing/test_data/results/`
- **Source Files**: Original source files in `/testing/test_data/sources/`
- **Synthetic Data**: Generated template data in `/testing/test_data/synthetic/template_data/`

### Code Style Conventions

- **Formatting**: 120 character line length; Google docstring format
- **Types**: Python 3.12 syntax; comprehensive type hints required
- **Patterns**:
    - Use async/await for database operations
    - Sort kwargs alphabetically
    - For 3+ arguments, use kwargs only (e.g., `def func(*, arg1, arg2, arg3)`)
    - Prefer functional approach over OOP

## Frontend-Specific Guidelines

### Architecture

- `/src`: Source code
    - `/app`: Next.js app router pages and layouts
    - `/components`: React components
    - `/actions`: Server actions for API communication
    - `/hooks`: Custom React hooks
    - `/lib`: Shared utilities and schemas
    - `/utils`: Helper functions
    - `/types`: TypeScript type definitions

### State Management

- Use React context for state that spans multiple components
- Use React Query for server state management
- Prefer server components where possible

### Component Guidelines

- Use shadcn/ui components as the base UI library
- Follow the folder structure for component organization
- Create reusable components in the `/components` directory

### Testing Strategy

- Use Vitest for unit and component testing
- Create factory functions in `/testing/factories.ts` for test data

### Code Style Conventions

- Follow ESLint and Prettier configuration
- Use TypeScript for all components and utilities
- Use Next.js App Router patterns for routing

**IMPORTANT**: Do not add inline comments!
