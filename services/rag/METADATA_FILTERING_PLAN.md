# Metadata-Enhanced Retrieval Strategy

## Goal
Leverage kreuzberg-extracted metadata (entities, keywords, categories) to improve retrieval precision and performance through:
1. PostgreSQL GIN indices on JSONB metadata fields
2. SQL-level pre-filtering before vector similarity search
3. Enhanced metadata scoring with entity type weighting

## Current State Analysis

### Metadata Available (`RagSource.document_metadata`)
```python
# From kreuzberg ExtractionResult
entities: list[Entity]  # PERSON, ORGANIZATION, LOCATION, DATE, EMAIL, PHONE
keywords: list[tuple[str, float]]  # Keywords with confidence scores
categories: list[str]
document_type: str
detected_languages: list[str]
quality_score: float
subject, title, abstract, summary: str
```

### Current Retrieval Flow
```
User Query
    ↓
Generate Embeddings
    ↓
Vector Similarity Search (pgvector) ← 70% weight
    ↓
Python Metadata Re-ranking ← 30% weight (keywords, entities, doc_type)
    ↓
Return Top-K Results
```

**Limitations:**
- No SQL indices on `document_metadata` JSON field
- Metadata filtering happens in Python after expensive vector search
- Can't pre-filter by specific entity types or categories
- Missing opportunity for hybrid search (SQL + vector)

## Proposed Solution

### Phase 1: Add GIN Indices (Migration)

Create migration to add PostgreSQL GIN indices:

```sql
-- Index for entity extraction
CREATE INDEX idx_rag_sources_metadata_entities_gin
ON rag_sources USING GIN ((document_metadata -> 'entities'));

-- Index for keywords
CREATE INDEX idx_rag_sources_metadata_keywords_gin
ON rag_sources USING GIN ((document_metadata -> 'keywords'));

-- Index for categories
CREATE INDEX idx_rag_sources_metadata_categories_gin
ON rag_sources USING GIN ((document_metadata -> 'categories'));

-- Composite index for common queries
CREATE INDEX idx_rag_sources_metadata_gin
ON rag_sources USING GIN (document_metadata jsonb_path_ops);
```

**Benefits:**
- Fast JSONB containment queries: `document_metadata @> '{"categories": ["research"]}'`
- Efficient entity type filtering: `document_metadata -> 'entities' @> '[{"type": "ORGANIZATION"}]'`
- Query performance: O(log n) instead of O(n) for metadata filters

### Phase 2: Enhanced Retrieval Strategy

#### 2.1 Pre-Filter Mode (When Specific Entities/Categories Needed)

```python
async def retrieve_vectors_with_metadata_filter(
    *,
    embeddings: list[list[float]],
    entity_types: list[str] | None = None,  # ["ORGANIZATION", "PERSON"]
    categories: list[str] | None = None,    # ["research", "scientific"]
    min_quality_score: float | None = None,
    **kwargs
) -> list[TextVector]:
    """Pre-filter by metadata before vector search."""

    # Build metadata filters
    filters = []
    if entity_types:
        # Use GIN index: entities contain any of these types
        for entity_type in entity_types:
            filters.append(
                RagSource.document_metadata['entities'].astext.contains(
                    json.dumps([{"type": entity_type}])
                )
            )

    if categories:
        # Use GIN index: categories array overlap
        filters.append(
            RagSource.document_metadata['categories'].astext.op('&&')(
                cast(categories, ARRAY(String))
            )
        )

    if min_quality_score:
        filters.append(
            cast(RagSource.document_metadata['quality_score'].astext, Float) >= min_quality_score
        )

    # Vector search WITH metadata pre-filtering
    query = (
        select_active(TextVector)
        .join(RagSource)
        .where(*filters)  # ← Pre-filter using GIN indices
        .where(or_(*similarity_conditions))  # Then vector similarity
        .order_by(...)
    )
```

#### 2.2 Entity-Aware Scoring

```python
def calculate_enhanced_metadata_score(
    document_metadata: DocumentMetadata,
    search_queries: list[str],
    entity_type_weights: dict[str, float] | None = None,
) -> float:
    """Enhanced scoring with entity type awareness."""

    if entity_type_weights is None:
        entity_type_weights = {
            "ORGANIZATION": 0.4,  # High weight for org names
            "PERSON": 0.3,        # Medium for people
            "LOCATION": 0.2,      # Lower for places
            "DATE": 0.1,          # Lowest for dates
        }

    query_terms = extract_query_terms(search_queries)

    # Existing keyword matching (40%)
    keyword_score = calculate_keyword_score(...)

    # Enhanced entity matching with type weighting (40%)
    entity_score = 0.0
    for entity in document_metadata.get("entities", []):
        entity_text = entity.get("text", "").lower()
        entity_type = entity.get("type", "")

        if entity_text in query_terms:
            weight = entity_type_weights.get(entity_type, 0.1)
            entity_score += weight

    entity_score = min(entity_score, 1.0)

    # Category matching (20%)
    category_score = calculate_category_score(...)

    return 0.4 * keyword_score + 0.4 * entity_score + 0.2 * category_score
```

### Phase 3: Adaptive Retrieval Strategy

```python
async def retrieve_documents_adaptive(
    task_description: str,
    search_queries: list[str],
    **kwargs
) -> list[str]:
    """Adaptively choose retrieval strategy based on query."""

    # Extract entities from query using spaCy/pattern matching
    query_entities = extract_entities_from_queries(search_queries)
    query_categories = infer_categories_from_query(task_description)

    if query_entities or query_categories:
        # Use hybrid approach: metadata pre-filter + vector search
        logger.info(
            "Using metadata-enhanced retrieval",
            entity_types=[e["type"] for e in query_entities],
            categories=query_categories,
        )

        vectors = await retrieve_vectors_with_metadata_filter(
            embeddings=embeddings,
            entity_types=[e["type"] for e in query_entities],
            categories=query_categories,
            **kwargs
        )
    else:
        # Use standard vector-only search
        vectors = await retrieve_vectors_for_embedding(...)

    # Re-rank with enhanced metadata scoring
    scored_vectors = [
        (v, calculate_enhanced_metadata_score(v.rag_source.document_metadata, ...))
        for v in vectors
    ]

    return format_results(scored_vectors)
```

## Implementation Plan

### Step 1: Database Migration
- [ ] Create migration: `add_metadata_gin_indices.py`
- [ ] Add GIN indices for entities, keywords, categories
- [ ] Test migration on staging database
- [ ] Monitor index size and query performance

### Step 2: Enhance Retrieval Module
- [ ] Add `retrieve_vectors_with_metadata_filter()` function
- [ ] Implement `calculate_enhanced_metadata_score()` with entity type weights
- [ ] Create `extract_entities_from_queries()` helper
- [ ] Add feature flag for hybrid retrieval

### Step 3: Testing & Validation
- [ ] Unit tests for metadata filtering SQL queries
- [ ] E2E tests comparing standard vs metadata-enhanced retrieval
- [ ] Performance benchmarks (query latency, precision@k, recall@k)
- [ ] A/B test on real grant applications

### Step 4: Monitoring & Optimization
- [ ] Add metrics: metadata_filter_usage, pre_filter_reduction_ratio
- [ ] Log metadata scoring breakdowns
- [ ] Tune entity type weights based on relevance feedback
- [ ] Adjust GIN index parameters if needed

## Expected Benefits

### Performance
- **30-50% faster retrieval** when metadata filters apply (skip many vector comparisons)
- **Better precision@10** through entity-aware scoring
- **Reduced false positives** by filtering out wrong document types early

### Example Use Cases

1. **Finding Granting Organization Guidelines**
   - Query: "NIH grant requirements"
   - Pre-filter: `entity_types=["ORGANIZATION"]`, `categories=["guidelines"]`
   - Result: Only docs mentioning NIH as entity, skip unrelated research papers

2. **Research Paper Retrieval for Specific Scientist**
   - Query: "Dr. Smith's melanoma research"
   - Pre-filter: `entity_types=["PERSON"]`, keywords containing "melanoma"
   - Result: Papers with Dr. Smith as entity, melanoma keyword

3. **Location-Specific Clinical Trials**
   - Query: "clinical trials in Boston hospitals"
   - Pre-filter: `entity_types=["LOCATION", "ORGANIZATION"]`, `categories=["clinical"]`
   - Result: Trials mentioning Boston locations, hospital orgs

## Risks & Mitigations

### Risk 1: Index Size
- **Concern**: GIN indices can be large (~3x data size)
- **Mitigation**: Monitor index size, use `jsonb_path_ops` for containment-only queries

### Risk 2: False Negatives
- **Concern**: Pre-filtering too aggressively may miss relevant docs
- **Mitigation**: Make metadata filters optional, use OR logic not AND

### Risk 3: Entity Extraction Quality
- **Concern**: Kreuzberg entity extraction may have errors
- **Mitigation**: Use confidence thresholds, fallback to keyword matching

## Metrics to Track

```python
@dataclass
class MetadataRetrievalMetrics:
    total_queries: int
    metadata_filter_used: int
    avg_pre_filter_reduction: float  # % docs filtered before vector search
    avg_retrieval_time_ms: float
    precision_at_10: float
    recall_at_10: float
    entity_match_rate: float
    category_match_rate: float
```

## References

- PostgreSQL GIN Index Documentation: https://www.postgresql.org/docs/current/gin-intro.html
- pgvector Hybrid Search: https://github.com/pgvector/pgvector#hybrid-search
- Kreuzberg Entity Types: `.venv/lib/python3.13/site-packages/kreuzberg/_types.py:813-822`
