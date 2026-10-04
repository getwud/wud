#!/usr/bin/env bash
set -e

# Node 24 runtime proxy support: enable --use-env-proxy when proxy env vars are set
if [ -n "${HTTP_PROXY:-}" ] || [ -n "${HTTPS_PROXY:-}" ] || \
   [ -n "${http_proxy:-}" ] || [ -n "${https_proxy:-}" ] || \
   [ -n "${ALL_PROXY:-}" ] || [ -n "${all_proxy:-}" ]; then
  if [[ "${NODE_OPTIONS:-}" != *"--use-env-proxy"* ]]; then
    export NODE_OPTIONS="${NODE_OPTIONS:+${NODE_OPTIONS} }--use-env-proxy"
  fi
fi

# One-shot headless mode: run `node dist/index <command>` directly so the
# JSON output on stdout is never piped through pino-pretty.
# Usage: docker run -e WUD_RUN_MODE=oneshot getwud/wud watch
if [ "${WUD_RUN_MODE}" == "oneshot" ]; then
  if [ "$1" == "node" ] && [ "$2" == "dist/index" ]; then
    shift 2
  fi
  exec node dist/index "$@"
fi

if [ "$1" == "node" ] && [ "$2" == "dist/index" ] && [ "${WUD_LOG_FORMAT}" != "json" ]; then
  exec "$@" | ./node_modules/.bin/pino-pretty \
    --translateTime "SYS:yyyy-mm-dd HH:MM:ss.l" \
    --ignore pid,hostname,name,component \
    --messageFormat '{if component}[{component}] {end}{msg}'
else
  exec "$@"
fi