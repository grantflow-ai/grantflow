# Frontend E2E Tests

GrantFlow uses Playwright for browser automation. This directory contains end-to-end (E2E) tests that exercise the Next.js frontend.

## Test Organization

Currently, we maintain two test files:
- **`landing.spec.ts`** - Landing page tests (public, no auth required)
- **`login.spec.ts`** - Login flow tests (requires auth, currently stubs)

All other test files have been removed to focus on proper e2e testing infrastructure first.

## Running Tests

### Local Development (Mock API)
Tests run against the Next.js dev server with mocked API responses:
```bash
# From repo root
task frontend:test:e2e

# From frontend/ directory
pnpm test:e2e

# Run specific test file
pnpm test:e2e -- e2e/landing.spec.ts

# Visual debugging
pnpm test:e2e:ui
```

### CI Mode (Real Backend)
Tests run against real backend services with seeded data:
```bash
# Start services, seed data, and run tests
task frontend:test:e2e:ci

# Or manually control the flow:
task e2e:up      # Start docker services (db, backend, pubsub, gcs)
task e2e:seed    # Seed test data
pnpm test:e2e    # Run tests
task e2e:down    # Stop services
```

The CI mode:
1. Starts PostgreSQL, Backend API, Pub/Sub emulator, and GCS emulator via docker-compose
2. Runs database migrations
3. Seeds deterministic test data (see `scripts/seed_e2e.py`)
4. Runs Playwright tests against http://localhost:8000 backend
5. Cleans up services

## Test Data

E2E tests use deterministic test data created by `scripts/seed_e2e.py`:
- **Organization ID**: `00000000-0000-0000-0000-000000000001`
- **Project ID**: `00000000-0000-0000-0000-000000000002`
- **Application ID**: `00000000-0000-0000-0000-000000000003`
- **Test User UID**: `e2e-test-user-uid`
- **Test User Email**: `e2e.playwright+ci@grantflow.ai`

These IDs are predictable and can be referenced in tests.

## Authoring Guidelines

- **Prefer `data-testid` attributes** for selectors - DOM structure changes frequently
- **Keep tests deterministic** - avoid relying on animations, timers, or random data without explicit waits
- **Use `test-setup.ts`** for shared test configuration - it handles cookie consent and localStorage setup
- **Use `test.skip`** for unimplemented tests with a clear `TODO:` comment explaining blockers
- **No helpers directory** - keep test code inline for now until patterns emerge

## Authentication Strategy

We have two patterns for handling authentication in e2e tests:

### Pattern 1: Fast Authentication (Recommended for most tests)

Use `setupAuthenticatedSession()` to bypass the login UI entirely. This is **much faster** and should be used for any test that doesn't specifically test the login flow itself.

```typescript
import { setupAuthenticatedSession } from "./helpers/auth";

test("should display dashboard", async ({ page }) => {
  // Set up auth without going through login UI
  await setupAuthenticatedSession(page);

  // Now you're authenticated and can test features
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
});
```

**When to use:**
- Testing dashboard features
- Testing project/application functionality
- Testing settings and user management
- Any test where authentication is a prerequisite, not the focus

### Pattern 2: Login Flow Testing

Use `mockFirebaseAuth()` to test the actual login UI flow. This intercepts Firebase Auth API calls and returns mock credentials.

```typescript
import { mockFirebaseAuth, E2E_TEST_USER } from "./helpers/auth";

test("should login successfully", async ({ page }) => {
  // Mock Firebase Auth APIs
  await mockFirebaseAuth(page);

  // Now test the actual login flow
  await page.goto("/login");
  await page.fill('[data-testid="email-input"]', E2E_TEST_USER.email);
  await page.fill('[data-testid="password-input"]', "password");
  await page.click('[data-testid="login-button"]');

  // Verify successful login
  await expect(page).toHaveURL(/\/projects/);
});
```

**When to use:**
- Testing login form validation
- Testing login error handling
- Testing password reset flows
- Testing sign-up flows
- Any test specifically focused on authentication UI

### Test User Credentials

All e2e tests use a seeded test user with predictable IDs:

```typescript
import { E2E_TEST_USER } from "./helpers/auth";

// Available properties:
E2E_TEST_USER.uid               // "e2e-test-user-uid"
E2E_TEST_USER.email             // "e2e.playwright+ci@grantflow.ai"
E2E_TEST_USER.displayName       // "E2E Test User"
E2E_TEST_USER.organizationId    // "00000000-0000-0000-0000-000000000001"
E2E_TEST_USER.projectId         // "00000000-0000-0000-0000-000000000002"
E2E_TEST_USER.applicationId     // "00000000-0000-0000-0000-000000000003"
```

These match the data seeded by `scripts/seed_e2e.py`.

## Prerequisites

- Docker and docker-compose (for CI mode)
- Node.js 22+ and pnpm
- Python 3.13 and uv (for seeding)

Install everything:
```bash
task setup
```

## Writing New Tests

### Quick Start for Developers

1. **Find a stub test** in `dashboard.spec.ts` or `login.spec.ts`
2. **Remove `test.skip`** from the test
3. **Implement the test** following the TODO comments
4. **Add `data-testid` attributes** to components as needed
5. **Run the test** with `pnpm test:e2e -- e2e/dashboard.spec.ts`

### Example: Implementing a Stub Test

Before:
```typescript
test.skip("should display list of projects", async ({ page }) => {
  // TODO: Implement project list display test
  expect(page).toBeTruthy();
});
```

After:
```typescript
test("should display list of projects", async ({ page }) => {
  // Verify projects grid is visible
  const projectsGrid = page.locator('[data-testid="projects-grid"]');
  await expect(projectsGrid).toBeVisible();

  // Verify test project appears
  const projectCard = projectsGrid.locator('[data-testid="project-card"]').first();
  await expect(projectCard).toBeVisible();
  await expect(projectCard).toContainText("E2E Test Project");
});
```

### Best Practices

1. **Use `data-testid` for selectors** - They're stable and won't break with styling changes
   ```typescript
   // Good
   await page.locator('[data-testid="login-button"]').click();

   // Avoid
   await page.locator('.btn-primary.mt-4').click();
   ```

2. **Test user behavior, not implementation**
   ```typescript
   // Good - tests what users see
   await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

   // Avoid - tests internal structure
   await expect(page.locator('div.header > h1.title')).toBeVisible();
   ```

3. **Keep tests independent** - Each test should work in isolation
   ```typescript
   test("should create project", async ({ page }) => {
     await setupAuthenticatedSession(page);  // Set up fresh state
     await page.goto("/projects");
     // Test logic...
   });
   ```

4. **Use descriptive assertions**
   ```typescript
   // Good
   await expect(projectCard).toContainText("E2E Test Project");

   // Less clear
   await expect(await projectCard.textContent()).toMatch(/E2E/);
   ```

5. **Wait for elements explicitly**
   ```typescript
   // Good
   await expect(page.locator('[data-testid="modal"]')).toBeVisible();

   // Avoid implicit waits
   await page.waitForTimeout(1000);
   ```

### Adding Test IDs to Components

When implementing tests, you'll often need to add `data-testid` attributes to components:

```tsx
// In your React component
<button
  data-testid="create-project-button"
  onClick={handleCreate}
>
  Create Project
</button>
```

### Common Patterns

**Testing forms:**
```typescript
await page.fill('[data-testid="project-name-input"]', "My Project");
await page.fill('[data-testid="project-description-textarea"]', "Description");
await page.click('[data-testid="submit-button"]');
await expect(page.getByText("Project created")).toBeVisible();
```

**Testing modals:**
```typescript
await page.click('[data-testid="open-modal-button"]');
await expect(page.locator('[data-testid="modal"]')).toBeVisible();
await page.click('[data-testid="modal-close"]');
await expect(page.locator('[data-testid="modal"]')).not.toBeVisible();
```

**Testing navigation:**
```typescript
await page.click('[data-testid="projects-link"]');
await expect(page).toHaveURL(/\/projects/);
await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
```

## Reports and Debugging

- **Artifacts**: Screenshots, videos, and traces saved to `frontend/test-results/` on failure
- **HTML Reports**: Auto-generated after each run
- **Debug Mode**: `pnpm test:e2e -- --debug --trace on`
- **Headed Mode**: `pnpm test:e2e -- --headed`
- **Run specific test**: `pnpm test:e2e -- e2e/dashboard.spec.ts -g "should display dashboard"`

