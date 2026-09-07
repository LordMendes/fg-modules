#!/bin/sh
set -e
cd /app/web
PRISMA="./node_modules/.bin/prisma"

case "${1:-start}" in
  start)
    "$PRISMA" migrate deploy
    # Prefer bundled custom server (WebSocket + Redis); fall back to Next standalone.
    if [ -f /app/web/server.mjs ]; then
      cd /app/web
      exec node server.mjs
    fi
    if [ -f /app/server.mjs ]; then
      cd /app
      exec node server.mjs
    fi
    cd /app
    exec node server.js
    ;;
  import)
    export DATA_DIR="${DATA_DIR:-/data/dndtools}"
    exec node import-dndtools.mjs
    ;;
  migrate)
    "$PRISMA" migrate deploy
    ;;
  *)
    exec "$@"
    ;;
esac
