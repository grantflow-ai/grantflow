# GrantFlow.AI Monorepo Guidelines

Instructions:

- Update CLAUDE.md with your learnings
- Update this file with your own guidelines
- If you encounter mistakes, correct them

## Project Structure

- **Frontend**: Next.js 15 app with TypeScript, React 19, and Tailwind CSS (under `./frontend`)
- **Backend Services**: Python microservices using Litestar framework (under `./services`)
    - `backend`: Main API service with authentication and business logic
    - `indexer`: Document indexing and processing service
    - `crawler`: Web scraping and content extraction service
- **Shared Packages**: Reusable Python packages (under `./packages`)
    - `db`: Database models, migrations, and schemas
    - `shared_utils`: Common utilities and AI helpers
- **Infrastructure**: Terraform/OpenTofu configurations (under `./terraform`)
- **Testing**: Shared testing utilities and fixtures (under `./testing`)

## Development Environment

- **Node.js**: Version 22+ required
- **Python**: Version 3.12 required (enforced by uv)
- **Package Managers**:
    - `pnpm` (v10.11.0) for JavaScript/TypeScript
    - `uv` for Python dependencies and workspace management
- **Task Runner**: `task` (Taskfile) for common development commands
- **Pre-commit Hooks**: Automated code quality checks on commit

## Guidelines

### General

- DO NOT add inline comments
- DO NOT add doc strings
- Always type all arguments and return statements in Python
- Use python 3.12+ syntax only, especially for typing
- Use pytest functional style only
- For Python commands, use `uv run <command>` instead of `python <command>`
- Use `pre-commit run --all-files` to run all pre-commit hooks on all files or select specific hooks
- We use opentofu for terraform, so use `tofu` commands instead of `terraform`

### Python Development

- **Linting**: Ruff with extensive rule configuration (see pyproject.toml)
- **Type Checking**: mypy in strict mode
- **Testing**: pytest with asyncio support
    - Tests use real PostgreSQL database (via Docker)
    - Shared test plugins in `./testing` directory
    - Each service/package has its own `conftest.py`
    - Set `PYTHONPATH=$(pwd)` before running tests
    - Use `E2E_TESTS=1` environment variable for end-to-end tests
- **Code Coverage**: Minimum 80% coverage required
- **Async**: Heavy use of async/await patterns with SQLAlchemy async sessions

### Frontend Development

- **Framework**: Next.js 15 with App Router and Server Components
- **Styling**: Tailwind CSS v4 with custom configuration
- **Testing**: Vitest with React Testing Library
    - Mock files in `testing/global-mocks.ts`
    - Test files use `.spec.ts(x)` extension
- **Type Safety**: TypeScript in strict mode
- **State Management**: React Hook Form for forms
- **API Client**: Ky for HTTP requests with generated types from backend

### Database

- **PostgreSQL 17** with pgvector extension for embeddings
- **Alembic** for database migrations
- **SQLAlchemy 2.0** with async support
- **Testing**: Each test gets isolated database session

### Infrastructure

- **Docker Compose** for local development
- **Google Cloud Platform** deployment target
- **Services**:
    - PostgreSQL database
    - Valkey (Redis fork) for caching
    - Google Cloud Storage emulator
    - Pub/Sub emulator

## Commands

### Setup & Installation

- Initial setup: `task setup`
- Update all dependencies: `task update`

### Development

- Start all services: `task dev`
- Backend API only: `task service:backend:dev`
- Frontend only: `task frontend:dev`
- Storybook: `task frontend:storybook`

### Testing

- All tests: `task test`
- Frontend tests: `task frontend:test` or `task frontend:test:watch`
- Backend tests: `task backend:test`
- E2E tests: `task test:e2e`
- Specific service: `task service:<name>:test`

### Database

- Start database: `task db:up`
- Run migrations: `task db:migrate`
- Create migration: `task db:create-migration <message>`
- Seed database: `task db:seed`

### Code Quality

- Run all linters: `task lint`
- Frontend typecheck: `cd frontend && pnpm typecheck`
- Generate API types: `task generate:api-types`

### Infrastructure

- Format Terraform: `task terraform:fmt`
- Lint Terraform: `task terraform:lint`

## Storybook

- Configured with Next.js and Vite using `@storybook/experimental-nextjs-vite`
- Story files follow pattern `*.stories.tsx` alongside components
- Preview configuration supports environment variables
- Deployed to GitHub Pages via Chromatic

## Testing Guidelines

### Python Testing

- Use `pytest.mark.asyncio` for async test functions (auto-enabled)
- Create fixtures for singleton pattern resets
- Use `AsyncMock` from `unittest.mock` for async mocking
- Mock Google Cloud clients at both creation and method levels
- Test both success and failure scenarios
- Use `pytest.raises` with `match` for error validation
- Fixtures in `testing/` plugins for reusability
- Real database used with transaction rollback

### Frontend Testing

- Vitest with jsdom environment
- Global test setup in `testing/setup.ts`
- Mock Next.js navigation functions
- Use Testing Library queries
- Mock API calls with `vi.mock`
- Test files colocated with components

## Environment Variables

- Backend services use `.env` files in their directories
- Frontend uses `.env` with `NEXT_PUBLIC_` prefix for client variables
- Test environment uses stubbed credentials (see `base_test_plugin.py`)
- Docker Compose handles service discovery

## Git Workflow

- Commit messages follow Conventional Commits format
- Pre-commit hooks enforce code quality
- Branch protection on `main` branch
- Pull requests required for merges

## API Development

- Litestar framework for Python services
- WebSocket support for real-time features
- Generated TypeScript types from backend schemas
- JWT-based authentication with Firebase integration
- Structured logging with JSON output

## Security Notes

- Never commit real credentials
- Use environment variables for secrets
- Firebase service account credentials required
- JWT secrets must be configured
- Admin access codes for protected endpoints

## Learnings from Implementation

### Litestar API Endpoints

- **TypedDict with msgspec**: Litestar uses msgspec for serialization. Do NOT use type unions (e.g., `str | None`) in TypedDict fields - msgspec doesn't support them
- **NotRequired vs Optional**: Use `NotRequired[type]` for optional fields in request bodies, not `type | None`
- **Empty values**: Frontend should send empty objects/arrays instead of null when clearing values
- **Validation pattern**: Always check entity existence before updates:
    ```python
    entity = await session.scalar(select(Entity).where(Entity.id == id))
    if not entity:
        raise ValidationException("Entity not found")
    ```
- **Exception handling**: Use separate except blocks for ValidationException vs SQLAlchemyError
- **Workspace scoping**: For workspace-scoped endpoints, middleware automatically checks user permissions when `allowed_roles` is set

### Testing Patterns

- **Test fixtures**: Be careful with complex fixtures that have specific data structures - they may not match your test needs
- **TypedDict in tests**: Don't use TypedDict constructors in tests - use plain dictionaries for JSON payloads
- **Test isolation**: Each test should create its own test data rather than relying on shared fixtures with specific structures
- **Error assertions**: Test both the status code and error message content

### Authentication & Authorization

- **Middleware pattern**: The `AuthMiddleware` automatically handles workspace membership checks when `allowed_roles` is set on route handlers
- **Path parameters**: Workspace-scoped endpoints must have `workspace_id` in the path for authorization to work
- **Role-based access**: Use `allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER]` decorator parameter

### Database Operations

- **Update pattern**: Use `update().where().values(**data)` for updates with TypedDict data
- **Transaction handling**: Always use `async with session_maker() as session, session.begin():` pattern
- **Rollback on error**: Ensure rollback in except blocks before re-raising exceptions
- **Check relationships**: When updating related entities, verify parent entity exists and belongs to the correct workspace
