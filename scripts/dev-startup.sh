#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting GrantFlow Development Environment${NC}"
echo ""

# Check required tools
echo -e "${YELLOW}Checking required tools...${NC}"
MISSING_TOOLS=()

command -v docker >/dev/null 2>&1 || MISSING_TOOLS+=("docker")
command -v docker-compose >/dev/null 2>&1 || MISSING_TOOLS+=("docker-compose")
command -v uv >/dev/null 2>&1 || MISSING_TOOLS+=("uv")
command -v pnpm >/dev/null 2>&1 || MISSING_TOOLS+=("pnpm")
command -v gcloud >/dev/null 2>&1 || MISSING_TOOLS+=("gcloud")

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required tools: ${MISSING_TOOLS[*]}${NC}"
    echo "Please install missing tools before continuing."
    exit 1
fi

echo -e "${GREEN}✅ All required tools are installed${NC}"
echo ""

# Check .env files
echo -e "${YELLOW}Checking environment files...${NC}"
MISSING_ENV_FILES=()

[ -f "frontend/.env" ] || MISSING_ENV_FILES+=("frontend/.env")
[ -f "services/backend/.env" ] || MISSING_ENV_FILES+=("services/backend/.env")
[ -f "services/indexer/.env" ] || MISSING_ENV_FILES+=("services/indexer/.env")
[ -f "services/crawler/.env" ] || MISSING_ENV_FILES+=("services/crawler/.env")

if [ ${#MISSING_ENV_FILES[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing .env files:${NC}"
    for file in "${MISSING_ENV_FILES[@]}"; do
        echo "  - $file"
        if [ -f "${file}.example" ]; then
            echo "    Copy from: cp ${file}.example ${file}"
        fi
    done
    echo ""
    echo "Please create missing .env files before continuing."
    exit 1
fi

echo -e "${GREEN}✅ All .env files are present${NC}"
echo ""

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
task db:migrate || {
    echo -e "${RED}❌ Database migration failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Database migrations complete${NC}"
echo ""

# Seed database (idempotent)
echo -e "${YELLOW}Seeding database...${NC}"
task db:seed || {
    echo -e "${RED}❌ Database seeding failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Database seeding complete${NC}"
echo ""

# Initialize Pub/Sub emulator topics
echo -e "${YELLOW}Initializing Pub/Sub emulator...${NC}"
docker-compose --profile services up -d pubsub-emulator || {
    echo -e "${RED}❌ Failed to start Pub/Sub emulator${NC}"
    exit 1
}

# Wait for Pub/Sub emulator to be ready
echo "Waiting for Pub/Sub emulator to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while ! curl -s http://localhost:8085 >/dev/null 2>&1; do
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo -e "${RED}❌ Pub/Sub emulator failed to start${NC}"
        exit 1
    fi
    echo -n "."
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
done
echo ""

# Run Pub/Sub initialization script
export PUBSUB_EMULATOR_HOST=localhost:8085
export PUBSUB_PROJECT_ID=grantflow
uv run scripts/init-pubsub-emulator.py || {
    echo -e "${RED}❌ Failed to initialize Pub/Sub topics${NC}"
    exit 1
}
echo -e "${GREEN}✅ Pub/Sub emulator initialized${NC}"
echo ""

# Start all services
echo -e "${YELLOW}Starting all services...${NC}"
echo ""
echo -e "${BLUE}📝 Service URLs:${NC}"
echo "  - Backend API: http://localhost:8000"
echo "  - Backend API Docs: http://localhost:8000/schema/swagger"
echo "  - Indexer: http://localhost:8001"
echo "  - Crawler: http://localhost:8002"
echo "  - GCS Emulator: http://localhost:4443"
echo "  - Pub/Sub Emulator: http://localhost:8085"
echo ""
echo -e "${YELLOW}Attaching to Docker Compose logs...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Start services attached to show logs
docker-compose --profile services up || {
    echo -e "${RED}❌ Failed to start services${NC}"
    exit 1
}
