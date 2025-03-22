# GrantFlow.AI Backend

This is the backend service for GrantFlow.AI, built with Litestar, SQLAlchemy, PostgreSQL, and AI services.

## Project Structure

The backend follows a modular architecture:

```
/src
  /api               # API routes and endpoints
    /routes          # Route handlers for different resources
    middleware.py    # API middleware
    main.py          # API entry point
  /db                # Database models and connection
    tables.py        # SQLAlchemy models
    base.py          # Base model definitions
    connection.py    # Database connection handling
    enums.py         # Enumeration types
    json_objects.py  # JSON object definitions
  /indexer           # Document indexing functionality
    chunking.py      # Text chunking for indexing
    files.py         # File handling for indexing
    indexing.py      # Core indexing functionality
  /rag               # Retrieval Augmented Generation
    /grant_application # Grant application RAG functionality
    /grant_template  # Grant template RAG functionality
    completion.py    # LLM completion utilities
    retrieval.py     # Document retrieval utilities
  /utils             # Utility functions
    ai.py            # AI service integration
    db.py            # Database utilities
    embeddings.py    # Vector embedding utilities
    firebase.py      # Firebase authentication
    jwt.py           # JWT token handling
    serialization.py # Data serialization
```

## Tech Stack

- **Litestar**: Fast ASGI web framework
- **SQLAlchemy**: ORM for database access
- **asyncpg**: Asynchronous PostgreSQL driver
- **pgvector**: Vector search extension for PostgreSQL
- **AI Services**:
    - Google Cloud AI (Vertex AI) for LLM integration
    - Anthropic Claude for LLM integration
- **Firebase**: Authentication
- **msgspec**: High-performance serialization
- **structlog**: Structured logging
- **spaCy**: Natural language processing

## Getting Started

### Prerequisites

- Python 3.12+
- PostgreSQL 17+ with pgvector extension
- uv (Python package manager)

### Environment Setup

Create a `.env` file by copying the `.env.example` file:

```bash
cp .env.example .env
```

Update the environment variables as needed.

## Data Model & Serialization

### TypedDict Approach

The backend uses TypedDict for DTOs instead of Pydantic:

- **TypedDicts**: Located in `src/dto.py`, `src/rag/dto.py`, and `src/api/api_types.py`
- **NotRequired**: Used for optional fields with complete docstrings
- **msgspec**: Used for high-performance serialization in `src/utils/serialization.py`

### Database Models

SQLAlchemy models are defined in `src/db/tables.py`:

- **Workspaces**: Research workspaces for organizing grant applications
- **GrantApplications**: Grant application data and metadata
- **FundingOrganizations**: Information about funding organizations
- **RagFile**: Files indexed for RAG operations

## Testing

### Testing Framework

- **pytest**: Test framework with pytest-asyncio for async tests
- **Docker-based PostgreSQL**: Test database with pgvector extension
- **polyfactory**: Factory pattern for test data generation

### Test Structure

- **Unit Tests**: Test specific functionality in isolation
- **API Tests**: Test endpoints using Litestar's test client
- **End-to-End Tests**: Controlled with `E2E_TESTS` environment variable

### Running Tests

```bash
# Run all tests
uv run python -m pytest

# Run specific test file
uv run python -m pytest tests/path/to/test.py

# Run specific test
uv run python -m pytest tests/path/to/test.py::test_name

# Run with verbose output
uv run python -m pytest -v

# Run with coverage
uv run python -m pytest --cov=src
```

## Code Style Conventions

- **Line Length**: 120 character line length
- **Docstrings**: Google docstring format
- **Types**: Python 3.12 syntax with comprehensive type hints
- **Patterns**:
    - Use async/await for database operations
    - Sort kwargs alphabetically
    - For 3+ arguments, use kwargs only (e.g., `def func(*, arg1, arg2, arg3)`)
    - Prefer functional approach over OOP
    - Use TypedDict for data transfer objects

## RAG Architecture

The RAG system is designed to assist in generating grant applications:

1. **Document Indexing**: Process and index relevant documents
2. **Query Generation**: Create targeted queries for document retrieval
3. **Retrieval**: Fetch the most relevant document chunks
4. **Generation**: Use LLMs to generate high-quality content
5. **Post-Processing**: Refine and format the generated content
