#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

echo "🧪 Running UI integration tests..."

# Cleanup any existing containers
echo "🧹 Cleaning up existing test containers..."
docker compose -f "$SCRIPT_DIR/docker-compose.e2e.yml" down -v

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

# Install dependencies for UI tests
echo "📦 Installing UI test dependencies..."
(cd "$SCRIPT_DIR/../ui-e2e" && npm install)

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
(cd "$SCRIPT_DIR/../ui-e2e" && npx playwright install)

# Run Playwright tests
echo "🏃 Running Playwright tests..."
(cd "$SCRIPT_DIR/../ui-e2e" && npm test)

echo "✅ UI integration tests completed!"

# Cleanup (Optional - comment out if you want to inspect after success)
# docker compose -f "$SCRIPT_DIR/docker-compose.e2e.yml" down -v
