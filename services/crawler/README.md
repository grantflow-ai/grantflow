# GrantFlow.AI Crawler Service

This service is responsible for crawling funding organization websites and automatically extracting grant-related documents and information.

## Project Structure

```
/src
  ├── main.py          - Main entry point and API endpoint
  ├── extraction.py    - URL crawling and document extraction logic
```

## Features

- Crawls specified URLs to find grant-related content
- Extracts documents like PDFs, DOCs, and other files automatically
- Uses a keyword-based relevancy scoring to prioritize important pages
- Uploads extracted documents to Google Cloud Storage for further processing
- Integrates with the Indexer service to make documents searchable

## API Endpoints

- `POST /` - Submit a URL for crawling
    - Request body:
        ```json
        {
        	"url": "https://funding-organization.com/grant-page",
        	"type": "grant_template",
        	"parent_id": "uuid-of-parent-entity"
        }
        ```

## Local Development

### Prerequisites

- Python 3.12+
- Docker
- Google Cloud Storage emulator (provided in docker-compose)

### Running the Service

```bash
# Using Docker Compose
docker compose --profile crawler up -d

# Using Task Runner
task service:crawler:dev

# Run tests
task service:crawler:test
```

### Environment Variables

Copy the `.env.example` file to `.env` and adjust as needed:

```bash
cp .env.example .env
```

## Notes

This service is currently a work in progress. Future enhancements will include:

- Improved document classification
- Scheduled crawling of known funding sources
- Text extraction from crawled documents
- Automatic grant deadline detection
