# Common Stage
FROM node:24-alpine AS base
WORKDIR /home/node/app

# App dependency stage
FROM base AS app-dependencies
COPY app/package* ./
RUN npm ci --omit=dev --omit=optional --no-audit --no-fund --no-update-notifier

# UI stage - building UI assets
FROM base AS ui-dependencies
COPY ./ui ./
RUN pwd && tree .
RUN npm ci --no-audit --no-fund --no-update-notifier && npm run build

# Release stage
FROM base AS release 

LABEL maintainer="fmartinou"
EXPOSE 3000
ARG WUD_VERSION=unknown

ENV WORKDIR=/home/node/app
ENV WUD_LOG_FORMAT=text
ENV WUD_VERSION=$WUD_VERSION

HEALTHCHECK --interval=30s --timeout=5s CMD if [[ -z ${WUD_SERVER_ENABLED} || ${WUD_SERVER_ENABLED} == 'true' ]]; then curl --fail http://localhost:${WUD_SERVER_PORT:-3000}/health || exit 1; else exit 0; fi;

# Setup directory structure
RUN mkdir /store

# Add useful stuff
# RUN apk add --no-cache tzdata openssl curl git jq bash
RUN apk add --no-cache tzdata openssl curl bash

COPY Docker.entrypoint.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh

## Copy dependencies and artifacts
COPY --from=app-dependencies /home/node/app/node_modules ./node_modules
COPY --from=ui-dependencies /home/node/app/dist/ ./ui

# Copy app source
COPY app/ ./

ENTRYPOINT ["/usr/bin/entrypoint.sh"]
CMD ["node", "index"]
