#!/bin/sh
set -e
cd /app/web
PRISMA="./node_modules/.bin/prisma"

case "${1:-start}" in
  start)
    "$PRISMA" migrate deploy
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
