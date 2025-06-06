#!/bin/bash
set -e

# Drop the development database
echo "Dropping the development database..."

# Get the database name from the connection string
DB_NAME="local"
DB_USER="local"

# Connect to postgres database to drop the local database
# Drop all connections to the database
docker compose exec -T db psql -U local -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" || true

# Drop the database
docker compose exec -T db psql -U local -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

# Recreate the database
docker compose exec -T db psql -U local -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Create required extensions
echo "Creating database extensions..."
docker compose exec -T db psql -U local -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
docker compose exec -T db psql -U local -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"vector\";"

echo "Database dropped and recreated successfully!"
