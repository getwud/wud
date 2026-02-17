#!/bin/bash

set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

echo "🧪 Running complete e2e test suite..."

# Cleanup any existing containers
"$SCRIPT_DIR/cleanup-test-containers.sh"

# Setup test containers
"$SCRIPT_DIR/setup-test-containers.sh"

# Start WUD
"$SCRIPT_DIR/start-wud.sh"

# Run e2e tests
echo "🏃 Running cucumber tests..."
(cd "$SCRIPT_DIR/../e2e" && npm run cucumber)

echo "✅ E2E tests completed!"