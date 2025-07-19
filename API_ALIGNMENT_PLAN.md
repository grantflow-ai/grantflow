# API Alignment Plan

## Executive Summary

After comprehensive audit of both backend and frontend APIs, **CRITICAL ISSUE FOUND**: The current project endpoints have **ambiguous organization scoping** that breaks multi-tenant functionality. Users in multiple organizations cannot reliably control which organization context they're operating in.

**Pre-MVP Status**: No legacy compatibility or rollback concerns. All changes are forward-only improvements.

## Current API Structure Issues

### Organization Management (Correctly Implemented)
- ✅ `/organizations` - CRUD operations
- ✅ `/organizations/{org_id}/members` - Member management  
- ✅ `/organizations/{org_id}/invitations` - Invitation management
- ✅ `/organizations/{org_id}/sources` - Organization-scoped sources

### Project Management (BROKEN - Needs Organization Scoping)
- ❌ `/projects` - **BROKEN**: Uses arbitrary organization selection via `session.scalar()`
- ❌ `/projects/{project_id}` - **BROKEN**: No organization context validation
- ❌ `/projects/{project_id}/applications` - **BROKEN**: Inherits broken project scoping
- ❌ `/projects/{project_id}/members` - **BROKEN**: Inherits broken project scoping

**Root Cause**: `projects.py:109-113` uses `session.scalar()` which returns random organization when user belongs to multiple organizations.

### Authentication & User Management
- ✅ `/login` - Firebase authentication
- ✅ `/user` - User profile management
- ✅ `/notifications` - User notifications

### WebSocket
- ✅ `/projects/{project_id}/applications/{application_id}/notifications` - Real-time updates

## Required Fixes

### CRITICAL: Organization-Scoped Project URLs

**Problem**: Current project endpoints break multi-tenant functionality

**Solution**: Convert to organization-scoped URLs:
- `/projects` → `/organizations/{org_id}/projects`
- `/projects/{project_id}` → `/organizations/{org_id}/projects/{project_id}`
- `/projects/{project_id}/applications` → `/organizations/{org_id}/projects/{project_id}/applications`
- `/projects/{project_id}/members` → `/organizations/{org_id}/projects/{project_id}/members`

### Implementation Plan

#### Commit Block 0: Backend Organization-Scoped Project URLs
**Update Backend Project Endpoints**

##### Files to Update:
- [ ] `services/backend/src/api/routes/projects.py` - All project endpoints
- [ ] `services/backend/src/api/routes/applications.py` - Grant application endpoints (if exists)
- [ ] `services/backend/tests/` - Update all project-related tests
- [ ] Update OpenAPI spec generation

##### Key Changes:
1. **URL Path Changes**:
   ```python
   # OLD: @post("/projects")
   @post("/organizations/{org_id:uuid}/projects")
   
   # OLD: @get("/projects/{project_id:uuid}")  
   @get("/organizations/{org_id:uuid}/projects/{project_id:uuid}")
   ```

2. **Organization Validation**:
   ```python
   # Add to all endpoints
   async def validate_org_access(request: APIRequest, org_id: UUID, session: AsyncSession):
       org_user = await session.scalar(
           select(OrganizationUser).where(
               OrganizationUser.organization_id == org_id,
               OrganizationUser.firebase_uid == request.auth,
               OrganizationUser.deleted_at.is_(None)
           )
       )
       if not org_user:
           raise ValidationException("User not authorized for this organization")
       return org_user
   ```

3. **Remove Ambiguous Organization Selection**:
   ```python
   # REMOVE this problematic code from all endpoints:
   user_org = await session.scalar(
       select(OrganizationUser).where(
           OrganizationUser.firebase_uid == request.auth,
           OrganizationUser.deleted_at.is_(None),
       )
   )
   ```

#### Commit Block 1: Frontend Organization-Scoped Project URLs
**Update Frontend Project API Calls**

##### Files to Update:
- [ ] `frontend/src/actions/projects.ts` - All project API calls
- [ ] `frontend/src/actions/applications.ts` - Grant application API calls (if exists)
- [ ] `frontend/src/types/api-types.ts` - Type definitions (regenerate)
- [ ] All components using project APIs
- [ ] All test files

##### Key Changes:
1. **API Call Updates**:
   ```typescript
   // OLD: getClient().post("projects", {...})
   getClient().post(`organizations/${orgId}/projects`, {...})
   
   // OLD: getClient().get(`projects/${projectId}`)
   getClient().get(`organizations/${orgId}/projects/${projectId}`)
   ```

2. **Organization Context Requirements**:
   - All project operations require `organizationId` parameter
   - Update component props to include organization context
   - Update route handlers to extract organization from URL/context

#### Commit Block 2: Prerequisites (Fix Existing Issues)
**Resolve Current TypeScript and Test Failures**

##### Current Frontend Issues:
- [ ] Fix 346+ TypeScript errors throughout frontend
- [ ] Resolve failing component tests (missing data-testid attributes)
- [ ] Fix broken imports and missing dependencies
- [ ] Update all test files to use correct type imports (UserRole vs UserRoleEnum)

### Commit Block 1: Automatic User Restoration on Login
**Implement Automatic Soft-Delete Recovery**

#### Backend Changes:
- [ ] Update login endpoint in `services/backend/src/api/routes/auth.py`
- [ ] Add logic to check for soft-deleted user records with matching firebase_uid
- [ ] Implement automatic restoration of soft-deleted OrganizationUser records
- [ ] Update `deleted_at` field to `NULL` for restored records
- [ ] Add logging for restoration events
- [ ] Ensure organization access is properly restored

#### Frontend Changes:
- [ ] Remove `restoreAccount()` function from `frontend/src/actions/user.ts` (no longer needed)
- [ ] Remove any UI components for manual restoration process
- [ ] Update user deletion flow messaging to indicate automatic restoration on login
- [ ] Remove restoration-related tests and update user flow tests

#### Implementation Code Path:
```python
# In services/backend/src/api/routes/auth.py - handle_login function
async def handle_login(data: LoginRequestBody, session_maker: async_sessionmaker[Any]) -> LoginResponse:
    # ... existing login logic ...
    
    # Add after firebase_uid is obtained:
    # Check for soft-deleted user records and restore them
    deleted_org_users = await session.scalars(
        select(OrganizationUser).where(
            OrganizationUser.firebase_uid == firebase_uid,
            OrganizationUser.deleted_at.is_not(None)
        )
    )
    
    if deleted_org_users:
        for org_user in deleted_org_users:
            org_user.deleted_at = None
            logger.info("Restored soft-deleted user", firebase_uid=firebase_uid, org_id=org_user.organization_id)
    
    # ... continue with existing logic ...
```

### Commit Block 2: Notification Consistency
**Align Notification Terminology**

#### Implementation (Rename Frontend to Match Backend):
- [ ] Rename `deleteNotification()` to `dismissNotification()` in `frontend/src/actions/notifications.ts`
- [ ] Update all components using this function
- [ ] Update test files that reference the old function name
- [ ] Verify backend endpoint behavior (dismiss vs delete)

### Commit Block 3: WebSocket Notification Types Audit
**Verify WebSocket Message Structure Alignment**

#### Backend WebSocket Analysis:
- [ ] Find WebSocket implementation in backend (search for websocket/SSE endpoints)
- [ ] Audit notification message schemas and types
- [ ] Document all notification event types and their payloads
- [ ] Check timestamp formats and data structures
- [ ] Verify authentication/authorization for WebSocket connections

#### Frontend WebSocket Analysis:
- [ ] Find WebSocket client implementation (`use-websocket` or similar)
- [ ] Audit notification type handling and message parsing
- [ ] Verify connection management and error handling
- [ ] Check if frontend handles all backend notification types
- [ ] Update TypeScript interfaces if schema mismatches found

#### Implementation Code Path:
```typescript
// Find WebSocket implementation and verify message structure
// In frontend/src/hooks/use-websocket.ts or similar:

interface NotificationMessage {
  type: 'application_updated' | 'generation_complete' | 'error';
  payload: {
    application_id: string;
    project_id: string;
    timestamp: string;
    // ... other fields
  };
}

// Ensure this matches backend WebSocket message format exactly
```

### Commit Block 4: API Type Generation
**Regenerate and Verify API Types**

#### Implementation Code Path:
```bash
# Run type generation
task generate:api-types

# Fix any resulting TypeScript errors
cd frontend && pnpm typecheck
cd frontend && pnpm lint

# Update tests
cd frontend && pnpm test
```

### Commit Block 5: Final Validation
**Verify All Systems Working**

#### Implementation Code Path:
```bash
# Backend validation
cd services/backend && task test
cd services/backend && task lint:python

# Frontend validation  
cd frontend && pnpm test
cd frontend && pnpm lint

# Integration test
task dev  # Start full system
# Test user deletion and login restoration flow
# Test WebSocket notifications
# Test all API endpoints work correctly
```

## Architecture Validation

### ✅ Correctly Designed Patterns

#### Multi-Tenant Architecture
- Projects correctly inherit organization context through auth
- No need for `/organizations/{org_id}/projects` URLs
- Organization membership controls project access

#### Security Model
- Organization boundaries properly enforced
- User can only access projects in their organizations
- Role-based access control properly implemented

#### RESTful Design
- Proper resource nesting
- Consistent URL patterns
- Appropriate HTTP methods

### ⚠️ Considerations for Future

#### Potential Enhancements (Not Required Now)
- Consider adding organization context to project URLs for explicit scoping
- Add bulk operations for large-scale management
- Consider GraphQL for complex nested queries

#### Monitoring & Observability
- Ensure all endpoints have proper logging
- Add metrics for organization and project operations
- Monitor cross-organization access attempts

## Implementation Priority

### Phase 0 (Prerequisites - Must Complete First)
0. Resolve existing TypeScript/test issues (Commit Block 0)

### Phase 1 (Critical - Complete Second)
1. Automatic user restoration on login (Commit Block 1)
2. Notification consistency (Commit Block 2)

### Phase 2 (Important - Complete Third)
3. WebSocket alignment (Commit Block 3)
4. Type generation (Commit Block 4)

### Phase 3 (Validation - Final Step)
5. Final validation (Commit Block 5)

## Execution Order

1. **Block 0**: Fix existing issues (prerequisite)
2. **Block 1**: Implement auto-restoration in login
3. **Block 2**: Align notification terminology  
4. **Block 3**: Verify WebSocket alignment
5. **Block 4**: Regenerate API types
6. **Block 5**: Final validation

## Notes

- **Pre-MVP**: No backward compatibility concerns
- Current API structure follows multi-tenant SaaS best practices
- Organization scoping correctly implemented through authentication
- Focus on fixing identified gaps, not restructuring
- All changes are forward-only improvements