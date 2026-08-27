#!/bin/bash

set -e

echo "🐳 Setting up test containers for local e2e tests..."

# Login to private registries (if credentials available)
if [ ! -z "$GITLAB_TOKEN" ]; then
  docker login registry.gitlab.com -u "$GITLAB_USERNAME" -p "$GITLAB_TOKEN"
fi

# Pull lightweight test images
docker pull nginx:1.10-alpine
docker pull alpine:latest

# Tag old nginx to simulate an update_available (digest mismatch)
docker tag nginx:1.10-alpine nginx:latest

# Tag nginx as if it was coming from various registries to spoof images
docker tag nginx:1.10-alpine fmartinou/test:1.0.0
docker tag nginx:1.10-alpine 229211676173.dkr.ecr.eu-west-1.amazonaws.com/test:1.0.0
docker tag nginx:1.10-alpine 229211676173.dkr.ecr.eu-west-1.amazonaws.com/sub/test:1.0.0
docker tag nginx:1.10-alpine 229211676173.dkr.ecr.eu-west-1.amazonaws.com/sub/sub/test:1.0.0
docker tag nginx:1.10-alpine ghcr.io/linuxserver/radarr:5.14.0.9383-ls245
docker tag nginx:1.10-alpine registry.gitlab.com/gitlab-org/gitlab-runner:v16.0.0
docker tag nginx:1.10-alpine homeassistant/home-assistant:2021.6.1
docker tag nginx:1.10-alpine lscr.io/linuxserver/radarr:5.14.0.9383-ls245
docker tag nginx:1.10-alpine oci.trueforge.org/containerforge/radarr:6.0.4
docker tag nginx:1.10-alpine quay.io/prometheus/prometheus:v2.52.0

echo "✅ Docker images pulled and tagged"

echo "✅ Docker images pulled and tagged. Ready for docker-compose up."