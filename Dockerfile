# App build stage
FROM node:24-alpine AS app-build
WORKDIR /home/node/app
RUN apk add --no-cache python3 make g++
COPY app/package*.json ./
RUN npm ci --include=dev --omit=optional --no-audit --no-fund --no-update-notifier
COPY app/ ./
RUN npm run build
RUN npm prune --omit=dev \
    && find node_modules -path 'node_modules/better-sqlite3' -prune -o \
        -type d \( \
            -name '__tests__' -o -name '__mocks__' -o -name 'test' -o -name 'tests' \
            -o -name 'example' -o -name 'examples' -o -name 'docs' \
            -o -name '.github' -o -name '.vscode' -o -name '.idea' \
            -o -name 'coverage' -o -name '@types' \
        \) -prune -exec rm -rf {} + \
    && find node_modules -path 'node_modules/better-sqlite3' -prune -o \
        -type f \( \
            -name '*.map' -o -name '*.d.ts' -o -name '*.d.mts' -o -name '*.d.cts' \
            -o -iname '*.md' -o -iname '*.markdown' -o -iname '*.mkd' \
            -o -name '*.tsbuildinfo' -o -name '.DS_Store' -o -name 'Thumbs.db' \
        \) -exec rm -f {} +

# UI build stage
FROM --platform=$BUILDPLATFORM node:24-alpine AS ui-build
WORKDIR /home/node/ui
COPY ui/package*.json ./
RUN npm ci --include=dev --omit=optional --no-audit --no-fund --no-update-notifier
COPY ui/ ./
RUN npm run build

# Release stage
FROM node:24-alpine AS release
WORKDIR /home/node/app

LABEL maintainer="fmartinou"
EXPOSE 3000
ARG WUD_VERSION=unknown
ENV WORKDIR=/home/node/app
ENV WUD_LOG_FORMAT=text
ENV WUD_VERSION=$WUD_VERSION

HEALTHCHECK --interval=30s --timeout=5s CMD \
    case "${WUD_SERVER_ENABLED:-true}" in [Tt][Rr][Uu][Ee]) ;; *) exit 0 ;; esac; \
    case "${WUD_SERVER_TLS_ENABLED:-false}" in \
        [Tt][Rr][Uu][Ee]) curl --fail --silent --show-error --insecure "https://localhost:${WUD_SERVER_PORT:-3000}/health" || exit 1 ;; \
        *) curl --fail --silent --show-error "http://localhost:${WUD_SERVER_PORT:-3000}/health" || exit 1 ;; \
    esac

RUN apk add --no-cache tzdata openssl curl bash libstdc++

COPY Docker.entrypoint.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh

# Copy app runtime artifacts
COPY --from=app-build /home/node/app/node_modules ./node_modules
COPY --from=app-build /home/node/app/dist ./dist
COPY --from=app-build /home/node/app/package.json ./package.json
COPY app/.pino-prettyrc.json ./.pino-prettyrc.json

# Copy UI build output
COPY --from=ui-build /home/node/ui/dist ./ui

ENTRYPOINT ["/usr/bin/entrypoint.sh"]
CMD ["node", "dist/index"]
