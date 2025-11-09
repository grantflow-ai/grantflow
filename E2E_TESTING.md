# E2E Testing Strategy

## Overview

GrantFlow uses a two-tier E2E testing approach:

1. **Mocked Backend E2E** - Fast, isolated frontend tests with mocked API responses
2. **Full Stack E2E** - Complete integration tests with real backend services

## Architecture

### Mocked Backend E2E (Default)

**Purpose**: Test frontend UI logic, user flows, and component integration without backend dependencies

**When to use**:
- Default for all PR CI runs
- Local development testing
- Testing frontend-only changes
- Rapid iteration on UI/UX

**How it works**:
- Playwright runs tests against local Next.js dev server (port 3001)
- API calls are intercepted using `page.route()` (see `frontend/e2e/helpers/auth.ts`)
- Firebase Auth is mocked with test credentials
- Backend responses are mocked with realistic data

**Running locally**:
```bash
task frontend:test:e2e
# or
cd frontend && pnpm test:e2e
```

**CI**: Runs automatically on all PRs in `.github/workflows/ci-frontend.yaml`

**Pros**:
- ⚡ Fast (~2 minutes)
- 🔒 Isolated (no backend failures affect tests)
- 💰 Low cost (no infrastructure needed)
- 🔄 Deterministic (no race conditions)

**Cons**:
- ❌ Mocks can drift from real API
- ❌ Doesn't test backend integration
- ❌ Can't catch API contract changes

### Full Stack E2E

**Purpose**: Test complete user flows with real backend, database, and all services

**When to use**:
- Before major releases
- Testing backend + frontend changes together
- Validating API contracts
- Testing real authentication flows
- Pre-production smoke tests

**How it works**:
- Docker Compose starts full stack with `e2e-full` profile:
  - PostgreSQL database
  - Backend API service
  - Frontend Next.js app
  - Firebase Auth emulator
  - GCS emulator
  - Pub/Sub emulator
- Playwright tests run against containerized frontend
- Real API calls to containerized backend
- Database seeded with E2E test data

**Running locally**:
```bash
task frontend:test:e2e:full
```

**Running manually**:
```bash
# Start services
task e2e:up:full

# Seed database
task e2e:seed

# Run tests
cd frontend && pnpm test:e2e

# Cleanup
task e2e:down
```

**CI**: Not currently automated (optional - can add to scheduled workflow)

**Pros**:
- ✅ Tests real integration
- ✅ Catches API contract issues
- ✅ Tests database interactions
- ✅ More confidence before production

**Cons**:
- 🐌 Slow (~10-15 minutes)
- 💰 Resource intensive
- 🔧 More complex setup
- ⚠️ Potential flakiness from timing issues

## Docker Compose Profiles

### `e2e` Profile
**Services**: Database, Firebase Auth Emulator, GCS Emulator, Pub/Sub Emulator

**Used by**:
- Python service E2E tests (`services/*/tests/`)
- Backend integration tests

**Start command**: `docker compose --profile e2e up -d`

### `e2e-full` Profile
**Services**: All `e2e` services + Backend + Frontend

**Used by**:
- Full stack E2E tests
- Complete integration testing

**Start command**: `docker compose --profile e2e-full up -d`

## Test Data

E2E test data is managed in `scripts/seed_e2e.py`:

**Test User**:
- Email: `e2e.playwright+ci@grantflow.ai`
- UID: `e2e-test-user-uid`
- Organization: E2E Test Organization
- Role: OWNER

**Test IDs** (fixed UUIDs for deterministic tests):
```python
TEST_ORG_ID = "00000000-0000-0000-0000-000000000001"
TEST_PROJECT_ID = "00000000-0000-0000-0000-000000000002"
TEST_APPLICATION_ID = "00000000-0000-0000-0000-000000000003"
TEST_INSTITUTION_ID = "00000000-0000-0000-0000-000000000004"
```

## Taskfile Commands

```bash
# Frontend E2E with mocked backend (fast)
task frontend:test:e2e

# Frontend E2E with real backend (slow, full integration)
task frontend:test:e2e:full

# Start emulators only (for backend Python tests)
task e2e:up

# Start full stack (for frontend full E2E)
task e2e:up:full

# Seed E2E test data
task e2e:seed

# Stop all E2E services
task e2e:down
```

## Mock Helpers

Located in `frontend/e2e/helpers/auth.ts`:

- `mockFirebaseAuth(page)` - Mock Firebase Auth flow
- `mockBackendLogin(page)` - Mock `/login` endpoint
- `mockBackendOrganizations(page)` - Mock `/organizations` endpoint
- `setupAuthenticatedSession(page)` - Bypass login, set auth state directly
- `mockGoogleOAuth(page)` - Mock Google OAuth flow

**Example**:
```typescript
test('should load dashboard', async ({ page }) => {
  await setupAuthenticatedSession(page);
  await page.goto('/organization');
  await expect(page.getByTestId('dashboard-title')).toBeVisible();
});
```

## Best Practices

### For Mocked E2E Tests
1. ✅ Mock at the network layer with `page.route()`
2. ✅ Use realistic response data
3. ✅ Test happy paths and error states
4. ✅ Focus on user flows, not API logic
5. ✅ Keep mocks in sync with API changes

### For Full Stack E2E Tests
1. ✅ Use test data with fixed UUIDs
2. ✅ Clean up data between tests
3. ✅ Add wait conditions for async operations
4. ✅ Use `data-testid` attributes for reliable selectors
5. ✅ Run locally before committing
6. ✅ Keep tests independent (don't rely on execution order)

### General
1. ✅ Use descriptive test names
2. ✅ Group related tests with `test.describe()`
3. ✅ Use `test.skip()` for WIP tests (with TODO comments)
4. ✅ Add screenshots on failure
5. ✅ Keep tests under 60 seconds each

## CI Integration

**Current Setup** (`.github/workflows/ci-frontend.yaml`):
- Runs mocked E2E tests on every PR
- Fast feedback loop (~2 minutes)
- No infrastructure costs

**Future Enhancements**:
- Add scheduled full stack E2E tests (nightly)
- Add full stack E2E on pre-release tags
- Add smoke tests in production with real user flows

## Troubleshooting

### Test fails locally but passes in CI
- Check if you have leftover Docker containers: `docker compose down`
- Ensure clean state: `task e2e:down && task e2e:up`

### Mock responses not being intercepted
- Verify the route pattern matches: `**/api/endpoint`
- Check if CORS is blocking requests
- Use `page.route('**', route => { console.log(route.request().url()); route.continue(); })` to debug

### Full stack tests timing out
- Increase timeout in `playwright.config.ts`
- Add explicit wait conditions: `await page.waitForSelector('[data-testid="element"]')`
- Check Docker logs: `docker compose logs backend`

### Database seeding fails
- Ensure migrations ran: `task e2e:migrate`
- Check database is running: `docker compose ps`
- Verify connection string: `postgresql+asyncpg://local:local@localhost:5433/local`

## Related Files

- `frontend/e2e/` - Playwright test files
- `frontend/playwright.config.ts` - Playwright configuration
- `frontend/e2e/helpers/auth.ts` - Mock helpers
- `scripts/seed_e2e.py` - E2E test data seeding
- `docker-compose.yaml` - Service definitions with profiles
- `Taskfile.yaml` - Task automation
- `.github/workflows/ci-frontend.yaml` - CI configuration
