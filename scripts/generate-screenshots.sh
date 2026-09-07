#!/bin/bash
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR="$SCRIPT_DIR/.."

echo "📸 Generating WUD documentation screenshots..."

# 1. Build UI in demo mode
echo "📦 Building UI in demo mode..."
(cd "$ROOT_DIR/ui" && npm run build:demo)

# 2. Run Playwright screenshot capture
echo "🖼️ Capturing screenshots with Playwright..."
(cd "$ROOT_DIR/ui-e2e" && echo "Installing ui-e2e dependencies..." && npm ci)

# Ensure Playwright browsers are downloaded (chromium). Use non-root download
# which avoids attempting to install OS packages. CI already runs with
# `npx playwright install --with-deps chromium` so this is mainly for local usage.
(cd "$ROOT_DIR/ui-e2e" && echo "Downloading Playwright browsers (chromium)..." && npx playwright install chromium)

(cd "$ROOT_DIR/ui-e2e" && npm run screenshots)

echo "✅ Screenshots generated successfully in website/docs/assets/screenshots/!"
