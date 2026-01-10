---
priority: medium
---

# Testing Strategy (95%+ Coverage)

**Real PostgreSQL · Function-based tests · 95%+ coverage · Three-tier approach**

- Test files: *_test.py (function-based, never class-based)
- Real PostgreSQL: async_sessionmaker fixture, isolated databases per test worker
- Test data: TypedDict constructors, factories from testing/factories.py
- Integration tests: @pytest.mark.integration, full environment setup
- E2E tests: @pytest.mark.e2e_full with markers (smoke/quality_assessment)
- Always: PYTHONPATH=. uv run pytest (for import resolution)
- Mock only external APIs; use real PostgreSQL, real Pub/Sub emulator
- Coverage: 95%+ for services, 80%+ for packages
- Avoid: redundant/duplicate tests, mocking internal services
