#!/usr/bin/env bash
set -e

if [ $1 == "node" ] && [ $2 == "dist/index" ] && [ ${WUD_LOG_FORMAT} != "json" ]; then
  exec "$@" | ./node_modules/.bin/bunyan -L  -o long
else
  exec "$@"
fi