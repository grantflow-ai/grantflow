# API Alignment Plan

## Executive Summary

After comprehensive audit of both backend and frontend APIs, the current architecture is **correctly designed** for a multi-tenant SaaS application. The project-scoped URLs are appropriate because projects belong to organizations, and organization context is maintained through authentication and authorization layers.

Only minor fixes needed - no major architectural changes required.

## Current API Structure (Correct)

### Organization Management
- ✅ `/organizations` - CRUD operations
- ✅ `/organizations/{org_id}/members` - Member management  
- ✅ `/organizations/{org_id}/invitations` - Invitation management
- ✅ `/organizations/{org_id}/sources` - Organization-scoped sources

### Project Management (Correctly Inherits Organization Context)
- ✅ `/projects` - Scoped to user's organizations via auth
- ✅ `/projects/{project_id}` - Project operations
- ✅ `/projects/{project_id}/applications` - Grant applications
- ✅ `/projects/{project_id}/members` - Project member management

### Authentication & User Management
- ✅ `/login` - Firebase authentication
- ✅ `/user` - User profile management
- ✅ `/notifications` - User notifications

### WebSocket
- ✅ `/projects/{project_id}/applications/{application_id}/notifications` - Real-time updates

## Issues Found & Fixes Required

### Commit Block 0: Prerequisites (Fix Existing Issues)
**Resolve Current TypeScript and Test Failures**

#### Current Frontend Issues:
- [ ] Fix 346+ TypeScript errors throughout frontend
- [ ] Resolve failing component tests (missing data-testid attributes)
- [ ] Fix broken imports and missing dependencies
- [ ] Update all test files to use correct type imports (UserRole vs UserRoleEnum)

#### Current Backend Issues:
- [ ] Verify all backend tests pass
- [ ] Fix any linting errors in backend code
- [ ] Ensure database migrations are up to date

#### Risk Assessment:
- **High Risk**: Proceeding with API changes while existing errors exist
- **Mitigation**: Must resolve all existing issues before making new changes

### Commit Block 1: Backend Missing Endpoint
**Fix Missing User Restoration Endpoint**

#### Backend Changes:
- [ ] Add `POST /user/restore` endpoint in `services/backend/src/api/routes/user.py`
- [ ] Implement restoration logic with token validation
- [ ] Add proper error handling and response types
- [ ] Update API documentation

#### Frontend Changes:
- [ ] Verify `restoreAccount()` function in `frontend/src/actions/user.ts` 
- [ ] Update types if needed after backend implementation

### Commit Block 2: Notification Consistency
**Align Notification Terminology**

#### Decision Required:
- Current: Frontend `deleteNotification()` vs Backend dismiss functionality
- Options:
  - A) Rename frontend to `dismissNotification()`
  - B) Update backend to support actual deletion
  - C) Keep both (dismiss for marking read, delete for removal)

#### Implementation (Option A - Rename Frontend):
- [ ] Rename `deleteNotification()` to `dismissNotification()` in `frontend/src/actions/notifications.ts`
- [ ] Update all components using this function
- [ ] Update test files
- [ ] Regenerate API types

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

#### Critical Tasks:
- [ ] Compare frontend expected message format vs backend actual format
- [ ] Ensure notification types enum matches between frontend/backend
- [ ] Test connection establishment and message flow
- [ ] Verify proper cleanup on component unmount

### Commit Block 4: API Type Generation
**Regenerate and Verify API Types**

#### Tasks:
- [ ] Run `task generate:api-types` to regenerate frontend types
- [ ] Verify all new endpoints are properly typed
- [ ] Fix any TypeScript errors in frontend
- [ ] Update test files with correct types

### Commit Block 5: Testing & Validation
**Comprehensive Testing of API Alignment**

#### Backend Tests:
- [ ] Run all backend tests to ensure no regressions
- [ ] Add tests for new `/user/restore` endpoint
- [ ] Verify organization scoping in existing project tests

#### Frontend Tests:
- [ ] Run all frontend API tests
- [ ] Update tests for notification changes
- [ ] Add tests for user restoration flow

#### Integration Tests:
- [ ] Test WebSocket notification flow end-to-end
- [ ] Verify organization context is maintained across all operations
- [ ] Test authentication and authorization boundaries

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
1. Backend missing endpoint (Commit Block 1)
2. Notification consistency (Commit Block 2)

### Phase 2 (Important - Complete Third)
3. WebSocket alignment (Commit Block 3)
4. Type generation (Commit Block 4)

### Phase 3 (Validation - Final Step)
5. Testing & validation (Commit Block 5)

## Dependencies

### Critical Dependencies:
- **Block 0 → All Others**: Must fix existing issues before proceeding
- **Block 1 → Block 4**: Backend changes must complete before type generation
- **Block 2 → Block 4**: Frontend function changes need type updates
- **Block 3 → Block 5**: WebSocket changes need integration testing

### Parallel Work Possible:
- Blocks 1 and 2 can be developed in parallel
- Block 3 can start after Block 0 completes
- Block 4 depends on Blocks 1-3 completion

## Risk Assessment

### Low Risk Changes
- Adding missing backend endpoint (isolated addition)
- Renaming frontend functions (simple refactor)
- Type regeneration (automated process)

### Medium Risk Changes
- WebSocket message format changes (affects real-time features)
- Notification type alignment (user-facing changes)
- Fixing existing TypeScript errors (may uncover hidden issues)

### High Risk Changes
- **Block 0 Prerequisites**: Large number of existing errors suggests deeper issues
- **Integration Risk**: Changes across multiple systems (frontend, backend, websocket)
- **User Impact**: Notification changes affect user experience

### Mitigation Strategies
- **Incremental Deployment**: Deploy each block separately with rollback capability
- **Feature Flags**: Use flags to enable/disable new functionality
- **Staging Testing**: Full end-to-end testing in staging environment
- **User Communication**: Notify users of any notification behavior changes

### Red Flags to Watch For
- TypeScript errors that suggest architectural problems
- Test failures indicating broken functionality
- WebSocket connection failures in production
- Cross-organization data leakage (security issue)

## Success Criteria

### Must Have
- [ ] All frontend API calls successfully connect to backend endpoints
- [ ] No 404 or routing errors
- [ ] Organization context properly maintained
- [ ] User restoration flow works end-to-end

### Should Have
- [ ] WebSocket notifications work consistently
- [ ] All API types are properly generated and typed
- [ ] Test coverage maintained above 90%

### Nice to Have
- [ ] Performance improvements in API response times
- [ ] Enhanced error messaging
- [ ] Better API documentation

## Rollback Plan

If issues arise during implementation:

1. **Immediate Rollback**: Revert specific commit blocks independently
2. **Type Issues**: Regenerate types from known-good backend state
3. **WebSocket Issues**: Disable real-time features temporarily
4. **Database Issues**: Use migration rollback scripts

## Notes

- Current API structure follows multi-tenant SaaS best practices
- Organization scoping is correctly implemented through authentication
- No major architectural changes needed
- Focus on fixing identified gaps rather than restructuring