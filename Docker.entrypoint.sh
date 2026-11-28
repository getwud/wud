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
  NODE_PID=""
  PRETTY_PID=""
  SIGNAL_RECEIVED=""
  PENDING_SIGNAL=""

  forward_signal() {
    local sig="$1"
    SIGNAL_RECEIVED="$sig"
    if [ -n "$NODE_PID" ]; then
      kill -s "$sig" "$NODE_PID" 2>/dev/null || true
    else
      PENDING_SIGNAL="$sig"
    fi
  }

  trap 'forward_signal TERM' SIGTERM
  trap 'forward_signal INT' SIGINT

  # Start pino-pretty in its own session (when setsid is available) so TTY
  # signals like Ctrl+C do not terminate the formatter before node flushes
  # its graceful shutdown logs.
  exec 3> >(
    trap '' SIGTERM SIGINT
    if command -v setsid >/dev/null 2>&1; then
      exec setsid ./node_modules/.bin/pino-pretty \
        --translateTime "SYS:yyyy-mm-dd HH:MM:ss.l" \
        --ignore pid,hostname,name,component \
        --messageFormat '{if component}[{component}] {end}{msg}'
    else
      exec ./node_modules/.bin/pino-pretty \
        --translateTime "SYS:yyyy-mm-dd HH:MM:ss.l" \
        --ignore pid,hostname,name,component \
        --messageFormat '{if component}[{component}] {end}{msg}'
    fi
  )
  PRETTY_PID=$!

  "$@" >&3 3>&- &
  NODE_PID=$!
  exec 3>&-

  # Forward any signal received between trap registration and process start.
  if [ -n "$PENDING_SIGNAL" ]; then
    kill -s "$PENDING_SIGNAL" "$NODE_PID" 2>/dev/null || true
    PENDING_SIGNAL=""
  fi

  # Wait until node actually exits, surviving repeated SIGTERM/SIGINT signals
  # that interrupt `wait` without letting `set -e` abort the entrypoint.
  set +e
  STATUS=0
  INTERRUPTED=0
  while true; do
    SIGNAL_RECEIVED=""
    wait "$NODE_PID" 2>/dev/null
    WAIT_STATUS=$?
    if [ "$INTERRUPTED" -eq 1 ] && [ "$WAIT_STATUS" -eq 127 ]; then
      break
    fi
    STATUS=$WAIT_STATUS
    if [ -n "$SIGNAL_RECEIVED" ] && [ "$WAIT_STATUS" -gt 128 ]; then
      INTERRUPTED=1
      continue
    fi
    break
  done

  # Node has exited and closed the write end of the log pipe; wait for
  # pino-pretty to finish flushing remaining logs before PID 1 exits.
  if [ -n "$PRETTY_PID" ]; then
    trap '' SIGTERM SIGINT
    wait "$PRETTY_PID" 2>/dev/null || true
  fi

  exit "$STATUS"
else
  exec "$@"
fi
