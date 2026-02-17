#!/bin/bash

set -e

echo "🐳 Setting up test containers for local e2e tests..."

# Login to private registries (if credentials available)
if [ ! -z "$GITLAB_TOKEN" ]; then
  docker login registry.gitlab.com -u "$GITLAB_USERNAME" -p "$GITLAB_TOKEN"
fi

# Pull nginx as a test image
docker pull nginx:1.10-alpine
docker pull nginx:1.20-alpine

# Tag nginx 1.10 as latest to simulate an update_available
docker tag nginx:1.10-alpine nginx:latest

# Tag nginx as if it was coming from private registries
docker tag nginx:1.10-alpine fmartinou/test:1.0.0
docker tag nginx:1.10-alpine 229211676173.dkr.ecr.eu-west-1.amazonaws.com/test:1.0.0
docker tag nginx:1.10-alpine 229211676173.dkr.ecr.eu-west-1.amazonaws.com/sub/test:1.0.0
docker tag nginx:1.10-alpine 229211676173.dkr.ecr.eu-west-1.amazonaws.com/sub/sub/test:1.0.0

# Pull homeassistant
docker pull homeassistant/home-assistant
docker pull homeassistant/home-assistant:2021.6.1

# Pull traefik
docker pull traefik:2.4.5

echo "✅ Docker images pulled and tagged"

# Run containers for tests
echo "🚀 Starting test containers..."

# ECR
docker run -d --name ecr_sub_sub_test --label 'wud.watch=true' 229211676173.dkr.ecr.eu-west-1.amazonaws.com/sub/sub/test:1.0.0

# GHCR
docker run -d --name ghcr_radarr --label 'wud.watch=true' --label 'wud.tag.include=^\d+\.\d+\.\d+\.\d+-ls\d+$' ghcr.io/linuxserver/radarr:5.14.0.9383-ls245

# GITLAB
docker run -d --name gitlab_test --label 'wud.watch=true' --label 'wud.tag.include=^v16\.[01]\.0$' registry.gitlab.com/gitlab-org/gitlab-runner:v16.0.0

# HUB
docker run -d --name hub_homeassistant_202161 --label 'wud.watch=true' --label 'wud.tag.include=^\d+\.\d+.\d+$' --label 'wud.link.template=https://github.com/home-assistant/core/releases/tag/${major}.${minor}.${patch}' homeassistant/home-assistant:2021.6.1
docker run -d --name hub_homeassistant_latest --label 'wud.watch=true' --label 'wud.watch.digest=true' --label 'wud.tag.include=^latest$' homeassistant/home-assistant
docker run -d --name hub_nginx_120 --label 'wud.watch=true' --label 'wud.tag.include=^\d+\.\d+-alpine$' nginx:1.20-alpine
docker run -d --name hub_nginx_latest --label 'wud.watch=true' --label 'wud.watch.digest=true' --label 'wud.tag.include=^latest$' nginx
docker run -d --name hub_traefik_245 --label 'wud.watch=true' --label 'wud.tag.include=^\d+\.\d+.\d+$' traefik:2.4.5

# LSCR
docker run -d --name lscr_radarr --label 'wud.watch=true' --label 'wud.tag.include=^\d+\.\d+\.\d+\.\d+-ls\d+$' lscr.io/linuxserver/radarr:5.14.0.9383-ls245

# TrueForge
docker run -d --name trueforge_radarr --label 'wud.watch=true' --label 'wud.tag.include=^v\d+\.\d+\.\d+$' --memory 512m --tmpfs /config oci.trueforge.org/containerforge/radarr:6.0.4

# QUAY
docker run -d --name quay_prometheus --label 'wud.watch=true' --label 'wud.tag.include=^v\d+\.\d+\.\d+$' --user root --tmpfs /prometheus:rw,mode=777 quay.io/prometheus/prometheus:v2.52.0

echo "✅ Test containers started (10 containers)"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -E "(ecr_|ghcr_|gitlab_|hub_|lscr_|quay_|trueforge_)"