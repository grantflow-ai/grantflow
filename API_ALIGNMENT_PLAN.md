# API Alignment Plan - Remaining Work

## Executive Summary

Backend organization-scoped URLs are **already implemented**. Frontend migration is **30% complete** with core infrastructure in place. Focus on completing frontend API calls, components, and cleanup.

## Remaining Implementation Plan

### Commit Block 1: Complete Frontend Action File Migration
**Update Remaining Action Files to Organization-Scoped URLs**

#### Files to Update:
- [ ] `frontend/src/actions/grant-template.ts` - All grant template endpoints
- [ ] `frontend/src/actions/sources.ts` - All source management endpoints  
- [ ] `frontend/src/actions/rag-jobs.ts` - RAG job endpoints

#### Key Changes:
```typescript
// OLD: getClient().post(`projects/${projectId}/applications/${appId}/grant-template`)
// NEW: getClient().post(`organizations/${orgId}/projects/${projectId}/applications/${appId}/grant-template`)

// Add organizationId parameter to all functions:
export async function createGrantTemplate(
  organizationId: string,  // Add this parameter
  projectId: string,
  applicationId: string,
  data: API.CreateGrantTemplate.RequestBody
) { ... }
```

### Commit Block 2: Update WebSocket and Notification URLs
**Fix WebSocket Implementation for Organization Context**

#### Files to Update:
- [ ] `frontend/src/hooks/use-application-notifications.ts` - WebSocket URL pattern
- [ ] Any other WebSocket hooks or notification systems

#### Key Changes:
```typescript
// OLD: `/projects/${projectId}/applications/${applicationId}/notifications`
// NEW: `/organizations/${orgId}/projects/${projectId}/applications/${appId}/notifications`
```

### Commit Block 3: Fix API Type Generation and TypeScript Errors
**Resolve Type Generation and Compilation Issues**

#### Actions:
- [ ] Run `task generate:api-types` to regenerate types
- [ ] Fix missing ResponseBody type definitions
- [ ] Resolve 32+ TypeScript compilation errors

#### Files Likely Affected:
- [ ] `frontend/src/types/api-types.ts` - Generated types
- [ ] `frontend/src/actions/*.ts` - Action files with type errors

### Commit Block 4: Update Components and Stores
**Pass Organization Context Through Components**

#### Files to Update:
- [ ] `frontend/src/components/projects/detail/project-detail-client.tsx`
- [ ] `frontend/src/components/projects/settings/project-settings-members.tsx` 
- [ ] `frontend/src/providers/navigation-context-provider.tsx`
- [ ] `frontend/src/stores/application-store.ts` - Add organization parameters
- [ ] `frontend/src/stores/project-store.ts` - Verify organization handling

#### Key Changes:
- Add `organizationId` props to components
- Update store methods to accept organization parameters
- Ensure API calls pass organization context

### Commit Block 5: Fix Test Files
**Update Tests for Organization-Scoped Patterns**

#### Files to Update:
- [ ] `frontend/src/actions/grant-applications.spec.ts` - 32 failing tests
- [ ] `frontend/src/components/projects/forms/create-project-form.spec.tsx` - 5 failing tests
- [ ] `frontend/tests/api/` - API test files

#### Key Changes:
- Add `organizationId` parameters to test function calls
- Update test expectations for new URL patterns
- Fix component props in tests

### Commit Block 6: Final Cleanup and Validation
**Run Linters and Verify System**

#### Actions:
- [ ] Run `task lint:frontend` and fix issues
- [ ] Run `task test` and ensure all tests pass
- [ ] Verify all API endpoints work with organization context
- [ ] Test user flows with organization selection

## Current Status

**✅ Complete:**
- Backend organization-scoped URLs implemented
- Organization store and context utilities
- Main dashboard and project/application actions partially migrated

**❌ Remaining:**
- 3 action files still using old URLs
- WebSocket URLs need organization context
- TypeScript compilation errors (32+)
- Component props missing organization context
- Test files need updating

## Notes

- Backend migration is **already complete** - no backend work needed
- Focus entirely on frontend completion
- Organization switcher functionality removed (out of scope)
- All changes are forward-only improvements with no legacy compatibility concerns