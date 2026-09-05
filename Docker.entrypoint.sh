#!/usr/bin/env bash
set -e

if [ "$1" == "node" ] && [ "$2" == "dist/index" ] && [ "${WUD_LOG_FORMAT}" != "json" ]; then
  exec "$@" | ./node_modules/.bin/pino-pretty \
    --translateTime "SYS:yyyy-mm-dd HH:MM:ss.l" \
    --ignore pid,hostname,name,component \
    --messageFormat '{if component}[{component}] {end}{msg}'
else
  exec "$@"
fi