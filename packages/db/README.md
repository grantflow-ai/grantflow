# Database Package

Shared database layer providing SQLAlchemy models, Alembic migrations, and query helpers for all GrantFlow.AI services. This package implements a PostgreSQL-based multi-tenant architecture with soft-delete patterns, vector embeddings for RAG operations, and comprehensive relationship management.

## Getting Started

For prerequisites, environment setup, and general development workflow, see the [Contributing Guide](../../CONTRIBUTING.md).

This README covers db package-specific architecture and development details.

## Package Structure

```
packages/db/
├── alembic/                    # Database migrations
│   ├── versions/              # Individual migration scripts
│   ├── env.py                 # Alembic environment configuration
│   └── script.py.mako         # Migration template
├── alembic.ini                # Alembic configuration
├── pg-extensions.sql          # PostgreSQL extensions (pgvector)
└── src/
    ├── __init__.py            # Package exports
    ├── connection.py          # Database connection utilities
    ├── constants.py           # Constants (EMBEDDING_DIMENSIONS, source types)
    ├── enums.py               # Shared enumerations (UserRoleEnum, StatusEnum, etc.)
    ├── json_objects.py        # TypedDict definitions for JSON columns
    ├── query_helpers.py       # Soft-delete and metadata filtering helpers
    ├── tables.py              # SQLAlchemy model definitions
    └── utils.py               # Database utilities
```

## Database Models

The database schema follows a hierarchical multi-tenant structure with polymorphic RAG sources and collaborative editing support:

```mermaid
erDiagram
    Organization ||--o{ OrganizationUser : has
    Organization ||--o{ Project : contains
    Organization ||--o{ Notification : receives

    OrganizationUser ||--o{ ProjectAccess : grants
    OrganizationUser }o--|| User : represents

    Project ||--o{ GrantApplication : contains
    Project ||--o{ ProjectAccess : controls

    GrantApplication ||--|| GrantTemplate : has
    GrantApplication ||--o{ GrantApplicationSource : references
    GrantApplication ||--o{ RagGenerationJob : triggers
    GrantApplication ||--o{ EditorDocument : owns
    GrantApplication ||--o{ GenerationNotification : receives
    GrantApplication }o--o| GrantApplication : "parent/children"

    GrantTemplate ||--o{ GrantTemplateSource : references
    GrantTemplate ||--o{ RagGenerationJob : triggers
    GrantTemplate }o--|| GrantingInstitution : "funded by"

    GrantingInstitution ||--o{ Grant : publishes
    GrantingInstitution ||--o{ GrantingInstitutionSource : references

    RagSource ||--o{ TextVector : vectorized
    RagSource ||--o{ GrantApplicationSource : "linked to"
    RagSource ||--o{ GrantTemplateSource : "linked to"
    RagSource ||--o{ GrantingInstitutionSource : "linked to"
    RagSource }o--o| RagSource : "parent/children"

    RagFile --|> RagSource : inherits
    RagUrl --|> RagSource : inherits

    RagGenerationJob }o--o| RagGenerationJob : "parent/children"

    EditorDocument }o--|| GrantApplication : belongs_to
```

### Core Entity Descriptions

**Multi-tenancy & Access Control:**
- `Organization`: Top-level tenant entity
- `OrganizationUser`: User membership with role-based permissions (OWNER, ADMIN, COLLABORATOR)
- `Project`: Organizational unit for grant applications
- `ProjectAccess`: Fine-grained project access control

**Grant Management:**
- `GrantApplication`: Main entity for grant proposals with deep dive questions and research objectives
- `GrantTemplate`: Structured grant template with sections and CFP analysis
- `GrantingInstitution`: Funding organizations (NIH, NSF, etc.)
- `Grant`: Published grant opportunities with deadlines and requirements

**RAG (Retrieval-Augmented Generation):**
- `RagSource`: Polymorphic base for indexable content (files and URLs)
- `RagFile`: GCS-stored files with extraction metadata
- `RagUrl`: Crawled web pages with title and description
- `TextVector`: Embeddings with 384-dimensional vectors for similarity search

**Workflow Management:**
- `RagGenerationJob`: Async job tracking for template/application generation stages
- `GenerationNotification`: Real-time updates during generation pipeline
- `Notification`: User notifications for deadlines and system events

**Collaboration:**
- `EditorDocument`: CRDT-based collaborative editing state (Y.js binary format)

## Soft-Delete Pattern

All models inherit from `Base` which implements a soft-delete pattern using the `deleted_at` timestamp. Soft-deleted records remain in the database but are excluded from queries.

### Using Query Helpers

Always use the `select_active()` and `update_active()` helpers from `/packages/db/src/query_helpers.py` to automatically filter out soft-deleted records:

```python
from packages.db.src.query_helpers import select_active, update_active
from packages.db.src.tables import Project
from sqlalchemy import select

# CORRECT: Use helper to exclude deleted records
query = select_active(Project).where(Project.organization_id == org_id)
projects = await session.scalars(query)

# INCORRECT: Manual filtering is error-prone and violates soft-delete pattern
query = select(Project).where(
    Project.organization_id == org_id,
    Project.deleted_at.is_(None)  # Don't do this
)
```

### Soft-Delete Operations

```python
from packages.db.src.tables import GrantApplication

# Soft delete a record
application.soft_delete()  # Sets deleted_at to current timestamp
await session.commit()

# Restore a soft-deleted record
application.restore()  # Sets deleted_at to None
await session.commit()

# Check if deleted
if application.is_deleted:
    print("This record has been soft-deleted")
```

### Query Helper Functions

The package provides comprehensive helpers in `/packages/db/src/query_helpers.py`:

**Basic Filters:**
- `select_active(model)`: SELECT query excluding deleted records
- `select_active_by_id(model, id)`: SELECT by ID excluding deleted records
- `update_active(model)`: UPDATE query excluding deleted records
- `update_active_by_id(model, id)`: UPDATE by ID excluding deleted records
- `add_active_filter(query, *models)`: Add soft-delete filter to existing query

**Metadata Filters (for `document_metadata` JSON columns):**
- `metadata_has_entity_type(column, entity_type)`: Filter by entity type in metadata
- `metadata_has_categories(column, categories, match_mode)`: Filter by categories (any/all)
- `metadata_has_keyword(column, keyword, min_confidence)`: Filter by keyword with confidence threshold
- `build_metadata_filter(column, ...)`: Composite filter builder combining entity types, categories, and quality scores

## Exported Utilities

The package exports the following from `/packages/db/src/__init__.py`:

**Models:**
All table classes from `tables.py` including `Organization`, `Project`, `GrantApplication`, `GrantTemplate`, `RagSource`, `RagFile`, `RagUrl`, `TextVector`, `EditorDocument`, etc.

**Enumerations:**
- `UserRoleEnum`: OWNER, ADMIN, COLLABORATOR
- `ApplicationStatusEnum`: WORKING_DRAFT, IN_PROGRESS, GENERATING, CANCELLED
- `SourceIndexingStatusEnum`: CREATED, INDEXING, FINISHED, FAILED
- `RagGenerationStatusEnum`: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
- `GrantType`: RESEARCH, TRANSLATIONAL
- `GrantTemplateStageEnum`: CFP_ANALYSIS, TEMPLATE_GENERATION
- `GrantApplicationStageEnum`: BLUEPRINT_PREP, WORKPLAN_GENERATION, SECTION_SYNTHESIS

**TypedDict Structures:**
- `Chunk`: Text chunk with optional page number
- `ResearchTask`: Task with number, title, description
- `ResearchObjective`: Objective with research tasks
- `ResearchDeepDive`: Research-focused deep dive questions
- `TranslationalResearchDeepDive`: Translational research deep dive questions
- `CFPAnalysis`: Call for Proposals analysis structure
- `GrantElement`: Base grant section element
- `GrantLongFormSection`: Extended section with generation instructions

**Constants:**
- `EMBEDDING_DIMENSIONS`: 384 (dimensionality for text embeddings)
- `RAG_FILE`, `RAG_URL`: Polymorphic identity constants

**Query Helpers:**
All functions from `query_helpers.py` for soft-delete filtering and metadata queries.

**Connection:**
- `get_async_session_maker()`: Factory for async database sessions

## Notes

### Async Session Management

All database operations must use async context managers with explicit transaction boundaries:

```python
from packages.db.src.connection import get_async_session_maker

async_session_maker = get_async_session_maker()

# CORRECT: Explicit transaction boundary
async with async_session_maker() as session, session.begin():
    project = await session.scalar(
        select_active(Project).where(Project.id == project_id)
    )
    # Modifications are automatically committed

# INCORRECT: Reusing sessions across requests
session = async_session_maker()  # Don't do this
# ... multiple operations ...
```

### Vector Embeddings with pgvector

The `TextVector` table stores 384-dimensional embeddings generated from indexed content:

```python
from packages.db.src.tables import TextVector
from packages.db.src.constants import EMBEDDING_DIMENSIONS

# Query for similar vectors using cosine distance
from sqlalchemy import select, func

query = select(TextVector).order_by(
    TextVector.embedding.cosine_distance(query_embedding)
).limit(10)

similar_chunks = await session.scalars(query)
```

The embedding column uses pgvector's HNSW index (Hierarchical Navigable Small World) for efficient approximate nearest neighbor search with the following parameters:
- `m`: 48 (max connections per layer)
- `ef_construction`: 256 (size of dynamic candidate list during construction)
- `vector_cosine_ops`: Cosine distance optimization

### JSON Columns with TypedDict

Several columns use JSON/JSONB storage with strict TypedDict schemas:

**GrantApplication:**
- `form_inputs`: `ResearchDeepDive | TranslationalResearchDeepDive` - Deep dive questionnaire responses
- `research_objectives`: `list[ResearchObjective]` - Structured research objectives with tasks

**GrantTemplate:**
- `grant_sections`: `list[GrantLongFormSection | GrantElement]` - Template structure
- `cfp_analysis`: `CFPAnalysis` - Analyzed call for proposals

**TextVector:**
- `chunk`: `Chunk` - Text content with metadata

**RagSource:**
- `document_metadata`: `DocumentMetadata` - Extracted document metadata (entities, keywords, categories)

These TypedDict structures provide type safety when accessing JSON fields:

```python
from packages.db.src.json_objects import ResearchDeepDive

application = await session.scalar(
    select_active(GrantApplication).where(GrantApplication.id == app_id)
)

# Type-safe access to JSON fields
if application.form_inputs:
    deep_dive: ResearchDeepDive = application.form_inputs
    hypothesis = deep_dive.get("hypothesis")
```

### Polymorphic Inheritance

`RagSource` uses SQLAlchemy's single-table inheritance pattern:

```python
from packages.db.src.tables import RagSource, RagFile, RagUrl
from packages.db.src.constants import RAG_FILE, RAG_URL

# Query all sources (returns RagFile and RagUrl instances)
all_sources = await session.scalars(select_active(RagSource))

# Query only files
files = await session.scalars(select_active(RagFile))

# Query only URLs
urls = await session.scalars(select_active(RagUrl))

# Check polymorphic type
if source.source_type == RAG_FILE:
    # source is a RagFile instance
    print(f"File: {source.filename}")
elif source.source_type == RAG_URL:
    # source is a RagUrl instance
    print(f"URL: {source.url}")
```

### Self-Referential Relationships

Several tables support hierarchical structures:

**GrantApplication** (parent/children):
```python
# Create revision from existing application
new_version = GrantApplication(
    title=original.title,
    parent_id=original.id,
    project_id=original.project_id,
)
```

**RagSource** (parent/children):
```python
# Create sub-document from parent source
sub_doc = RagUrl(
    url=chapter_url,
    parent_id=main_doc.id,
)
```

**RagGenerationJob** (parent/child jobs):
```python
# Create dependent job
child_job = RagGenerationJob(
    parent_job_id=parent_job.id,
    grant_template_id=template.id,
    template_stage=GrantTemplateStageEnum.TEMPLATE_GENERATION,
)
```
