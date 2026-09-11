#!/bin/bash
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

if [ -z "$1" ]; then
  echo "❌ Error: Version argument is required."
  echo "Usage: ./scripts/release.sh <version> [--allow-dirty]"
  echo "Example: ./scripts/release.sh 8.5.0"
  exit 1
fi

VERSION="${1#v}" # Strip leading 'v' if present
ALLOW_DIRTY=false

if [ "$2" = "--allow-dirty" ] || [ "$1" = "--allow-dirty" ]; then
  ALLOW_DIRTY=true
fi

# Semver validation: e.g. 8.5.0, 8.5.0-beta.1
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "❌ Error: Invalid semver format '$VERSION'. Expected format like 8.5.0 or 8.5.0-beta.1"
  exit 1
fi

# Ensure git working tree is clean
if [ "$ALLOW_DIRTY" = false ] && [ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]; then
  echo "❌ Error: Working directory contains uncommitted changes."
  echo "Please commit or stash your changes before releasing, or pass --allow-dirty for testing."
  exit 1
fi

echo "🚀 Preparing release for version $VERSION..."

# 1. Update version in app, ui, and website packages
echo "📦 Updating package versions to $VERSION..."
(cd "$ROOT_DIR/app" && npm version "$VERSION" --no-git-tag-version)
(cd "$ROOT_DIR/ui" && npm version "$VERSION" --no-git-tag-version)
(cd "$ROOT_DIR/website" && npm version "$VERSION" --no-git-tag-version)

# Update OpenAPI specification version
echo "📄 Updating OpenAPI specification version to $VERSION..."
sed -i.bak -E "s/^(    version: ).*/\1$VERSION/" "$ROOT_DIR/app/api/openapi.yaml" && rm -f "$ROOT_DIR/app/api/openapi.yaml.bak"

# 2. Update changelog
echo "📝 Updating changelogs..."
node "$SCRIPT_DIR/update-changelog.js" "$VERSION"

# Build demo UI bundle for documentation
echo "🖥️ Building demo UI bundle..."
(cd "$ROOT_DIR/ui" && npm run build:demo)

# 3. Generate OpenAPI documentation in website
echo "📚 Generating OpenAPI documentation..."
(cd "$ROOT_DIR/website" && npm run gen:api-docs)

# 4. Snapshot Docusaurus documentation for this version
echo "🏷️ Snapshotting Docusaurus documentation as version $VERSION..."
(cd "$ROOT_DIR/website" && npm run docusaurus docs:version "$VERSION")

# 5. Commit and tag release
echo "💾 Committing release changes and creating Git tag $VERSION..."
git -C "$ROOT_DIR" add .
git -C "$ROOT_DIR" commit -m "chore(release): $VERSION" --author="Manfred Martin <16061231+fmartinou@users.noreply.github.com>"
git -C "$ROOT_DIR" tag -a "$VERSION" -m "Release $VERSION"

echo ""
echo "🎉 Release $VERSION successfully prepared and tagged!"
echo "👉 To publish the release upstream, run:"
echo "   git push origin $(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD) --follow-tags"
