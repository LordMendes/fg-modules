#!/bin/sh
set -e
cd /app/web

case "${1:-start}" in
  start)
    node migrate.mjs
    exec node server.mjs
    ;;
  import)
    export DATA_DIR="${DATA_DIR:-/data/dndtools}"
    exec node import-dndtools.mjs
    ;;
  migrate)
    exec node migrate.mjs
    ;;
  *)
    exec "$@"
    ;;
esac
