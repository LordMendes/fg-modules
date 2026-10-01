# Build from dndtools-reference/: docker build -f web/Dockerfile .
# No "# syntax=docker/dockerfile:1", avoids a Docker Hub pull that can fail with 500 on some hosts.

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
RUN pnpm --filter @fg-modules/web run copy:dice-assets
RUN pnpm --filter @fg-modules/web build
RUN node /app/web/scripts/stage-runtime-packages.mjs

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
COPY --from=builder /app/web/migrate.mjs ./web/migrate.mjs
COPY --from=builder /app/web/docker-entrypoint.sh /docker-entrypoint.sh

# Monorepo standalone layout: .next/standalone/{web,node_modules}
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
# Standalone tracing leaves symlinks here. Docker cannot copy a directory onto a symlink.
RUN rm -rf \
  /app/web/node_modules/sharp \
  /app/web/node_modules/detect-libc \
  /app/web/node_modules/semver \
  /app/web/node_modules/@img/colour \
  /app/web/node_modules/@img/sharp-linux* \
  /app/web/node_modules/@img/sharp-libvips-linux* \
  /app/web/node_modules/@prisma/client \
  /app/web/node_modules/@prisma/client-runtime-utils
# Sharp musl binaries and the Prisma client runtime.
COPY --from=builder --chown=nextjs:nodejs /runtime-pkgs/node_modules/ ./web/node_modules/

RUN chmod +x /docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["start"]
