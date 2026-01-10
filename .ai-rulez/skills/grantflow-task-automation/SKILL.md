---
priority: medium
---

# Task Automation (Taskfile.yaml)

**Taskfile.yaml only · No raw commands · task --list for discovery**

- Core workflow: `task setup dev test lint format build`
- Always use task commands: `task lint`, `task test`, `task db:migrate`
- Never run raw pip/pnpm/pytest commands in production or CI
- Pre-commit: task lint validates all changes
- E2E tests: task test:e2e with E2E_TESTS=1 env var
- Database: task db:up, task db:migrate, task db:reset (data loss warning)
- Check available: `task --list` for discovery
