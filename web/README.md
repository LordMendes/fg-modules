# Arcane Archives — D&D 3.5 Reference Website

Self-hosted Next.js SSR reference site for D&D 3.5 Edition content, backed by PostgreSQL + Prisma.

Part of the `fg-modules` pnpm monorepo (`@fg-modules/web`).

## Prerequisites

- Node.js 22+
- pnpm 10+ (`corepack enable`)
- PostgreSQL 16+ (or Docker)
- Scraped JSON data in `../data/dndtools/`

## Local Development

From the **repo root**:

```bash
# Start PostgreSQL
docker compose up -d postgres

# Install dependencies
pnpm install

# Copy environment
cp web/.env.example web/.env

# Run migrations
pnpm db:deploy

# Import JSON data (~13,800 records)
pnpm import:dndtools

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

You can also run commands from `web/` directly with `pnpm <script>`.

## Environment Variables

Set in `web/.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Random 32-byte secret for session signing |
| `NEXT_PUBLIC_SITE_URL` | Public site URL |

## Coolify Deployment

1. Create a new application in Coolify pointing to the **repo root**.
2. Set Dockerfile to `web/Dockerfile` with build context `.`.
3. Add a PostgreSQL database service and set `DATABASE_URL`.
4. Set `SESSION_SECRET` to a random value (`openssl rand -base64 32`).
5. Set `NEXT_PUBLIC_SITE_URL` to your domain.
6. Deploy — migrations run automatically on startup.
7. Run the import as a one-off command:
   ```
   DATA_DIR=/data/dndtools pnpm import:dndtools
   ```

## Data Import

The import script (`web/prisma/import-dndtools.ts`) runs in 3 passes:

1. **Sources** — deduplicates book/source records
2. **Entities** — imports all 13 categories
3. **Junctions** — resolves spell↔class, domain↔spell, monster↔feat, etc.

Re-running is idempotent (upserts on slug).

## Anti-Scrape Protections

- No public JSON API endpoints
- Server Components for page rendering
- POST-only Server Actions for pagination/search
- Session nonce validation on actions
- In-memory rate limiting (60 req/min pagination, 10 req/min search)

## Project Structure

```
fg-modules/                  # pnpm monorepo root
├── package.json
├── pnpm-workspace.yaml
├── docker-compose.yml
└── web/                     # @fg-modules/web
    ├── prisma/
    ├── src/
    └── Dockerfile
```
