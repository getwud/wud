# App build stage
FROM node:24-alpine AS app-build
WORKDIR /home/node/app
RUN apk add --no-cache python3 make g++
COPY app/package*.json ./
RUN npm ci --include=dev --omit=optional --no-audit --no-fund --no-update-notifier
COPY app/ ./
RUN npm run build
RUN npm prune --omit=dev

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

HEALTHCHECK --interval=30s --timeout=5s CMD if [[ -z ${WUD_SERVER_ENABLED} || ${WUD_SERVER_ENABLED} == 'true' ]]; then curl --fail http://localhost:${WUD_SERVER_PORT:-3000}/health || exit 1; else exit 0; fi;

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
