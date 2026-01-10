---
priority: medium
---

# Service Communication & Pub/Sub

**Google Cloud Pub/Sub · Async messaging · Duplicate handling · Topics**

- Topics: file-indexing, url-crawling, rag-processing, frontend-notifications, autofill-requests
- Handle duplicates: `ON CONFLICT DO NOTHING` in all database operations
- Idempotent message handling: design all subscribers for at-least-once delivery
- Messages: JSON with correlation IDs, organization_id for tracing
- Never: blocking operations in subscribers, tight coupling between services
- Pub/Sub subscriptions: DLQ with retry policies, monitoring alerts
