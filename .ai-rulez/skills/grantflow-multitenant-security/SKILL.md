---
priority: medium
---

# Multi-tenant Security & Authorization

**Organization-based isolation · Role-based access control · Firebase JWT**

- All endpoints include organization_id in URL path: `/organizations/{id}/...`
- Use @allowed_roles decorator from services.backend.src.auth (never check manually)
- Firebase JWT claims MUST include organization_id and role
- UserRoleEnum: OWNER, ADMIN, COLLABORATOR
- Pattern: `@post('/path', allowed_roles=[UserRoleEnum.COLLABORATOR])`
- Frontend: wrap all API calls with withAuthRedirect() wrapper
- Never: manual auth checks, auth bypasses, role assumptions
