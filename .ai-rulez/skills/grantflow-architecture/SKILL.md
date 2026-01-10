---
priority: medium
---

# Microservices Architecture

## Services Overview

**Backend API** (`services/backend`)
- Framework: Litestar async with msgspec serialization
- Auth: Firebase JWT with organization claims
- Pattern: `/organizations/{id}/projects/{id}/applications/{id}`
- WebSockets: `/api/socket/grant-applications` (real-time notifications)
- Webhooks: email notifications, grant matching, entity cleanup

**Document Indexing** (`services/indexer`)
- Pipeline: PDF/DOC/HTML → kreuzberg extraction → chunks → embeddings
- Entity/keyword extraction with scientific configuration
- Token optimization: 35% reduction through intelligent chunking
- Embeddings: stored in pgvector (384 dims, HNSW index)
- Trigger: Pub/Sub file-indexing topic

**Web Crawler** (`services/crawler`)
- Technology: Playwright for JavaScript-heavy sites
- Strategy: recursive link extraction (max depth 2)
- Conversion: HTML → markdown (trafilatura)
- Deduplication: RagUrl table with URL tracking
- Rate limiting: respect robots.txt, add delays

**RAG Service** (`services/rag`)
- Multi-stage pipelines: 3 stages for grant applications
- Pipeline stages: BLUEPRINT_PREP → WORKPLAN_GENERATION → SECTION_SYNTHESIS
- LLMs: Gemini Flash 2.5 (primary), Claude Sonnet (specialized)
- Enrichment: Wikidata SPARQL for scientific context
- Evaluation: AI-based quality assessment with rubrics

**Grant Scraper** (`services/scraper`)
- Sources: NIH Reporter, grants.gov
- Technology: Playwright for page downloads
- Extraction: eligibility, funding amounts, deadlines
- Notifications: Discord webhooks

**Real-time Collaboration**
- CRDT Server (`crdt/`): Hocuspocus WebSocket with Y.js
- Editor (`editor/`): TipTap collaborative package
- Conflict resolution: CRDT for concurrent edits

**Message Flow**
```
User Upload → GCS → Pub/Sub (file-indexing)
              ↓
  Indexer: Extract → Chunk → Embed → PostgreSQL/pgvector
              ↓
  RAG: Process (rag-processing topic) → frontend-notifications
```
