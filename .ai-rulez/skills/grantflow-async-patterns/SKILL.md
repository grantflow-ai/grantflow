---
priority: medium
---

# Async Patterns & Concurrency

**Fully async · asyncio.gather · No blocking I/O · Concurrency=1 staging**

- All I/O: async (httpx, asyncpg, anyio, asyncio)
- Never: sync requests, blocking operations, time.sleep (use asyncio.sleep)
- Concurrency: Cloud Run with concurrency=1 in staging for debugging
- Job management: JobManager with check_if_cancelled, handle_cancellation mocks
- Batch operations: asyncio.gather for parallel tasks
- Timeouts: explicit asyncio.timeout() for all external calls
