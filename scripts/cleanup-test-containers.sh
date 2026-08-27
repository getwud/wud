#!/bin/bash

echo "🧹 Cleaning up test containers..."

# Stop and remove test containers
docker rm -f ecr_sub_sub_test ghcr_radarr gitlab_test hub_alpine_latest hub_homeassistant_202161 hub_nginx_latest lscr_radarr trueforge_radarr quay_prometheus wud 2>/dev/null || true

echo "✅ Test containers cleaned up"