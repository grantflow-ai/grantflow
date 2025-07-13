#!/bin/bash
# Script to update service URLs in secrets after infrastructure changes

set -euo pipefail

PROJECT_ID="${1:-grantflow}"
ENVIRONMENT="${2:-staging}"

echo "Updating service URLs for project: $PROJECT_ID, environment: $ENVIRONMENT"

# Get current Cloud Run service URLs
BACKEND_URL=$(gcloud run services describe backend --region=us-central1 --project="$PROJECT_ID" --format="value(status.url)")
CRAWLER_URL=$(gcloud run services describe crawler --region=us-central1 --project="$PROJECT_ID" --format="value(status.url)")
INDEXER_URL=$(gcloud run services describe indexer --region=us-central1 --project="$PROJECT_ID" --format="value(status.url)")
RAG_URL=$(gcloud run services describe rag --region=us-central1 --project="$PROJECT_ID" --format="value(status.url)")
SCRAPER_URL=$(gcloud run services describe scraper --region=us-central1 --project="$PROJECT_ID" --format="value(status.url)")

echo "Found service URLs:"
echo "  Backend: $BACKEND_URL"
echo "  Crawler: $CRAWLER_URL"
echo "  Indexer: $INDEXER_URL"
echo "  RAG: $RAG_URL"
echo "  Scraper: $SCRAPER_URL"

# Update secrets based on environment
if [ "$ENVIRONMENT" = "staging" ]; then
    SECRET_SUFFIX="_STAGING"
else
    SECRET_SUFFIX=""
fi

# Update backend URL secret
echo "Updating NEXT_PUBLIC_BACKEND_API_BASE_URL${SECRET_SUFFIX}..."
echo "$BACKEND_URL" | gcloud secrets versions add "NEXT_PUBLIC_BACKEND_API_BASE_URL${SECRET_SUFFIX}" --data-file=- --project="$PROJECT_ID"

# Store all service URLs in a single secret for internal use
cat > /tmp/service_urls.json <<EOF
{
  "backend": "$BACKEND_URL",
  "crawler": "$CRAWLER_URL",
  "indexer": "$INDEXER_URL",
  "rag": "$RAG_URL",
  "scraper": "$SCRAPER_URL"
}
EOF

echo "Updating SERVICE_URLS${SECRET_SUFFIX} secret..."
gcloud secrets versions add "SERVICE_URLS${SECRET_SUFFIX}" --data-file=/tmp/service_urls.json --project="$PROJECT_ID" 2>/dev/null || \
  (gcloud secrets create "SERVICE_URLS${SECRET_SUFFIX}" --data-file=/tmp/service_urls.json --project="$PROJECT_ID" && \
   echo "Created new secret SERVICE_URLS${SECRET_SUFFIX}")

rm /tmp/service_urls.json

echo "✅ Service URLs updated successfully!"
echo ""
echo "Next steps:"
echo "1. Redeploy frontend to pick up new URLs"
echo "2. Restart any services that depend on these URLs"