# GrantFlow.AI Indexer Service

This is the document indexing service for GrantFlow.AI, responsible for processing, chunking, and indexing documents for retrieval augmented generation (RAG).

## Project Structure

The indexer service follows a modular architecture:

```
/src
  chunking.py     # Text chunking strategies for different document types
  extraction.py   # Content extraction from various file formats
  files.py        # File handling and processing
  gcs.py          # Google Cloud Storage integration
  indexing.py     # Vector indexing and database operations
  dto.py          # Data transfer objects
  main.py         # Service entry point
```

## Tech Stack

- **SQLAlchemy**: ORM for database access
- **asyncpg**: Asynchronous PostgreSQL driver
- **pgvector**: Vector search extension for PostgreSQL
- **FastAPI**: ASGI web framework for API endpoints
- **AI Services**:
    - Embeddings API for vector embeddings
- **spaCy**: Natural language processing
- **PyPDF2/PyMuPDF**: PDF text extraction
- **docx2txt**: Word document text extraction

## Features

- **Document Processing**: Extract text from various file formats (PDF, DOCX, TXT)
- **Intelligent Chunking**: Split documents into semantic chunks for better retrieval
- **Metadata Extraction**: Extract titles, authors, and other metadata from documents
- **Vector Embeddings**: Generate embeddings for document chunks
- **Database Integration**: Store document chunks and embeddings in PostgreSQL with pgvector

## Usage

The indexer service exposes endpoints for:

- Uploading and indexing new documents
- Batch processing multiple documents
- Managing document collections
- Retrieving document metadata

## Integration

The service integrates with:

- [GCS Notifier Function](../../functions/gcs_notifier/README.md): Notifies the indexer when new files are uploaded to GCS

## Testing

The service includes unit tests and end-to-end tests for document processing:

- **Unit Tests**: Test specific functionality like chunking and extraction
- **End-to-End Tests**: Test the full indexing pipeline with real documents

## Development

For local development:

1. Ensure the database is running: `task db:up`
2. Run the service: `PYTHONPATH=. uvicorn src.main:app --reload`
