# Grant Finder Feature Implementation - TODO

## Overview
Implementation of VSP-185: Grant Finder feature for discovering NIH funding opportunities with email subscriptions.

**Target Environment**: Staging only (simplified infrastructure)
**Database Architecture**: Firestore-only (completely separate from main PostgreSQL database)
**Key Decision**: This feature is isolated from the main application database to maintain separation of concerns

---

## Phase 1: Infrastructure & Foundation (Simplified for Staging)

### Commit 1: Enable Firestore in Terraform
- [ ] Create `terraform/modules/firestore/main.tf`
- [ ] Create `terraform/modules/firestore/variables.tf` 
- [ ] Create `terraform/modules/firestore/outputs.tf`
- [ ] Add Firestore module to `terraform/environments/staging/main.tf`
- [ ] Run `task lint:terraform`
- [ ] Test with `tofu plan` in staging environment

### Commit 2: Add IAM permissions for Firestore
- [ ] Update `terraform/environments/staging/iam.tf` - add Firestore roles for scraper
- [ ] Add Firestore roles for backend service account
- [ ] Create grant-matcher service account with Firestore access
- [ ] Run `task lint:terraform`
- [ ] Test with `tofu plan` in staging environment

### Commit 3: Configure Cloud Scheduler for grant matcher
- [ ] Update `terraform/modules/scheduler/main.tf` - add grant-matcher-daily job
- [ ] Configure HTTP trigger with service account authentication
- [ ] Set schedule to "0 3 * * *" (3 AM UTC daily)
- [ ] Run `task lint:terraform`
- [ ] Test with `tofu plan` in staging environment

---

## Phase 2: Scraper Firestore Integration (VSP-280)

### Commit 4: Add Firestore dependencies to scraper
- [ ] Update `services/scraper/pyproject.toml` - add google-cloud-firestore
- [ ] Run `uv sync` to update lock file
- [ ] Update `services/scraper/requirements.txt` for Docker
- [ ] Run `task lint:python`

### Commit 5: Remove GCS dependencies from scraper
- [ ] Update `services/scraper/src/grant_pages.py` - remove GCS upload logic
- [ ] Update `services/scraper/src/search_data.py` - remove GCS save logic
- [ ] Update `services/scraper/src/main.py` - remove GCS client initialization
- [ ] Remove `services/scraper/src/storage.py` if it only handles GCS
- [ ] Update `services/scraper/pyproject.toml` - remove GCS dependencies if not needed elsewhere
- [ ] Run `task lint:python`
- [ ] Run `PYTHONPATH=. uv run pytest services/scraper/tests/ -v` to ensure nothing breaks

### Commit 6: Create Firestore utilities module
- [ ] Create `services/scraper/src/firestore_utils.py`
- [ ] Implement `FirestoreClient` class with singleton pattern
- [ ] Add `save_grant()` method with deduplication
- [ ] Add `generate_content_hash()` function
- [ ] Add `extract_structured_fields()` for markdown parsing
- [ ] Add `check_grant_exists()` for deduplication
- [ ] Run `PYTHONPATH=. uv run mypy services/scraper/src/firestore_utils.py`
- [ ] Run `PYTHONPATH=. uv run ruff check services/scraper/src/firestore_utils.py`

### Commit 7: Add Firestore unit tests for scraper
- [ ] Create `services/scraper/tests/firestore_utils_test.py`
- [ ] Test `save_grant()` with mock Firestore client
- [ ] Test content hash generation
- [ ] Test deduplication logic
- [ ] Test structured field extraction
- [ ] Test `check_grant_exists()` method
- [ ] Run `PYTHONPATH=. uv run pytest services/scraper/tests/firestore_utils_test.py -v`
- [ ] Ensure 100% test coverage

### Commit 8: Replace GCS with Firestore in grant processing
- [ ] Update `services/scraper/src/grant_pages.py` - replace GCS save with Firestore
- [ ] Update `services/scraper/src/search_data.py` - save search metadata to Firestore
- [ ] Update `services/scraper/src/main.py` - initialize Firestore client instead of GCS
- [ ] Update deduplication to use Firestore instead of GCS blob listing
- [ ] Add Firestore metrics to Discord notification
- [ ] Run `task lint:python`
- [ ] Run `PYTHONPATH=. uv run mypy services/scraper/src/`

### Commit 9: Update scraper tests for Firestore
- [ ] Update `services/scraper/tests/grant_pages_test.py` - replace GCS mocks with Firestore
- [ ] Update `services/scraper/tests/search_data_test.py` - replace GCS mocks with Firestore
- [ ] Update `services/scraper/tests/conftest.py` - remove GCS fixtures, add Firestore fixtures
- [ ] Remove GCS-specific test files if any
- [ ] Run `PYTHONPATH=. uv run pytest services/scraper/tests/ -v`
- [ ] Ensure all tests pass

---

## Phase 3: Public API Endpoints (VSP-281 & VSP-282)

### Commit 10: Update middleware for public paths
- [ ] Update `services/backend/src/api/middleware.py` - add grant paths to PUBLIC_PATHS
- [ ] Add pattern matching for `/api/public/grants/*` routes
- [ ] Run `PYTHONPATH=. uv run mypy services/backend/src/api/middleware.py`
- [ ] Run `task lint:python`

### Commit 11: Create middleware tests
- [ ] Update `services/backend/tests/api/middleware_test.py`
- [ ] Test public path detection for grant endpoints
- [ ] Test authentication bypass for public paths
- [ ] Run `PYTHONPATH=. uv run pytest services/backend/tests/api/middleware_test.py -v`

### Commit 12: Create Firestore utilities for backend
- [ ] Create `services/backend/src/utils/firestore_client.py`
- [ ] Implement Firestore client initialization
- [ ] Add grant search functions with filtering
- [ ] Add subscription CRUD operations
- [ ] Add pagination utilities for Firestore queries
- [ ] Run `PYTHONPATH=. uv run mypy services/backend/src/utils/firestore_client.py`
- [ ] Run `task lint:python`

### Commit 13: Implement public grant search endpoint
- [ ] Create `services/backend/src/api/routes/public/__init__.py`
- [ ] Create `services/backend/src/api/routes/public/grants.py`
- [ ] Implement `search_grants()` endpoint using Firestore
- [ ] Add request/response DTOs
- [ ] Add Firestore pagination support
- [ ] Run `PYTHONPATH=. uv run mypy services/backend/src/api/routes/public/`
- [ ] Run `task lint:python`

### Commit 14: Create grant search tests
- [ ] Create `services/backend/tests/api/routes/public/grants_test.py`
- [ ] Test search with various criteria
- [ ] Test Firestore pagination
- [ ] Test empty results
- [ ] Test public access (no auth required)
- [ ] Mock Firestore client in tests
- [ ] Run `PYTHONPATH=. uv run pytest services/backend/tests/api/routes/public/grants_test.py -v`
- [ ] Ensure 100% test coverage

### Commit 15: Implement subscription management endpoints
- [ ] Create `services/backend/src/api/routes/public/grant_subscriptions.py`
- [ ] Implement `create_subscription()` endpoint - save to Firestore
- [ ] Implement `verify_email()` endpoint - update Firestore doc
- [ ] Implement `get_subscription()` endpoint - query Firestore
- [ ] Implement `unsubscribe()` endpoint - update Firestore doc
- [ ] All operations use Firestore, no PostgreSQL
- [ ] Run `PYTHONPATH=. uv run mypy services/backend/src/api/routes/public/`
- [ ] Run `task lint:python`

### Commit 16: Create email verification utilities
- [ ] Create `services/backend/src/utils/email_verification.py`
- [ ] Implement token generation (secure random)
- [ ] Store verification tokens in Firestore subscription docs
- [ ] Implement token validation with expiry check from Firestore
- [ ] Add email sending for verification via Pub/Sub
- [ ] Run `PYTHONPATH=. uv run mypy services/backend/src/utils/email_verification.py`
- [ ] Run `task lint:python`

### Commit 17: Create subscription management tests
- [ ] Create `services/backend/tests/api/routes/public/grant_subscriptions_test.py`
- [ ] Test subscription creation in Firestore
- [ ] Test email verification flow with Firestore updates
- [ ] Test unsubscribe with token
- [ ] Test invalid tokens
- [ ] Test public access (no auth required)
- [ ] Mock Firestore client in tests
- [ ] Run `PYTHONPATH=. uv run pytest services/backend/tests/api/routes/public/grant_subscriptions_test.py -v`
- [ ] Ensure 100% test coverage

### Commit 18: Register public routes in main app
- [ ] Update `services/backend/src/main.py` - import public route handlers
- [ ] Add public routes to api_routes list
- [ ] Test application startup
- [ ] Run `PYTHONPATH=. uv run mypy services/backend/src/main.py`
- [ ] Run `task lint:python`

---

## Phase 4: Grant Matcher Cloud Function (VSP-284)

### Commit 20: Create grant matcher function structure
- [ ] Create `cloud_functions/src/grant_matcher/` directory
- [ ] Create `cloud_functions/src/grant_matcher/__init__.py`
- [ ] Create `cloud_functions/src/grant_matcher/main.py`
- [ ] Create `cloud_functions/src/grant_matcher/requirements.txt`
- [ ] Add function entry point
- [ ] Run `PYTHONPATH=. uv run mypy cloud_functions/src/grant_matcher/`

### Commit 21: Implement grant matching logic
- [ ] Create `cloud_functions/src/grant_matcher/matcher.py`
- [ ] Implement `matches_subscription()` function
- [ ] Add keyword matching logic
- [ ] Add activity code matching
- [ ] Add institution location matching
- [ ] Run `PYTHONPATH=. uv run mypy cloud_functions/src/grant_matcher/`
- [ ] Run `PYTHONPATH=. uv run ruff check cloud_functions/src/grant_matcher/`

### Commit 22: Implement Firestore operations for matcher
- [ ] Create `cloud_functions/src/grant_matcher/firestore_client.py`
- [ ] Implement `get_new_grants()` function - query scraped_grants collection
- [ ] Implement `get_active_subscriptions()` function - query grant_subscriptions collection
- [ ] Implement `save_match_record()` function - save to grant_matches collection
- [ ] All data comes from Firestore, no PostgreSQL connection
- [ ] Run `PYTHONPATH=. uv run mypy cloud_functions/src/grant_matcher/`

### Commit 23: Create grant matcher unit tests
- [ ] Create `cloud_functions/tests/grant_matcher/` directory
- [ ] Create `cloud_functions/tests/grant_matcher/test_matcher.py`
- [ ] Test matching logic with various criteria
- [ ] Test edge cases (no matches, all match)
- [ ] Run `PYTHONPATH=. uv run pytest cloud_functions/tests/grant_matcher/ -v`
- [ ] Ensure 100% test coverage

### Commit 24: Create grant matcher integration tests
- [ ] Create `cloud_functions/tests/grant_matcher/test_main.py`
- [ ] Test Cloud Scheduler trigger handling
- [ ] Test Pub/Sub message publishing
- [ ] Test error handling
- [ ] Run `PYTHONPATH=. uv run pytest cloud_functions/tests/grant_matcher/ -v`

### Commit 25: Add Terraform configuration for grant matcher
- [ ] Create `terraform/modules/cloud_functions/grant_matcher.tf`
- [ ] Configure function deployment
- [ ] Set up service account
- [ ] Configure environment variables
- [ ] Run `task lint:terraform`
- [ ] Test with `tofu plan` in staging environment

---

## Phase 5: Email Notifications Extension (VSP-285)

### Commit 26: Update Pub/Sub message types
- [ ] Update `packages/shared_utils/src/pubsub.py` - add `GrantMatchNotificationData`
- [ ] Add `EmailNotificationType` enum
- [ ] Update `publish_email_notification()` to support types
- [ ] Create `publish_grant_match_notification()` function
- [ ] Run `PYTHONPATH=. uv run mypy packages/shared_utils/src/pubsub.py`
- [ ] Run `task lint:python`

### Commit 27: Create Pub/Sub tests for new message types
- [ ] Update `packages/shared_utils/tests/pubsub_test.py`
- [ ] Test grant match notification publishing
- [ ] Test message serialization
- [ ] Test backward compatibility
- [ ] Run `PYTHONPATH=. uv run pytest packages/shared_utils/tests/pubsub_test.py -v`

### Commit 28: Create grant match email template
- [ ] Create `cloud_functions/src/email_notifications/templates/grant_matches.html`
- [ ] Design responsive HTML template
- [ ] Add grant list formatting
- [ ] Add unsubscribe link
- [ ] Test template rendering locally

### Commit 29: Extend email notification function
- [ ] Update `cloud_functions/src/email_notifications/main.py`
- [ ] Add message type routing logic
- [ ] Implement `send_grant_match_email()` function
- [ ] Add Firestore client for fetching grant details
- [ ] Run `PYTHONPATH=. uv run mypy cloud_functions/src/email_notifications/`
- [ ] Run `PYTHONPATH=. uv run ruff check cloud_functions/src/email_notifications/`

### Commit 30: Update email notification tests
- [ ] Update `cloud_functions/tests/email_notifications/main_test.py`
- [ ] Add tests for grant match notifications
- [ ] Test message type routing
- [ ] Test template rendering with multiple grants
- [ ] Test error scenarios
- [ ] Run `PYTHONPATH=. uv run pytest cloud_functions/tests/email_notifications/ -v`
- [ ] Ensure 100% test coverage

---

## Phase 6: Integration & E2E Testing

### Commit 31: Create E2E test for scraper with Firestore
- [ ] Create `services/scraper/tests/e2e/firestore_integration_test.py`
- [ ] Test full scraping flow with Firestore saves
- [ ] Test deduplication across runs
- [ ] Mark with `@pytest.mark.e2e`
- [ ] Run `E2E_TESTS=1 PYTHONPATH=. uv run pytest services/scraper/tests/e2e/ -v`

### Commit 32: Create E2E test for public API
- [ ] Create `services/backend/tests/e2e/public_api_test.py`
- [ ] Test grant search flow
- [ ] Test subscription creation and verification
- [ ] Test rate limiting behavior
- [ ] Run `E2E_TESTS=1 PYTHONPATH=. uv run pytest services/backend/tests/e2e/ -v`

### Commit 33: Create E2E test for grant matching flow
- [ ] Create `cloud_functions/tests/e2e/grant_matching_flow_test.py`
- [ ] Test matcher finding new grants
- [ ] Test email notification sending
- [ ] Test end-to-end flow from scraping to email
- [ ] Run `E2E_TESTS=1 PYTHONPATH=. uv run pytest cloud_functions/tests/e2e/ -v`

---

## Phase 7: Documentation & Deployment

### Commit 34: Update API documentation
- [ ] Update OpenAPI schema generation for public endpoints
- [ ] Add endpoint descriptions and examples
- [ ] Generate TypeScript types with `task generate:api-types`
- [ ] Run `task lint:frontend`

### Commit 35: Update Docker configurations
- [ ] Update `services/scraper/Dockerfile` if needed
- [ ] Update `services/backend/Dockerfile` if needed
- [ ] Test Docker builds locally
- [ ] Run `task build`

### Commit 36: Final linting and testing
- [ ] Run `task lint:all`
- [ ] Run `task test`
- [ ] Run `task test:serial`
- [ ] Run `E2E_TESTS=1 task test:e2e`
- [ ] Fix any remaining issues

### Commit 37: Deploy to staging
- [ ] Run `tofu apply` for Terraform changes in staging
- [ ] Deploy services with `task gh:deploy:scraper`
- [ ] Deploy backend with `task gh:deploy:backend`
- [ ] Deploy cloud functions
- [ ] Test in staging environment

---

## Testing Checklist

### Unit Tests Required
- [ ] `services/scraper/tests/firestore_utils_test.py` - Firestore operations for scraper
- [ ] `services/backend/tests/api/middleware_test.py` (updated) - Public path detection
- [ ] `services/backend/tests/utils/firestore_client_test.py` - Firestore client utilities
- [ ] `services/backend/tests/api/routes/public/grants_test.py` - Grant search with Firestore
- [ ] `services/backend/tests/api/routes/public/grant_subscriptions_test.py` - Subscriptions in Firestore
- [ ] `cloud_functions/tests/grant_matcher/test_matcher.py` - Matching logic
- [ ] `cloud_functions/tests/grant_matcher/test_main.py` - Cloud function handler
- [ ] `cloud_functions/tests/email_notifications/` (updated) - Grant match emails
- [ ] `packages/shared_utils/tests/pubsub_test.py` (updated) - New message types

### Integration Tests Required
- [ ] Firestore-only scraper integration (no GCS)
- [ ] Public API with Firestore queries
- [ ] Grant matcher reading/writing Firestore
- [ ] Email notifications with grant match templates

### E2E Tests Required
- [ ] Complete grant scraping to Firestore flow (no GCS)
- [ ] Public API search and subscription flow (Firestore-only)
- [ ] Grant matching and notification flow (all Firestore)

---

## Success Criteria

- [ ] All unit tests pass with 100% coverage
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] `task lint:all` passes with no errors
- [ ] `task build` completes successfully
- [ ] Terraform plan shows expected changes
- [ ] Services deploy successfully to staging
- [ ] Manual testing in staging confirms functionality

---

## Notes

- Each commit should be atomic and pass all tests
- Run linters after each code change
- Ensure backward compatibility for existing functionality
- Follow existing code patterns and conventions
- Update Linear issues after completing each phase