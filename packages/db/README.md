# GrantFlow.AI Database Package

This package contains the shared database models, migrations, and utilities for GrantFlow.AI services.

## Project Structure

The database package is organized as follows:

```
/
  alembic/            # Database migrations
    versions/         # Individual migration scripts
    env.py            # Alembic environment configuration
    script.py.mako    # Template for migration script generation
  alembic.ini         # Alembic configuration file
  pg-extensions.sql   # PostgreSQL extensions setup script
  src/
    __init__.py       # Package exports
    connection.py     # Database connection utilities
    constants.py      # Database-related constants
    enums.py          # Shared enumeration types
    json_objects.py   # JSON object structures for DB columns
    tables.py         # SQLAlchemy model definitions
```

## Tech Stack

- **SQLAlchemy 2.0+**: Modern ORM with asyncio support
- **Alembic**: Database migration tool
- **PostgreSQL**: Primary database with pgvector extension
- **asyncpg**: Fast asynchronous PostgreSQL driver
- **Python 3.13+**: Leveraging latest type annotations

## Key Features

- **Async-first**: All database operations support async/await
- **Strictly Typed**: Comprehensive type annotations with Python 3.13 syntax
- **Migration Support**: Alembic integration for database versioning
- **Vector Operations**: pgvector integration for embedding storage and similarity search

## Core Models

The database schema includes the following primary models:

1. **Project**: Research projects for organizing grant applications
2. **GrantApplication**: Grant application data and metadata
3. **GrantTemplate**: Structured template for grant applications
4. **FundingOrganization**: Information about funding organizations
5. **RagFile**: Files indexed for RAG operations
6. **GrantApplicationFile**: Mapping between applications and files

For a visual representation of the database schema and entity relationships, see the [Data Model Diagram](../../diagrams/db/data-model.md).

## Database Migrations

Database migrations are handled through Alembic:

```bash
# Create a new migration (from the db package directory)
PYTHONPATH=. uv run alembic revision --autogenerate -m "description"

# Apply migrations
PYTHONPATH=. uv run alembic upgrade head
```

Migrations are also accessible through the Taskfile in the root repository:

```bash
# Create migration
task db:create-migration -- "description"

# Apply migrations
task db:migrate
```

## Usage in Services

The database package is designed to be imported by other services:

```python
from db.tables import Project, GrantApplication
from db.connection import get_async_session_maker
from sqlalchemy import select

async def get_project(project_id: UUID) -> Project:
    async_session_maker = get_async_session_maker()
    async with async_session_maker() as session:
        project = await session.scalar(
            select(Project).where(Project.id == project_id)
        )
        return project
```

## Development

When making changes to the database models:

1. Update the SQLAlchemy models in `src/tables.py`
2. Create a migration using Alembic
3. Test the migration locally
4. Update any relevant DTOs in the services using these models