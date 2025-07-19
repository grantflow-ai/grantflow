# API Alignment Plan - Remaining Work

## Executive Summary

Backend organization-scoped URLs are **implemented**. Frontend action layer migration is **COMPLETE**. Focus on application layer (stores, components, tests) and cleanup.

## Remaining Implementation Plan

### Commit Block 1: Update Application Store
**Add Organization Parameters to Application Store Methods**

#### Files to Update:
- [ ] `frontend/src/stores/application-store.ts` - Update all methods to accept organizationId parameter

#### Key Changes:
```typescript
// Update interface methods to include organizationId:
createApplication: (organizationId: string, projectId: string) => Promise<void>;
getApplication: (organizationId: string, projectId: string, applicationId: string) => Promise<void>;
generateApplication: (organizationId: string, projectId: string, applicationId: string) => Promise<void>;
// ... etc for all methods that call action functions
```

### Commit Block 2: Update Components  
**Pass Organization Context Through Components**

#### Files to Update:
- [ ] `frontend/src/components/projects/detail/project-detail-client.tsx`
- [ ] `frontend/src/components/projects/settings/project-settings-members.tsx` 
- [ ] `frontend/src/providers/navigation-context-provider.tsx`
- [ ] Components using WebSocket notifications (add organizationId prop)

#### Key Changes:
- Add `organizationId` props to components
- Update component calls to stores/actions with organization context
- Update WebSocket hook usage to include organizationId

### Commit Block 3: Fix Test Files
**Update Tests for Organization-Scoped Patterns**

#### Files to Update:
- [ ] `frontend/src/actions/grant-applications.spec.ts` - 32 failing tests
- [ ] `frontend/src/actions/grant-template.spec.ts` - Tests with missing organizationId
- [ ] `frontend/src/actions/sources.spec.ts` - Tests with missing organizationId  
- [ ] `frontend/src/components/projects/forms/create-project-form.spec.tsx` - 5 failing tests
- [ ] Other test files with organization parameter mismatches

#### Key Changes:
- Add `organizationId` parameters to test function calls
- Update test expectations for new function signatures
- Fix component props in tests

### Commit Block 4: Final Cleanup and Validation
**Run Linters and Verify System**

#### Actions:
- [ ] Run `task lint:frontend` and fix remaining issues
- [ ] Run `task test` and ensure all tests pass
- [ ] Verify TypeScript compilation is clean
- [ ] Test key user flows with organization selection

### Backend Task (Separate)
**Update Backend WebSocket Endpoint** 
- [ ] Update WebSocket route to support organization-scoped URLs in backend

## Current Status

**✅ Complete (High Priority Tasks):**
- ✅ All frontend action files use organization-scoped URLs
- ✅ WebSocket frontend URLs and types updated  
- ✅ API types regenerated successfully
- ✅ Granting institution frontend functionality removed
- ✅ Project store has organization parameters

**📋 Remaining (Application Layer):**
- Application store methods need organization parameters
- Components need organization context passed through  
- Test files need parameter updates
- TypeScript compilation cleanup

## Notes

- **Action layer migration is COMPLETE** - all API calls use organization-scoped URLs
- Focus on application layer: stores → components → tests → cleanup
- Backend WebSocket endpoint update is separate backend task
- All changes are forward-only improvements