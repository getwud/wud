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
  "$@" | ./node_modules/.bin/pino-pretty \
    --translateTime "SYS:yyyy-mm-dd HH:MM:ss.l" \
    --ignore pid,hostname,name,component \
    --messageFormat '{if component}[{component}] {end}{msg}' &
  PIPE_PID=$!
  NODE_PID=$(jobs -p)

  forward_signal() {
    local sig="$1"
    kill -s "$sig" $NODE_PID 2>/dev/null || true
  }

  trap 'forward_signal TERM' SIGTERM
  trap 'forward_signal INT' SIGINT

  wait "$PIPE_PID" 2>/dev/null || true
  wait "$PIPE_PID" 2>/dev/null
  STATUS=$?
  exit $STATUS
else
  exec "$@"
fi
