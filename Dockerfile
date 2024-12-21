# Common Stage
FROM node:23-alpine as base

LABEL maintainer="fmartinou"
EXPOSE 3000

ARG WUD_VERSION=unknown

ENV WORKDIR=/home/node/app
ENV WUD_LOG_FORMAT=text
ENV WUD_VERSION=$WUD_VERSION

WORKDIR /home/node/app

RUN mkdir /store

# Add TZDATA to allow easy local time configuration
RUN apk update \
    && apk add --no-cache tzdata openssl \
    && rm -rf /var/cache/apk/*

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
COPY app/ ./

# Copy ui
COPY ui/dist/ ./ui
