# SQLAlchemy-Native Metadata Filtering Implementation Plan

## Overview

Implement metadata-enhanced retrieval using SQLAlchemy ORM patterns with PostgreSQL GIN indices for JSONB fields. This plan prioritizes type safety, maintainability, and proper ORM patterns.

## Architecture

### 1. Data Model & Schema (Current State)

```python
# packages/db/src/tables.py
class RagSource(BaseWithUUIDPK):
    document_metadata: Mapped[DocumentMetadata | None] = mapped_column(JSON, nullable=True)
    # DocumentMetadata imported from kreuzberg._types.Metadata
```

**DocumentMetadata Structure** (from kreuzberg):
```python
class Metadata(TypedDict, total=False):
    entities: NotRequired[list[dict]]  # [{"type": "PERSON", "text": "Dr. Smith", "start": 0, "end": 9}]
    keywords: NotRequired[list[tuple[str, float]]]  # [("melanoma", 0.95), ("research", 0.87)]
    categories: NotRequired[list[str]]  # ["research", "scientific"]
    document_type: NotRequired[str]  # "scientific_paper"
    quality_score: NotRequired[float]  # 0.92
    # ... 50+ other fields
```

### 2. Database Migration Strategy

#### Migration File: `packages/db/alembic/versions/XXXX_add_metadata_gin_indices.py`

```python
"""Add GIN indices for document_metadata JSONB fields

Revision ID: XXXX
Revises: 2006574d8e84
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "XXXX"
down_revision: str | None = "2006574d8e84"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add GIN indices for fast JSONB queries on document_metadata."""

    # 1. General GIN index for containment queries (@>, ?, ?&, ?|)
    # Supports: document_metadata @> '{"categories": ["research"]}'
    op.create_index(
        "ix_rag_sources_document_metadata_gin",
        "rag_sources",
        ["document_metadata"],
        unique=False,
        postgresql_using="gin",
        postgresql_ops={"document_metadata": "jsonb_path_ops"},  # Optimized for containment
    )

    # 2. Entities array index for entity-specific queries
    # Supports queries on document_metadata -> 'entities'
    op.execute(
        """
        CREATE INDEX ix_rag_sources_metadata_entities_gin
        ON rag_sources USING gin ((document_metadata -> 'entities'))
        """
    )

    # 3. Keywords array index
    # Supports queries on document_metadata -> 'keywords'
    op.execute(
        """
        CREATE INDEX ix_rag_sources_metadata_keywords_gin
        ON rag_sources USING gin ((document_metadata -> 'keywords'))
        """
    )

    # 4. Categories array index
    # Supports queries on document_metadata -> 'categories'
    op.execute(
        """
        CREATE INDEX ix_rag_sources_metadata_categories_gin
        ON rag_sources USING gin ((document_metadata -> 'categories'))
        """
    )

    # 5. Composite expression index for common filter patterns
    # Supports filtering by document type + quality score
    op.execute(
        """
        CREATE INDEX ix_rag_sources_metadata_type_quality_gin
        ON rag_sources USING gin (
            (document_metadata -> 'document_type'),
            (document_metadata -> 'quality_score')
        )
        """
    )


def downgrade() -> None:
    """Remove GIN indices."""
    op.execute("DROP INDEX IF EXISTS ix_rag_sources_metadata_type_quality_gin")
    op.execute("DROP INDEX IF EXISTS ix_rag_sources_metadata_categories_gin")
    op.execute("DROP INDEX IF EXISTS ix_rag_sources_metadata_keywords_gin")
    op.execute("DROP INDEX IF EXISTS ix_rag_sources_metadata_entities_gin")
    op.drop_index("ix_rag_sources_document_metadata_gin", table_name="rag_sources")
```

**Index Strategy Rationale**:
- `jsonb_path_ops`: 30% smaller, faster for containment (@>), but only supports `@>` operator
- Expression indices: Target specific nested fields for common queries
- Multiple specialized indices: Better than one general index for our access patterns

### 3. SQLAlchemy Query Patterns

#### 3.1 JSONB Operators in SQLAlchemy

```python
from sqlalchemy import cast, func, text
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.types import String, Float

# PostgreSQL JSONB operators mapped to SQLAlchemy:

# 1. Containment (@>): Check if JSONB contains another JSONB
RagSource.document_metadata.contains({"categories": ["research"]})
# SQL: document_metadata @> '{"categories": ["research"]}'::jsonb

# 2. Key existence (?): Check if key exists
RagSource.document_metadata.has_key("entities")
# SQL: document_metadata ? 'entities'

# 3. Any key exists (?|): Check if any of the keys exist
RagSource.document_metadata.op("?|")(["entities", "keywords"])
# SQL: document_metadata ?| array['entities', 'keywords']

# 4. All keys exist (?&): Check if all keys exist
RagSource.document_metadata.op("?&")(["entities", "keywords", "categories"])
# SQL: document_metadata ?& array['entities', 'keywords', 'categories']

# 5. JSON field extraction (->): Get JSON value (returns JSONB)
RagSource.document_metadata["entities"]
# SQL: document_metadata -> 'entities'

# 6. JSON field extraction as text (->>): Get JSON value as text
RagSource.document_metadata["entities"].astext
# SQL: document_metadata ->> 'entities'

# 7. Path extraction (#>): Get nested value by path
RagSource.document_metadata.op("#>")(text("'{entities,0,type}'"))
# SQL: document_metadata #> '{entities,0,type}'

# 8. Array contains (@>): Check if JSONB array contains elements
RagSource.document_metadata["categories"].astext.cast(ARRAY(String)).op("@>")(
    cast(["research", "scientific"], ARRAY(String))
)
# SQL: (document_metadata -> 'categories')::text[] @> ARRAY['research', 'scientific']
```

#### 3.2 Helper Functions for Type-Safe Metadata Queries

```python
# packages/db/src/query_helpers.py

from typing import Any, TypeVar
from sqlalchemy import Select, and_, or_, cast, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import InstrumentedAttribute
from sqlalchemy.sql import ColumnElement
from sqlalchemy.types import String, Float

T = TypeVar("T")


def metadata_has_entity_type(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    entity_type: str,
) -> ColumnElement[bool]:
    """Check if document_metadata contains entity of specific type.

    Uses GIN index: ix_rag_sources_metadata_entities_gin

    Example:
        query.where(metadata_has_entity_type(RagSource.document_metadata, "ORGANIZATION"))
    """
    # Check if entities array contains object with matching type
    # SQL: document_metadata -> 'entities' @> '[{"type": "ORGANIZATION"}]'::jsonb
    return metadata_column["entities"].astext.op("@>")(
        func.jsonb_build_array(func.jsonb_build_object("type", entity_type))
    )


def metadata_has_entity_text(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    entity_text: str,
    case_sensitive: bool = False,
) -> ColumnElement[bool]:
    """Check if document_metadata contains entity with specific text.

    Example:
        query.where(metadata_has_entity_text(RagSource.document_metadata, "NIH"))
    """
    if case_sensitive:
        return metadata_column["entities"].astext.op("@>")(
            func.jsonb_build_array(func.jsonb_build_object("text", entity_text))
        )

    # Case-insensitive: need to iterate (slower, doesn't use index)
    # For case-insensitive, consider text search or preprocessing entities
    return metadata_column["entities"].astext.ilike(f'%"text": "{entity_text}"%')


def metadata_has_categories(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    categories: list[str],
    match_all: bool = False,
) -> ColumnElement[bool]:
    """Check if document_metadata categories overlap with provided list.

    Uses GIN index: ix_rag_sources_metadata_categories_gin

    Args:
        match_all: If True, document must have ALL categories. If False, ANY category.

    Example:
        query.where(metadata_has_categories(RagSource.document_metadata, ["research", "scientific"]))
    """
    if match_all:
        # Document must contain all categories
        # SQL: document_metadata -> 'categories' @> '["research", "scientific"]'::jsonb
        return metadata_column["categories"].astext.op("@>")(
            func.to_jsonb(cast(categories, ARRAY(String)))
        )

    # Document must contain at least one category (array overlap &&)
    # SQL: document_metadata -> 'categories' ?| array['research', 'scientific']
    return metadata_column["categories"].op("?|")(categories)


def metadata_has_keyword(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    keyword: str,
    min_confidence: float | None = None,
) -> ColumnElement[bool]:
    """Check if document_metadata contains keyword (with optional confidence threshold).

    Uses GIN index: ix_rag_sources_metadata_keywords_gin

    Example:
        query.where(metadata_has_keyword(RagSource.document_metadata, "melanoma", min_confidence=0.7))
    """
    # Keywords stored as: [["melanoma", 0.95], ["research", 0.87]]
    # For basic check without confidence, use text search
    if min_confidence is None:
        return metadata_column["keywords"].astext.ilike(f'%"{keyword}"%')

    # With confidence threshold: need to check both keyword and score
    # This requires jsonb_array_elements + filtering (slower, doesn't use index well)
    # Consider materialized column or separate keywords table for complex filters
    return metadata_column["keywords"].astext.op("@>")(
        func.jsonb_build_array(func.jsonb_build_array(keyword, min_confidence))
    )


def metadata_quality_above(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    min_score: float,
) -> ColumnElement[bool]:
    """Filter by quality score threshold.

    Example:
        query.where(metadata_quality_above(RagSource.document_metadata, 0.7))
    """
    # SQL: (document_metadata ->> 'quality_score')::float >= 0.7
    return cast(metadata_column["quality_score"].astext, Float) >= min_score


def metadata_document_type_is(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    doc_type: str,
) -> ColumnElement[bool]:
    """Filter by document type.

    Example:
        query.where(metadata_document_type_is(RagSource.document_metadata, "scientific_paper"))
    """
    # SQL: document_metadata ->> 'document_type' = 'scientific_paper'
    return metadata_column["document_type"].astext == doc_type


def build_metadata_filter(
    metadata_column: InstrumentedAttribute[dict[str, Any] | None],
    *,
    entity_types: list[str] | None = None,
    entity_texts: list[str] | None = None,
    categories: list[str] | None = None,
    keywords: list[str] | None = None,
    min_quality: float | None = None,
    doc_types: list[str] | None = None,
    match_mode: str = "any",  # "any" or "all"
) -> ColumnElement[bool] | None:
    """Build composite metadata filter from multiple criteria.

    Args:
        match_mode: "any" = OR logic, "all" = AND logic

    Example:
        filter_expr = build_metadata_filter(
            RagSource.document_metadata,
            entity_types=["ORGANIZATION", "PERSON"],
            categories=["research"],
            min_quality=0.7,
            match_mode="all"
        )
        query.where(filter_expr)
    """
    conditions: list[ColumnElement[bool]] = []

    if entity_types:
        entity_conditions = [
            metadata_has_entity_type(metadata_column, etype) for etype in entity_types
        ]
        conditions.append(or_(*entity_conditions) if len(entity_conditions) > 1 else entity_conditions[0])

    if entity_texts:
        text_conditions = [
            metadata_has_entity_text(metadata_column, text) for text in entity_texts
        ]
        conditions.append(or_(*text_conditions) if len(text_conditions) > 1 else text_conditions[0])

    if categories:
        conditions.append(metadata_has_categories(metadata_column, categories, match_all=False))

    if keywords:
        keyword_conditions = [
            metadata_has_keyword(metadata_column, kw) for kw in keywords
        ]
        conditions.append(or_(*keyword_conditions) if len(keyword_conditions) > 1 else keyword_conditions[0])

    if min_quality is not None:
        conditions.append(metadata_quality_above(metadata_column, min_quality))

    if doc_types:
        type_conditions = [
            metadata_document_type_is(metadata_column, dtype) for dtype in doc_types
        ]
        conditions.append(or_(*type_conditions) if len(type_conditions) > 1 else type_conditions[0])

    if not conditions:
        return None

    if match_mode == "all":
        return and_(*conditions)
    return or_(*conditions)
```

### 4. Enhanced Retrieval Implementation

#### 4.1 Metadata-Aware Retrieval Function

```python
# services/rag/src/utils/retrieval.py

from packages.db.src.query_helpers import build_metadata_filter
from typing import TypedDict


class MetadataFilterParams(TypedDict, total=False):
    """Parameters for metadata-based pre-filtering."""
    entity_types: list[str]  # ["ORGANIZATION", "PERSON", "LOCATION"]
    entity_texts: list[str]  # ["NIH", "FDA", "Dr. Smith"]
    categories: list[str]    # ["research", "scientific", "clinical"]
    keywords: list[str]      # ["melanoma", "immunotherapy"]
    min_quality: float       # 0.7
    doc_types: list[str]     # ["scientific_paper", "grant_guidelines"]
    match_mode: str          # "any" or "all"


async def retrieve_vectors_for_embedding(
    *,
    application_id: str | None = None,
    embeddings: list[list[float]],
    file_table_cls: type[GrantApplicationSource | GrantingInstitutionSource],
    iteration: int = 1,
    limit: int = MAX_RESULTS,
    organization_id: str | None = None,
    search_queries: list[str] | None = None,
    metadata_filter: MetadataFilterParams | None = None,  # ← NEW
    trace_id: str,
) -> list[TextVector]:
    """Retrieve vectors with optional metadata pre-filtering."""

    session_maker = get_session_maker()

    max_threshold = 1.0
    threshold = min(0.3 + 0.2 * iteration, max_threshold)
    similarity_conditions = [
        TextVector.embedding.cosine_distance(embedding) <= threshold
        for embedding in embeddings
    ]

    async with session_maker() as session:
        # Base query
        query = (
            select_active(TextVector)
            .options(selectinload(TextVector.rag_source))
            .join(RagSource, TextVector.rag_source_id == RagSource.id)
            .join(file_table_cls, RagSource.id == file_table_cls.rag_source_id)
            .where(
                file_table_cls.grant_application_id == application_id
                if hasattr(file_table_cls, "grant_application_id")
                else file_table_cls.granting_institution_id == organization_id
            )
        )

        # Add metadata pre-filtering BEFORE vector similarity
        if metadata_filter:
            metadata_condition = build_metadata_filter(
                RagSource.document_metadata,
                **metadata_filter
            )
            if metadata_condition is not None:
                query = query.where(metadata_condition)

                logger.debug(
                    "Applied metadata pre-filter",
                    trace_id=trace_id,
                    filter_params=metadata_filter,
                )

        # Add vector similarity filtering
        query = (
            query
            .where(or_(*similarity_conditions))
            .order_by(func.least(*[
                TextVector.embedding.cosine_distance(embedding)
                for embedding in embeddings
            ]))
            .limit(limit * 2)
        )

        vectors = list(await session.scalars(query))

    # Rest of the function unchanged...
    if search_queries and vectors:
        # Re-rank with enhanced metadata scoring
        scored_vectors = []
        for vector in vectors:
            cosine_similarities = [
                float(util.cos_sim(vector.embedding, embedding).item())
                for embedding in embeddings
            ]
            max_cosine_similarity = max(cosine_similarities) if cosine_similarities else 0.0

            metadata_score = calculate_enhanced_metadata_score(
                vector.rag_source.document_metadata,
                search_queries,
                metadata_filter=metadata_filter,  # Pass filter context for scoring
            )

            combined_score = (0.7 * max_cosine_similarity) + (0.3 * metadata_score)
            scored_vectors.append((vector, combined_score, metadata_score))

        scored_vectors.sort(key=lambda x: x[1], reverse=True)
        result = [v[0] for v in scored_vectors[:limit]]
    else:
        result = vectors[:limit]

    # Recursion logic unchanged...
    return result
```

#### 4.2 Enhanced Metadata Scoring

```python
# services/rag/src/utils/retrieval.py

from typing import Final


# Entity type weights based on relevance for grant applications
ENTITY_TYPE_WEIGHTS: Final[dict[str, float]] = {
    "ORGANIZATION": 0.5,  # NIH, FDA, foundations - highly relevant
    "PERSON": 0.3,        # Researchers, PIs - moderately relevant
    "LOCATION": 0.15,     # Research sites - less relevant
    "DATE": 0.05,         # Deadlines, dates - least relevant
}


def calculate_enhanced_metadata_score(
    document_metadata: "DocumentMetadata | None",
    search_queries: list[str],
    *,
    metadata_filter: MetadataFilterParams | None = None,
    weights: MetadataWeights | None = None,
) -> float:
    """Enhanced metadata scoring with entity type weighting."""

    if not document_metadata:
        return 0.7  # Baseline score for docs without metadata

    if weights is None:
        weights = DEFAULT_METADATA_WEIGHTS

    query_terms = set()
    for query in search_queries:
        tokens = re.findall(r"\b\w+\b", query.lower())
        query_terms.update(tokens)

    score = 0.0

    # 1. Keyword matching (40% weight)
    doc_keywords = {
        kw[0].lower() if isinstance(kw, (list, tuple)) else str(kw).lower()
        for kw in document_metadata.get("keywords", [])
    }
    if doc_keywords and query_terms:
        overlap = len(doc_keywords & query_terms)
        keyword_score = min(overlap / max(len(doc_keywords), 5), 1.0)
        score += weights["keywords"] * keyword_score

    # 2. Enhanced entity matching with type weighting (40% weight)
    entities_raw = document_metadata.get("entities", [])
    entity_score = 0.0

    for entity in entities_raw if isinstance(entities_raw, list) else []:
        if not isinstance(entity, dict):
            continue

        entity_text = entity.get("text", "").lower()
        entity_type = entity.get("type", "")

        # Check if entity text matches query terms
        if entity_text in query_terms or any(term in entity_text for term in query_terms):
            # Weight by entity type importance
            type_weight = ENTITY_TYPE_WEIGHTS.get(entity_type, 0.1)
            entity_score += type_weight

    # Normalize entity score
    entity_score = min(entity_score, 1.0)
    score += weights["entities"] * entity_score

    # 3. Document type matching (20% weight)
    doc_type = str(document_metadata.get("document_type", "")).lower()

    # Boost for research/scientific documents
    if any(t in doc_type for t in ["research", "scientific", "academic", "paper"]):
        score += weights["doc_type"]

    # Boost if doc_type matches query intent
    if metadata_filter and metadata_filter.get("doc_types"):
        if doc_type in [dt.lower() for dt in metadata_filter["doc_types"]]:
            score += weights["doc_type"] * 0.5  # Additional boost

    # Final score: 0.5 baseline + 0.5 weighted components
    return 0.5 + (score * 0.5)
```

### 5. Query Extraction & Auto-Detection

```python
# services/rag/src/utils/metadata_extraction.py

import re
from typing import TypedDict


class ExtractedMetadataIntent(TypedDict, total=False):
    """Metadata intent extracted from user queries."""
    entity_types: list[str]
    entity_texts: list[str]
    categories: list[str]
    keywords: list[str]


# Common organization name patterns for grants
ORGANIZATION_PATTERNS = [
    r"\b(NIH|National Institutes of Health)\b",
    r"\b(NSF|National Science Foundation)\b",
    r"\b(FDA|Food and Drug Administration)\b",
    r"\b(CDC|Centers for Disease Control)\b",
    r"\b(DARPA)\b",
    r"\b(DOD|Department of Defense)\b",
]


def extract_metadata_intent_from_queries(
    search_queries: list[str],
    task_description: str | None = None,
) -> ExtractedMetadataIntent | None:
    """Extract metadata filtering intent from search queries.

    Example:
        queries = ["NIH grant guidelines", "melanoma research requirements"]
        intent = extract_metadata_intent_from_queries(queries)
        # Returns: {
        #     "entity_texts": ["NIH"],
        #     "keywords": ["melanoma", "research", "guidelines"]
        # }
    """
    combined_text = " ".join(search_queries)
    if task_description:
        combined_text = f"{task_description} {combined_text}"

    combined_lower = combined_text.lower()

    intent: ExtractedMetadataIntent = {}

    # Extract organization entities
    org_matches = []
    for pattern in ORGANIZATION_PATTERNS:
        matches = re.findall(pattern, combined_text, re.IGNORECASE)
        org_matches.extend(matches)

    if org_matches:
        intent["entity_texts"] = org_matches
        intent["entity_types"] = ["ORGANIZATION"]

    # Detect category hints
    categories = []
    if any(word in combined_lower for word in ["guideline", "requirement", "instruction"]):
        categories.append("guidelines")
    if any(word in combined_lower for word in ["research", "study", "investigation"]):
        categories.append("research")
    if any(word in combined_lower for word in ["clinical", "trial", "patient"]):
        categories.append("clinical")

    if categories:
        intent["categories"] = categories

    # Extract keywords (simple approach: noun phrases, capitalized terms)
    # In production, use spaCy for better extraction
    capitalized_words = re.findall(r"\b[A-Z][a-z]+\b", combined_text)
    if capitalized_words:
        intent["keywords"] = list(set(capitalized_words))

    return intent if intent else None
```

### 6. Integration into retrieve_documents

```python
# services/rag/src/utils/retrieval.py

async def retrieve_documents(
    *,
    application_id: str | None = None,
    max_results: int = MAX_RESULTS,
    max_tokens: int = 4000,
    model: str = GENERATION_MODEL,
    organization_id: str | None = None,
    search_queries: list[str] | None = None,
    task_description: str | PromptTemplate,
    with_guided_retrieval: bool = False,
    embedding_model: str | None = None,
    enable_metadata_filtering: bool = True,  # ← NEW feature flag
    metadata_filter: MetadataFilterParams | None = None,  # ← Explicit filter
    trace_id: str,
    **kwargs: Any,
) -> list[str]:
    """Retrieve documents with optional metadata-enhanced filtering."""

    # Generate search queries if not provided
    if not search_queries:
        search_queries = await handle_create_search_queries(
            user_prompt=str(task_description),
            embedding_model=embedding_model,
            **kwargs
        )

    # Auto-detect metadata filtering intent if enabled and not explicitly provided
    if enable_metadata_filtering and metadata_filter is None:
        detected_intent = extract_metadata_intent_from_queries(
            search_queries,
            task_description=str(task_description)
        )

        if detected_intent:
            metadata_filter = MetadataFilterParams(
                **detected_intent,
                match_mode="any"  # Use OR logic for auto-detected filters
            )

            logger.info(
                "Auto-detected metadata filter",
                trace_id=trace_id,
                filter=metadata_filter,
            )

    # Retrieve vectors with metadata filtering
    vectors = await handle_retrieval(
        application_id=application_id,
        organization_id=organization_id,
        search_queries=search_queries,
        max_results=max_results,
        model_name=embedding_model,
        metadata_filter=metadata_filter,  # ← Pass to retrieval
        trace_id=trace_id,
    )

    # Rest of function unchanged (convert to documents, post-process, etc.)
    ...
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create Alembic migration for GIN indices
- [ ] Add `query_helpers.py` with type-safe metadata query functions
- [ ] Write unit tests for query helper functions
- [ ] Run migration on staging database
- [ ] Monitor index creation time and size

### Phase 2: Core Integration (Week 2)
- [ ] Add `MetadataFilterParams` TypedDict
- [ ] Implement `build_metadata_filter()` function
- [ ] Update `retrieve_vectors_for_embedding()` with metadata_filter parameter
- [ ] Add feature flag: `enable_metadata_filtering=False` (default off)
- [ ] Write integration tests comparing filtered vs unfiltered retrieval

### Phase 3: Enhanced Scoring (Week 3)
- [ ] Implement `calculate_enhanced_metadata_score()` with entity type weights
- [ ] Add entity type weight configuration
- [ ] Create `metadata_extraction.py` with query intent detection
- [ ] Write tests for metadata scoring and intent extraction

### Phase 4: Production Rollout (Week 4)
- [ ] Enable feature flag for 10% of queries (A/B test)
- [ ] Monitor metrics: query latency, precision@10, metadata_filter_usage
- [ ] Tune entity type weights based on relevance feedback
- [ ] Roll out to 100% if metrics improve

## Testing Strategy

### Unit Tests

```python
# packages/db/tests/query_helpers_test.py

import pytest
from packages.db.src.query_helpers import (
    metadata_has_entity_type,
    metadata_has_categories,
    build_metadata_filter,
)
from packages.db.src.tables import RagSource


def test_metadata_has_entity_type():
    """Test entity type filter generates correct SQL."""
    condition = metadata_has_entity_type(RagSource.document_metadata, "ORGANIZATION")

    # Compile to SQL to verify
    sql = str(condition.compile(compile_kwargs={"literal_binds": True}))
    assert "entities" in sql
    assert "ORGANIZATION" in sql


def test_build_metadata_filter_any_mode():
    """Test composite filter with OR logic."""
    filter_expr = build_metadata_filter(
        RagSource.document_metadata,
        entity_types=["ORGANIZATION", "PERSON"],
        categories=["research"],
        match_mode="any"
    )

    assert filter_expr is not None
    sql = str(filter_expr.compile(compile_kwargs={"literal_binds": True}))
    assert "OR" in sql


def test_build_metadata_filter_all_mode():
    """Test composite filter with AND logic."""
    filter_expr = build_metadata_filter(
        RagSource.document_metadata,
        entity_types=["ORGANIZATION"],
        min_quality=0.7,
        match_mode="all"
    )

    assert filter_expr is not None
    sql = str(filter_expr.compile(compile_kwargs={"literal_binds": True}))
    assert "AND" in sql
```

### Integration Tests

```python
# services/rag/tests/utils/retrieval_metadata_test.py

import pytest
from packages.db.src.tables import RagSource, GrantApplicationSource
from services.rag.src.utils.retrieval import retrieve_vectors_for_embedding, MetadataFilterParams


@pytest.mark.asyncio
async def test_retrieve_with_entity_filter(async_session_maker, test_application_id):
    """Test retrieval with entity type filter."""

    metadata_filter = MetadataFilterParams(
        entity_types=["ORGANIZATION"],
        match_mode="any"
    )

    embeddings = [[0.1] * 1536]  # Dummy embedding

    vectors = await retrieve_vectors_for_embedding(
        application_id=test_application_id,
        embeddings=embeddings,
        file_table_cls=GrantApplicationSource,
        metadata_filter=metadata_filter,
        trace_id="test",
    )

    # Verify all results have ORGANIZATION entities
    for vector in vectors:
        entities = vector.rag_source.document_metadata.get("entities", [])
        entity_types = [e["type"] for e in entities if isinstance(e, dict)]
        assert "ORGANIZATION" in entity_types


@pytest.mark.asyncio
async def test_retrieve_with_category_filter(async_session_maker, test_application_id):
    """Test retrieval with category filter."""

    metadata_filter = MetadataFilterParams(
        categories=["research", "scientific"],
        match_mode="any"
    )

    embeddings = [[0.1] * 1536]

    vectors = await retrieve_vectors_for_embedding(
        application_id=test_application_id,
        embeddings=embeddings,
        file_table_cls=GrantApplicationSource,
        metadata_filter=metadata_filter,
        trace_id="test",
    )

    # Verify all results have matching categories
    for vector in vectors:
        categories = vector.rag_source.document_metadata.get("categories", [])
        assert any(cat in ["research", "scientific"] for cat in categories)
```

## Performance Monitoring

### Metrics to Track

```python
# services/rag/src/utils/retrieval.py

@dataclass
class MetadataFilterMetrics:
    """Metrics for metadata filtering performance."""
    query_count: int = 0
    metadata_filter_used: int = 0
    avg_pre_filter_reduction_pct: float = 0.0  # % of docs filtered before vector search
    avg_query_latency_ms: float = 0.0
    precision_at_10: float = 0.0
    recall_at_10: float = 0.0
    entity_match_rate: float = 0.0
    category_match_rate: float = 0.0


# Log metrics after each retrieval
logger.info(
    "Metadata-enhanced retrieval completed",
    trace_id=trace_id,
    metadata_filter_used=bool(metadata_filter),
    vectors_before_filter=total_vectors_in_db,
    vectors_after_filter=len(vectors),
    reduction_pct=((total_vectors_in_db - len(vectors)) / total_vectors_in_db * 100),
    query_latency_ms=(time.time() - start_time) * 1000,
)
```

## Migration Risks & Mitigations

### Risk 1: Index Creation Time
- **Impact**: GIN indices can take 1-10 minutes on large tables
- **Mitigation**: Create indices `CONCURRENTLY` in production (separate migration)
- **Rollback**: Indices can be dropped instantly if needed

### Risk 2: Increased Storage
- **Impact**: GIN indices ~30-50% of table size (several GB)
- **Mitigation**: Monitor disk usage, use `jsonb_path_ops` for smaller indices
- **Threshold**: Alert if index size > 10GB

### Risk 3: False Negatives
- **Impact**: Over-filtering may miss relevant documents
- **Mitigation**: Use OR logic by default, make filters optional
- **Monitoring**: Track precision/recall metrics

## Success Criteria

- ✅ Migration runs successfully on staging without errors
- ✅ Query latency for metadata-filtered queries < 200ms (vs 300-500ms baseline)
- ✅ Precision@10 improves by ≥5% for queries with organization/entity mentions
- ✅ No degradation in recall@10 for general queries
- ✅ Index size < 5GB per table
- ✅ 80% test coverage for new metadata query functions

## References

- SQLAlchemy JSONB: https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#sqlalchemy.dialects.postgresql.JSONB
- PostgreSQL GIN Indices: https://www.postgresql.org/docs/current/gin-intro.html
- Alembic Migrations: https://alembic.sqlalchemy.org/en/latest/
- Kreuzberg Metadata: `.venv/lib/python3.13/site-packages/kreuzberg/_types.py:609-720`
