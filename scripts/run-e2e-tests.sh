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

# Wait dynamically for WUD to be healthy and have resolved all containers
echo "⏳ Waiting for WUD to start and resolve all containers..."
MAX_WAIT_SECONDS=30
START_TIME=$(date +%s)

while true; do
    CONTAINERS_JSON=$(curl -s -u "${WUD_USERNAME:-john}:${WUD_PASSWORD:-doe}" http://localhost:3000/api/containers 2>/dev/null || echo "[]")
    
    CONTAINER_COUNT=$(node -e "
        try {
            const arr = JSON.parse(process.argv[1]);
            if (Array.isArray(arr) && arr.length >= 9 && arr.every(c => c.result || c.error)) {
                console.log(arr.length);
            } else {
                console.log(0);
            }
        } catch (e) {
            console.log(0);
        }
    " "$CONTAINERS_JSON" 2>/dev/null || echo "0")

    if [ "$CONTAINER_COUNT" -ge 9 ]; then
        ELAPSED=$(( $(date +%s) - START_TIME ))
        echo "🎯 Ready for e2e tests! (all $CONTAINER_COUNT containers resolved in ${ELAPSED}s)"
        break
    fi

    ELAPSED=$(( $(date +%s) - START_TIME ))
    if [ $ELAPSED -ge $MAX_WAIT_SECONDS ]; then
        echo "⚠️ Timed out after ${MAX_WAIT_SECONDS}s waiting for containers to resolve. Proceeding with tests..."
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