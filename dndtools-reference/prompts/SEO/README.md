# SEO and AI ranking: execution protocol

Implement items in [`STATUS.md`](./STATUS.md). That file is the source of truth for progress.

## Rules

1. **Task 0 first:** create or update STATUS before app code in a new session.
2. **Update STATUS after each item:** set `status` to `done`, `blocked`, or `skipped` and add a one-line note plus files touched.
3. **Respect `depends`:** do not start an item until dependencies are `done`.
4. **Parallel waves:** only parallelize items that do not share files (see plan ownership table).
5. **Ops items:** `G5`, `G7` stay `ops`. Do not mark them `done` in code.
6. **No em dash** in user-facing copy, comments, commit subjects, or these markdown files. Use comma, period, colon, or hyphen.
7. **Entity intros:** auto-generate from existing fields only. No invented lore.
8. **Sitemap chunk IDs:** keep `/sitemap/0.xml` through `/sitemap/14.xml` stable. Append new URLs to hub sitemap id 0 only.
9. **Do not index** `/tools/campaign*` (auth redirect in `proxy.ts`).

## Already in place (baseline)

- Chunked sitemaps, canonicals, Open Graph, Twitter cards
- JSON-LD breadcrumbs on hubs, entities, tools, sources
- `noindex,follow` on filtered category hubs and `/search?q=`
- Server-rendered entity pages with first 50 hub links via `PaginatedEntityList`

## Test command

From repo root:

```bash
pnpm --filter @fg-modules/web test
pnpm --filter @fg-modules/web lint
```

Register new test files in `web/package.json` `test` script.

## Verification (browser)

- `/catalog/spells/f` shows real `<a href="/spells/...">` links in HTML source
- `/spells/{slug}` shows generated lead and D&D 3.5 title
- `/llms.txt` returns plain text
- `/tools/leadership-calculator` shows FAQ in HTML (not accordion-only)
- Footer links: About, Changelog, Privacy, llms.txt

## Suggested commits

- `feat(seo): add seo status tracker`
- One commit per wave if the user asks to commit
