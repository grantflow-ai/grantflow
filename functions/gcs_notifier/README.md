# GrantFlow.AI GCS Notifier Function

This Cloud Function serves as a notification bridge between Google Cloud Storage (GCS) and the GrantFlow.AI indexer service. It listens for GCS events (such as file uploads) and forwards them to the indexer service for processing.

## Overview

The GCS Notifier function:

1. Receives Cloud Events when files are created or updated in configured GCS buckets
2. Extracts the file path information from the event
3. Forwards the file details to the indexer service via HTTP
4. Logs the result of the forwarding operation

## Configuration

The function requires the following environment variables:

- `INDEXER_URL`: The base URL of the indexer service (e.g., `https://indexer-service.example.com`)

## Deployment

This Cloud Function is designed to be deployed to Google Cloud Functions with a GCS trigger.

## Integration

The function integrates with:

- [Indexer Service](../../services/indexer/README.md): Receives the file notifications and performs document processing and indexing

## Development

For local development:

1. Install dependencies: `uv sync`
2. Test the function with the Functions Framework: `functions-framework --target=process_gcs_event --signature-type=cloudevent`
