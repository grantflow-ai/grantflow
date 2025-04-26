# GrantFlow.AI Shared Utilities Package

This package contains common utility functions and helpers shared across GrantFlow.AI services.

## Project Structure

The shared utilities package is organized as follows:

```
/src
  __init__.py       # Package exports
  embeddings.py     # Vector embedding utilities for RAG
  env.py            # Environment variable handling
  exceptions.py     # Common exception types
  files.py          # File handling utilities
  logger.py         # Structured logging setup
  patterns.py       # Common design patterns
  ref.py            # Reference handling utilities
  retry.py          # Retry logic for external API calls
  serialization.py  # High-performance serialization utilities
  server.py         # Common server configuration
  sync.py           # Synchronization primitives
```

## Tech Stack

- **msgspec**: High-performance serialization and validation
- **structlog**: Structured logging
- **pydantic**: Data validation (when needed)
- **typing-extensions**: Advanced type annotations

## Key Features

- **Performance**: Optimized for high-throughput operations
- **Type Safety**: Comprehensive type annotations using Python 3.12 syntax
- **Consistency**: Shared patterns across services
- **Logging**: Structured logging with consistent format
- **Error Handling**: Standardized exception handling

## Usage

Import specific utilities from the package in other services:

```python
# Environment variables
from shared_utils.env import get_env, get_bool_env

# Structured logging
from shared_utils.logger import get_logger

# Serialization
from shared_utils.serialization import msgspec_encode, msgspec_decode

# Embedding utilities
from shared_utils.embeddings import get_embeddings, cosine_similarity

# File handling
from shared_utils.files import read_file_content, get_file_extension

# Retry logic
from shared_utils.retry import retry_with_exponential_backoff
```

## Development

When adding new utilities:

1. Keep them focused and single-purpose
2. Add comprehensive type annotations
3. Write unit tests for all functionality
4. Ensure performance is optimized for high-throughput operations
5. Document usage examples in docstrings

## Testing

The utilities package includes unit tests:

```bash
# Run the tests
PYTHONPATH=. uv run pytest tests/
```
