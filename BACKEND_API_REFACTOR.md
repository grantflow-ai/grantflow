# Backend API Refactor: Organization-Based Multi-Tenancy

## Overview
Transform the backend API from project-centric to organization-centric architecture with proper multi-tenancy support.

## Phase 1: Fix Critical Import/Query Issues ✅ (IN PROGRESS)

### Critical Database Naming Inconsistencies
**Issue**: Code imports `ProjectUser` but queries `OrganizationUser`, causing runtime failures.

**Files with Critical Issues:**
- [ ] `middleware.py:13` - Imports `ProjectUser` but uses `OrganizationUser` in lines 71-82
- [ ] `auth.py:7` - Imports `ProjectUser` but creates `OrganizationUser` instances (line 37)
- [ ] `projects.py:13` - Uses `UserProjectInvitation` in queries but imports `OrganizationInvitation`
- [ ] `user.py:7` - Imports `ProjectUser` but needs `OrganizationUser`
- [ ] All test files importing the old table names

### Specific Code Fixes Required:
- [ ] `middleware.py:71-82` - Fix query to use correct table names
- [ ] `auth.py:37-38` - Fix OrganizationUser query syntax
- [ ] `projects.py` - Replace all `UserProjectInvitation` with `OrganizationInvitation`
- [ ] Update all import statements across route files
- [ ] Update test factory imports in test files

## Phase 2: Organization-Scoped Authorization (HIGH PRIORITY)

### Current Authorization Flow (middleware.py)
**Lines 33-86**: Current flow supports project-based role checking but needs organization context.

### Authorization Logic Updates
- [ ] Update `AuthMiddleware.authenticate_request()` to extract `organization_id` from path
- [ ] Modify role checking query (lines 71-82) to use organization context
- [ ] Implement project-level access control for COLLABORATOR role
- [ ] Create authorization helper functions
- [ ] Update allowed_roles decorator to handle organization context

### Specific Code Changes Required:

#### middleware.py Updates:
- [ ] Line 62: Extract `organization_id` from path parameters using regex
- [ ] Lines 71-82: Update authorization query to:
  ```python
  # Check organization membership first
  stmt = select(OrganizationUser).where(
      OrganizationUser.firebase_uid == firebase_uid,
      OrganizationUser.organization_id == organization_id,
      OrganizationUser.role.in_(allowed_roles)
  )
  
  # For project-specific endpoints, check ProjectAccess if needed
  if project_id and user.role == UserRoleEnum.COLLABORATOR and not user.has_all_projects_access:
      # Check ProjectAccess table
  ```

#### New Authorization Helper Functions:
- [ ] `check_organization_access(firebase_uid, organization_id, required_roles)`
- [ ] `check_project_access(firebase_uid, organization_id, project_id)`
- [ ] `get_user_organization_role(firebase_uid, organization_id)`

### Role Hierarchy Logic:
- **OWNER/ADMIN**: Full access to all projects in organization
- **COLLABORATOR** with `has_all_projects_access=true`: Access to all projects
- **COLLABORATOR** with `has_all_projects_access=false`: Only projects in ProjectAccess table

## Phase 3: API Structure Updates - Organization-First URLs (MEDIUM PRIORITY)

### Current Route Structure Analysis:
**35+ endpoints** across 10 route files, all currently project-centric.

### New URL Structure (Option A)
Current: `/projects/{project_id}/...`
Target: `/organizations/{org_id}/projects/{project_id}/...`

### Route File Updates Required:

#### projects.py (10 endpoints):
- [ ] `GET /projects` → `GET /organizations/{org_id}/projects`
- [ ] `POST /projects` → `POST /organizations/{org_id}/projects`
- [ ] `GET /projects/{project_id}` → `GET /organizations/{org_id}/projects/{project_id}`
- [ ] `PATCH /projects/{project_id}` → `PATCH /organizations/{org_id}/projects/{project_id}`
- [ ] `DELETE /projects/{project_id}` → `DELETE /organizations/{org_id}/projects/{project_id}`
- [ ] `POST /projects/{project_id}/create-invitation-redirect-url` → `POST /organizations/{org_id}/projects/{project_id}/create-invitation-redirect-url`
- [ ] `DELETE /projects/{project_id}/invitations/{invitation_id}` → `DELETE /organizations/{org_id}/projects/{project_id}/invitations/{invitation_id}`
- [ ] `PATCH /projects/{project_id}/invitations/{invitation_id}` → `PATCH /organizations/{org_id}/projects/{project_id}/invitations/{invitation_id}`
- [ ] `GET /projects/{project_id}/members` → `GET /organizations/{org_id}/projects/{project_id}/members`
- [ ] `PATCH /projects/{project_id}/members/{firebase_uid}` → `PATCH /organizations/{org_id}/projects/{project_id}/members/{firebase_uid}`
- [ ] `DELETE /projects/{project_id}/members/{firebase_uid}` → `DELETE /organizations/{org_id}/projects/{project_id}/members/{firebase_uid}`

#### grant_applications.py (8 endpoints):
- [ ] `GET /projects/{project_id}/applications` → `GET /organizations/{org_id}/projects/{project_id}/applications`
- [ ] `POST /projects/{project_id}/applications` → `POST /organizations/{org_id}/projects/{project_id}/applications`
- [ ] `GET /projects/{project_id}/applications/{application_id}` → `GET /organizations/{org_id}/projects/{project_id}/applications/{application_id}`
- [ ] `PATCH /projects/{project_id}/applications/{application_id}` → `PATCH /organizations/{org_id}/projects/{project_id}/applications/{application_id}`
- [ ] `DELETE /projects/{project_id}/applications/{application_id}` → `DELETE /organizations/{org_id}/projects/{project_id}/applications/{application_id}`
- [ ] `POST /projects/{project_id}/applications/{application_id}/generate` → `POST /organizations/{org_id}/projects/{project_id}/applications/{application_id}/generate`
- [ ] `POST /projects/{project_id}/applications/{application_id}/autofill` → `POST /organizations/{org_id}/projects/{project_id}/applications/{application_id}/autofill`
- [ ] `POST /projects/{project_id}/applications/{application_id}/duplicate` → `POST /organizations/{org_id}/projects/{project_id}/applications/{application_id}/duplicate`

#### sources.py (12 endpoints):
- [ ] All `/projects/{project_id}/applications/{application_id}/sources/*` endpoints
- [ ] All `/projects/{project_id}/grant-templates/{template_id}/sources/*` endpoints  
- [ ] All `/organizations/{org_id}/sources/*` endpoints (already organization-based)

#### rag_jobs.py (1 endpoint):
- [ ] `GET /projects/{project_id}/rag-jobs/{job_id}` → `GET /organizations/{org_id}/projects/{project_id}/rag-jobs/{job_id}`

#### grant_template.py (2 endpoints):
- [ ] `POST /projects/{project_id}/applications/{application_id}/grant-template/generate` → `POST /organizations/{org_id}/projects/{project_id}/applications/{application_id}/grant-template/generate`
- [ ] `PATCH /projects/{project_id}/applications/{application_id}/grant-template/{template_id}` → `PATCH /organizations/{org_id}/projects/{project_id}/applications/{application_id}/grant-template/{template_id}`

#### WebSocket (1 endpoint):
- [ ] `WS /projects/{project_id}/applications/{application_id}/notifications` → `WS /organizations/{org_id}/projects/{project_id}/applications/{application_id}/notifications`

### Route Decorator Updates:
- [ ] Update all `@get()`, `@post()`, `@patch()`, `@delete()` path parameters
- [ ] Update function signatures to include `organization_id: UUID`
- [ ] Update path parameter validation

## Phase 4: New Organization Management Endpoints (MEDIUM PRIORITY)

### Organization CRUD
- [ ] `GET /organizations` - List user's organizations
- [ ] `POST /organizations` - Create new organization
- [ ] `GET /organizations/{org_id}` - Get organization details
- [ ] `PATCH /organizations/{org_id}` - Update organization
- [ ] `DELETE /organizations/{org_id}` - Delete organization (soft delete)

### Organization Member Management
- [ ] `GET /organizations/{org_id}/members` - List organization members
- [ ] `POST /organizations/{org_id}/members` - Add member to organization
- [ ] `PATCH /organizations/{org_id}/members/{firebase_uid}` - Update member role
- [ ] `DELETE /organizations/{org_id}/members/{firebase_uid}` - Remove member

### Organization Invitations
- [ ] `POST /organizations/{org_id}/invitations` - Create invitation
- [ ] `GET /organizations/{org_id}/invitations` - List pending invitations
- [ ] `PATCH /organizations/{org_id}/invitations/{invitation_id}` - Update invitation
- [ ] `DELETE /organizations/{org_id}/invitations/{invitation_id}` - Cancel invitation
- [ ] `POST /invitations/{invitation_id}/accept` - Accept invitation

### Project Access Management (for COLLABORATOR role)
- [ ] `GET /organizations/{org_id}/projects/{project_id}/access` - List project access
- [ ] `POST /organizations/{org_id}/projects/{project_id}/access` - Grant project access
- [ ] `DELETE /organizations/{org_id}/projects/{project_id}/access/{firebase_uid}` - Remove access

## Phase 5: Response Structure Updates (LOW PRIORITY)

### Current Response Patterns:
**Response Building Pattern** (lines 189-266 in grant_applications.py):
```python
response: ApplicationResponse = {"id": str(entity.id), ...}
if entity.optional_field:
    response["optional_field"] = entity.optional_field
```

### Response Structure Updates Required:

#### User Context Response (auth.py):
- [ ] `LoginResponse` - Add organization context:
  ```python
  {
    "token": str,
    "organization": {
      "id": str,
      "name": str,
      "role": UserRoleEnum,
      "has_all_projects_access": bool
    }
  }
  ```

#### Project Response Updates (projects.py):
- [ ] `ProjectResponse` - Include organization information:
  ```python
  {
    "id": str,
    "name": str,
    "organization": {
      "id": str,
      "name": str
    },
    "members": [{
      "firebase_uid": str,
      "role": UserRoleEnum,
      "has_all_projects_access": bool
    }]
  }
  ```

#### Error Response Improvements:
- [ ] Add organization-specific error messages
- [ ] Improve permission denied responses with context
- [ ] Add access requirement details for COLLABORATORs

### TypedDict Updates Required:
- [ ] Update all response TypedDict definitions
- [ ] Add organization context to existing responses
- [ ] Create new response types for organization endpoints

## Phase 6: Test Infrastructure Updates (MEDIUM PRIORITY)

### Current Test Architecture:
- **AsyncTestClient** with auth headers: `{"Authorization": "Bearer some_token"}`
- **Factory Pattern**: `CreateProjectRequestBodyFactory.build()`
- **Real PostgreSQL** with async sessions
- **Mocked Services**: Firebase Admin SDK, JWT verification, Pub/Sub

### Test Setup Updates Required:

#### Factory Updates (testing/factories.py):
- [ ] Update `ProjectUserFactory` to use `OrganizationUser` model
- [ ] Create `OrganizationFactory` for organization test data
- [ ] Create `ProjectAccessFactory` for project access tests
- [ ] Update `UserProjectInvitationFactory` to use `OrganizationInvitation`
- [ ] Add organization context to all existing factories

#### Test Fixture Updates:
- [ ] Create `organization_fixture` for test organizations
- [ ] Create `organization_user_fixture` for test memberships
- [ ] Create `project_access_fixture` for access control tests
- [ ] Update existing project fixtures to include organization

#### Authentication Helper Updates:
- [ ] Update auth headers to include organization context
- [ ] Create `create_org_user_auth_headers(firebase_uid, org_id, role)`
- [ ] Update JWT token mocking for organization context

### Test Case Updates Required:

#### Authorization Test Cases:
- [ ] Test organization-level access control
- [ ] Test project-level access control for COLLABORATORs
- [ ] Test role hierarchy (OWNER > ADMIN > COLLABORATOR)
- [ ] Test `has_all_projects_access` flag behavior

#### API Endpoint Test Updates:
- [ ] Update all test URLs to use organization-first structure
- [ ] Add organization_id to all test requests
- [ ] Update response assertions for organization context

### Specific Test Files to Update:

#### Core Test Files:
- [ ] `tests/api/routes/projects_test.py` - 20+ test cases to update
- [ ] `tests/api/routes/auth_test.py` - Login/authentication flow tests
- [ ] `tests/api/routes/user_test.py` - User management tests
- [ ] `tests/api/routes/applications_test.py` - Grant application tests
- [ ] `tests/api/routes/sources_test.py` - Source management tests
- [ ] `tests/api/routes/rag_jobs_test.py` - RAG job tests
- [ ] `tests/api/middleware_test.py` - Authorization middleware tests

#### Test Pattern Updates:
```python
# Current pattern
response = await test_client.get("/projects/123")

# New pattern
response = await test_client.get("/organizations/456/projects/123")
```

#### Database Test Data Setup:
- [ ] Create organization test data in test setup
- [ ] Create organization user relationships
- [ ] Create project access relationships for test cases
- [ ] Update test data cleanup to handle organization cascade

## Phase 7: Soft Delete Implementation (HIGH PRIORITY)

### Current Delete Operations:
All current delete operations use hard deletes with `session.delete()` or `delete()` queries.

### Soft Delete Implementation Required:

#### Database Layer Updates:
- [ ] Update all delete operations to use `soft_delete()` method
- [ ] Add `deleted_at IS NULL` filters to all queries
- [ ] Create query helpers for soft delete filtering
- [ ] Update relationships to handle soft deleted records

#### API Layer Updates:

##### DELETE Endpoints to Update:
- [ ] `DELETE /organizations/{org_id}/projects/{project_id}` - Soft delete project
- [ ] `DELETE /organizations/{org_id}` - Soft delete organization  
- [ ] `DELETE /organizations/{org_id}/projects/{project_id}/applications/{app_id}` - Soft delete application
- [ ] `DELETE /organizations/{org_id}/projects/{project_id}/sources/{source_id}` - Soft delete source
- [ ] `DELETE /organizations/{org_id}/members/{firebase_uid}` - Soft delete membership
- [ ] `DELETE /user` - Soft delete user account

##### Query Filter Updates:
- [ ] Add `.where(Model.deleted_at.is_(None))` to all SELECT queries
- [ ] Create query helper functions:
  ```python
  def active_only(query, model):
      return query.where(model.deleted_at.is_(None))
  ```

##### Specific Code Changes:

###### projects.py:
- [ ] Line 142: Project list query - Add soft delete filter
- [ ] Line 240: Project members query - Add soft delete filter  
- [ ] `handle_delete_project()` - Use `project.soft_delete()` instead of `session.delete()`

###### grant_applications.py:
- [ ] All application queries - Add soft delete filter
- [ ] `handle_delete_application()` - Use `application.soft_delete()`

###### user.py:
- [ ] `handle_delete_user()` - Use `user.soft_delete()` instead of immediate deletion

#### Restore Functionality:
- [ ] Add `POST /organizations/{org_id}/restore` - Restore organization
- [ ] Add `POST /organizations/{org_id}/projects/{project_id}/restore` - Restore project
- [ ] Add restore endpoints for applications and sources

#### Admin Functionality:
- [ ] Add query parameter `?include_deleted=true` for admin views
- [ ] Add permanent delete endpoints for admins
- [ ] Add bulk restore operations

### Soft Delete Helper Functions:
- [ ] `soft_delete_and_commit(session, entity)`
- [ ] `restore_and_commit(session, entity)`
- [ ] `add_soft_delete_filter(query, model)`
- [ ] `include_deleted_if_admin(query, model, include_deleted)`

### Organization Deletion Business Logic (CRITICAL)

Following the existing user deletion pattern, organizations require special deletion handling:

#### Business Rules:
1. **Sole Owner Protection**: Users cannot delete their account if they are the sole owner of any organizations
2. **Organization Cleanup**: Soft deleted organizations are automatically hard deleted after 30 days
3. **Two-Phase Deletion**: Immediate soft delete + scheduled hard delete cleanup

#### User Account Deletion Prerequisites:
- [ ] Update `DELETE /user` endpoint to check for sole-owned organizations
- [ ] Add `GET /user/sole-owned-organizations` endpoint (similar to `sole-owned-projects`)
- [ ] Block user deletion if user is sole owner of any organizations
- [ ] Return HTTP 400 with organization transfer requirements

#### Organization Deletion Flow:
- [ ] `DELETE /organizations/{org_id}` - Soft delete organization
- [ ] Validate user has OWNER role for the organization
- [ ] Soft delete all child projects, applications, and sources
- [ ] Remove all organization members (except owner)
- [ ] Schedule organization for hard delete after 30 days
- [ ] Send notifications to all organization members

#### Cloud Function Updates:
- [ ] Update existing `user-cleanup-function` to handle organization cleanup
- [ ] Add organization deletion logic to `cloud_functions/src/user_cleanup/main.py`
- [ ] Query organizations with `deleted_at < NOW() - INTERVAL '30 days'`
- [ ] Hard delete organization and all cascade relationships
- [ ] Update Firestore collection to track `organization-deletion-requests`

#### Firestore Organization Deletion Tracking:
- [ ] Collection: `organization-deletion-requests`
- [ ] Document ID: Organization UUID
- [ ] Fields: `organization_id`, `deleted_at`, `scheduled_hard_delete_at`, `status`
- [ ] Statuses: `scheduled` → `completed` or `cancelled`

#### Database Cascade Updates:
- [ ] Ensure proper cascade deletes for organization relationships
- [ ] Update `Organization` model with `on_delete="CASCADE"` for child tables
- [ ] Test cascade behavior with soft deleted organizations

#### API Endpoint Updates:
- [ ] `DELETE /organizations/{org_id}` - Implement soft delete with validation
- [ ] `POST /organizations/{org_id}/restore` - Restore soft deleted organization
- [ ] `GET /user/sole-owned-organizations` - Check ownership prerequisites
- [ ] Update `DELETE /user` - Add organization ownership validation

#### Grace Period Configuration:
- [ ] Add `ORGANIZATION_DELETION_GRACE_PERIOD_DAYS = 30` environment variable
- [ ] Update cloud function to use organization grace period
- [ ] Add grace period to organization deletion responses

#### Monitoring and Alerting:
- [ ] Update existing alert policies to include organization cleanup failures
- [ ] Add organization deletion metrics to monitoring
- [ ] Include organization cleanup in Discord alerts

#### Test Cases Required:
- [ ] Test sole owner organization deletion blocking
- [ ] Test organization soft delete with cascade
- [ ] Test organization hard delete after grace period
- [ ] Test organization restoration functionality
- [ ] Test user deletion with organization ownership validation

## Phase 8: Database Migration (HIGH PRIORITY)
- [ ] Create fresh database migration
- [ ] Test migration with sample data
- [ ] Update migration scripts
- [ ] Verify all constraints and indexes

## Phase 8: Frontend Coordination (FUTURE)
- [ ] Update frontend API calls to use new URL structure
- [ ] Update authentication flow
- [ ] Update organization selection UI
- [ ] Update project access management UI

## Implementation Order
1. **Phase 1**: Fix imports (immediate)
2. **Phase 7**: Create database migration
3. **Phase 2**: Update authorization logic
4. **Phase 3**: Update API structure
5. **Phase 4**: Add organization endpoints
6. **Phase 6**: Update tests
7. **Phase 5**: Improve responses
8. **Phase 8**: Frontend updates

## Risk Assessment
- **High Risk**: URL structure changes will break frontend
- **Medium Risk**: Authorization logic changes
- **Low Risk**: New endpoints and response improvements

## Success Criteria
- [ ] All API endpoints work with organization context
- [ ] Proper multi-tenancy with organization isolation
- [ ] COLLABORATOR role has proper project access controls
- [ ] All tests pass with new structure
- [ ] Database migration completes successfully
- [ ] Performance is maintained or improved