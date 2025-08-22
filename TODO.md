# Grant Finder Feature Implementation - TODO

## Overview
Implementation of VSP-185: Grant Finder feature for discovering NIH funding opportunities with email subscriptions.

**Target Environment**: Staging only (simplified infrastructure)
**Database Architecture**: Firestore-only (completely separate from main PostgreSQL database)
**Key Decision**: This feature is isolated from the main application database to maintain separation of concerns

## Current Status (Updated: 2024-08-22)

### ✅ Completed Phases:
- **Phase 1**: Infrastructure & Foundation - All Terraform/Firestore setup complete
- **Phase 2**: Scraper Firestore Integration - Fully implemented and tested
- **Phase 3**: Public API Endpoints - All endpoints working with shared TypedDict types
- **Phase 4**: Grant Matcher Cloud Function - Matching logic and Firestore operations complete
- **Phase 5**: Email Notifications Extension - Grant alert emails with TypedDict responses

### 🔄 In Progress:
- Using shared TypedDict definitions across all services
- Refactored email functions to use TypedDict constructor pattern
- Improved grant matching efficiency with parse_grant_amounts helper

### ⏳ Remaining Work:
- **Phase 6**: Integration & E2E Testing - Need comprehensive E2E tests
- **Phase 7**: Documentation & Deployment - Final deployment to staging
- Email verification Pub/Sub integration (marked as TODO in code)
- Full-text search optimization (currently using client-side filtering)
- Production-ready rate limiting (currently in-memory)

### 🎯 Key Technical Debt:
1. **Email Verification**: The TODO comment at line 423 in `public_grants.py` needs implementation
2. **Full-text Search**: Lines 213-216 warn about inefficient client-side filtering
3. **Rate Limiting**: In-memory implementation won't work across multiple instances
4. **Firestore Indexes**: Need composite indexes for complex queries

---

## Phase 1: Infrastructure & Foundation (Simplified for Staging)

### Commit 1: Enable Firestore in Terraform
- [x] Create `terraform/modules/firestore/main.tf`
- [x] Create `terraform/modules/firestore/variables.tf` 
- [x] Create `terraform/modules/firestore/outputs.tf`
- [x] Add Firestore module to `terraform/environments/staging/main.tf`
- [x] Run `task lint:terraform`
- [x] Test with `tofu plan` in staging environment

### Commit 2: Add IAM permissions for Firestore
- [x] Update `terraform/environments/staging/iam.tf` - add Firestore roles for scraper
- [x] Add Firestore roles for backend service account
- [x] Create grant-matcher service account with Firestore access
- [x] Run `task lint:terraform`
- [x] Test with `tofu plan` in staging environment

### Commit 3: Configure Cloud Scheduler for grant matcher
- [x] Update `terraform/modules/scheduler/main.tf` - add grant-matcher-daily job
- [x] Configure HTTP trigger with service account authentication
- [x] Set schedule to "0 3 * * *" (3 AM UTC daily)
- [x] Run `task lint:terraform`
- [x] Test with `tofu plan` in staging environment

---

## Phase 2: Scraper Firestore Integration (VSP-280)

### Commit 4: Add Firestore dependencies to scraper
- [x] Update `services/scraper/pyproject.toml` - add google-cloud-firestore
- [x] Run `uv sync` to update lock file
- [x] Update `services/scraper/requirements.txt` for Docker
- [x] Run `task lint:python`

### Commit 5: Remove GCS dependencies from scraper
- [x] Update `services/scraper/src/grant_pages.py` - remove GCS upload logic
- [x] Update `services/scraper/src/search_data.py` - remove GCS save logic
- [x] Update `services/scraper/src/main.py` - remove GCS client initialization
- [x] Remove `services/scraper/src/storage.py` if it only handles GCS
- [x] Update `services/scraper/pyproject.toml` - remove GCS dependencies if not needed elsewhere
- [x] Run `task lint:python`
- [x] Run `PYTHONPATH=. uv run pytest services/scraper/tests/ -v` to ensure nothing breaks

### Commit 6: Create Firestore utilities module
- [x] Create `services/scraper/src/firestore_utils.py`
- [x] Implement `FirestoreClient` class with singleton pattern
- [x] Add `save_grant()` method with deduplication
- [x] Add `generate_content_hash()` function
- [x] Add `extract_structured_fields()` for markdown parsing
- [x] Add `check_grant_exists()` for deduplication
- [x] Run `PYTHONPATH=. uv run mypy services/scraper/src/firestore_utils.py`
- [x] Run `PYTHONPATH=. uv run ruff check services/scraper/src/firestore_utils.py`

### Commit 7: Add Firestore unit tests for scraper
- [x] Create `services/scraper/tests/firestore_utils_test.py`
- [x] Test `save_grant()` with mock Firestore client
- [x] Test content hash generation
- [x] Test deduplication logic
- [x] Test structured field extraction
- [x] Test `check_grant_exists()` method
- [x] Run `PYTHONPATH=. uv run pytest services/scraper/tests/firestore_utils_test.py -v`
- [x] Ensure 100% test coverage

### Commit 8: Replace GCS with Firestore in grant processing
- [x] Update `services/scraper/src/grant_pages.py` - replace GCS save with Firestore
- [x] Update `services/scraper/src/search_data.py` - save search metadata to Firestore
- [x] Update `services/scraper/src/main.py` - initialize Firestore client instead of GCS
- [x] Update deduplication to use Firestore instead of GCS blob listing
- [x] Add Firestore metrics to Discord notification
- [x] Run `task lint:python`
- [x] Run `PYTHONPATH=. uv run mypy services/scraper/src/`

### Commit 9: Update scraper tests for Firestore
- [x] Update `services/scraper/tests/grant_pages_test.py` - replace GCS mocks with Firestore
- [x] Update `services/scraper/tests/search_data_test.py` - replace GCS mocks with Firestore
- [x] Update `services/scraper/tests/conftest.py` - remove GCS fixtures, add Firestore fixtures
- [x] Remove GCS-specific test files if any
- [x] Run `PYTHONPATH=. uv run pytest services/scraper/tests/ -v`
- [x] Ensure all tests pass

---

## Phase 3: Public API Endpoints (VSP-281 & VSP-282)

### Commit 10: Update middleware for public paths
- [x] Update `services/backend/src/api/middleware.py` - add grant paths to PUBLIC_PATHS
- [x] Add pattern matching for `/api/public/grants/*` routes
- [x] Run `PYTHONPATH=. uv run mypy services/backend/src/api/middleware.py`
- [x] Run `task lint:python`

### Commit 11: Create middleware tests
- [x] Update `services/backend/tests/api/middleware_test.py`
- [x] Test public path detection for grant endpoints
- [x] Test authentication bypass for public paths
- [x] Run `PYTHONPATH=. uv run pytest services/backend/tests/api/middleware_test.py -v`

### Commit 12: Create Firestore utilities for backend
- [x] Create `services/backend/src/utils/firestore_client.py` (inline in public_grants.py)
- [x] Implement Firestore client initialization
- [x] Add grant search functions with filtering
- [x] Add subscription CRUD operations
- [x] Add pagination utilities for Firestore queries
- [x] Run `PYTHONPATH=. uv run mypy services/backend/src/utils/firestore_client.py`
- [x] Run `task lint:python`

### Commit 13: Implement public grant search endpoint
- [x] Create `services/backend/src/api/routes/public_grants.py` (single file approach)
- [x] Implement `search_grants()` endpoint using Firestore
- [x] Add request/response DTOs using TypedDict
- [x] Add Firestore pagination support
- [x] Run `PYTHONPATH=. uv run mypy services/backend/src/api/routes/public/`
- [x] Run `task lint:python`

### Commit 14: Create grant search tests
- [x] Create `services/backend/tests/api/routes/public_grants_test.py`
- [x] Test search with various criteria
- [x] Test Firestore pagination
- [x] Test empty results
- [x] Test public access (no auth required)
- [x] Mock Firestore client in tests
- [x] Run `PYTHONPATH=. uv run pytest services/backend/tests/api/routes/public/grants_test.py -v`
- [x] Ensure 100% test coverage

### Commit 15: Implement subscription management endpoints
- [x] Update `services/backend/src/api/routes/public_grants.py`
- [x] Implement `create_subscription()` endpoint - save to Firestore
- [x] Implement `verify_subscription()` endpoint - update Firestore doc
- [x] Implement `get_grant_details()` endpoint - query Firestore
- [x] Implement `unsubscribe()` endpoint - update Firestore doc
- [x] All operations use Firestore, no PostgreSQL
- [x] Run `PYTHONPATH=. uv run mypy services/backend/src/api/routes/public/`
- [x] Run `task lint:python`

### Commit 16: Create email verification utilities
- [x] Inline in `services/backend/src/api/routes/public_grants.py`
- [x] Implement token generation (secure random)
- [x] Store verification tokens in Firestore subscription docs
- [x] Implement token validation with expiry check from Firestore
- [ ] Add email sending for verification via Pub/Sub (TODO marked in code)
- [x] Run `PYTHONPATH=. uv run mypy services/backend/src/utils/email_verification.py`
- [x] Run `task lint:python`

### Commit 17: Create subscription management tests
- [x] Update `services/backend/tests/api/routes/public_grants_test.py`
- [x] Test subscription creation in Firestore
- [x] Test email verification flow with Firestore updates
- [x] Test unsubscribe with token
- [x] Test invalid tokens
- [x] Test public access (no auth required)
- [x] Mock Firestore client in tests
- [x] Run `PYTHONPATH=. uv run pytest services/backend/tests/api/routes/public/grant_subscriptions_test.py -v`
- [x] Ensure 100% test coverage

### Commit 18: Register public routes in main app
- [x] Update `services/backend/src/main.py` - import public route handlers
- [x] Add public routes to api_routes list
- [x] Test application startup
- [x] Run `PYTHONPATH=. uv run mypy services/backend/src/main.py`
- [x] Run `task lint:python`

---

## Phase 4: Grant Matcher Cloud Function (VSP-284)

### Commit 20: Create grant matcher function structure
- [x] Create `cloud_functions/src/grant_matcher/` directory
- [x] Create `cloud_functions/src/grant_matcher/__init__.py`
- [x] Create `cloud_functions/src/grant_matcher/main.py`
- [x] Create `cloud_functions/src/grant_matcher/requirements.txt`
- [x] Add function entry point
- [x] Run `PYTHONPATH=. uv run mypy cloud_functions/src/grant_matcher/`

### Commit 21: Implement grant matching logic
- [x] Inline in `cloud_functions/src/grant_matcher/main.py`
- [x] Implement `match_grant_with_subscription()` function
- [x] Add keyword matching logic
- [x] Add activity code matching
- [x] Add amount range matching
- [x] Run `PYTHONPATH=. uv run mypy cloud_functions/src/grant_matcher/`
- [x] Run `PYTHONPATH=. uv run ruff check cloud_functions/src/grant_matcher/`

### Commit 22: Implement Firestore operations for matcher
- [x] Inline in `cloud_functions/src/grant_matcher/main.py`
- [x] Implement `get_new_grants()` function - query scraped_grants collection
- [x] Implement `get_active_subscriptions()` function - query grant_subscriptions collection
- [x] Implement `save_match_record()` function - save to grant_matches collection
- [x] All data comes from Firestore, no PostgreSQL connection
- [x] Run `PYTHONPATH=. uv run mypy cloud_functions/src/grant_matcher/`

### Commit 23: Create grant matcher unit tests
- [x] Create `cloud_functions/tests/grant_matcher/` directory
- [x] Create `cloud_functions/tests/grant_matcher/main_test.py`
- [x] Test matching logic with various criteria
- [x] Test edge cases (no matches, all match)
- [x] Run `PYTHONPATH=. uv run pytest cloud_functions/tests/grant_matcher/ -v`
- [x] Ensure 100% test coverage

### Commit 24: Create grant matcher integration tests
- [x] Update `cloud_functions/tests/grant_matcher/main_test.py`
- [x] Test Cloud Scheduler trigger handling
- [x] Test Pub/Sub message publishing
- [x] Test error handling
- [x] Run `PYTHONPATH=. uv run pytest cloud_functions/tests/grant_matcher/ -v`

### Commit 25: Add Terraform configuration for grant matcher
- [x] Create `terraform/modules/cloud_functions/grant_matcher.tf`
- [x] Configure function deployment
- [x] Set up service account
- [x] Configure environment variables
- [x] Run `task lint:terraform`
- [x] Test with `tofu plan` in staging environment

---

## Phase 5: Email Notifications Extension (VSP-285)

### Commit 26: Update Pub/Sub message types
- [x] Update `packages/shared_utils/src/pubsub.py` - add `EmailNotificationData`
- [x] Add `NotificationStatus` enum
- [x] Update `publish_email_notification()` to support types
- [x] Create `publish_grant_alert_notification()` function (in grant_matcher)
- [x] Run `PYTHONPATH=. uv run mypy packages/shared_utils/src/pubsub.py`
- [x] Run `task lint:python`

### Commit 27: Create Pub/Sub tests for new message types
- [x] Update `packages/shared_utils/tests/pubsub_test.py`
- [x] Test email notification publishing
- [x] Test message serialization
- [x] Test backward compatibility
- [x] Run `PYTHONPATH=. uv run pytest packages/shared_utils/tests/pubsub_test.py -v`

### Commit 28: Create grant match email template
- [x] Create `cloud_functions/src/email_notifications/templates/grant_alert.html`
- [x] Design responsive HTML template
- [x] Add grant list formatting
- [x] Add unsubscribe link
- [x] Test template rendering locally

### Commit 29: Extend email notification function
- [x] Update `cloud_functions/src/email_notifications/main.py`
- [x] Add message type routing logic
- [x] Implement `send_grant_alert_email()` function
- [x] Add TypedDict definitions for responses
- [x] Run `PYTHONPATH=. uv run mypy cloud_functions/src/email_notifications/`
- [x] Run `PYTHONPATH=. uv run ruff check cloud_functions/src/email_notifications/`

### Commit 30: Update email notification tests
- [x] Create `cloud_functions/tests/email_notifications/test_grant_alerts.py`
- [x] Add tests for grant alert notifications
- [x] Test message type routing
- [x] Test template rendering with multiple grants
- [x] Test error scenarios
- [x] Run `PYTHONPATH=. uv run pytest cloud_functions/tests/email_notifications/ -v`
- [x] Ensure 100% test coverage

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