#!/bin/bash

set -e

export DOCKER_BUILDKIT=0

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

echo "🚀 Starting WUD container for local e2e tests..."

# Build wud docker image
docker build -t wud --build-arg WUD_VERSION=local "$SCRIPT_DIR/.."

# Run wud docker image
docker run -d \
  --name wud \
  --publish 3000:3000 \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  --env WUD_TRIGGER_MOCK_EXAMPLE_MOCK=mock \
  --env WUD_WATCHER_LOCAL_WATCHBYDEFAULT=false \
  --env WUD_REGISTRY_ECR_PRIVATE_ACCESSKEYID="${AWS_ACCESSKEY_ID:-dummy}" \
  --env WUD_REGISTRY_ECR_PRIVATE_SECRETACCESSKEY="${AWS_SECRET_ACCESSKEY:-dummy}" \
  --env WUD_REGISTRY_ECR_PRIVATE_REGION=eu-west-1 \
  --env WUD_REGISTRY_GHCR_PRIVATE_USERNAME="${GITHUB_USERNAME:-dummy}" \
  --env WUD_REGISTRY_GHCR_PRIVATE_TOKEN="${GITHUB_TOKEN:-dummy}" \
  --env WUD_REGISTRY_GITLAB_PRIVATE_TOKEN="${GITLAB_TOKEN:-dummy}" \
  --env WUD_REGISTRY_LSCR_PRIVATE_USERNAME="${GITHUB_USERNAME:-dummy}" \
  --env WUD_REGISTRY_LSCR_PRIVATE_TOKEN="${GITHUB_TOKEN:-dummy}" \
  --env WUD_REGISTRY_ACR_PRIVATE_CLIENTID="${ACR_CLIENT_ID:-89dcf54b-ef99-4dc1-bebb-8e0eacafdac8}" \
  --env WUD_REGISTRY_ACR_PRIVATE_CLIENTSECRET="${ACR_CLIENT_SECRET:-dummy}" \
  --env WUD_REGISTRY_TRUEFORGE_PRIVATE_USERNAME="${TRUEFORGE_USERNAME:-dummy}" \
  --env WUD_REGISTRY_TRUEFORGE_PRIVATE_TOKEN="${TRUEFORGE_TOKEN:-dummy}" \
  --env WUD_REGISTRY_GCR_PRIVATE_CLIENTEMAIL="${GCR_CLIENT_EMAIL:-gcr@wud-test.iam.gserviceaccount.com}" \
  --env WUD_REGISTRY_GCR_PRIVATE_PRIVATEKEY="${GCR_PRIVATE_KEY:------BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZ\n-----END PRIVATE KEY-----}" \
  --env WUD_AUTH_BASIC_JOHN_USER="john" \
  --env WUD_AUTH_BASIC_JOHN_HASH='$apr1$8zDVtSAY$62WBh9DspNbUKMZXYRsjS/' \
  wud

echo "✅ WUD started on http://localhost:3000"
echo "⏳ Waiting 20 seconds for WUD to fetch updates..."
sleep 20
echo "🎯 Ready for e2e tests!"