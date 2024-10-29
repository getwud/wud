# Common Stage
FROM node:18-alpine as base

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

# Dependencies Stage (Backend)
FROM base as dependencies

# Copy backend package files
COPY app/package*.json ./

# Install backend dependencies
RUN npm ci --omit=dev --omit=optional --no-audit --no-fund --no-update-notifier

# Frontend Build Stage
FROM base as ui-builder

# Set working directory to UI folder
WORKDIR /home/node/ui

# Copy UI package files
COPY ui/package*.json ./

# Install UI dependencies
RUN npm install

# Copy all UI source files
COPY ui/ ./

# Build the UI
RUN npm run build

# Release Stage
FROM base as release

# Default entrypoint
COPY Docker.entrypoint.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh
ENTRYPOINT ["/usr/bin/entrypoint.sh"]
CMD ["node", "index"]

# Copy backend dependencies
COPY --from=dependencies /home/node/app/node_modules ./node_modules

# Copy backend app files
COPY app/ ./

# Copy built UI from the ui-builder stage
COPY --from=ui-builder /home/node/ui/dist ./ui
