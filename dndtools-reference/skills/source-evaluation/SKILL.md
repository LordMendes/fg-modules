---
name: source-evaluation
description: >-
  Audits dndtools-reference website JSON data quality for a D&D 3.5 source
  book (abbrev). Checks classes, feats, spells, skills, races, monsters,
  items, domains, rules, psionics, deities, templates, and cross-entity links
  for Bard-style stubs, missing fields, and wrong source tags. After
  completion, updates reviews/source-review-checklist.md. Use when reviewing
  a source book, evaluating /sources/{abbrev}, auditing scraped data, or
  working through source-review-checklist.md.
---
# Source Evaluation (dndtools-reference web)

Systematic data-quality review for one source book in `dndtools-reference/data/dndtools/`. Modeled on the Bard investigation: detect catastrophic stubs, wrong sources, missing content, and broken cross-references before marking a source reviewed on the site.

## When to use

- User asks to review/evaluate/audit a source (`PH`, `BV`, `CD`, etc.)
- Working through `reviews/source-review-checklist.md`
- Site shows empty or wrong data for entities from a book
- After scraping or patching JSON — verify before production import

## Quick start

```bash
cd dndtools-reference
python scripts/audit_source.py BV --write reviews/bv.md
```

1. Run the audit script for the source abbrev.
2. Read the report; spot-check flagged records on `/sources/{abbrev}` and entity detail pages.
3. Fix JSON (or write a patch script); re-run audit until errors are gone.
4. Write findings to `reviews/{abbrev_lower}.md`.
5. **Update `reviews/source-review-checklist.md`** (required — see [Completion](#completion-required)).
6. Remind: JSON fixes do not update Postgres until import runs.

## Workflow

Copy and track:

```
Source evaluation: {ABBREV}
- [ ] Run audit_source.py
- [ ] Review errors (Bard-style stubs, index/full mismatch, broken links)
- [ ] Review warnings (missing descriptions, advancement, stats)
- [ ] Spot-check 3–5 records per category on the live site
- [ ] Fix data or document accepted gaps
- [ ] Write reviews/{abbrev}.md
- [ ] Update reviews/source-review-checklist.md (required)
- [ ] Note if production re-import needed
```

## Severity model

| Level | Meaning | Example |
|-------|---------|---------|
| **Error** | Broken or misleading on site | Wrong `source_abbrev`, index/full count mismatch, spell class slug with no target and no alias |
| **Warning** | Loads but incomplete | Missing `description_html`, `advancement_html`, monster `stat_line` |
| **Info** | Expected anomaly | UA variant with `—` hit die + "retained from base class" prose; slug without `-{id}` suffix |

### Bard-style catastrophic stub (always error)

All of the following together on a **canonical** record (not a campaign cross-ref):

- Wrong `index.source_abbrev` / `source.abbrev`
- `hit_die` or `skill_points` is `—` or null
- Null `description_html` **and** null `advancement_html`
- Often sole record for that class name

If a `{name}-{id}` canonical sibling exists, the dashed cross-ref is **info**, not error.

## Data locations

| Layer | Path |
|-------|------|
| Index (list) | `data/dndtools/.index/{category}.json` |
| Full records | `data/dndtools/{category}.json` |
| Scraper errors | `data/dndtools/errors.json` |
| Checklist | `reviews/source-review-checklist.md` |
| Reports | `reviews/{abbrev}.md` (e.g. `ph.md`) |
| Import | `web/prisma/import-dndtools.ts` |
| Class slug aliases | `CLASS_SLUG_ALIASES` in import script (`bard-90` → `bard`) |

Filter rule: `record["index"]["source_abbrev"] == "{ABBREV}"` (fallback: `record["source"]["abbrev"]`).

## Categories audited

`classes`, `feats`, `spells`, `skills`, `races`, `monsters`, `items`, `equipment`, `domains`, `rules`, `psionics`, `deities`, `templates`

Per-category required fields: see [reference.md](reference.md).

## Manual spot-checks (after script)

On `/{category}/{slug}` for 3–5 records per non-empty category:

- **Classes** — advancement table, class skills, requirements, feature text; spell list tab if caster
- **Feats** — benefit, prerequisites, type
- **Spells** — school, components, class levels, description
- **Monsters** — stat block, CR, special abilities
- **Races** — ability adjustments, traits, LA
- **Items** — price, aura, description
- **Skills** — key ability, check text
- **Domains** — granted powers, domain spells
- **Psionics** — discipline, PP, manifesting time

Compare rendered page to JSON fields. If JSON is fine but site is wrong → stale DB; run import.

## Remediation patterns

| Problem | Approach |
|---------|----------|
| Missing class metadata | Fetch classic page via `scraper.parsers.classes.parse_detail`; patch like `scripts/patch_bard.py` |
| Missing feat text | `scripts/patch_feats.py` or manual JSON edit |
| Wrong source tag | Patch `index.source_abbrev` and `source.abbrev` together |
| Unresolved spell→class slug | Add record or extend `CLASS_SLUG_ALIASES` in `import-dndtools.ts` |
| Scraper failure | Check `errors.json`; re-scrape entity |

After JSON changes:

```bash
# local DB refresh
cd web && npx tsx prisma/import-dndtools.ts

# production (after deploy)
/docker-entrypoint.sh import
```

## Report template

Use script output or this structure for `reviews/{abbrev}.md`:

```markdown
# {Source Name} (`{ABBREV}`) — Data Review

Reviewed: YYYY-MM-DD
Site route: /sources/{ABBREV}

## Record counts
(table from audit)

## Classes
(per-class status table)

## {category}
(gaps summary)

## Cross-references
(spell class links, feat prereqs)

## Verdict
OK | Reviewed with warnings | Needs fixes

## Follow-up
- [ ] items
```

## Completion (required)

**Do not mark the evaluation done until `reviews/source-review-checklist.md` is updated.**

File: `dndtools-reference/reviews/source-review-checklist.md`

### 1. Table row — mark reviewed

In `## All sources`, find the row whose **Abbrev** column matches `{ABBREV}` (e.g. `` `PH` ``, `` `BV` ``).

Change the **Done** cell from `- [ ]` to `- [x]`:

```markdown
| - [x] | Book of Vile Darkness | `BV` | Supplementals (3.0) | 195 |
```

### 2. Progress count

Update the line near the top:

```markdown
**Progress:** N / 130 reviewed
```

Increment `N` by 1 (count rows with `- [x]` in the table to verify).

### 3. Review notes section

Under `## Review notes`, find `### {Source Name} (\`{ABBREV}\`)` and replace the placeholder `-` with bullets:

```markdown
### Book of Vile Darkness (`BV`)

Categories: classes=18, domains=7, feats=27, races=2, spells=141

- **YYYY-MM-DD:** audit — see [bv.md](bv.md)
- **Verdict:** OK | Reviewed with warnings | Needs fixes
- (list errors/warnings or "no issues")
- Site: `/sources/BV`
```

Copy category counts from the audit report table. Link the report file when it exists.

### 4. When not to check off

Leave `- [ ]` if:

- Audit still has **errors** (Bard-style stubs, index/full mismatch, unresolved links)
- User asked for evaluation only, not sign-off
- Known follow-ups block "reviewed complete" — note them and use "Reviewed with warnings" instead

## Checklist update (summary)

Same steps as [Completion (required)](#completion-required) above — the checklist update is the **final mandatory step** of every source evaluation.

## Reference

- Per-category field requirements: [reference.md](reference.md)
- Bard case study: [reviews/ph.md](../../reviews/ph.md)
- Patch example: [scripts/patch_bard.py](../../scripts/patch_bard.py)
