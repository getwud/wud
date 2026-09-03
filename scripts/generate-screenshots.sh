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
(cd "$ROOT_DIR/ui-e2e" && npm run screenshots)

echo "✅ Screenshots generated successfully in website/docs/assets/screenshots/!"
