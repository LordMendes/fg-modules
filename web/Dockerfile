# Build from repo root: docker build -f web/Dockerfile .
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
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY web ./web
COPY data/dndtools /data/dndtools

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @fg-modules/web exec prisma generate
RUN pnpm --filter @fg-modules/web build
RUN pnpm --filter @fg-modules/web import:bundle

# --- Production ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATA_DIR=/data/dndtools

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /data/dndtools /data/dndtools
COPY --from=builder /app/web/prisma ./web/prisma
COPY --from=builder /app/web/public ./web/public
COPY --from=builder /app/web/import-dndtools.mjs ./web/import-dndtools.mjs
COPY --from=builder /app/web/docker-entrypoint.sh /docker-entrypoint.sh
COPY --from=builder /app/web/prisma.config.docker.mjs ./web/prisma.config.mjs

# Monorepo standalone layout: .next/standalone/{web,node_modules}
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static

# Prisma CLI + config deps (migrate deploy reads prisma.config.mjs)
WORKDIR /app/web
RUN npm install prisma@7.8.0 --ignore-scripts --no-package-lock \
  && chown -R nextjs:nodejs node_modules
WORKDIR /app

RUN chmod +x /docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["start"]
