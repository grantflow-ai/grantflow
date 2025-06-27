# API Implementation Guide

**Date:** 2025-06-27
**Status:** Frontend Implementation Complete - Backend APIs Required
**Context:** Dashboard enhancement with notification system, project detail page, and application management

## Overview

This document outlines the API endpoints and database changes required to support the newly implemented frontend features. The frontend components are fully functional with proper state management, but require backend integration to provide real data and persistent notifications.

## 🔧 Required API Endpoints

### 1. Notification System APIs

#### **GET /notifications**
**Purpose:** Retrieve user's notifications
**Frontend Integration:** Used by `NotificationContainer` component on page load

```typescript
// Request
GET /notifications
Headers: Authorization: Bearer <token>

// Response
{
  "notifications": [
    {
      "id": "uuid",
      "type": "deadline" | "info" | "warning" | "success",
      "title": "7 days until grant deadline",
      "message": "is due in 7 days. Make sure everything is ready for submission.",
      "project_name": "Neuroadaptive Interfaces - EIC Pathfinder",
      "project_id": "uuid",
      "created_at": "2025-06-27T10:00:00Z",
      "read": false,
      "expires_at": "2025-07-04T10:00:00Z" // Optional
    }
  ]
}
```

#### **POST /notifications/{id}/dismiss**
**Purpose:** Mark a notification as dismissed/closed
**Frontend Integration:** Called when user clicks close (×) button

```typescript
// Request
POST /notifications/{id}/dismiss
Headers: Authorization: Bearer <token>

// Response
{ "success": true }
```

#### **POST /notifications/dismiss-all**
**Purpose:** Dismiss all notifications for a user
**Frontend Integration:** Could be used for "clear all" functionality

```typescript
// Request
POST /notifications/dismiss-all
Headers: Authorization: Bearer <token>

// Response
{ "success": true, "dismissed_count": 5 }
```

#### **POST /notifications/{id}/read**
**Purpose:** Mark notification as read (for future read/unread UI)
**Frontend Integration:** Currently not used but prepared for future enhancement

### 2. Enhanced Project APIs

#### **GET /projects/{id}/collaborators**
**Purpose:** Get team members for a project to display proper avatars
**Frontend Integration:** Used by `AvatarGroup` in project cards and headers
**Backend Implementation:** Uses Firebase Admin SDK to fetch user data on-demand

```typescript
// Request
GET /projects/{id}/collaborators
Headers: Authorization: Bearer <token>

// Response
{
  "collaborators": [
    {
      "id": "uuid", // Firebase UID
      "firebase_uid": "firebase_user_id", // Firebase user ID
      "initials": "NH", // Generated from display_name or email
      "full_name": "Naaman Hirschfeld", // From Firebase user.displayName
      "display_name": "Naaman Hirschfeld", // From Firebase user.displayName
      "email": "naaman@example.com", // From Firebase user.email
      "email_verified": true, // From Firebase user.emailVerified
      "photo_url": "https://lh3.googleusercontent.com/...", // From Firebase user.photoURL
      "role": "owner" | "admin" | "member", // From project_collaborators table
      "avatar_color": "#369e94", // Generated or stored custom color
      "provider_data": [ // From Firebase user.providerData
        {
          "provider_id": "google.com",
          "uid": "google_user_id",
          "display_name": "Naaman Hirschfeld",
          "email": "naaman@example.com",
          "photo_url": "https://lh3.googleusercontent.com/..."
        }
      ],
      "last_sign_in": "2025-06-27T10:00:00Z", // From Firebase user.metadata.lastSignInTime
      "created_at": "2025-06-01T10:00:00Z", // From Firebase user.metadata.creationTime
      "joined_project_at": "2025-06-15T10:00:00Z", // From project_collaborators table
      "invited_by": "inviter_user_id", // From project_collaborators table
      "status": "active" | "pending" | "removed" // From project_collaborators table
    }
  ]
}

// Backend Implementation Notes:
// 1. Query project_collaborators table for user IDs and roles
// 2. Use Firebase Admin SDK to fetch user data: admin.auth().getUsers(uids)
// 3. Merge Firebase user data with project role data
// 4. Generate initials from displayName or email if displayName is null
// 5. Cache Firebase user data for 15 minutes to reduce API calls
// 6. Handle deleted/disabled Firebase users gracefully
```

#### **POST /projects/{id}/collaborators**
**Purpose:** Invite collaborators to a project
**Frontend Integration:** Connected to invite button tooltip in dashboard header

```typescript
// Request
{
  "email": "user@example.com",
  "role": "member" | "admin"
}

// Response
{
  "success": true,
  "invitation_id": "uuid",
  "invited_user": {
    "email": "user@example.com",
    "status": "pending" | "accepted"
  }
}
```

### 3. Billing & Payment APIs (Stripe Integration)

#### **GET /billing/subscription**
**Purpose:** Get current subscription status and plan details
**Frontend Integration:** Used by billing settings page to show current plan

```typescript
// Request
GET /billing/subscription
Headers: Authorization: Bearer <token>

// Response
{
  "subscription": {
    "id": "sub_1234567890",
    "status": "active" | "trialing" | "past_due" | "canceled" | "unpaid",
    "current_period_start": "2025-06-01T00:00:00Z",
    "current_period_end": "2025-07-01T00:00:00Z",
    "cancel_at_period_end": false,
    "plan": {
      "id": "plan_1234567890",
      "name": "Professional",
      "price": 49.99,
      "currency": "USD",
      "interval": "month",
      "features": [
        "Unlimited projects",
        "Advanced AI assistance",
        "Priority support",
        "Team collaboration"
      ]
    },
    "payment_method": {
      "id": "pm_1234567890",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "exp_month": 12,
        "exp_year": 2025
      }
    }
  }
}
```

#### **GET /billing/plans**
**Purpose:** Get available subscription plans
**Frontend Integration:** Used for plan selection/upgrade UI

```typescript
// Response
{
  "plans": [
    {
      "id": "plan_free",
      "name": "Free",
      "price": 0,
      "currency": "USD",
      "interval": "month",
      "features": [
        "1 project",
        "Basic AI assistance",
        "Community support"
      ],
      "limits": {
        "projects": 1,
        "applications_per_project": 3,
        "ai_requests_per_month": 100
      }
    },
    {
      "id": "plan_professional",
      "name": "Professional",
      "price": 49.99,
      "currency": "USD",
      "interval": "month",
      "features": [
        "Unlimited projects",
        "Advanced AI assistance",
        "Priority support",
        "Team collaboration"
      ],
      "limits": {
        "projects": -1, // unlimited
        "applications_per_project": -1,
        "ai_requests_per_month": -1
      },
      "popular": true
    },
    {
      "id": "plan_enterprise",
      "name": "Enterprise",
      "price": 199.99,
      "currency": "USD",
      "interval": "month",
      "features": [
        "Everything in Professional",
        "Custom integrations",
        "Dedicated account manager",
        "SLA guarantee",
        "Custom AI training"
      ],
      "contact_sales": true
    }
  ]
}
```

#### **POST /billing/create-checkout-session**
**Purpose:** Create Stripe checkout session for new subscription
**Frontend Integration:** Called when user clicks upgrade/subscribe

```typescript
// Request
POST /billing/create-checkout-session
Headers: Authorization: Bearer <token>
{
  "plan_id": "plan_professional",
  "success_url": "https://app.grantflow.ai/billing/success",
  "cancel_url": "https://app.grantflow.ai/billing/cancel"
}

// Response
{
  "checkout_session_id": "cs_1234567890",
  "checkout_url": "https://checkout.stripe.com/pay/cs_1234567890"
}
```

#### **POST /billing/create-portal-session**
**Purpose:** Create Stripe customer portal session for subscription management
**Frontend Integration:** Called when user clicks "Manage Subscription"

```typescript
// Request
POST /billing/create-portal-session
Headers: Authorization: Bearer <token>
{
  "return_url": "https://app.grantflow.ai/billing"
}

// Response
{
  "portal_session_id": "bps_1234567890",
  "portal_url": "https://billing.stripe.com/p/session/bps_1234567890"
}
```

#### **GET /billing/invoices**
**Purpose:** Get billing history and invoices
**Frontend Integration:** Used by billing page to show payment history

```typescript
// Request
GET /billing/invoices?limit=10&offset=0
Headers: Authorization: Bearer <token>

// Response
{
  "invoices": [
    {
      "id": "in_1234567890",
      "number": "INV-2025-001",
      "status": "paid",
      "amount_paid": 49.99,
      "currency": "USD",
      "created_at": "2025-06-01T00:00:00Z",
      "paid_at": "2025-06-01T00:05:00Z",
      "pdf_url": "https://pay.stripe.com/invoice/...",
      "hosted_invoice_url": "https://invoice.stripe.com/..."
    }
  ],
  "total": 15,
  "has_more": true
}
```

#### **POST /billing/update-payment-method**
**Purpose:** Update default payment method
**Frontend Integration:** Called from payment method update form

```typescript
// Request
POST /billing/update-payment-method
Headers: Authorization: Bearer <token>
{
  "payment_method_id": "pm_1234567890" // From Stripe Elements
}

// Response
{
  "success": true,
  "payment_method": {
    "id": "pm_1234567890",
    "type": "card",
    "card": {
      "brand": "mastercard",
      "last4": "5555",
      "exp_month": 12,
      "exp_year": 2026
    }
  }
}
```

#### **DELETE /billing/subscription**
**Purpose:** Cancel subscription at period end
**Frontend Integration:** Called from cancel subscription flow

```typescript
// Request
DELETE /billing/subscription
Headers: Authorization: Bearer <token>
{
  "reason": "too_expensive" | "not_using" | "missing_features" | "other",
  "feedback": "Optional feedback text"
}

// Response
{
  "success": true,
  "subscription": {
    "id": "sub_1234567890",
    "status": "active",
    "cancel_at_period_end": true,
    "current_period_end": "2025-07-01T00:00:00Z"
  }
}
```

#### **POST /billing/reactivate-subscription**
**Purpose:** Reactivate a canceled subscription before period end
**Frontend Integration:** Show option if subscription is set to cancel

```typescript
// Request
POST /billing/reactivate-subscription
Headers: Authorization: Bearer <token>

// Response
{
  "success": true,
  "subscription": {
    "id": "sub_1234567890",
    "status": "active",
    "cancel_at_period_end": false
  }
}
```

#### **POST /billing/webhooks/stripe**
**Purpose:** Webhook endpoint for Stripe events
**Note:** This is for backend processing, not frontend

```typescript
// Stripe will send events like:
// - checkout.session.completed
// - customer.subscription.created
// - customer.subscription.updated
// - customer.subscription.deleted
// - invoice.payment_succeeded
// - invoice.payment_failed
```

### 4. User Account Management

#### **DELETE /user/account**
**Purpose:** Soft delete user account with grace period for restoration
**Frontend Integration:** Called from delete account modal

```typescript
// Request
DELETE /user/account
Headers: Authorization: Bearer <token>

// Response
{
  "success": true,
  "deletion_scheduled_at": "2025-07-04T10:00:00Z", // Account will be permanently deleted after this
  "grace_period_days": 7,
  "restoration_token": "uuid-token", // Sent via email for account restoration
  "message": "Your account has been scheduled for deletion. You have 7 days to restore it."
}

// Error Response (400)
{
  "error": "Cannot delete account with active subscription",
  "code": "ACTIVE_SUBSCRIPTION_EXISTS"
}
```

#### **POST /user/account/restore**
**Purpose:** Restore a soft-deleted account within grace period
**Frontend Integration:** Called from restoration link in email

```typescript
// Request
POST /user/account/restore
{
  "token": "uuid-restoration-token"
}

// Response
{
  "success": true,
  "message": "Your account has been successfully restored"
}

// Error Response (400)
{
  "error": "Invalid or expired restoration token",
  "code": "INVALID_RESTORATION_TOKEN"
}

// Error Response (410)
{
  "error": "Grace period has expired. Account permanently deleted.",
  "code": "GRACE_PERIOD_EXPIRED"
}
```

#### **GET /user/account/status**
**Purpose:** Check if account is marked for deletion
**Frontend Integration:** Used to show warning banner on login

```typescript
// Request
GET /user/account/status
Headers: Authorization: Bearer <token>

// Response (Normal account)
{
  "status": "active",
  "deletion_scheduled": false
}

// Response (Soft-deleted account)
{
  "status": "pending_deletion",
  "deletion_scheduled": true,
  "deletion_scheduled_at": "2025-07-04T10:00:00Z",
  "days_remaining": 5,
  "can_restore": true
}
```

### 5. Project Deadline Management

#### **GET /projects/{id}/deadlines**
**Purpose:** Get upcoming deadlines for a project
**Frontend Integration:** Used to generate deadline notifications

```typescript
// Response
{
  "deadlines": [
    {
      "id": "uuid",
      "title": "Grant Application Deadline",
      "due_date": "2025-07-04T23:59:59Z",
      "application_id": "uuid", // Optional if linked to specific application
      "status": "upcoming" | "overdue" | "completed",
      "days_remaining": 7
    }
  ]
}
```

#### **POST /projects/{id}/deadlines**
**Purpose:** Create a new deadline/reminder
**Frontend Integration:** Future enhancement for deadline management

### 6. Application Management APIs

#### **GET /projects/{id}/applications**
**Purpose:** Get all applications for a project with search and filtering capabilities
**Frontend Integration:** Used by project detail page to display application cards with real-time search

```typescript
// Request
GET /projects/{id}/applications?search=keyword&status=working_draft&sort=updated_at&order=desc&limit=50&offset=0
Headers: Authorization: Bearer <token>

// Query Parameters:
// - search: string (optional) - Search in application name and description
// - status: string (optional) - Filter by status: "generating" | "in_progress" | "working_draft"
// - sort: string (optional) - Sort by field: "name" | "created_at" | "updated_at" | "deadline"
// - order: string (optional) - Sort order: "asc" | "desc" (default: "desc")
// - limit: number (optional) - Number of results per page (default: 50, max: 100)
// - offset: number (optional) - Pagination offset (default: 0)
// - created_by: string (optional) - Filter by creator user ID

// Response
{
  "applications": [
    {
      "id": "uuid",
      "name": "Application Name",
      "description": "Lorem ipsum dolor sit amet consectetur...",
      "status": "generating" | "in_progress" | "working_draft",
      "deadline": "2025-07-04T23:59:59Z", // Optional
      "deadline_text": "4 weeks and 3 days to the deadline", // Human-readable
      "last_edited": "2025-08-22T10:00:00Z",
      "created_at": "2025-06-01T10:00:00Z",
      "updated_at": "2025-08-22T10:00:00Z",
      "project_id": "uuid",
      "created_by": "uuid",
      "created_by_name": "John Doe", // Resolved from Firebase user data
      "created_by_email": "john.doe@example.com" // Resolved from Firebase user data
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 50,
    "offset": 0,
    "has_more": false
  },
  "filters_applied": {
    "search": "keyword",
    "status": "working_draft",
    "sort": "updated_at",
    "order": "desc"
  }
}

// Example Requests:
// GET /projects/123/applications?search=neural - Search for "neural" in name/description
// GET /projects/123/applications?status=in_progress - Filter by status
// GET /projects/123/applications?sort=deadline&order=asc - Sort by deadline ascending
// GET /projects/123/applications?search=AI&status=working_draft&sort=name - Combined filters
```

#### **DELETE /applications/{id}**
**Purpose:** Delete an application permanently
**Frontend Integration:** Called from delete confirmation modal

```typescript
// Request
DELETE /applications/{id}
Headers: Authorization: Bearer <token>

// Response
{ "success": true }

// Error Response (404)
{
  "error": "Application not found",
  "code": "APPLICATION_NOT_FOUND"
}

// Error Response (403)
{
  "error": "You don't have permission to delete this application",
  "code": "PERMISSION_DENIED"
}
```

#### **POST /projects/{id}/applications**
**Purpose:** Create a new application within a project
**Frontend Integration:** Called when user clicks "New Application" button

```typescript
// Request
POST /projects/{id}/applications
Headers: Authorization: Bearer <token>
{
  "name": "Untitled Application", // Default name
  "description": "",
  "status": "working_draft"
}

// Response
{
  "id": "uuid",
  "name": "Untitled Application",
  "description": "",
  "status": "working_draft",
  "project_id": "uuid",
  "created_at": "2025-06-27T10:00:00Z",
  "redirect_url": "/projects/{project_id}/applications/{id}"
}
```

#### **PATCH /applications/{id}**
**Purpose:** Update application details (name, description, status)
**Frontend Integration:** For future inline editing of application details

```typescript
// Request
PATCH /applications/{id}
Headers: Authorization: Bearer <token>
{
  "name": "Updated Application Name", // Optional
  "description": "Updated description", // Optional
  "status": "in_progress" // Optional
}

// Response
{
  "id": "uuid",
  "name": "Updated Application Name",
  "description": "Updated description",
  "status": "in_progress",
  "updated_at": "2025-06-27T10:00:00Z"
}
```

## 🗄️ Database Schema Changes

### 1. User Account Soft Delete

```sql
-- Add soft delete columns to users table
ALTER TABLE users
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deletion_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN restoration_token VARCHAR(255) UNIQUE,
ADD COLUMN deletion_reason TEXT;

-- Create index for soft delete queries
CREATE INDEX idx_users_deletion_scheduled ON users(deletion_scheduled_at)
WHERE deletion_scheduled_at IS NOT NULL;

-- Create restoration tokens table for tracking
CREATE TABLE account_restoration_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT
);

-- Create index for token lookups
CREATE INDEX idx_restoration_tokens_token ON account_restoration_tokens(token);
CREATE INDEX idx_restoration_tokens_expires ON account_restoration_tokens(expires_at);
```

### 2. Notifications Table

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deadline', 'info', 'warning', 'success')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    project_name VARCHAR(255), -- Denormalized for performance
    read BOOLEAN DEFAULT FALSE,
    dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    metadata JSONB DEFAULT '{}' -- For future extensibility
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_active ON notifications(user_id) WHERE dismissed = FALSE;
CREATE INDEX idx_notifications_project_id ON notifications(project_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### 3. Project Collaborators Table (if not exists)

```sql
CREATE TABLE project_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'removed')),
    UNIQUE(project_id, user_id)
);
```

### 4. Project Deadlines Table

```sql
CREATE TABLE project_deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    application_id UUID REFERENCES grant_applications(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_days INTEGER[] DEFAULT '{7, 3, 1}', -- Days before to send reminders
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Grant Applications Table Update

```sql
-- Add status column if not exists
ALTER TABLE grant_applications
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'working_draft'
CHECK (status IN ('generating', 'in_progress', 'working_draft'));

-- Add search and filter indexes for performance
CREATE INDEX idx_applications_project_id ON grant_applications(project_id);
CREATE INDEX idx_applications_status ON grant_applications(status);
CREATE INDEX idx_applications_updated_at ON grant_applications(updated_at DESC);
CREATE INDEX idx_applications_created_at ON grant_applications(created_at DESC);
CREATE INDEX idx_applications_deadline ON grant_applications(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_applications_created_by ON grant_applications(created_by);

-- Composite indexes for common query patterns
CREATE INDEX idx_applications_project_status_updated ON grant_applications(project_id, status, updated_at DESC);
CREATE INDEX idx_applications_project_created_by ON grant_applications(project_id, created_by);

-- Full-text search indexes (PostgreSQL)
CREATE INDEX idx_applications_name_search ON grant_applications USING GIN (to_tsvector('english', name));
CREATE INDEX idx_applications_description_search ON grant_applications USING GIN (to_tsvector('english', description));

-- Combined text search index for name and description
CREATE INDEX idx_applications_fulltext_search ON grant_applications
USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- For MySQL/other databases, use regular indexes
-- CREATE INDEX idx_applications_name_text ON grant_applications(name);
-- CREATE FULLTEXT INDEX idx_applications_description_fulltext ON grant_applications(description);
```

### 6. Search Performance Optimization

```sql
-- Example queries that will be optimized by these indexes:

-- 1. Search with filters
SELECT * FROM grant_applications
WHERE project_id = ?
  AND status = 'working_draft'
  AND to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', 'neural network')
ORDER BY updated_at DESC
LIMIT 50;

-- 2. Sort by deadline
SELECT * FROM grant_applications
WHERE project_id = ?
  AND deadline IS NOT NULL
ORDER BY deadline ASC;

-- 3. Filter by creator
SELECT * FROM grant_applications
WHERE project_id = ?
  AND created_by = ?
ORDER BY created_at DESC;

-- 4. Combined filters
SELECT * FROM grant_applications
WHERE project_id = ?
  AND status IN ('in_progress', 'working_draft')
  AND created_by = ?
ORDER BY updated_at DESC;
```

## 🔌 Frontend Integration Points

### 1. Notification Store Usage

**File:** `/src/stores/notification-store.ts`

```typescript
// Current store methods available:
const { addNotification, removeNotification, clearAllNotifications } = useNotificationStore();

// Integration points:
// 1. Load notifications on app start
// 2. Add real-time notifications via WebSocket
// 3. Sync with backend when user dismisses notifications
```

**Required Backend Integration:**
```typescript
// In a new file: /src/actions/notification.ts
export async function getNotifications() {
  return withAuthRedirect(
    getClient()
      .get("notifications", { headers: await createAuthHeaders() })
      .json<API.GetNotifications.Http200.ResponseBody>()
  );
}

export async function dismissNotification(notificationId: string) {
  return withAuthRedirect(
    getClient()
      .post(`notifications/${notificationId}/dismiss`, { headers: await createAuthHeaders() })
      .json<API.DismissNotification.Http200.ResponseBody>()
  );
}
```

### 2. Project Store Enhancement

**File:** `/src/stores/project-store.ts`

**Current capabilities:**
- ✅ CRUD operations for projects
- ✅ SWR cache invalidation
- ✅ Project duplication
- ❌ Collaborator management (needs API)
- ❌ Deadline management (needs API)

**Required additions:**
```typescript
// Add to project store interface:
interface ProjectActions {
  // ... existing methods
  getCollaborators: (projectId: string) => Promise<void>;
  inviteCollaborator: (projectId: string, email: string, role: string) => Promise<void>;
  getProjectDeadlines: (projectId: string) => Promise<void>;
}
```

### 3. Avatar System Integration

**File:** `/src/components/ui/avatar.tsx`

**Current implementation:**
- ✅ Single avatar component with custom background colors
- ✅ AvatarGroup component for multiple team members
- ✅ Predefined color palette
- ❌ Real user data integration (currently uses hardcoded initials)

**Required integration:**
```typescript
// Update AvatarGroup to accept real user data:
interface AvatarUser {
  id: string;
  initials: string;
  fullName: string;
  backgroundColor?: string;
}

// Usage in project cards:
<AvatarGroup
  users={project.collaborators.map(collab => ({
    id: collab.id,
    initials: collab.initials,
    fullName: collab.full_name,
    backgroundColor: collab.avatar_color
  }))}
  size="md"
/>
```

### 4. Application Management Integration

**File:** `/src/components/projects/detail/project-detail-client.tsx`

**Current implementation:**
- ✅ Application cards with status badges
- ✅ Search and filter functionality
- ✅ Delete application with confirmation modal
- ✅ Empty state for no applications
- ❌ Real data from API (currently using mock data)
- ❌ Create new application functionality

**Required Backend Integration:**
```typescript
// In a new file: /src/actions/application.ts
export async function getProjectApplications(projectId: string) {
  return withAuthRedirect(
    getClient()
      .get(`projects/${projectId}/applications`, { headers: await createAuthHeaders() })
      .json<API.GetProjectApplications.Http200.ResponseBody>()
  );
}

export async function deleteApplication(applicationId: string) {
  return withAuthRedirect(
    getClient()
      .delete(`applications/${applicationId}`, { headers: await createAuthHeaders() })
      .json<API.DeleteApplication.Http200.ResponseBody>()
  );
}

export async function createApplication(projectId: string, data: API.CreateApplication.RequestBody) {
  return withAuthRedirect(
    getClient()
      .post(`projects/${projectId}/applications`, {
        headers: await createAuthHeaders(),
        json: data
      })
      .json<API.CreateApplication.Http200.ResponseBody>()
  );
}
```

**Application Status Flow:**
1. **working_draft** - Initial state, user is editing
2. **in_progress** - Application is being actively worked on
3. **generating** - AI is generating content (future feature)

## 🔄 Real-time Notifications

### WebSocket Integration

**Endpoint:** `wss://api.grantflow.ai/ws/notifications`

**Frontend Integration:** Extend existing WebSocket pattern from wizard

```typescript
// In notification store or new hook
export function useNotificationWebSocket() {
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE_URL}/notifications`);

    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      addNotification(notification);
    };

    return () => ws.close();
  }, []);
}
```

**Backend WebSocket Events:**
```typescript
// Events to send to frontend:
{
  "type": "notification.created",
  "data": { /* notification object */ }
}

{
  "type": "deadline.approaching",
  "data": { /* deadline notification */ }
}
```

## 🤖 Notification Generation Logic

### Automatic Deadline Notifications

**Implementation:** Background job/cron that runs daily

```python
# Pseudocode for notification generation
def generate_deadline_notifications():
    upcoming_deadlines = get_deadlines_in_range(days=[7, 3, 1])

    for deadline in upcoming_deadlines:
        # Check if notification already sent for this deadline + day combination
        if not notification_exists(deadline.id, deadline.days_remaining):
            create_notification(
                user_id=deadline.project.owner_id,
                project_id=deadline.project_id,
                type="deadline",
                title=f"{deadline.days_remaining} days until grant deadline",
                message=f"is due in {deadline.days_remaining} days. Make sure everything is ready for submission.",
                project_name=deadline.project.name
            )
```

### Event-Driven Notifications

**Triggers for automatic notifications:**
1. **Project deadline approaching** (7, 3, 1 days before)
2. **New collaborator invited** to project
3. **Grant application submitted** successfully
4. **Grant application status changed**
5. **System maintenance** notifications

## 🔥 Firebase Admin SDK Integration

### User Data Resolution

**Purpose:** Fetch Firebase user information on-demand for collaborators and application creators

**Implementation Pattern:**
```python
from firebase_admin import auth
import asyncio
from typing import Dict, List, Optional

class FirebaseUserService:
    def __init__(self):
        self._user_cache = {}  # In-memory cache with TTL
        self._cache_ttl = 900  # 15 minutes

    async def get_users_data(self, firebase_uids: List[str]) -> Dict[str, dict]:
        """
        Fetch user data from Firebase Admin SDK with caching

        Args:
            firebase_uids: List of Firebase UIDs to fetch

        Returns:
            Dict mapping UID to user data
        """
        # Check cache first
        cached_users = {}
        missing_uids = []

        for uid in firebase_uids:
            if uid in self._user_cache and not self._is_cache_expired(uid):
                cached_users[uid] = self._user_cache[uid]
            else:
                missing_uids.append(uid)

        # Fetch missing users from Firebase
        if missing_uids:
            try:
                # Firebase Admin SDK call
                user_records = auth.get_users(missing_uids)

                for user_record in user_records.users:
                    user_data = {
                        "firebase_uid": user_record.uid,
                        "email": user_record.email,
                        "email_verified": user_record.email_verified,
                        "display_name": user_record.display_name,
                        "photo_url": user_record.photo_url,
                        "disabled": user_record.disabled,
                        "provider_data": [
                            {
                                "provider_id": provider.provider_id,
                                "uid": provider.uid,
                                "display_name": provider.display_name,
                                "email": provider.email,
                                "photo_url": provider.photo_url,
                            }
                            for provider in user_record.provider_data
                        ],
                        "last_sign_in": user_record.user_metadata.last_sign_in_time.isoformat() if user_record.user_metadata.last_sign_in_time else None,
                        "created_at": user_record.user_metadata.creation_time.isoformat() if user_record.user_metadata.creation_time else None,
                    }

                    # Generate initials
                    user_data["initials"] = self._generate_initials(
                        user_record.display_name, user_record.email
                    )

                    # Cache the user data
                    self._user_cache[user_record.uid] = {
                        "data": user_data,
                        "cached_at": time.time()
                    }
                    cached_users[user_record.uid] = user_data

                # Handle not found users
                for uid in user_records.not_found:
                    cached_users[uid] = None

            except Exception as e:
                logger.error("Failed to fetch Firebase users", error=str(e), uids=missing_uids)
                # Return cached data only, set missing as None
                for uid in missing_uids:
                    if uid not in cached_users:
                        cached_users[uid] = None

        return cached_users

    def _generate_initials(self, display_name: Optional[str], email: Optional[str]) -> str:
        """Generate user initials from display name or email"""
        if display_name:
            parts = display_name.strip().split()
            if len(parts) >= 2:
                return f"{parts[0][0]}{parts[-1][0]}".upper()
            elif len(parts) == 1:
                return parts[0][:2].upper()

        if email:
            return email[:2].upper()

        return "??"

    def _is_cache_expired(self, uid: str) -> bool:
        """Check if cached user data is expired"""
        if uid not in self._user_cache:
            return True
        return time.time() - self._user_cache[uid]["cached_at"] > self._cache_ttl

# Usage in API endpoints
firebase_service = FirebaseUserService()

async def get_project_collaborators(project_id: str):
    # 1. Query project_collaborators table
    collaborators = await db.query(
        "SELECT user_id, role, joined_at, invited_by, status FROM project_collaborators WHERE project_id = ?",
        project_id
    )

    # 2. Extract Firebase UIDs
    firebase_uids = [collab.user_id for collab in collaborators]

    # 3. Fetch Firebase user data
    firebase_users = await firebase_service.get_users_data(firebase_uids)

    # 4. Merge data
    result = []
    for collab in collaborators:
        firebase_data = firebase_users.get(collab.user_id)
        if firebase_data:  # User exists in Firebase
            result.append({
                **firebase_data,
                "role": collab.role,
                "joined_project_at": collab.joined_at.isoformat(),
                "invited_by": collab.invited_by,
                "status": collab.status,
                "avatar_color": generate_avatar_color(collab.user_id)
            })

    return {"collaborators": result}
```

**Error Handling:**
- **Deleted Firebase users**: Return `null` or exclude from results
- **Firebase API failures**: Fall back to cached data or basic user info
- **Rate limiting**: Implement exponential backoff
- **Batch limits**: Firebase Admin SDK supports up to 100 users per batch

**Caching Strategy:**
- **In-memory cache**: 15-minute TTL for user data
- **Redis cache** (optional): For production with multiple server instances
- **Cache invalidation**: Manual refresh for critical updates

**Security Considerations:**
- **Service account**: Properly configured Firebase Admin SDK credentials
- **Data filtering**: Only return necessary user data to frontend
- **Access control**: Verify user has permission to see collaborator data

## 🔐 Soft Delete Implementation Details

### Backend Considerations

**Soft Delete Logic:**
1. When user initiates deletion:
   - Set `deletion_scheduled_at` to current time + grace period (7 days)
   - Generate unique restoration token
   - Send email with restoration link
   - Cancel any active subscriptions at period end
   - Notify user's collaborators about pending deletion

2. During grace period:
   - User can still log in but sees warning banner
   - All functionality remains available
   - Restoration link in email allows instant recovery
   - Automated reminders at 3 days and 1 day before deletion

3. After grace period expires:
   - Background job permanently deletes user data
   - Cascading deletes remove all associated data:
     - Projects (and all project data)
     - Applications
     - Notifications
     - Collaborations
     - Files and documents
   - Audit log entry created for compliance

**Security Considerations:**
- Restoration tokens should be cryptographically secure
- Tokens expire after grace period
- IP address and user agent logged for security audit
- Rate limiting on restoration attempts
- Email confirmation required for restoration

**Cascading Delete Complexity:**
Due to foreign key relationships, deletion order matters:
1. First mark user as deleted (soft delete)
2. Queue background job for permanent deletion
3. In background job, delete in order:
   - Application data
   - Project collaborations
   - Projects
   - User account
   - Audit trail preserved

## 📋 Implementation Checklist

### Backend API Development
- [ ] **Firebase Admin SDK Integration**
  - [ ] Set up Firebase Admin SDK with service account credentials
  - [ ] Implement FirebaseUserService with caching (15-min TTL)
  - [ ] Add batch user fetching with error handling
  - [ ] Implement initials generation from display name/email
  - [ ] Add Redis caching for production environments (optional)
- [ ] **Application Management with Search/Filter**
  - [ ] Implement search functionality (name, description)
  - [ ] Add status filtering (generating, in_progress, working_draft)
  - [ ] Implement sorting (name, created_at, updated_at, deadline)
  - [ ] Add pagination support (limit, offset)
  - [ ] Add creator filtering (created_by user ID)
  - [ ] Include Firebase user data resolution for created_by fields
  - [ ] Add database indexes for search performance
- [ ] **Enhanced Collaborators API**
  - [ ] Integrate Firebase Admin SDK for real user data
  - [ ] Merge project role data with Firebase user info
  - [ ] Handle deleted/disabled Firebase users gracefully
  - [ ] Add avatar color generation and persistence
- [ ] **User Account Management**
  - [ ] Implement user account soft delete endpoints (DELETE /user/account, POST /user/account/restore, GET /user/account/status)
  - [ ] Create background job for permanent deletion after grace period
  - [ ] Implement email notifications for deletion and restoration
  - [ ] Add restoration token generation and validation
  - [ ] Handle cascading deletes with proper ordering
- [ ] **Core Features**
  - [ ] Create notification endpoints (GET, POST dismiss, POST read)
  - [ ] Add deadline management endpoints
  - [ ] Set up WebSocket notification broadcasting
  - [ ] Create background job for deadline notifications
  - [ ] Add notification cleanup job (remove old/expired notifications)
  - [ ] Add application status transition logic

### Database Setup
- [ ] **Search & Filter Optimization**
  - [ ] Add full-text search indexes on grant_applications (name, description)
  - [ ] Add composite index on (project_id, status, updated_at) for filtered queries
  - [ ] Add index on (created_by, created_at) for user filtering
  - [ ] Add index on (deadline) for deadline sorting
  - [ ] Consider PostgreSQL GIN indexes for advanced text search
- [ ] **Core Tables**
  - [ ] Add soft delete columns to users table
  - [ ] Create account_restoration_tokens table
  - [ ] Add indexes for soft delete queries
  - [ ] Create notifications table with indexes
  - [ ] Create project_collaborators table (if not exists)
  - [ ] Create project_deadlines table
  - [ ] Update grant_applications table with status column
  - [ ] Add indexes for application queries
- [ ] **Data Integrity**
  - [ ] Add migration scripts
  - [ ] Set up database triggers for automatic notifications
  - [ ] Add constraints for valid status values
  - [ ] Add foreign key constraints with proper cascading

### Frontend Integration
- [ ] Complete user account API actions (/src/actions/user.ts) - partially done
- [ ] Add account status check on login
- [ ] Implement warning banner for accounts pending deletion
- [ ] Add restoration page for email links
- [ ] Create notification API actions (/src/actions/notification.ts)
- [ ] Create application API actions (/src/actions/application.ts)
- [ ] Integrate real notification loading on app start
- [ ] Connect dismiss notification to backend API
- [ ] Update AvatarGroup to use real collaborator data
- [ ] Add collaborator invitation flow
- [ ] Connect project detail page to real application data
- [ ] Implement create new application flow
- [ ] Set up WebSocket connection for real-time notifications

### Testing & Polish
- [ ] Test notification creation and dismissal
- [ ] Test real-time notification delivery
- [ ] Test collaborator avatar display
- [ ] Test application CRUD operations
- [ ] Test application search and filtering
- [ ] Add loading states for notification actions
- [ ] Add loading states for application operations
- [ ] Add error handling for notification failures
- [ ] Add error handling for application operations
- [ ] Performance testing with many notifications
- [ ] Performance testing with many applications

## 🎯 Success Metrics

**Functionality:**
- Users receive deadline notifications 7, 3, and 1 days before due dates
- Notifications can be dismissed and persist across sessions
- Real collaborator avatars display in project cards and headers
- Real-time notifications appear without page refresh
- Applications can be created, viewed, searched, and deleted
- Application status badges clearly indicate current state
- Project sidebar shows all applications with status indicators

**Performance:**
- Notification queries execute in < 100ms
- Application list queries execute in < 200ms
- WebSocket connections remain stable
- Notification dismissal provides immediate UI feedback
- Application deletion is instant with optimistic updates
- No memory leaks from notification subscriptions

**User Experience:**
- Notifications provide clear, actionable information
- Users can manage notification preferences (future enhancement)
- Collaborator management is intuitive and immediate
- Application management feels seamless and responsive
- Delete confirmation prevents accidental data loss
- Empty states guide users to create first application
- System feels responsive and professional

---

**Note:** This implementation should follow the existing patterns established in the codebase:
- Use `withAuthRedirect` for API calls
- Follow Zustand store patterns for state management
- Use SWR for data fetching with proper cache invalidation
- Maintain TypeScript strict typing throughout
- Follow the established error handling and logging patterns