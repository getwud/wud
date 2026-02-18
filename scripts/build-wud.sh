#!/bin/bash

set -e

export DOCKER_BUILDKIT=0

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

echo "🚀 Building WUD..."

# Build wud docker image
docker build -t wud --build-arg WUD_VERSION=local "$SCRIPT_DIR/.."
