#!/bin/bash
set -e

# Based on Taskfile.yaml cloud-functions:prepare task
# This script prepares Cloud Functions for deployment by:
# 1. Generating requirements.txt from workspace dependencies
# 2. Removing workspace package references
# 3. Copying workspace packages to function directory

echo "📦 Preparing Cloud Functions for deployment..."

# Generate requirements.txt from workspace dependencies
echo "Generating requirements.txt from workspace dependencies..."
uv export \
  --format requirements-txt \
  --output-file functions/dlq_manager/requirements.txt \
  --no-hashes \
  --no-editable \
  --group functions

# Remove workspace package references (packages will be copied directly)
echo "🔧 Removing workspace package references..."
grep -v "^\./packages/" functions/dlq_manager/requirements.txt > functions/dlq_manager/requirements.txt.tmp
mv functions/dlq_manager/requirements.txt.tmp functions/dlq_manager/requirements.txt

# Copy workspace packages to function directory
echo "📦 Copying workspace packages to dlq_manager function directory..."
cp -r packages functions/dlq_manager/

echo "✅ Cloud Functions prepared for deployment!"
