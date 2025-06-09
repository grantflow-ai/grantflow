# GrantFlow.AI Crawler Service

This service is responsible for crawling funding organization websites and automatically extracting grant-related documents and information.

## Project Structure

```
/src
  ├── main.py          - Main entry point and PubSub message handler
  ├── extraction.py    - URL crawling and document extraction logic
  ├── constants.py     - Service constants and configuration
  └── utils.py         - Utility functions
```

## Features

- Receives crawling requests via Google Cloud Pub/Sub push subscriptions
- Crawls specified URLs to find grant-related content
- Extracts documents like PDFs, DOCs, and other files automatically
- Uses a keyword-based relevancy scoring to prioritize important pages
- Stores URL metadata in the database
- Uploads extracted documents to Google Cloud Storage for indexing
- Handles multiple parent types: grant applications, funding organizations, and grant templates

## Architecture

### PubSub Integration

The crawler service is triggered by messages published to the `url-crawling` topic:

1. Backend publishes a `CrawlingRequest` message to the `url-crawling` topic
2. PubSub pushes the message to the crawler's Cloud Run endpoint
3. Crawler processes the URL and extracts relevant documents
4. Extracted files are uploaded to GCS, triggering the indexer service

### Message Format

The service expects PubSub messages in the following format:

```json
{
	"url": "https://example.com/grants",
	"parent_type": "funding_organization",
	"parent_id": "uuid-of-parent-entity",
	"workspace_id": "optional-workspace-uuid"
}
```

## API Endpoints

- `POST /` - Receives PubSub push messages for URL crawling
    - Expects a PubSub envelope with base64-encoded message data
    - Message data should be a serialized `CrawlingRequest`

## Local Development

### Prerequisites

- Python 3.13+
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

The crawler service requires the following environment variables:

```bash
# Database Configuration
DATABASE_CONNECTION_STRING=postgresql+asyncpg://...
# Service Account Credentials
GCS_SERVICE_ACCOUNT_CREDENTIALS={"type": "service_account", ...}
```

## Deployment

The crawler service is deployed as a Cloud Run service and is triggered by PubSub push subscriptions:

1. **Terraform Configuration**: The service and its PubSub subscription are managed via Terraform
2. **IAM Permissions**: The `pubsub-invoker` service account is used to authenticate PubSub push requests
3. **Dead Letter Queue**: Failed messages are sent to `url-crawling-dlq` after 5 retry attempts

## Error Handling

- Failed crawls are logged and the PubSub message is nacked for retry
- Messages that fail repeatedly are sent to the dead letter queue
- Database errors during URL record creation cause transaction rollback
- Network timeouts and connection errors are handled gracefully
