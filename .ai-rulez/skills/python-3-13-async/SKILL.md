---
priority: medium
---

# Python 3.13 Modern & Async Standards

**Python 3.13 · Async-first · msgspec · Full type safety · 95%+ coverage**

- Target Python 3.13; use match/case, union types (X | Y), structural pattern matching
- msgspec ONLY (NEVER pydantic): msgspec.Struct, msgspec.field, TypedDict with NotRequired
- Never use Optional[T] → use T | None; never use Any type
- Full type hints: ParamSpec, TypeVar, Generic[T], Protocol for structural typing
- Enable mypy --strict --warn-unreachable --disallow-any-expr
- Fully async: anyio.Path (not pathlib), httpx AsyncClient, asyncpg, asyncio.gather
- Walrus operator := in comprehensions; match/case for conditionals
- contextlib.suppress for intentional exception suppression
- O(1) optimization: dict/set lookups over if/elif chains
- Function-based tests ONLY (*_test.py); pytest fixtures, 95% coverage, real PostgreSQL
- Never: class tests, pydantic, sync I/O in async, Any type
