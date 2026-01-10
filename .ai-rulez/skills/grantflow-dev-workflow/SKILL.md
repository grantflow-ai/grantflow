---
priority: medium
---

# Development Workflow

## Quick Start
```bash
task setup        # Install all dependencies and git hooks
task dev          # Start all services (docker compose)
task test         # Run all tests (parallel)
task lint         # Run prek (all linters)
```

## Daily Development
```bash
# Tests
task test                    # Run all tests
PYTHONPATH=. uv run pytest services/backend/tests/
cd frontend && pnpm test

# Linting & Formatting
task lint                    # Run prek (linting + formatting)
task format                  # Format frontend

# Database
task db:migrate              # Apply migrations
task db:create-migration -- <name>
task db:reset                # WARNING: destroys local data
task db:proxy:start          # Connect to Cloud SQL

# Service Development
task frontend:dev            # Next.js dev server (port 3000)
task service:backend:dev     # Backend API (port 8000)
```

## Service URLs (docker compose)
- Backend API: http://localhost:8000
- Swagger Docs: http://localhost:8000/schema/swagger
- Indexer: http://localhost:8001
- Crawler: http://localhost:8002
- RAG: http://localhost:8003
- CRDT Server: ws://localhost:8090
- Pub/Sub Emulator: http://localhost:8085
- GCS Emulator: http://localhost:4443

## Git Workflow
- Feature branches from `development`
- `development` → auto-deploys to staging
- `main` → auto-deploys to production
