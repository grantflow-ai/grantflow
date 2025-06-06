# GrantFlow.AI Development Guide

## Stack

- **Frontend**: Next.js 15, TypeScript, React 19, Tailwind CSS
- **Backend**: Python 3.12, Litestar, msgspec, SQLAlchemy 2.0 async
- **Services**: backend (API), indexer (docs), crawler (web)
- **Tools**: Node.js 22+, pnpm, uv, Docker Compose, GCP

## Core Rules

- NO inline comments/docstrings
- Type all Python args/returns (3.12+ syntax)
- Use `uv run`, `tofu`, SCREAMING_SNAKE_CASE constants
- Use `??` not `||`, extract magic numbers
- 100% test coverage, real PostgreSQL
- Use `pnpm`
- Use `task`

## Commands

```bash
task setup dev test lint db:migrate generate:api-types
```

## Patterns

### Backend Endpoint

```python
@post("/items", allowed_roles=[UserRoleEnum.MEMBER])
async def create_item(data: TypedDict, request: Request[User, Token, Any]) -> dict:
    async with session_maker() as session, session.begin():
        # operations
        return {"id": item.id}
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

## Python Guidelines

- Litestar + msgspec serialization
- TypedDict: Use `NotRequired[type]` not `type | None`
- Check entity exists before updates
- Use `logger.exception()` not `logger.error(..., exc_info=True)`
- Avoid `global` - use singleton classes
- Use `get_env()` with fallbacks

## Key Learnings

### Wizard Patterns

Create draft entities early for file uploads. Applications start as "Untitled Application", debounced title updates (500ms), validate title + documents before proceeding.

### Pub/Sub Handling

Handle duplicates gracefully in consumers. Check existence before insert, use `ON CONFLICT DO NOTHING`, return 200 for processed messages.

**Topics**: `url-crawling`, `source-processing-notifications`, `file-indexing`

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
