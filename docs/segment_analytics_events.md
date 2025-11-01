# Segment Analytics Events Documentation

## Overview

This document provides a comprehensive breakdown of all analytics events tracked in the GrantFlow application, their locations, and the design principles behind the tracking system.

## Design Principles

### 1. **User Flow Focus**
- Events track major user journeys and decision points
- Focus on meaningful actions rather than micro-interactions
- Capture intent and outcomes, not every click

### 2. **Type Safety**
- All events are strongly typed with TypeScript interfaces
- Event properties are validated at compile time
- Centralized event definitions prevent typos and inconsistencies

### 3. **Security First**
- No sensitive data (PII, tokens, etc.) in event properties
- Environment variables for API keys
- Cryptographically secure session IDs
- Email addresses are hashed when tracked

### 4. **Consistent Naming Convention**
- Format: `{category}-{action}-{target}`
- Categories: `onboarding`, `wizard`, `cta`, `error`, `page-view`, etc.
- Actions: `start`, `complete`, `click`, `upload`, `generate`, etc.
- Targets: `new`, `application`, `file`, `link`, etc.

### 5. **Contextual Information**
- Every event includes session ID, timestamp, and user context
- Organization and project IDs for multi-tenant tracking
- Application IDs for workflow tracking
- Path and referrer for navigation analysis

## Event Categories

### Onboarding Events

#### `onboarding-start-new`
**Location**: `src/components/organizations/modals/new-application-modal.tsx:63`
**Trigger**: User clicks "Start Application" in the new application modal
**Properties**:
- `isNewProject: boolean` - Whether creating a new project
- `projectName?: string` - Name of the project (if new)
- `organizationId: string` - Current organization
**Purpose**: Track the beginning of the application creation funnel

#### `onboarding-complete`
**Properties**:
- `applicationId: string` - Completed application ID
- `projectId: string` - Associated project ID
**Purpose**: Measure onboarding completion rates

#### `onboarding-skip`
**Properties**: Base properties only
**Purpose**: Track users who skip onboarding steps

### Call-to-Action (CTA) Events

#### `main-cta-new-application`
**Location**: `src/components/organizations/project/project-detail-client.tsx:223`
**Trigger**: User clicks "New Application" button in project header
**Properties**:
- `source: "dashboard" | "project-actions-header" | "project-page"` - Where CTA was clicked
- `organizationId: string` - Current organization
- `projectId: string` - Current project
**Purpose**: Track effectiveness of primary CTAs across the application

#### `sidebar-cta-new-application`
**Location**: `src/components/sidebar/app-sidebar.tsx:42`
**Trigger**: User clicks "New Application" button in sidebar
**Properties**:
- `source: "sidebar"` - Indicates sidebar origin
- `organizationId?: string` - Current organization (if available)
**Purpose**: Measure sidebar CTA performance

#### `main-cta-new-application-empty`
**Properties**:
- `source: "empty-state"` - Indicates empty state origin
**Purpose**: Track CTA clicks from empty state screens

### Wizard Navigation Events

#### `wizard-step-1-next`
**Location**: Wizard footer component
**Trigger**: User proceeds from "Application Details" step
**Properties**: Base context (applicationId, organizationId, projectId)
**Purpose**: Track progression through application creation wizard

#### `wizard-step-2-approve`
**Location**: `src/components/organizations/project/applications/wizard/wizard-wrapper-components.tsx:357`
**Trigger**: User approves application structure
**Properties**:
- `sectionsCount: number` - Number of sections in template
- `templateId: string` - Template being approved
**Purpose**: Measure template approval rates and preferences

#### `wizard-step-3-next`
**Trigger**: User proceeds from "Knowledge Base" step
**Properties**: Base context only
**Purpose**: Track knowledge base completion

#### `wizard-step-4-next`
**Trigger**: User proceeds from "Research Plan" step
**Properties**: Base context only
**Purpose**: Track research planning completion

#### `wizard-step-5-generate`
**Location**: `src/components/organizations/project/applications/wizard/wizard-wrapper-components.tsx:373`
**Trigger**: User clicks "Generate" on final step
**Properties**:
- `generationType: "application" | "template"` - Type of generation
**Purpose**: Track final generation attempts and success rates

### Wizard Content Events

#### `wizard-step-1-upload`
**Location**: Template file uploader component
**Trigger**: User uploads file in step 1
**Properties**:
- `fileName: string` - Name of uploaded file
- `fileSize: number` - Size in bytes
- `fileType: string` - MIME type
**Purpose**: Track file upload patterns and formats

#### `wizard-step-3-upload`
**Location**: Knowledge base file uploader
**Trigger**: User uploads file in step 3
**Properties**: Same as step 1 upload
**Purpose**: Measure knowledge base building behavior

#### `wizard-step-1-link`
**Location**: URL input component
**Trigger**: User adds URL in step 1
**Properties**:
- `domain: string` - Extracted domain name
- `url: string` - Full URL added
**Purpose**: Track external resource usage patterns

#### `wizard-step-3-link`
**Location**: Knowledge base URL input
**Trigger**: User adds URL in step 3
**Properties**: Same as step 1 link
**Purpose**: Analyze knowledge source preferences

#### `wizard-step-4-add`
**Location**: Research plan step
**Trigger**: User adds research objective
**Properties**:
- `contentType: string` - Type of content added
- `fieldName: string` - Name/title of the content
**Purpose**: Track research planning engagement

#### `wizard-step-3-ai` / `wizard-step-5-ai`
**Location**: AI interaction components
**Trigger**: User interacts with AI features
**Properties**:
- `aiType: "autofill" | "generation" | "preview"` - Type of AI interaction
- `fieldName?: string` - Field being assisted (if applicable)
**Purpose**: Measure AI feature adoption and usage patterns

### Error Events

#### `wizard-error-continue`
**Location**: Wizard navigation with validation errors
**Trigger**: User tries to proceed with validation errors
**Properties**:
- `errorType: string` - Type of error encountered
- `validationErrors?: string[]` - List of validation errors
**Purpose**: Identify common user pain points and form issues

#### `wizard-error-back`
**Trigger**: User navigates back with errors
**Properties**: Same as error-continue
**Purpose**: Track error recovery patterns

#### `error-api-critical`
**Properties**:
- `endpoint: string` - API endpoint that failed
- `errorMessage: string` - Error description
- `statusCode: number` - HTTP status code
**Purpose**: Monitor API reliability and user impact

#### `error-auth-failed`
**Properties**:
- `reason: string` - Authentication failure reason
**Purpose**: Track authentication issues

#### `error-generation-failed`
**Properties**:
- `errorMessage: string` - Error description
- `generationType: "application" | "template"` - What failed to generate
**Purpose**: Monitor AI generation reliability

### Wizard Completion Events

#### `wizard-start`
**Properties**: Base context only
**Purpose**: Track wizard entry points

#### `wizard-complete`
**Properties**:
- `duration: number` - Time spent in wizard (milliseconds)
- `stepsCompleted: number` - Number of steps completed
**Purpose**: Measure wizard completion rates and time

#### `wizard-abandon`
**Properties**:
- `duration: number` - Time before abandonment
- `lastStep: string` - Where user stopped
**Purpose**: Identify drop-off points and optimize funnel

### Application Management Events

#### `application-create`
**Properties**:
- `source: "empty-state" | "main-cta" | "onboarding" | "sidebar"` - Creation trigger
**Purpose**: Track application creation patterns

#### `application-view`
**Properties**:
- `applicationId: string` - Application being viewed
- `applicationTitle?: string` - Application title
**Purpose**: Monitor application engagement

#### `application-delete`
**Properties**:
- `applicationId: string` - Deleted application ID
**Purpose**: Track deletion patterns

#### `application-generate-start` / `application-generate-complete`
**Properties**:
- `generationType: "application" | "template"` - Type of generation
- `success: boolean` - Whether generation succeeded (complete event)
- `duration: number` - Generation time (complete event)
**Purpose**: Monitor AI generation performance and success rates

### Project Management Events

#### `project-create`
**Properties**:
- `projectName: string` - Name of new project
- `fromOnboarding: boolean` - Whether created during onboarding
**Purpose**: Track project creation patterns

#### `project-view`
**Properties**:
- `projectId: string` - Project being viewed
- `projectName?: string` - Project name
**Purpose**: Monitor project engagement

#### `project-invite-sent`
**Properties**:
- `inviteeEmail: string` - Hashed email of invitee
- `role: string` - Role being assigned
**Purpose**: Track collaboration patterns

#### `project-member-joined`
**Properties**:
- `role: string` - Role of new member
**Purpose**: Monitor team growth

### User Events

#### `user-signup`
**Properties**:
- `method: "email" | "github" | "google"` - Registration method
- `referralSource?: string` - How user found the platform
**Purpose**: Track user acquisition channels

#### `user-login`
**Properties**:
- `method: "email" | "github" | "google"` - Login method
**Purpose**: Monitor authentication patterns

#### `user-logout`
**Properties**: Base properties only
**Purpose**: Track session patterns

#### `user-email-verified`
**Properties**: Base properties only
**Purpose**: Monitor verification completion

### Page View Events

#### `page-view-dashboard`
**Trigger**: User visits dashboard
**Properties**: Base context only

#### `page-view-project`
**Trigger**: User visits project page
**Properties**: Base context only

#### `page-view-application`
**Trigger**: User visits application page
**Properties**: Base context only

#### `page-view-editor`
**Trigger**: User visits editor
**Properties**: Base context only

#### `page-view-login`
**Trigger**: User visits login page
**Properties**: Base context only

#### `page-view-signup`
**Trigger**: User visits signup page
**Properties**: Base context only

### AI and Generation Events

#### `ai-autofill-used`
**Properties**:
- `fieldName: string` - Field that was autofilled
**Purpose**: Track AI autofill adoption

#### `content-generated`
**Properties**:
- `contentType: string` - Type of content generated
- `wordCount?: number` - Length of generated content
**Purpose**: Monitor AI content generation usage

#### `template-generate`
**Properties**: Base context only
**Purpose**: Track template generation requests

#### `template-approved`
**Properties**: Base context only
**Purpose**: Measure template approval rates

### File Management Events

#### `file-upload-complete`
**Properties**:
- `fileName: string` - Name of uploaded file
- `fileSize: number` - Size in bytes
- `fileType: string` - MIME type
**Purpose**: Track file upload patterns across the platform

#### `url-added`
**Properties**:
- `domain: string` - Domain of added URL
**Purpose**: Monitor external resource integration

#### `source-removed`
**Properties**:
- `sourceType: "file" | "url"` - Type of source removed
**Purpose**: Track content management patterns

### Collaboration Events

#### `collaboration-session-start`
**Properties**: Base context only
**Purpose**: Track real-time collaboration usage

#### `collaboration-session-end`
**Properties**:
- `duration: number` - Session length in milliseconds
- `participantCount: number` - Number of participants
**Purpose**: Measure collaboration engagement

#### `member-role-changed`
**Properties**:
- `oldRole: string` - Previous role
- `newRole: string` - New role assigned
**Purpose**: Track permission management

## Implementation Architecture

### Core Files

#### `src/utils/tracking/events.ts`
- Centralized event name definitions
- Exported as const object for type safety
- Single source of truth for all event names

#### `src/utils/tracking/types.ts`
- TypeScript interfaces for all event properties
- Base properties interface extended by specific events
- Ensures compile-time validation of tracked data

#### `src/utils/tracking/track.ts`
- Main tracking functions (`trackEvent`, `trackError`, `trackPageView`)
- Session management integration
- Error handling and logging
- Analytics service integration

#### `src/utils/tracking/session.ts`
- Secure session ID generation using `crypto.getRandomValues`
- Session persistence in `sessionStorage`
- Fallback for older browsers

#### `src/hooks/use-wizard-analytics.ts`
- React hook for wizard-specific tracking
- Debouncing to prevent duplicate events
- Context management (organization, project, application IDs)
- Maintains backward compatibility with existing components

### Testing Strategy

#### `testing/analytics-test-utils.ts`
- Utilities for testing analytics in components
- Mock helpers and assertion functions
- Focuses on behavior verification rather than implementation details

#### `testing/global-mocks.ts`
- Global mocks for Segment analytics
- Ensures consistent test environment
- Prevents actual analytics calls during testing

## Usage Guidelines

### When to Add New Events

1. **Major User Actions**: Significant user decisions or workflow milestones
2. **Feature Adoption**: New feature usage and engagement
3. **Error Scenarios**: User-facing errors that impact experience
4. **Business Metrics**: Actions that correlate with business outcomes

### When NOT to Add Events

1. **Micro-interactions**: Mouse movements, hover states, focus events
2. **Redundant Actions**: Events that duplicate existing tracking
3. **High-frequency Events**: Actions that fire many times per session
4. **Implementation Details**: Internal state changes not visible to users

### Adding New Events

1. **Define Event**: Add to `TrackingEvents` object in `events.ts`
2. **Type Properties**: Add interface to `EventProperties` in `types.ts`
3. **Implement Tracking**: Use `trackEvent()` function at trigger location
4. **Add Tests**: Create tests focusing on behavior verification
5. **Update Documentation**: Add event details to this document

### Best Practices

1. **Keep Properties Minimal**: Only track data necessary for analysis
2. **Use Consistent Naming**: Follow the established convention
3. **Test Thoroughly**: Ensure events fire correctly and properties are accurate
4. **Respect Privacy**: Never track PII or sensitive information
5. **Monitor Performance**: Ensure tracking doesn't impact user experience

## Security Considerations

- **API Keys**: Stored in environment variables, never hard-coded
- **Session IDs**: Generated using cryptographically secure random values
- **PII Protection**: Email addresses hashed, no sensitive data in properties
- **Error Handling**: Graceful degradation when analytics fail
- **Browser Compatibility**: Fallbacks for older browsers without crypto APIs

This tracking system provides comprehensive insights into user behavior while maintaining security, performance, and maintainability standards.
