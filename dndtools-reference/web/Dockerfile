# Build from dndtools-reference/: docker build -f web/Dockerfile .
# No "# syntax=docker/dockerfile:1" — avoids a Docker Hub pull that can fail with 500 on some hosts.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl wget
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY web/package.json ./web/
COPY web/prisma ./web/prisma
COPY web/prisma.config.ts ./web/
# Skip lifecycle scripts: postinstall needs web/scripts/ and public/, not copied in this stage.
RUN pnpm install --frozen-lockfile --ignore-scripts

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY web ./web
COPY data/dndtools /data/dndtools

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @fg-modules/web exec prisma generate
RUN pnpm --filter @fg-modules/web rebuild sharp
# NFT standalone omits Sharp natives, Prisma CLI, and custom-server externals.
# Stash those pnpm packages, then follow their store symlinks (prisma CLI
# needs `effect`, `c12`, ... which are not in the seed list).
RUN mkdir -p /native-pkgs \
  && find /app/node_modules/.pnpm -maxdepth 1 \( \
       -name 'sharp@*' \
       -o -name '@img+sharp-linux*' \
       -o -name '@img+sharp-libvips-linux*' \
       -o -name 'prisma@*' \
       -o -name '@prisma+client@*' \
       -o -name '@prisma+client-runtime-utils@*' \
       -o -name '@prisma+config@*' \
       -o -name '@prisma+debug@*' \
       -o -name '@prisma+engines@*' \
       -o -name '@prisma+engines-version@*' \
       -o -name '@prisma+get-platform@*' \
       -o -name '@prisma+fetch-engine@*' \
       -o -name '@prisma+adapter-pg@*' \
       -o -name '@prisma+driver-adapter-utils@*' \
       -o -name 'ioredis@*' \
       -o -name '@ioredis+commands@*' \
       -o -name 'cluster-key-slot@*' \
       -o -name 'denque@*' \
       -o -name 'redis-errors@*' \
       -o -name 'standard-as-callback@*' \
       -o -name 'ws@*' \
       -o -name 'pg@*' \
     \) -exec cp -a {} /native-pkgs/ \; \
  && prev=0 \
  && curr=$(find /native-pkgs -maxdepth 1 -mindepth 1 | wc -l) \
  && while [ "$curr" -gt "$prev" ]; do \
       prev=$curr; \
       find /native-pkgs -type l | while IFS= read -r link; do \
         resolved=$(readlink -f "$link" || true); \
         [ -n "$resolved" ] || continue; \
         case "$resolved" in \
           /app/node_modules/.pnpm/*) \
             store=${resolved#/app/node_modules/.pnpm/}; \
             store=${store%%/*}; \
             if [ -n "$store" ] && [ -d "/app/node_modules/.pnpm/$store" ] && [ ! -e "/native-pkgs/$store" ]; then \
               cp -a "/app/node_modules/.pnpm/$store" /native-pkgs/; \
             fi; \
             ;; \
         esac; \
       done; \
       curr=$(find /native-pkgs -maxdepth 1 -mindepth 1 | wc -l); \
     done \
  && find /native-pkgs -maxdepth 1 -name 'effect@*' | grep -q . \
  && find /native-pkgs -name '*.node' | grep -q .
RUN pnpm --filter @fg-modules/web run copy:dice-assets
RUN pnpm --filter @fg-modules/web build
RUN pnpm --filter @fg-modules/web import:bundle
# Custom HTTP+WS server (esbuild). Runs with packages external.
RUN pnpm --filter @fg-modules/web run bundle:server

# --- Production ---
# Do not inherit `base` (pnpm). Previous runner `npm install` added 220 packages
# and made Coolify's "exporting layers" step OOM/disk-out on small hosts.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATA_DIR=/data/dndtools

RUN apk add --no-cache libc6-compat openssl wget
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /data/dndtools /data/dndtools
COPY --from=builder /app/web/prisma ./web/prisma
COPY --from=builder /app/web/public ./web/public
COPY --from=builder /app/web/import-dndtools.mjs ./web/import-dndtools.mjs
COPY --from=builder /app/web/server.mjs ./web/server.mjs
COPY --from=builder /app/web/docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=builder /app/web/prisma.config.docker.mjs ./web/prisma.config.mjs

# Monorepo standalone layout: .next/standalone/{web,node_modules}
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static

COPY --from=builder /native-pkgs /tmp/native-pkgs
RUN overlay_pkgs() { \
      target="$1"; \
      mkdir -p "$target"; \
      for src in /tmp/native-pkgs/*; do \
        [ -e "$src" ] || continue; \
        rm -rf "$target/$(basename "$src")"; \
        cp -a "$src" "$target/"; \
      done; \
    } \
  && overlay_pkgs /app/node_modules/.pnpm \
  && overlay_pkgs /app/web/node_modules/.pnpm \
  && find /app/node_modules /app/web/node_modules -name 'sharp-linuxmusl-*.node' | grep -q . \
  && link_web_pkg() { \
       name="$1"; \
       dest="/app/web/node_modules/$name"; \
       [ -e "$dest" ] && return 0; \
       src="$(find /app/node_modules/.pnpm /app/web/node_modules/.pnpm -maxdepth 3 -type d -path "*/node_modules/$name" | head -n 1)"; \
       [ -n "$src" ] || return 1; \
       mkdir -p "$(dirname "$dest")"; \
       ln -sfn "$src" "$dest"; \
     } \
  && link_web_pkg prisma \
  && link_web_pkg ioredis \
  && link_web_pkg ws \
  && link_web_pkg pg \
  && mkdir -p /app/web/node_modules/.bin \
  && ln -sfn ../prisma/build/index.js /app/web/node_modules/.bin/prisma \
  && chmod +x /app/web/node_modules/.bin/prisma /docker-entrypoint.sh \
  && chown -R nextjs:nodejs /app/node_modules /app/web/node_modules \
  && rm -rf /tmp/native-pkgs

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["start"]
