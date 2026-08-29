#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

echo "🧪 Running UI integration tests..."

# Cleanup any existing containers
echo "🧹 Cleaning up existing test containers..."
docker compose -f "$SCRIPT_DIR/docker-compose.e2e.yml" down -v

cleanup() {
  STATUS=$?
  if [ $STATUS -ne 0 ]; then
    echo "❌ Tests failed! Showing WUD logs:"
    docker logs wud || true
  fi
  echo "🧹 Tearing down test containers..."
  docker compose -f "$SCRIPT_DIR/docker-compose.e2e.yml" down -v
}
trap cleanup EXIT

# Setup test containers
"$SCRIPT_DIR/setup-test-containers.sh"

# Start WUD and test containers via Docker Compose
echo "🚀 Starting test containers and WUD via Docker Compose..."
docker compose -f "$SCRIPT_DIR/docker-compose.e2e.yml" up -d --build

# Wait for WUD to be responsive
echo "⏳ Waiting for WUD to be responsive..."
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ WUD is up!"
    break
  fi
  echo "zzz..."
  sleep 2
done

# Wait for WUD to finish its initial container scan
echo "⏳ Waiting for WUD to finish container resolution..."
MAX_WAIT_SECONDS=30
START_TIME=$(date +%s)

while true; do
  if docker logs wud 2>&1 | grep -q "Cron finished"; then
    ELAPSED=$(( $(date +%s) - START_TIME ))
    echo "🎯 Ready for UI tests! (initial container scan finished in ${ELAPSED}s)"
    break
  fi
  ELAPSED=$(( $(date +%s) - START_TIME ))
  if [ $ELAPSED -ge $MAX_WAIT_SECONDS ]; then
    echo "⚠️ Timed out waiting for initial container scan. Proceeding with tests..."
    break
  fi
  sleep 1
done

# Install dependencies for UI tests
echo "📦 Installing UI test dependencies..."
(cd "$SCRIPT_DIR/../ui-e2e" && npm ci)

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
(cd "$SCRIPT_DIR/../ui-e2e" && npx playwright install --with-deps chromium)

# Run Playwright tests
echo "🏃 Running Playwright tests..."
(cd "$SCRIPT_DIR/../ui-e2e" && npm test)

echo "✅ UI integration tests completed!"
