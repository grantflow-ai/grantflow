# Organization-Based Architecture Implementation Plan

## Overview
Migrate from project-based to organization-based architecture across both backend and frontend. Users authenticate and work within organization context, with all API routes requiring organization_id.

## Backend Changes Required

### Block 1: Backend JWT Organization Context ✓
- **Scope**: Enhance JWT infrastructure with default organization context
- **Changes**:
  - ✓ Extend JWT payload to include default organization_id and role
  - ✓ Update login endpoint to determine and include default organization using priority logic
  - Backend remains stateless - organization context comes from URL paths

### Block 2: Backend API Route Updates  
- **Scope**: Update all existing API routes to include organization_id
- **Changes**:
  - Modify route patterns: `/projects/{id}` → `/organizations/{org_id}/projects/{id}`
  - Update all endpoint functions to accept and validate organization_id
  - Add organization membership checks to all route handlers
  - Update API documentation and types

## Frontend Changes Required

### Block 3: Frontend Type System Updates
- **Scope**: Update TypeScript types, enums, and API interfaces
- **Changes**:
  - Update role enum: MEMBER → COLLABORATOR
  - Update application status enums to match backend
  - Regenerate API types from backend schema
  - Update factory types and test data

### Block 4: Frontend Authentication & Organization Context
- **Scope**: Update auth flow and organization selection
- **Changes**:
  - Extract default organization_id from JWT after login
  - Implement organization switching via Next.js cookies (client-side state)
  - Create organization selector component
  - Use cookie to persist selected organization across sessions
  - Frontend manages organization UI state, backend expects it in URL paths

### Block 5: Frontend API Layer Updates
- **Scope**: Update all API calls and client functions
- **Changes**:
  - Update all API action functions to include organization_id parameter
  - Modify API client to inject organization context
  - Update error handling for organization-related errors
  - Update withAuthRedirect to handle organization context

### Block 6: Frontend State Management Updates
- **Scope**: Update Zustand stores for organization context
- **Changes**:
  - Update application store to include organization_id
  - Update project store with organization context
  - Update user store to handle organization selection
  - Update all store actions to pass organization_id

### Block 7: Frontend Routing & Navigation Updates
- **Scope**: Update routing structure and navigation components
- **Changes**:
  - Update Next.js routes: `/projects/[id]` → `/organizations/[org_id]/projects/[id]`
  - Update navigation components (sidebar, breadcrumbs)
  - Update link generation throughout application
  - Update route guards and middleware

### Block 8: Frontend Component Updates
- **Scope**: Update components to work with organization context
- **Changes**:
  - Update form components to include organization_id
  - Update data display components for new structure
  - Update prop interfaces across components
  - Update component state management

### Block 9: Frontend Test Updates
- **Scope**: Fix all TypeScript errors and failing tests
- **Changes**:
  - Update test factories with new API structure
  - Fix component tests with organization context
  - Update API action tests
  - Update store tests

### Block 10: Integration Testing & Validation
- **Scope**: End-to-end testing and validation
- **Changes**:
  - Test authentication flow with organization selection
  - Test all major user workflows with organization context
  - Validate API integration between frontend and backend
  - Performance testing and optimization

## Implementation Strategy

1. **Sequential Implementation**: Each block should be completed and committed before moving to the next
2. **Testing**: Run linters and tests after each block
3. **Validation**: Ensure application remains functional after each block
4. **Documentation**: Update relevant documentation as changes are made

## Architecture Approach

### Backend (Stateless)
- JWT contains default organization_id and role (from login logic)
- Organization context MUST come from URL path parameters
- Backend has no knowledge of UI state or user preferences
- All routes expect `/organizations/{org_id}/...` pattern

### Frontend (Stateful UI)
- Extracts default organization_id from JWT after login
- Uses Next.js cookies to persist user's selected organization
- Organization switching is purely a frontend concern
- Updates all API calls to include selected organization in URL path

```typescript
// Frontend organization management:
// 1. After login: decode JWT to get default organization
// 2. Check cookie for previously selected organization
// 3. If no cookie or invalid, use JWT default
// 4. When user switches: update cookie and redirect to new org URL
// 5. All API calls use: `/organizations/${selectedOrgId}/...`
```

## Success Criteria
- All API routes work with organization context
- User authentication includes organization selection
- Frontend routing reflects organization structure
- All tests pass
- No TypeScript errors
- Application functions correctly with organization-based workflow