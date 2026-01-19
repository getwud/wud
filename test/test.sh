#!/bin/bash

set -e

# Pull Alpine
docker pull nginx:1.10-alpine

# Tag as if coming from private Hub, ECR...

# Private docker hib
docker tag nginx:1.10-alpine fmartinou/test:1.0.0

# ECR
docker tag nginx:1.10-alpine 229211676173.dkr.ecr.eu-west-1.amazonaws.com/test:1.0.0
docker tag nginx:1.10-alpine 229211676173.dkr.ecr.eu-west-1.amazonaws.com/sub/test:1.0.0
docker tag nginx:1.10-alpine 229211676173.dkr.ecr.eu-west-1.amazonaws.com/sub/sub/test:1.0.0

# GCR
docker tag nginx:1.10-alpine gcr.io/wud-test/test:1.0.0
docker tag nginx:1.10-alpine gcr.io/wud-test/sub/test:1.0.0
docker tag nginx:1.10-alpine gcr.io/wud-test/sub/sub/test:1.0.0

# ACR
docker tag nginx:1.10-alpine wudtest.azurecr.io/test:1.0.0
docker tag nginx:1.10-alpine wudtest.azurecr.io/sub/test:1.0.0
docker tag nginx:1.10-alpine wudtest.azurecr.io/sub/sub/test:1.0.0

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

docker-compose -f "$SCRIPT_DIR/docker-compose.yml" down --remove-orphans

docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d