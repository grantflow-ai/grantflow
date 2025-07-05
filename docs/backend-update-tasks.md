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

### ✅ Task 2: Notification System

**Status:** ✅ COMPLETED
**Impact:** High - User engagement and deadlines
**Effort:** Large

#### **Completed Features:**
✅ Database schema with notifications table and optimized indexes
✅ Notification types: deadline, info, warning, success
✅ Firebase UID association with optional project linking
✅ Read/dismissed status with expiration support
✅ Extra metadata field for extensible data

#### **Implemented Endpoints:**

**GET /notifications** - ✅ COMPLETED
- Lists user's active notifications with filtering
- Supports include_read parameter
- Automatic expiration filtering
- Structured response with metadata

**POST /notifications/{id}/dismiss** - ✅ COMPLETED
- Marks notifications as dismissed
- User ownership validation
- Idempotent operation
- Success confirmation response

#### **Implementation Details:**
- **Database Migration**: Alembic migration 9dbbdab85cde with proper indexes
- **Authentication**: Integrated with existing Firebase JWT system
- **Performance**: Optimized queries with user-specific indexes
- **Testing**: 10 comprehensive test cases covering all scenarios
- **Security**: User isolation and ownership validation

---

## 📊 **MEDIUM PRIORITY - Business Features**

### ✅ Task 3: User Account Management

**Status:** ✅ COMPLETED
**Impact:** Medium - User experience and compliance
**Effort:** Medium

#### **Completed Features:**
✅ Users table with soft delete support (deleted_at, deletion_scheduled_at)
✅ User profile fields (email, display_name, photo_url, preferences)
✅ Foreign key constraint from project_users to users table
✅ Data migration for existing project_users

#### **Implemented Endpoints:**

**GET /user/profile** - ✅ COMPLETED
- Get user profile information with Firebase UID authentication
- Returns profile data, preferences, and deletion status
- Conditional fields based on available data

**PATCH /user/profile** - ✅ COMPLETED
- Update user preferences and settings
- Partial updates supported (display_name, preferences)
- Proper validation and error handling

**DELETE /user/account** - ✅ COMPLETED
- Soft delete with 7-day grace period
- Schedules deletion without immediate data loss
- Returns grace period information

**GET /user/account/status** - ✅ COMPLETED
- Check account deletion status
- Returns active, deleted, or scheduled status
- Calculates days remaining in grace period

#### **Implementation Details:**
- **Database Migration**: Alembic migration 595833849cdd with users table and constraints
- **Authentication**: Integrated with existing Firebase JWT system
- **Testing**: 16 comprehensive test cases covering all scenarios
- **Code Quality**: All linters passing, proper TypeScript types

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

### Task 5: Advanced Collaboration Features

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
✅ **Task 2: Notification System** - COMPLETED

### **Phase 3: Business Features (Week 5-8)**
✅ **Task 3: User Account Management** - COMPLETED
4. **Task 4: Billing & Subscription Management**

### **Phase 4: Polish & Infrastructure (Week 9-12)**
5. **Task 5: Advanced Collaboration Features**

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