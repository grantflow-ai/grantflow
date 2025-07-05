# Backend Update Tasks

**Date:** 2025-06-27
**Status:** Frontend Complete - Backend APIs Required
**Priority:** Based on frontend implementation status and business impact

## Overview

This document outlines the backend API development tasks required to support the completed frontend features. The backend audit reveals a solid foundation for grant application management with comprehensive RAG integration, but missing key member management, user account, billing, and notification features.

## 🔥 **CRITICAL PRIORITY - Frontend Complete & Waiting**

## 🚀 **HIGH PRIORITY - Core Features**

### ✅ Task 1: Enhanced Application Management with Search

**Status:** ✅ COMPLETED
**Impact:** High - Core user workflow
**Effort:** Medium

#### **Completed Features:**
✅ Basic CRUD operations implemented
✅ Search and filtering on title and description
✅ Pagination with offset/limit
✅ Status filtering
✅ Sorting by title, created_at, updated_at
✅ Database indexes for performance optimization

#### **Implementation Details:**

**GET /projects/{project_id}/applications - Enhanced**
- Full-text search using PostgreSQL ILIKE
- Query parameters for search, status, sort, order, limit, offset
- Comprehensive test coverage (7 new tests)
- TypeScript types generated for frontend

**Database Optimizations:**
```sql
-- PostgreSQL pg_trgm extension enabled
-- GIN indexes for full-text search on titles
-- Composite indexes for filtering and sorting
CREATE INDEX idx_grant_applications_title_fts ON grant_applications USING gin(to_tsvector('english', title));
CREATE INDEX idx_grant_applications_title_trgm ON grant_applications USING gin(title gin_trgm_ops);
CREATE INDEX idx_grant_applications_filtering ON grant_applications (project_id, status, updated_at DESC);
```

#### **Frontend Integration:**
✅ Real-time search as user types (SWR integration)
✅ Status filtering dropdowns
✅ Pagination controls
✅ Loading states and error handling

---

### Task 2: Notification System

**Status:** Missing core functionality
**Impact:** High - User engagement and deadlines
**Effort:** Large

#### **Database Schema:**
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
    metadata JSONB DEFAULT '{}' -- Future extensibility
);

-- Performance indexes
CREATE INDEX idx_notifications_user_active
ON notifications(user_id) WHERE dismissed = FALSE;
```

#### **Required Endpoints:**

**GET /notifications**
- List user's active notifications
- Frontend: NotificationContainer component

**POST /notifications/{id}/dismiss**
- Mark notification as dismissed
- Frontend: Close button on notifications

**POST /notifications/{id}/read**
- Mark as read (future enhancement)
- Frontend: Read/unread state management

#### **Notification Generation:**
- Background job for deadline notifications (7, 3, 1 days)
- Event-driven notifications (new collaborator, status changes)
- WebSocket broadcasting for real-time delivery

---

## 📊 **MEDIUM PRIORITY - Business Features**

### Task 3: User Account Management

**Status:** Basic auth only, missing profile management
**Impact:** Medium - User experience and compliance
**Effort:** Medium

#### **Required Endpoints:**

**GET /user/profile**
- Get user profile information
- Merge Firebase data with app preferences

**PATCH /user/profile**
- Update user preferences and settings
- Frontend: Account settings page

**DELETE /user/account**
- Soft delete with 7-day grace period
- Frontend: Delete account modal (already implemented)
- Auto-restore on login during grace period

**GET /user/account/status**
- Check deletion status on login
- Frontend: Warning banner display

#### **Database Changes:**
```sql
-- Soft delete columns
ALTER TABLE users
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deletion_scheduled_at TIMESTAMP WITH TIME ZONE;
-- Note: No restoration tokens needed - auto-restore on login
```

---

### Task 4: Billing & Subscription Management (Stripe)

**Status:** Not implemented
**Impact:** High - Revenue generation
**Effort:** Large

#### **Required Endpoints:**

**Subscription Management:**
- `GET /billing/subscription` - Current subscription status
- `GET /billing/plans` - Available plans
- `POST /billing/create-checkout-session` - Upgrade flow
- `POST /billing/create-portal-session` - Manage subscription
- `DELETE /billing/subscription` - Cancel subscription

**Payment History:**
- `GET /billing/invoices` - Billing history
- `POST /billing/update-payment-method` - Update payment info

**Webhooks:**
- `POST /billing/webhooks/stripe` - Handle Stripe events

#### **Database Schema:**
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    status VARCHAR(20) NOT NULL,
    plan_id VARCHAR(255) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE subscription_plans (
    id VARCHAR(255) PRIMARY KEY, -- Stripe plan ID
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    interval VARCHAR(20) NOT NULL, -- month, year
    features JSONB DEFAULT '[]',
    limits JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE
);
```

---

## 🔧 **LOW PRIORITY - Infrastructure & Polish**

### Task 5: API Consistency & Documentation

**Status:** Good foundation, needs standardization
**Impact:** Medium - Developer experience
**Effort:** Medium

#### **Improvements Needed:**

**OpenAPI Documentation**
- Auto-generated API docs
- Request/response examples
- Authentication documentation

**API Versioning**
- Version strategy (header vs URL)
- Backward compatibility plan
- Deprecation notices

**Response Standardization**
- Consistent error formats
- Standardized success responses
- Metadata inclusion (pagination, timestamps)

**Rate Limiting**
- Per-user rate limits
- Endpoint-specific limits
- Graceful degradation

---

### Task 6: Enhanced Security & Compliance

**Status:** Basic security implemented
**Impact:** Medium - Trust and compliance
**Effort:** Medium

#### **Security Enhancements:**

**Audit Logging**
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**GDPR Compliance**
- Data export endpoints
- Data deletion confirmation
- Privacy policy acceptance tracking
- Cookie consent management

**Enhanced Authentication**
- Session management
- Multi-factor authentication support
- Login attempt monitoring
- Suspicious activity detection

---

### Task 7: Advanced Collaboration Features

**Status:** Not implemented
**Impact:** Low - Nice to have
**Effort:** Large

#### **Future Features:**

**Real-time Collaboration**
- Collaborative editing
- Live cursors and selections
- Conflict resolution
- Auto-save functionality

**Activity Feeds**
- Project activity timeline
- User action history
- Notification preferences
- Email digest options

**Commenting System**
- Section-level comments
- Comment threads
- @mentions and notifications
- Comment resolution workflow

---

## 📋 **Implementation Schedule**

### **Phase 1: Critical (Week 1-2)**
✅ **Completed** - Project Members Management APIs and Firebase Integration

### **Phase 2: Core Features (Week 3-4)**
✅ **Task 1: Enhanced Application Management with Search** - COMPLETED
2. **Task 2: Notification System** - IN PROGRESS

### **Phase 3: Business Features (Week 5-8)**
3. **Task 3: User Account Management**
4. **Task 4: Billing & Subscription Management**

### **Phase 4: Polish & Infrastructure (Week 9-12)**
5. **Task 5: API Consistency & Documentation**
6. **Task 6: Enhanced Security & Compliance**
7. **Task 7: Advanced Collaboration Features**

---

## 🎯 **Success Metrics**

### **Technical Metrics:**
- API response times < 200ms for 95th percentile
- Zero frontend breaking changes during implementation
- 100% test coverage for new endpoints
- Database query performance optimization (< 100ms)

### **User Experience Metrics:**
- Members management fully functional
- Real-time notifications working
- Search results returned in < 500ms
- Account management workflow complete

### **Business Metrics:**
- Billing integration functional
- User retention through member collaboration
- Support ticket reduction through self-service features
- Revenue generation through subscription management

---

## 📝 **Notes**

**Database Considerations:**
- All UUIDs should use `gen_random_uuid()` for security
- Proper indexing strategy for query performance
- Foreign key constraints with appropriate cascading
- Migration scripts for all schema changes

**Authentication:**
- Maintain Firebase JWT integration
- Role-based permissions on all new endpoints
- Consistent error responses for authorization failures
- Request correlation IDs for debugging

**Caching Strategy:**
- Redis for Firebase user data (15-min TTL)
- Database query result caching where appropriate
- CDN for static assets and uploaded files
- Cache invalidation on data updates

**Error Handling:**
- Structured error responses with error codes
- Detailed logging for debugging
- Graceful degradation for external service failures
- Rate limiting with proper error messages