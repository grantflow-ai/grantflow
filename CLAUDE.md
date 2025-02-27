# GrantFlow Backend

## Common Commands

### Setup & Dependencies
```bash
uv sync                          # Install dependencies
task update                      # Update dependencies and pre-commit hooks
```

### Development
```bash
uvicorn src.main:app --reload    # Run server with hot reloading
```

### Testing
```bash
uv run python -m pytest          # Run all tests
uv run python -m pytest tests/<path> -v                       # Verbose test output
uv run python -m pytest -xvs tests/path/to/test.py::test_name # Specific test function
```

### Code Quality
```bash
uv run pre-commit run --all-files # Run all checks (ruff, mypy, etc.)
uv run ruff check --fix .         # Lint code
uv run ruff format .              # Format code
uv run mypy                       # Type checking
```

### Database
```bash
task create-migration            # Create migration
task migrate                     # Apply migrations
```

## Project Architecture

- `/src`: Source code
  - `/api`: API routes and endpoints
  - `/db`: Database models and connection
  - `/indexer`: Document indexing functionality
  - `/rag`: Retrieval Augmented Generation features
  - `/utils`: Utility functions

## Data Model & Serialization

- Uses **TypedDict** for DTOs instead of Pydantic (see `src/dto.py`, `src/rag/dto.py`, `src/api_types.py`)
- Uses `NotRequired` for optional fields with complete docstrings
- Uses **msgspec** for high-performance serialization in `src/utils/serialization.py`
- For tests, uses polyfactory's TypedDictFactory and SQLAlchemyFactory in `tests/factories.py`

## Testing Strategy

- **Docker-based PostgreSQL** container with pgvector extension for test database
- **End-to-End Tests**: Controlled with `E2E_TESTS` environment variable
- **API Tests**: Uses Sanic's ASGI test client
- **Test Data**: 
  - Fixtures in `tests/test_data/fixtures/`
  - Factory pattern with polyfactory
- **Async Testing**: 
  - Uses pytest-asyncio
  - Async fixtures for database operations

## Code Style Conventions

- **Formatting**: 120 character line length; Google docstring format
- **Types**: Python 3.12 syntax; comprehensive type hints required
- **Patterns**:
  - Use async/await for database operations
  - No inline comments
  - Sort kwargs alphabetically
  - For 3+ arguments, use kwargs only (e.g., `def func(*, arg1, arg2, arg3)`)
  - Prefer functional approach over OOP