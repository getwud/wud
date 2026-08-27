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

# Run containers for tests
echo "🚀 Starting test containers..."

# ECR
docker run -d --name ecr_sub_sub_test --label 'wud.watch=true' 229211676173.dkr.ecr.eu-west-1.amazonaws.com/sub/sub/test:1.0.0 tail -f /dev/null

# GHCR
docker run -d --name ghcr_radarr --label 'wud.watch=true' --label 'wud.tag.include=^\d+\.\d+\.\d+\.\d+-ls\d+$' ghcr.io/linuxserver/radarr:5.14.0.9383-ls245 tail -f /dev/null

# GITLAB
docker run -d --name gitlab_test --label 'wud.watch=true' --label 'wud.tag.include=^v16\.[01]\.0$' registry.gitlab.com/gitlab-org/gitlab-runner:v16.0.0 tail -f /dev/null

# HUB
docker run -d --name hub_alpine_latest --label 'wud.watch=true' --label 'wud.watch.digest=true' --label 'wud.tag.include=^latest$' alpine:latest tail -f /dev/null
docker run -d --name hub_homeassistant_202161 --label 'wud.watch=true' --label 'wud.tag.include=^\d+\.\d+.\d+$' --label 'wud.link.template=https://github.com/home-assistant/core/releases/tag/${major}.${minor}.${patch}' homeassistant/home-assistant:2021.6.1 tail -f /dev/null
docker run -d --name hub_nginx_latest --label 'wud.watch=true' --label 'wud.watch.digest=true' --label 'wud.tag.include=^latest$' nginx:latest tail -f /dev/null

# LSCR
docker run -d --name lscr_radarr --label 'wud.watch=true' --label 'wud.tag.include=^\d+\.\d+\.\d+\.\d+-ls\d+$' lscr.io/linuxserver/radarr:5.14.0.9383-ls245 tail -f /dev/null

# TrueForge
docker run -d --name trueforge_radarr --label 'wud.watch=true' --label 'wud.tag.include=^v\d+\.\d+\.\d+$' --memory 512m --tmpfs /config oci.trueforge.org/containerforge/radarr:6.0.4 tail -f /dev/null

# QUAY
docker run -d --name quay_prometheus --label 'wud.watch=true' --label 'wud.tag.include=^v\d+\.\d+\.\d+$' --user root --tmpfs /prometheus:rw,mode=777 quay.io/prometheus/prometheus:v2.52.0 tail -f /dev/null

echo "✅ Test containers started (9 containers)"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -E "(ecr_|ghcr_|gitlab_|hub_|lscr_|quay_|trueforge_)"