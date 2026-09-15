#!/bin/sh
set -e
cd /app/web

prisma_migrate() {
  if [ -f ./node_modules/prisma/build/index.js ]; then
    node ./node_modules/prisma/build/index.js migrate deploy
  elif [ -x ./node_modules/.bin/prisma ]; then
    ./node_modules/.bin/prisma migrate deploy
  else
    echo "prisma CLI not found under /app/web/node_modules" >&2
    exit 1
  fi
}

case "${1:-start}" in
  start)
    prisma_migrate
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
    prisma_migrate
    ;;
  *)
    exec "$@"
    ;;
esac
