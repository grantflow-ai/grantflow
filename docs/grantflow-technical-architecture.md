# GrantFlow Technical Architecture & Innovation Portfolio

## Executive Summary

GrantFlow is a production-grade, event-driven grant management platform built on a microservices architecture with sophisticated AI-powered document processing and content generation. The system's core innovation lies in its multi-stage RAG (Retrieval-Augmented Generation) pipeline with token-optimized schemas, multi-dimensional quality evaluation, and scientific context enrichment.

## System Architecture

### Core Services (Microservices on Cloud Run)

**1. Backend API (Litestar ASGI)**
- Multi-tenant REST API with Firebase JWT authentication
- Organization-scoped access control (URL-based + middleware + database)
- WebSocket endpoint at `/api/socket/grant-applications` for real-time RAG progress
- Event orchestration via 5 Pub/Sub topics
- 14 API route modules covering full grant lifecycle

**2. Indexer Service (Document Processing)**
- 4-stage pipeline: Kreuzberg text extraction → entity/keyword extraction → embedding generation → database storage
- Dual-model NER: Kreuzberg (domain-optimized) + spaCy (general)
- ~35% token reduction via academic stopword filtering (logged estimate)
- 384-dimensional embeddings (sentence-transformers/all-MiniLM-L12-v2)
- Typical performance: 6-15 seconds per document end-to-end

**3. Crawler Service (Web Scraping)**
- Recursive depth-limited crawling with similarity-based link filtering
- HTML-to-Markdown conversion via Trafilatura
- Playwright-based document downloads (supports PDF, DOCX, XLSX, PPTX, TXT, MD, RTF)
- URL deduplication and status tracking in PostgreSQL
- Configurable crawl depth via `MAX_DEPTH` environment variable (default: 0 for single page)
- Timeout: 15 seconds per page

**4. RAG Service (Content Generation) - Core IP**
- Multi-stage pipeline architecture with checkpoint-based resumption (3 stages, 3 sub-stages in stage 1)
- Token-optimized JSON schemas via short property names with conversion layer to database format
- Wikidata-enhanced scientific term enrichment via SPARQL queries
- Multi-dimensional quality evaluation (5 parallel metrics with weighted scoring)
- Hybrid vector + metadata retrieval ranking (70% semantic, 30% metadata)
- Batch processing (4 components concurrently) with shared context retrieval
- Supports Gemini 2.5 Flash (1M context, primary) and Claude 3.5 Sonnet (fallback)

**5. Scraper Service (Grant Discovery)**
- NIH Reporter and grants.gov API integration
- Playwright-based page downloads with 30s timeout
- Eligibility and funding amount extraction
- Discord notifications for discovered opportunities

### Infrastructure & Data

**Database: PostgreSQL 17 + pgvector**
- Multi-tenant hierarchy: Organization → Project → GrantApplication
- Soft-delete pattern via `deleted_at` timestamp (query helper: `select_active()`)
- Vector storage: 384-dim HNSW index (m=48, ef_construction=256) on `TextVector` table
- CRDT state persistence in `EditorDocument` table with binary Y.js state
- Polymorphic source pattern: `RagSource` → `RagFile` / `RagUrl` subclasses
- Optimistic locking via status transitions for concurrency control

**Event-Driven Communication**
- 5 Pub/Sub topics:
  - `file-indexing`: GCS uploads → Indexer service
  - `url-crawling`: Backend → Crawler service
  - `rag-processing`: Backend → RAG service (templates & applications)
  - `frontend-notifications`: Services → Backend WebSocket → Frontend
  - `email-notifications`: Backend → Email service
- Automatic OpenTelemetry trace context propagation (X-Trace-ID header)
- Duplicate handling via `ON CONFLICT DO NOTHING` in database operations
- Stale job detection and recovery (10-minute timeout)
- Dead Letter Queue (DLQ) configuration for failed messages

**Real-time Collaboration**
- Hocuspocus CRDT server (Y.js-based)
- Binary state persistence in PostgreSQL
- Conflict-free multi-user editing

**Frontend**
- Next.js 15 / React 19 with TypeScript
- Firebase Auth with `withAuthRedirect()` wrapper
- Zustand state management + React Query for data fetching
- TipTap collaborative editor with Y.js bindings

## Core Technical Innovations & Intellectual Property

### 1. Token-Optimized JSON Schema Design
**Problem**: Large JSON schemas consume significant tokens in LLM context windows.
**Solution**: Systematic property name reduction with automatic conversion at database boundary.
- Example property mappings: `section_name` → `name`, `quote_from_source` → `quote`, `is_detailed_research_plan` → `is_plan`
- Conversion layer maintains database schema integrity while optimizing LLM consumption
- Follows Gemini best practices: short property names, minimal nesting (max 2 levels), reduced required fields (2-6 per object)
- Pipeline schemas optimized for token efficiency, converted to full database schemas on persistence

### 2. Multi-Dimensional Quality Evaluation Pipeline
**Problem**: Grant quality assessment requires multiple complementary metrics.
**Solution**: 5 parallel evaluation dimensions with weighted scoring:
- Structural (15%): Word count, paragraph distribution, academic formatting
- Source Grounding (25%): ROUGE scores (ROUGE-L, ROUGE-2, ROUGE-3), keyword coverage, citation density
- Scientific Quality (30%): Term density, methodology language, technical precision, evidence-based claims ratio
- Coherence (20%): Local/global coherence, lexical diversity, argument flow, paragraph unity
- Scientific Analysis (10%): Domain similarity, innovation indicators, concept sophistication

**Adaptive Thresholds**: Content-type based standards
- Research plans: ≥0.80 scientific quality
- Clinical trials: ≥0.70 scientific quality
- General scientific: ≥0.65 scientific quality

**Decision Logic**:
- Accept: overall_score ≥ 85 (confidence 0.75-0.99)
- LLM Review: 65 ≤ overall_score < 85 (confidence 0.40-0.70)
- Reject: overall_score < 65 (confidence 0.20-0.30)

### 3. Wikidata-Enhanced Scientific Context Enrichment
**Problem**: Grant applications need authoritative scientific context and terminology.
**Solution**: Automated SPARQL queries to Wikidata for term enrichment:
- Extracts 5 core scientific terms per objective (enforced via JSON schema: exactly 5 required)
- Batch processing (4 terms per request) with exponential backoff retry logic (3 attempts)
- 30-second timeout per SPARQL request
- Formats as structured context using `SCIENTIFIC_CONTEXT_TEMPLATE`
- Integrated in BLUEPRINT_PREP stage as `enrich_terminology` sub-stage
- Validation ensures context contains scientific keywords and meets quality standards

### 4. Hybrid Vector + Metadata Retrieval Ranking
**Problem**: Pure semantic search misses documents with relevant keywords/entities but different phrasing.
**Solution**: Combined scoring system:
```
final_score = 0.7 × cosine_similarity + 0.3 × metadata_score
metadata_score = 0.4 × keyword_overlap + 0.3 × entity_overlap + 0.3 × doc_type_bonus
```
- Dynamic threshold iteration: starts at 0.3, increases to 0.5, 0.7, 0.9 if insufficient results
- Prevents missed documents while maintaining relevance
- 30-minute result caching for identical queries

### 5. Checkpoint-Based Multi-Stage Pipeline
**Problem**: Long-running generation jobs (10-20 minutes) fail without recovery mechanism.
**Solution**: Database-backed checkpoints after each stage and sub-stage:

**Stage 1 (BLUEPRINT_PREP)** - 3 sub-stages:
1. `extract_relationships`: Identify dependencies between tasks/objectives (2-stage: draft → refinement)
2. `enrich_objectives`: Expand research objectives with scientific context
3. `enrich_terminology`: Integrate Wikidata scientific term enrichment

**Stage 2 (WORKPLAN_GENERATION)**:
- Generate comprehensive research plan with objectives and tasks
- Extract dependencies between work plan components
- Format with relationship context

**Stage 3 (SECTION_SYNTHESIS)**:
- Generate section-specific content using work plan and CFP requirements
- Apply editorial workflow (if enabled) for refinement
- Save to database and publish completion notification

Each stage saves outputs to `RagGenerationJob.checkpoint_data` JSON field, enabling resumption from any failure point without reprocessing completed stages. Sub-stage completion tracked in `completed_substages` array.

### 6. Smart Prompt Compression & Post-Processing
**Problem**: Retrieved context often contains boilerplate and redundancy.
**Solution**: Multi-layer post-processing pipeline:
- **Whitespace normalization**: Compress 3+ consecutive newlines to 2
- **Duplicate sentence removal**: Similarity threshold 0.85 using spaCy
- **BM25 lexical ranking**: Rank documents by keyword relevance to queries
- **Boilerplate detection**: 11 common patterns (copyright notices, navigation, disclaimers, etc.)
- **Content word filtering**: Minimum content word ratio for quality sentences
- **Token budget enforcement**: Configurable max tokens (typically 4,000-12,000 depending on stage)

Post-processing ensures high-quality, relevant context while staying within token budgets.

### 7. Parallel Batch Generation with Shared Context
**Problem**: Generating multiple work plan components sequentially is slow.
**Solution**: Batch processing with shared RAG context:
- **Shared context retrieval**: One-time retrieval for all components (12,000 token budget max)
- **Batch size**: 4 components processed concurrently (configurable via `SECTION_GENERATION_BATCH_SIZE`)
- **Wikidata batching**: 4 terms per enrichment request (configurable via `WIKIDATA_ENRICHMENT_BATCH_SIZE`)
- **Dynamic word bounds**: 700 words for objectives, 400 words for tasks (with 5% tolerance)
- **Timeout handling**: Per-component timeouts with graceful degradation
- **Cache utilization**: In-memory per-instance caching (30-minute TTL) prevents redundant retrievals

Parallel processing with shared context significantly improves throughput for multi-component generation.

## Deployment & Operations

**CI/CD Pipeline**
- GitHub Actions: development → staging, main → production
- Validation: `task lint:all` + `task test` on every push
- Docker builds pushed to Google Artifact Registry
- Terraform apply deploys all services within 5-minute window via `sync-services.yaml`

**Cloud Run Configuration**
- **Backend**: concurrency=10, memory=1Gi, timeout=300s
- **Processing services** (Indexer, Crawler, RAG): concurrency=1 (staging), memory=2-4Gi, varying timeouts
- **CRDT**: concurrency=10, memory=512Mi, timeout=300s
- **Frontend**: concurrency=10, memory=512Mi, timeout=60s
- **Fanout pattern**: concurrency=1 in staging ensures single-instance processing for cost efficiency

**Observability**
- OpenTelemetry distributed tracing with trace context propagation
- Structured logging (key=value format) via structlog
- Cloud Trace dashboard for request path visualization
- Health checks on all services

## Technology Roadmap

### Near-Term Enhancements (3-6 months)

**1. Advanced Relationship Extraction**
- Extend current 2-stage extraction to include cross-section dependencies
- Add temporal reasoning for milestone sequencing
- Implement constraint validation (budget alignment, timeline feasibility)

**2. Iterative Refinement Loop**
- Post-generation feedback integration from evaluator
- Targeted regeneration of low-scoring sections
- A/B testing framework for prompt optimization

**3. Multi-Model Ensemble**
- Parallel generation with Gemini + Claude + Anthropic
- Consensus scoring for quality ranking
- Automatic best-output selection based on evaluation metrics

**4. Enhanced Scientific Context**
- Expand from Wikidata to include PubMed, arXiv, and domain ontologies
- Citation recommendation based on semantic similarity
- Automatic figure/table suggestion from related publications

### Medium-Term Innovations (6-12 months)

**5. Fine-Tuned Evaluation Models**
- Train domain-specific BERT models on funded vs. rejected grants
- Learn institution-specific reviewer preferences
- Personalized quality thresholds based on historical success rates

**6. Active Learning for Chunking**
- Replace fixed 2000-char chunks with semantic boundary detection
- Optimize chunk overlap based on content type
- Adaptive chunk size based on embedding quality metrics

**7. Graph-Based Context Retrieval**
- Build citation graphs from scientific literature
- Implement PageRank-style relevance scoring
- Multi-hop reasoning across related documents

**8. Federated Learning for Privacy**
- Distribute model training across institutional boundaries
- Differential privacy guarantees for sensitive research data
- LoRA-based fine-tuning with encrypted gradient sharing

### Long-Term Vision (12+ months)

**9. Reinforcement Learning from Human Feedback (RLHF)**
- Collect expert reviewer feedback on generated sections
- Train reward model to predict funding likelihood
- Policy optimization for generation pipeline

**10. Explainable AI for Reviewer Insights**
- Attribution analysis showing which source passages influenced generation
- Counterfactual explanations for evaluation scores
- Visualization of reasoning paths through multi-stage pipeline

**11. Cross-Grant Learning**
- Transfer learning from successful applications in related domains
- Identify reusable narrative patterns and rhetorical structures
- Institutional knowledge graph of winning strategies

**12. Real-Time Collaborative AI**
- Streaming generation with incremental quality evaluation
- Multi-user co-editing with AI suggestions in CRDT document
- Live reviewer simulation providing feedback as user writes

---

## Summary

**Key Differentiators**: GrantFlow's architecture emphasizes production readiness (multi-tenancy, observability, fault tolerance) combined with proven AI innovations. The system's intellectual property lies in:

1. **Token-optimized schema design** with automatic conversion layer
2. **Multi-dimensional quality evaluation** (5 metrics, weighted scoring, adaptive thresholds)
3. **Wikidata-enhanced scientific enrichment** via SPARQL queries
4. **Hybrid retrieval ranking** (70% semantic + 30% metadata with dynamic thresholds)
5. **Checkpoint-based resumption** (3 stages, 3 sub-stages in stage 1)
6. **Parallel batch processing** (4 concurrent components with shared context)
7. **Intelligent post-processing** (BM25, deduplication, boilerplate removal)

These innovations are not theoretical concepts but proven, deployed implementations handling real grant generation workloads in production.
