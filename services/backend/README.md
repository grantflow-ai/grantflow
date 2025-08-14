# Backend Service

Main REST API server for the GrantFlow.AI platform, built with Litestar async framework.

## Overview

The backend service is the central API gateway that handles:
- User authentication and authorization (Firebase JWT)
- Organization and project management
- Grant application lifecycle
- Document source management
- Real-time WebSocket notifications
- Integration with all microservices via Pub/Sub

## Tech Stack

- **Framework**: Litestar (async Python web framework)
- **Database**: PostgreSQL 17 with pgvector extension
- **ORM**: SQLAlchemy 2.0 (async)
- **Authentication**: Firebase Auth with JWT validation
- **Serialization**: msgspec for high-performance JSON handling
- **Logging**: structlog for structured logging
- **Testing**: pytest with real PostgreSQL instances

## Architecture

### Key Components

- **API Routes**: RESTful endpoints organized by domain
- **Middleware**: Authentication, CORS, request ID tracking
- **WebSocket**: Real-time notifications for long-running operations
- **Multi-tenancy**: Organization-based data isolation
- **Role-based Access**: OWNER, ADMIN, COLLABORATOR permissions

### Database Models

- Organizations, Projects, Grant Applications
- Grant Templates, RAG Sources, Notifications
- User memberships and invitations
- Audit trails and activity logs

## API Endpoints

Key endpoint groups:
- `/health` - Health checks and readiness probes
- `/auth` - Authentication and user management
- `/organizations` - Organization CRUD and management
- `/projects` - Project operations within organizations
- `/applications` - Grant application lifecycle
- `/sources` - Document and URL source management
- `/templates` - Grant template generation
- `/notifications` - WebSocket and notification endpoints

## Development

```bash
# Run locally
task service:backend:dev

# Run tests
PYTHONPATH=. uv run pytest services/backend/tests/

# Type checking
PYTHONPATH=. uv run mypy services/backend/

# Linting
PYTHONPATH=. uv run ruff check services/backend/
```

## Environment Variables

See root `.env.example` for required configuration:
- `DB_CONNECTION_STRING` - PostgreSQL connection
- `FIREBASE_SERVICE_ACCOUNT_CREDENTIALS` - Firebase admin SDK
- `GCP_PROJECT_ID` - Google Cloud project
- `JWT_SECRET` - JWT signing secret
- Various service URLs and API keys

## Testing

Tests use real PostgreSQL with isolated databases per test worker.
Run with `PYTHONPATH=.` to ensure proper module resolution.

## Deployment

Deployed to Cloud Run via GitHub Actions:
- Staging: Automatic from `development` branch
- Production: Automatic from `main` branch