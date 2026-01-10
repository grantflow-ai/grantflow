---
priority: medium
---

# API Design & Soft Deletes

**REST endpoints · Soft-delete pattern · Organization isolation · Type-safe responses**

- Use @post/@get decorators with allowed_roles parameter
- Soft-delete pattern: all queries use select_active() helper
- Never query `deleted_at IS NULL` directly or omit select_active()
- Tables with deleted_at field MUST use soft-delete pattern
- All responses use msgspec models (never dict or Any)
- Async session management with explicit transaction boundaries
- Error handling: custom BackendError hierarchy, structured error responses
