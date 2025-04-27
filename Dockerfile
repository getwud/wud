# Common Stage
FROM node:23-slim as base

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
RUN apt update \
    && apt install -y tzdata openssl curl git jq \
    && rm -rf /var/cache/apt/*

# Dependencies stage
FROM base as dependencies

# Copy app package.json
COPY app/package* ./

# Install dependencies
RUN npm ci --omit=dev --omit=optional --no-audit --no-fund --no-update-notifier

# Release stage
FROM base as release

# Default entrypoint
COPY Docker.entrypoint.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh
ENTRYPOINT ["/usr/bin/entrypoint.sh"]
CMD ["node", "index"]

## Copy node_modules
COPY --from=dependencies /home/node/app/node_modules ./node_modules

# Copy app
COPY app/dist ./

# Copy ui
COPY ui/dist/ ./ui
