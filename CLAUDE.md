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
- **Linting**: Biome (formatting/style), ESLint (TS/React), MyPy (Python types), Ruff (Python), Codespell

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
task lint               # Run all linters (equivalent to task lint:all)

# Linting commands (organized by scope)
task lint:all           # Run all linters on all files
task lint:frontend      # Run frontend linters (Biome, ESLint, and TypeScript)
task lint:python        # Run Python linters (Ruff and MyPy)

# Specific linters (use these during development)
task lint:biome         # Format and lint JS/TS/JSON/CSS with Biome
task lint:eslint        # Lint JavaScript/TypeScript with ESLint
task lint:typescript    # Type check TypeScript code
task lint:ruff          # Lint and format Python code with Ruff
task lint:mypy          # Type check Python code with MyPy
task lint:codespell     # Check for common misspellings across all files

# Terraform linters (specialized - not included in lint:all)
task lint:terraform     # Run all Terraform linters (validate, tflint, trivy)
task lint:terraform:validate  # Validate Terraform configuration
task lint:terraform:fmt       # Format Terraform code
task lint:terraform:tflint    # Lint Terraform code with tflint
task lint:terraform:trivy     # Security scan Terraform code

# Database
task db:migrate         # Run migrations
task db:drop            # Drop and recreate DB (WARNING: destroys data)
task db:reset           # Drop DB and re-run migrations

# Other
task generate:api-types # Generate TypeScript types from backend
task --list             # Show all available tasks
```

IMPORTANT: Always check the Taskfile.yaml for the most up-to-date commands and their exact implementations.

## Testing

### Test Organization and Markers

The project uses pytest markers to organize tests by duration and purpose:

```bash
# Quick unit tests (default - no marker needed)
pytest services/indexer/tests/          # Runs unit tests only (~8s)

# Smoke tests - Essential functionality checks (< 1 min)
E2E_TESTS=1 pytest -m "smoke"          # Quick e2e validation

# Quality assessment tests (2-5 min)
E2E_TESTS=1 pytest -m "quality_assessment"  # Moderate quality checks

# Full e2e test suite (10+ min)
E2E_TESTS=1 pytest -m "e2e_full"       # Complete integration testing

# Specialized evaluation tests
E2E_TESTS=1 pytest -m "semantic_evaluation"  # Semantic similarity tests
E2E_TESTS=1 pytest -m "ai_eval"        # AI-powered evaluation tests

# All slow tests
E2E_TESTS=1 pytest -m "slow"           # Any time-intensive tests
```

### Test Categories

**Unit Tests** (no markers):
- Fast, mocked tests
- Run by default in CI
- Cover core logic and error paths
- ~8-10 seconds total runtime

**E2E Tests** (require `E2E_TESTS=1`):
- Test real functionality with actual files
- Use pytest markers for duration control
- Include quality and semantic validation
- Range from 1 min (smoke) to 10+ min (full)

### Running Tests

```bash
# Development workflow
task test                                    # Run all unit tests
E2E_TESTS=1 task test                       # Run all tests including e2e

# Specific services
pytest services/indexer/tests/             # Just indexer unit tests
E2E_TESTS=1 pytest services/indexer/tests/ # Indexer unit + e2e tests

# CI-friendly patterns
pytest                                      # Fast unit tests only
E2E_TESTS=1 pytest -m "smoke"             # Essential e2e validation
E2E_TESTS=1 pytest -m "not (ai_eval or semantic_evaluation)" # Skip expensive AI tests
```

### Timeout Configuration

- Default timeout: 120 seconds (set in `pyproject.toml`)
- Individual tests can override with `@pytest.mark.timeout(300)`
- E2E tests have longer timeouts based on complexity
- Smoke tests: 60-120s, Quality: 180-300s, Full: 600s+

### Applying Test Markers

**Unit Tests**: No markers needed - they run by default

**E2E Tests**: Apply appropriate markers based on test duration and purpose:

```python
# Quick smoke test (< 1 min)
@pytest.mark.smoke
@pytest.mark.timeout(60)
async def test_basic_extraction():
    ...

# Quality assessment (2-5 min)
@pytest.mark.quality_assessment
@pytest.mark.timeout(180)
async def test_extraction_quality():
    ...

# Full e2e test (10+ min)
@pytest.mark.e2e_full
@pytest.mark.timeout(600)
async def test_comprehensive_pipeline():
    ...

# Semantic evaluation
@pytest.mark.semantic_evaluation
async def test_embedding_similarity():
    ...

# AI-powered evaluation
@pytest.mark.ai_eval
async def test_llm_quality_assessment():
    ...
```

**Guidelines**:
- Use `@pytest.mark.skipif(not environ.get("E2E_TESTS"))` for all e2e tests
- Always set appropriate timeouts for longer tests
- Unit tests should complete in seconds, not need markers

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

### Frontend Testing

- Use Vitest with React Testing Library
- **NO mocking stores** - use real Zustand stores with setState
- Mock server actions and API calls, not state management
- Always use factories from `::testing/factories` (alias for `frontend/testing/factories`)
- Place shared utils and fixtures in the testing module
- Use `vi.fn()` for mocking functions you need to spy on
- Test behavior and user interactions, not implementation details

### Backend Testing

- pytest async, focus on API behavior
- Use real PostgreSQL for all tests
- Mock external services, not internal components
- Verify WebSocket integration with proper test clients

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.

## Linting and Code Quality

### Biome Configuration

Biome is the primary formatter and linter for JS/TS/JSON/CSS:

- Configuration: `biome.json` in root
- Integrates with ESLint via `eslint-config-biome`
- Handles formatting, import sorting, and many style rules
- Run with: `task lint:biome` or `pnpm biome check --write .`

### Common Linting Patterns

1. **Cognitive Complexity**: Extract helper functions and components to reduce complexity

    - Extract repeated logic into named functions
    - Use early returns to reduce nesting
    - Break complex components into smaller ones

2. **Type Safety**: Always provide proper types for function parameters

    - Import types explicitly when needed
    - Use type guards from `@tool-belt/type-predicates`
    - Avoid `any` - find the correct type from libraries or create interfaces

3. **Accessibility**: Follow ARIA guidelines

    - Remove unnecessary `aria-label` on semantic elements (like `<footer>`)
    - Use semantic HTML elements when possible (`<button>` instead of `<div role="button">`)
    - Interactive elements must be keyboard accessible

4. **React Best Practices**:
    - Always add `type="button"` to non-submit buttons
    - Use proper event handlers for keyboard accessibility
    - Extract complex logic into custom hooks

### Linting Workflow

1. After code changes, run: `task lint`
2. Fix any errors shown by Biome first
3. Then fix ESLint errors (usually type-related)
4. For Python: `task lint:python` runs mypy, ruff, and codespell
5. Commit with conventional commit messages

### Common Fixes

- **Button type warnings**: Add `type="button"` to all non-form buttons
- **Excessive complexity**: Extract functions, use early returns, create helper components
- **Type safety**: Import and use proper types, avoid `any`
- **ARIA issues**: Use semantic HTML, remove redundant attributes
- **Static element interactions**: Add proper roles and keyboard handlers
