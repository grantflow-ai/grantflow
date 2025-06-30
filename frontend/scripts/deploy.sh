#!/bin/bash

# Firebase App Hosting Deployment Script
# Usage: ./scripts/deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo "❌ Error: Environment must be 'staging' or 'production'"
    echo "Usage: ./scripts/deploy.sh [staging|production]"
    exit 1
fi

echo "🚀 Deploying to $ENVIRONMENT environment..."

# Switch to correct Firebase project
echo "📋 Switching to $ENVIRONMENT project..."
firebase use $ENVIRONMENT

# Check if the environment-specific config exists
CONFIG_FILE="apphosting.$ENVIRONMENT.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: Configuration file $CONFIG_FILE not found"
    exit 1
fi

echo "✅ Using configuration: $CONFIG_FILE"

# Deploy to Firebase App Hosting
echo "🔄 Deploying to Firebase App Hosting..."
firebase deploy

echo "🎉 Deployment to $ENVIRONMENT completed successfully!"

# Show deployment info
echo ""
echo "📊 Deployment Summary:"
echo "   Environment: $ENVIRONMENT"
echo "   Project: $(firebase use)"
echo "   Config: $CONFIG_FILE"
echo ""

# Show relevant URLs based on environment
if [ "$ENVIRONMENT" = "staging" ]; then
    echo "🔗 Staging URL: https://your-staging-url.app"
else
    echo "🔗 Production URL: https://your-production-url.app"
fi