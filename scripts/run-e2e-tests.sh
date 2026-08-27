#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

echo "🧪 Running complete e2e test suite..."

# Clean up any previously running containers
echo "🧹 Cleaning up existing test containers..."
docker compose -f "$SCRIPT_DIR/docker-compose.e2e.yml" down -v

# Setup test containers
"$SCRIPT_DIR/setup-test-containers.sh"

# Start all containers using Docker Compose
echo "🚀 Starting test containers and WUD via Docker Compose..."
docker compose -f "$SCRIPT_DIR/docker-compose.e2e.yml" up -d --build

# Wait for WUD to finish its initial container scan
echo "⏳ Waiting for WUD to finish container resolution..."
MAX_WAIT_SECONDS=30
START_TIME=$(date +%s)

while true; do
    if docker logs wud 2>&1 | grep -q "Cron finished"; then
        ELAPSED=$(( $(date +%s) - START_TIME ))
        echo "🎯 Ready for e2e tests! (initial container scan finished in ${ELAPSED}s)"
        break
    fi
    ELAPSED=$(( $(date +%s) - START_TIME ))
    if [ $ELAPSED -ge $MAX_WAIT_SECONDS ]; then
        echo "⚠️ Timed out waiting for initial container scan. Proceeding with tests..."
        break
    fi
    sleep 1
done

# Run e2e tests
if [ "$LOCAL_MODE" = "true" ]; then
    echo "🏃 Running cucumber tests (local mode - skipping @ci-only)..."
    (cd "$SCRIPT_DIR/../e2e" && npm run cucumber:local)
else
    echo "🏃 Running cucumber tests (CI mode)..."
    (cd "$SCRIPT_DIR/../e2e" && npm run cucumber)
fi

# Clean up
echo "🧹 Tearing down test containers..."
docker compose -f "$SCRIPT_DIR/docker-compose.e2e.yml" down -v

echo "✅ E2E tests completed!"