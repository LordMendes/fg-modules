# Arcane Archives — D&D 3.5 Reference Website

Self-hosted Next.js SSR reference site for D&D 3.5 Edition content, backed by PostgreSQL + Prisma.

Part of the `dndtools-reference` pnpm workspace (`@fg-modules/web`).

## Prerequisites

- Node.js 22+
- pnpm 10+ (`corepack enable`)
- PostgreSQL 16+ (or Docker)
- Scraped JSON data in `../data/dndtools/`

## Local Development

From **`dndtools-reference/`** (project root):

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

### Local development

Set in `web/.env` (see `web/.env.example`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Random 32-byte secret for session signing |
| `SITE_URL` | Public site URL (sitemap, robots) |
| `NEXT_PUBLIC_SITE_URL` | Legacy alias for `SITE_URL` |

### Coolify (production)

Do **not** commit or bake `web/.env` into the image (it is excluded via `.dockerignore`).

Set these as **runtime** environment variables in Coolify:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | From your linked PostgreSQL service |
| `SESSION_SECRET` | `openssl rand -base64 32` |
| `SITE_URL` | Your public URL, e.g. `https://dnd.example.com` |

`prisma generate` during the Docker build uses a harmless placeholder URL when no database is available — the real `DATABASE_URL` is only read at container startup.

## Coolify Deployment

1. Create a new application in Coolify pointing to **`dndtools-reference/`**.
2. Set Dockerfile to `web/Dockerfile` with build context `dndtools-reference/` (or repo root if the whole repo is checked out).
3. Add a PostgreSQL 16+ database service and link it — set `DATABASE_URL` on the app from that service.
4. Set the remaining runtime env vars (`SESSION_SECRET`, `SITE_URL`).
5. Deploy — migrations run automatically on startup.
6. Import data once via Coolify's **Execute Command** (or `docker exec`):
   ```
   /docker-entrypoint.sh import
   ```
   Data is baked into the image at `/data/dndtools`; `DATA_DIR` defaults there.

### Entrypoint commands

| Command | Description |
|---------|-------------|
| `start` (default) | Run migrations, then start the web server |
| `import` | Import JSON data into PostgreSQL |
| `migrate` | Run migrations only |

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

## SEO & Indexing

- `SITE_URL` must be the canonical HTTPS origin in production (used by `metadataBase`, Open Graph, robots, and sitemaps).
- Entity discovery for crawlers is **sitemap-first**: `robots.txt` lists chunked sitemaps at `/sitemap/0.xml`…`/sitemap/14.xml` (hubs, one file per category, sources). Category list pagination stays client infinite-scroll (no crawlable `?page=` URLs) so anti-scrape controls stay intact.
- Filtered category URLs and `/search?q=…` are `noindex,follow` via page metadata to avoid thin/duplicate indexing.

### Search Console checklist (after deploy)

1. Confirm `SITE_URL` matches the live canonical host (no trailing slash).
2. Submit the sitemap URLs from `robots.txt` (or the first `/sitemap/0.xml` hub) in [Google Search Console](https://search.google.com/search-console) and Bing Webmaster Tools.
3. Request indexing for hub pages (`/`, category indexes, `/sources`) first, then monitor Coverage / Pages reports.
4. Prefer a single host (`www` vs apex) via CDN/host redirects.

## Project Structure

```
dndtools-reference/          # pnpm workspace root
├── package.json
├── pnpm-workspace.yaml
├── docker-compose.yml
├── scraper/
├── data/dndtools/
└── web/                     # @fg-modules/web
    ├── prisma/
    ├── src/
    ├── Dockerfile
    └── docker-entrypoint.sh
```
