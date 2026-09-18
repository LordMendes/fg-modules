# SEO implementation status

Last updated: 2026-09-18

Legend: `pending` | `in_progress` | `done` | `blocked` | `skipped` | `ops`

## Google

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| G1 | Crawlable A-Z catalog (`/catalog/...`) | done | G3 | catalog routes, entities.ts, sitemap.ts, [category]/page.tsx | SSR letter lists + hub A-Z nav |
| G2 | Generated entity leads + tool explainers | done | G3 | entity-lead.ts, entity-detail.tsx, tool-faqs.ts | |
| G3 | D&D 3.5 titles and descriptions (no em dash) | done | task0 | seo.ts, seo.test.ts, layout.tsx | |
| G4 | Internal links (class spells, source category pages, related) | done | G1 | entities.ts, sources pages, [slug]/spells | Feat prereq auto-link skipped |
| G5 | Search Console / Bing submission | ops | deploy | manual | Confirm SITE_URL, submit sitemaps 0-14, request indexing |
| G6 | Last-updated dates on entities | done | G2 | entities.ts, entity-detail.tsx | G6-bot-cookies skipped |
| G7 | Backlinks and community mentions | ops | deploy | manual | Link tools on EN World, r/3d6, r/dnd |
| G8 | About and changelog pages | done | task0 | about, changelog, app-shell, json-ld | |

## AI

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| A1 | Explicit allow rules for AI crawlers in robots.txt | done | task0 | robots.ts | GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended |
| A2 | llms.txt and llms-full.txt routes | done | task0 | llms-txt.ts, route.ts, proxy.ts | |
| A3 | Quotable entity leads (generated) | done | G2 | entity-lead.ts, entity-detail.tsx | |
| A4 | FAQPage schema on public tool pages | done | G8 | tool-faqs.ts, json-ld.tsx, tool pages | Campaign table skipped |
| A5 | Brand consistency (footer, llms link) | done | G8 | app-shell.tsx | |
| A6 | HTML catalog indexes for crawlers | done | G1 | catalog routes | |
| A7 | Generated commentary from fields | done | G2 | entity-lead.ts | No invented lore |
| A8 | Niche tool copy in body HTML | done | A4 | tool-faqs.ts, tool pages | |

## Hygiene

| ID | Item | Status | Depends | Owner files | Notes |
|---|---|---|---|---|---|
| X1 | No em dash in new SEO copy | done | all | all touched files | Legacy UI strings unchanged |
| X2 | Sitemap chunk IDs stable (0-14) | done | G1 | sitemap.ts | Appended to id 0 only |
| X3 | Campaign routes remain unindexed | skipped | - | proxy.ts | Auth redirect to /login |

## Skipped / out of scope

| Item | Status | Reason |
|---|---|---|
| Feat prerequisite auto-link | skipped | Unreliable free-text parsing |
| Top 200 hand-written intros | skipped | User chose generated intros for all entities |
| Invented social sameAs URLs | skipped | No real profiles to link |
| G6-bot-cookies | skipped | v1 keeps session cookies on all requests |

## Baseline (already done before this work)

- Sitemaps at `/sitemap/0.xml` through `/sitemap/14.xml`
- Canonical URLs, Open Graph, Twitter cards via `buildPageMetadata`
- JSON-LD breadcrumbs on hubs, entities, tools, sources
- `noindex,follow` on filtered category URLs and `/search?q=`
- Entity SSR; first 50 links on category hubs via PaginatedEntityList
- WebSite + SearchAction JSON-LD in root layout

## Wave checklist

- [x] Task 0: README + STATUS (this file)
- [x] Wave 1: A1, A2, G3, G8, A5
- [x] Wave 2: G1, A6, G2, A3, A7, A4, A8
- [x] Wave 3: G4, G6
- [x] Wave 4: tests, README, final STATUS update

## Ops reminders (manual, post-deploy)

1. Submit `/sitemap/0.xml` through `/sitemap/14.xml` in Search Console and Bing.
2. Request indexing: `/`, `/spells`, `/catalog/spells`, `/tools/leadership-calculator`, `/about`.
3. Share tool URLs (not SRD reprints) on EN World, r/3d6, r/dnd for backlinks.
