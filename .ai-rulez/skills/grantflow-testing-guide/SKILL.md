---
priority: medium
---

# Testing Strategy Guide

## Test Commands
```bash
# All tests (parallel by default)
task test

# Specific services (Python)
PYTHONPATH=. uv run pytest services/backend/tests/
PYTHONPATH=. uv run pytest services/indexer/tests/
PYTHONPATH=. uv run pytest services/rag/tests/
PYTHONPATH=. uv run pytest services/crawler/tests/
PYTHONPATH=. uv run pytest services/scraper/tests/

# Frontend
cd frontend && pnpm test

# E2E Tests
E2E_TESTS=1 pytest -m "smoke"              # <1 min
E2E_TESTS=1 pytest -m "quality_assessment" # 2-5 min
E2E_TESTS=1 pytest -m "e2e_full"          # 10+ min

# Debug mode (no parallel)
pytest -n 0
```

## Test Structure
- Python: `*_test.py` (function-based, real PostgreSQL)
- TypeScript: `*.spec.ts(x)` (Vitest + React Testing Library)
- E2E: Playwright tests with data-testid attributes

## Test Data
- Python: `testing/factories.py` for test data
- TypeScript: `frontend/testing/factories.ts`
- Scenarios: `testing/test_data/scenarios/` with metadata.yaml
