---
priority: medium
---

# PostgreSQL & SQLAlchemy 2.0 Standards

**PostgreSQL 17 · SQLAlchemy 2.0 · Async-first · pgvector · Full ACID**

- Always use async context managers: `async with session_maker() as session, session.begin():`
- Never reuse sessions across requests or API boundaries
- Use select_active() from packages.db.src.query_helpers for soft-delete filtering
- All soft-delete queries: `select_active()` pattern, never query `deleted_at IS NULL`
- pgvector for embeddings: 384 dimensions, HNSW index, vector_cosine_similarity_ops
- Type safety: SQLAlchemy models with full annotations, match Python types exactly
- Transactions: explicit boundaries, proper error handling with rollback
- Migrations: use Alembic, version controlled, reversible
- Never: reuse sessions, manual transaction management without context managers
