# Common Stage
FROM node:24-alpine AS base

LABEL maintainer="fmartinou"
EXPOSE 3000

ARG WUD_VERSION=unknown

ENV WORKDIR=/home/node/app
ENV WUD_LOG_FORMAT=text
ENV WUD_VERSION=$WUD_VERSION

HEALTHCHECK --interval=30s --timeout=5s CMD if [[ -z ${WUD_SERVER_ENABLED} || ${WUD_SERVER_ENABLED} == 'true' ]]; then curl --fail http://localhost:${WUD_SERVER_PORT:-3000}/health || exit 1; else exit 0; fi;

WORKDIR /home/node/app

RUN mkdir /store

# Add useful stuff
RUN apk add --no-cache tzdata openssl curl git jq bash

# Dependencies stage (Build)
FROM base AS build

# Copy app package.json
COPY app/package* ./

# Install dependencies (including dev)
RUN npm ci --include=dev --omit=optional --no-audit --no-fund --no-update-notifier

# Copy app source
COPY app/ ./

# Build
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# Release stage
FROM base AS release

# Default entrypoint
COPY Docker.entrypoint.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh
ENTRYPOINT ["/usr/bin/entrypoint.sh"]
CMD ["node", "dist/index"]

## Copy node_modules
COPY --from=build /home/node/app/node_modules ./node_modules

# Copy app (dist)
COPY --from=build /home/node/app/dist ./dist
COPY --from=build /home/node/app/package.json ./package.json

# Copy ui
COPY ui/dist/ ./ui
