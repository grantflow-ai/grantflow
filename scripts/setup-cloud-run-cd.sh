#!/bin/bash
# Setup Cloud Run continuous deployment from GitHub

set -euo pipefail

PROJECT_ID="${1:-grantflow}"
REGION="${2:-us-central1}"
BRANCH="${3:-development}"

echo "Setting up Cloud Run continuous deployment for $PROJECT_ID"

# Services to configure
SERVICES=("backend" "crawler" "indexer" "rag" "scraper")

for SERVICE in "${SERVICES[@]}"; do
    echo "Configuring $SERVICE..."
    
    # Connect to GitHub repository
    gcloud run services update $SERVICE \
        --region=$REGION \
        --project=$PROJECT_ID \
        --update-annotations="run.googleapis.com/launch-stage=BETA" \
        --update-annotations="run.googleapis.com/continuous-deployment-config={
            \"branch\": \"$BRANCH\",
            \"repo\": \"grantflow-ai/monorepo\",
            \"path\": \"services/$SERVICE\",
            \"dockerfile\": \"Dockerfile\"
        }"
done

echo "✅ Continuous deployment configured!"
echo ""
echo "Now Cloud Run will automatically deploy when you push to $BRANCH"
echo "URLs will remain stable - services are updated, not recreated"