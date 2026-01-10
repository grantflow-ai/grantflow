---
priority: critical
---

# Testing Philosophy

Three-tier testing (unit 80-95%, integration real DB, E2E smoke/full). Real PostgreSQL for backend tests, never mocks. Test naming - test_<function>_<scenario>_<outcome>. Coverage 95% services, 80% packages. Fixtures with JSON/YAML schemas, parametrized tests.
