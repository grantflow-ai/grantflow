# GrantFlow.AI Development Guide

## System Prompt

You are an efficient developer following a structured development process:

- implement code
- run typechecks
- run the relevant linters
- write tests, always use factories to generate data (see ::testing/factories)

IMPORTANT: Always use the Taskfile for running commands. Check available tasks by:

1. First checking your memory for task names
2. If needed, read the Taskfile.yaml to see all available commands
3. Use `task --list` to see available commands with descriptions

## Stack

- **Frontend**: Next.js 15, TypeScript, React 19, Tailwind CSS
- **Backend**: Python 3.13, Litestar, msgspec, SQLAlchemy 2.0 async
- **Services**: backend (API), indexer (docs), crawler (web)
- **Tools**: Node.js 22+, pnpm, uv, Docker Compose, GCP

## Core Rules

- NO inline comments/docstrings
- Type all Python args/returns (3.13+ syntax)
- Use `uv run`, `tofu`, SCREAMING_SNAKE_CASE constants
- Use `??` not `||`, extract magic numbers
- 100% test coverage, real PostgreSQL
- Use `pnpm`
- Use `task`
- Run linters after code changes: `task lint:frontend` for JS/TS, `task lint:python` for Python

## Commands

Always use the Taskfile for commands. Common tasks:

```bash
# Development workflow
task setup              # Install dependencies and git hooks (lefthook)
task dev                # Start full dev environment (checks deps, migrates DB, inits emulators)
task dev:stop           # Stop all services
task test               # Run all tests
task lint               # Run all linters (or task lint:all)

# Specific linters (use these during development)
task lint:biome         # Format and lint code with Biome
task lint:eslint        # Lint JavaScript/TypeScript
task lint:ruff          # Lint and format Python code
task lint:mypy          # Type check Python code
task lint:codespell     # Check for common misspellings
task lint:python        # Run all Python linters
task lint:frontend      # Run all frontend linters

# Database
task db:migrate         # Run migrations
task db:drop            # Drop and recreate DB (WARNING: destroys data)
task db:reset           # Drop DB and re-run migrations

# Other
task generate:api-types # Generate TypeScript types from backend
task --list             # Show all available tasks
```

IMPORTANT: Always check the Taskfile.yaml for the most up-to-date commands and their exact implementations.

## Git Hooks (Lefthook)

The project uses lefthook for git hooks. It's automatically installed during `task setup`.

- **pre-commit**: Runs linters on staged files and auto-fixes issues
- **commit-msg**: Validates commit messages follow conventional commits format

To manually install/update hooks: `uv run lefthook install`

## Patterns

### Backend Endpoint

```python
@post("/items", allowed_roles=[UserRoleEnum.MEMBER])
async def create_item(data: TypedDict, session_maker: async_sessionmaker[Any]) -> dict:
    async with session_maker() as session, session.begin():
        # operations
        await session.commit()
        return {"id": str(item.id)}
```

### Response Building Pattern

```python
response: ItemResponse = {
    "id": str(item.id),
    "name": item.name,
    "created_at": item.created_at.isoformat(),
}

# Add optional fields conditionally
if item.description:
    response["description"] = item.description
```

### Frontend API

```typescript
export async function createItem(data: API.CreateItem.RequestBody) {
	return withAuthRedirect(
		getClient()
			.post(`items`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.CreateItem.ResponseBody>(),
	);
}
```

## TypeScript Guidelines

- Next.js App Router, TypeScript strict, Vitest
- Ky client with generated types from `@/types/api-types`
- Wrap API calls with `withAuthRedirect`
- Backend returns 400 for validation errors
- Use `getEnv()` for typed environment variables
- Use object or array destructuring wherever possible
- Prefer early returns and guard clauses
- Use `NotRequired` in TypedDict for optional fields

### Important Conventions

- never use `any` as a type.
- search for types, including from 3rd party libraries, to determine the correct type to use.
- use nullish coalescing and optional chaining whenever required.
- use type-guards and type predicates (use "@tool-belt/type-predicates" package as required)
- use factories for testings (see: frontend/testing/factories.ts, which s aliased as "::testing/factories")

## Python Guidelines

- Litestar + msgspec serialization
- TypedDict: Use `NotRequired[type]` not `type | None`
- Check entity exists before updates
- Use `logger.exception()` not `logger.error(..., exc_info=True)`
- Avoid `global` - use singleton classes
- Use `get_env()` with fallbacks
- Always use UUIDs as strings in responses (convert with `str()`)
- Use `.isoformat()` for datetime serialization
- Polymorphic SQLAlchemy models for flexible schemas

## Key Learnings

### Wizard Patterns

Create draft entities early for file uploads. Applications start as "Untitled Application", debounced title updates (500ms), validate title + documents before proceeding. **For detailed wizard implementation, see [WIZARD_FEATURE.md](./WIZARD_FEATURE.md)**.

### Pub/Sub Handling

Handle duplicates gracefully in consumers. Check existence before insert, use `ON CONFLICT DO NOTHING`, return 200 for processed messages.

**Topics**: `url-crawling`, `frontend-notifications`, `file-indexing`, `rag-processing`

### State Management Patterns

- Use Zustand for complex multi-step flows
- Separate UI state from domain state
- Create focused actions for specific operations
- Use polling sparingly with proper cleanup

### WebSocket Integration

Extract to custom hooks, use `react-use-websocket`, convert HTTP→WS URLs, handle null IDs gracefully. Endpoint: `/workspaces/{id}/applications/{id}/notifications`

### Environment Variables

- **Frontend**: `getEnv()` throws if missing required vars
- **Backend**: `get_env()` with fallback values
- **Build-time**: `process.env.NODE_ENV` in Next.js

## Security

Firebase auth + JWT, environment variables for secrets, never commit credentials.

## Testing

pytest async, focus on API behavior, mock WebSocket hooks, verify connection status UI.
