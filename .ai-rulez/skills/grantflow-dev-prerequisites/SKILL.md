---
priority: medium
---

# Local Development Prerequisites

- Node.js 22+
- Python 3.13
- Docker and Docker Compose
- PostgreSQL 17 with pgvector extension
- uv for Python package management
- pnpm ≥10.17 for frontend (corepack)
- Task for command automation

## Initial Setup
```bash
task setup           # Install deps + git hooks
cp .env.example .env # Copy config (add secrets)
task db:up           # Start PostgreSQL
task db:migrate      # Apply migrations
task db:seed         # Seed database
task dev             # Start all services
```

## Common Issues
- PostgreSQL: isolated DB per test (`grantflow_test_{worker}_{pid}`)
- Cloud SQL: use TCP (127.0.0.1:5432) not Unix socket
- Frontend Docker: requires --build-arg for env vars
