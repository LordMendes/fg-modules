# Prompt: Build D&D Tools 3.5 Scraper for new.dndtools.org

## Goal

Replace the legacy scraper (`old/scraper/`, which targeted `dnd.arkalseif.info`) with a new Python scraper that downloads **all** D&D 3.5 reference data from [https://new.dndtools.org/](https://new.dndtools.org/) and writes normalized JSON files under `data/dndtools/`.

Each asset category becomes one JSON file containing an **array of objects**. Every object must include **all fields** present anywhere in that category (missing values → `null`). Every record must include provenance (`source` / rulebook / edition).

---

## Categories to scrape

| Output file | Index URL | Approx. count |
|-------------|-----------|---------------|
| `spells.json` | `/spells` | ~5,035 |
| `feats.json` | `/feats` | ~3,665 |
| `monsters.json` | `/monsters` | ~807 |
| `templates.json` | `/templates` | ~155 |
| `classes.json` | `/classes` | ~1,054 |
| `skills.json` | `/skills` | ~80 |
| `equipment.json` | `/equipment` | ~65 |
| `items.json` | `/items` | ~816 |
| `races.json` | `/races` | ~150 |
| `deities.json` | `/deities` | ~670 |
| `domains.json` | `/domains` | ~368 |
| `psionics.json` | `/psionics` | ~703 |
| `rules.json` | `/rules` | ~273 |

**Total: ~13,000+ records across 13 files.**

Do **not** scrape `/characters`, `/favorites`, `/rulebooks` as primary datasets (rulebook metadata is embedded per record). Optionally write `rulebooks.json` later if useful for resolving source abbreviations.

---

## Site architecture (verified)

- **Stack:** Next.js (SSR). No public REST API (`/api/*` returns 404).
- **Scraping strategy:** Fetch HTML with `httpx`; parse with `BeautifulSoup` + `lxml`. Initial HTML already contains full detail content (no headless browser required).
- **Base URL:** `https://new.dndtools.org`
- **Detail URL pattern:** `/{category}/{slug}-{id}`  
  Examples:
  - `/spells/acid-breath-3801`
  - `/feats/acrobatic-42`
  - `/monsters/aboleth-1`
- **Slug parsing:** Extract trailing numeric ID with regex `-(\\d+)$` or `-(sample)$` for edge cases. Store both `slug` (full path segment) and `id` (numeric when present).
- **Pagination:** Query param `page` (1-based). Default page size is 50 rows.  
  - Working: `GET /spells?page=2`  
  - Not working: `?p=2`  
  - Optional: `&rows=50` (explicit)
- **Rate limiting:** Be polite — default 0.5s delay between requests, configurable. Use disk cache for development/resume.

---

## Project layout

Create a new scraper at repo root (do not extend `old/scraper/`):

```
scraper/
  __init__.py
  config.py              # BASE_URL, categories, delays, paths
  http_client.py         # httpx + cache + retries + rate limit (reuse old patterns)
  pagination.py          # page=N iteration per category
  normalize.py           # schema merge, source normalization, null-fill
  writer.py              # JSON output, summary.json, progress logging
  engine.py              # orchestration: index crawl → detail fetch → normalize → write
  scrape_all.py          # CLI entry point
  parsers/
    __init__.py          # registry: CATEGORY → (index_parser, detail_parser)
    base.py              # shared HTML helpers
    spells.py
    feats.py
    monsters.py
    templates.py
    classes.py
    skills.py
    equipment.py
    items.py
    races.py
    deities.py
    domains.py
    psionics.py
    rules.py
  tests/
    test_parsers.py      # fixture-based parser tests
    test_normalize.py    # schema merge + source rules
    fixtures/            # saved HTML snippets from new.dndtools.org
requirements.txt         # httpx, beautifulsoup4, lxml, pytest
data/dndtools/           # output directory (gitignored)
  spells.json
  feats.json
  ...
  summary.json
  errors.json
```

Reference `old/scraper/` for proven patterns (`http_client.py`, `engine.py`, `writer.py`, parser structure) but **rewrite parsers** for the new HTML structure.

---

## Scraping pipeline

### Phase 1 — Index crawl (per category)

For each category:

1. Fetch `/{category}?page=1`.
2. Parse the results table to collect stub records:
   - `name`, `url`, `slug`, `id`
   - All visible index columns (category-specific — see below)
   - `source_abbrev` / `edition` from index when present
3. Detect total pages from pagination UI (`Page / N`, `X–Y of Z`, or count of unique detail links).
4. Iterate `page=2..N`, dedupe by `url`.
5. Write intermediate `data/dndtools/.index/{category}.json` (optional, for resume).

### Phase 2 — Detail fetch (per record)

For each index stub, fetch the detail page and merge:

**Common detail structure (all categories):**

| Element | Selector / pattern | Maps to |
|---------|-------------------|---------|
| Name | `h1` | `name` |
| Source line | `p.text-muted-foreground` under title (e.g. "Spell Compendium (Sc), p. 7") | `source` object |
| Metadata grid | `dl > div > dt + dd` | flat string fields keyed by normalized `dt` text |
| Section blocks | `p.font-semibold` headings + following sibling | named sections |
| Long text | `.prose` inner HTML + plain text | `description_html`, `description_text` |
| Linked refs | `a[href^="/classes/"]`, badges, tables | structured arrays |

**Spell-specific fields (detail `<dt>` labels):**  
`school`, `casting_time`, `components`, `range`, `target`, `area`, `effect`, `duration`, `saving_throw`, `spell_resistance`, plus sections `classes`, `descriptors`, `description`, `also_appears_in` (if present).

**Feat-specific:** `type`/`category`, `prerequisite`, `benefit`, `normal`, `special`, `description`.

**Monster-specific:** full stat block — parse `dl` fields (Size, Type, HD, AC, attacks, abilities, SQ, SA, saves, skills, feats, environment, CR, alignment, etc.) and any tables in `.prose`.

**Class-specific:** advancement table, class features by level, requirements, hit die, skill points, BAB/saves progression.

**Item / equipment:** cost, weight, stats, aura, slot, price, properties.

Implement each parser incrementally; unknown `<dt>` labels should be captured dynamically (snake_case key) rather than dropped.

### Phase 3 — Normalize schema

After all records for a category are collected, run normalization:

```python
def normalize_records(records: list[dict]) -> list[dict]:
    """Union all keys across records; fill missing with null."""
    all_keys = set()
    for r in records:
        all_keys.update(flatten_keys(r))
    return [fill_nulls(r, all_keys) for r in records]
```

Rules:

- Use **snake_case** keys throughout.
- Nested objects are allowed for logical groupings (`source`, `stat_block`, `class_levels`) but the normalizer must ensure **consistent top-level keys** per category file. Prefer flattening index columns to top level; nest only clearly grouped data.
- Arrays stay arrays; empty → `[]`, not `null`.
- Do not drop fields that only appear on one record.

### Phase 4 — Source / provenance

Every record must include a `source` object:

```json
{
  "source": {
    "name": "Player's Handbook",
    "abbrev": "PH",
    "edition": "Core (3.5)",
    "page": 197,
    "url": null
  }
}
```

**Resolution order:**

1. Detail page source line (`Spell Compendium (Sc), p. 7` → name, abbrev, page).
2. Index table `Source` / `Edition` columns.
3. If still unknown: `{ "name": "Core", "abbrev": null, "edition": "3.5", "page": null, "url": null }` — never omit `source`.

Parse the muted subtitle with regex, e.g.:

- `^(.+?)\\s*\\(([^)]+)\\)(?:,\\s*p\\.\\s*(\\d+))?`
- Handle missing page gracefully.

Also store `source_url` (canonical detail URL) and `scraped_at` (ISO-8601 UTC) on every record.

---

## Index table columns (parse from list pages)

| Category | Index columns to capture |
|----------|-------------------------|
| spells | name, school, description_snippet, components V/S/M/F/DF/XP flags, source, edition |
| feats | name, type, description_snippet, source, edition |
| monsters | name, type, subtypes, CR, HD, source |
| templates | name, type, applies_to, type_change, CR, LA, summary, has_tables |
| classes | name, prestige_level, hit_die, skill_points, source, edition |
| skills | name, key_ability, trained_only, armor_check_penalty, source |
| equipment | name, kind, category, stats, cost, weight |
| items | name, type, price, source, edition |
| races | name, type, level_adjustment, source, edition |
| deities | name, alignment, pantheon, portfolio, favored_weapon |
| domains | name, granted_power_snippet, source |
| psionics | name, discipline, description_snippet, power_points, classes, source |
| rules | name, category, subcategory, source |

Store index-only fields even when detail page repeats them (detail wins on conflict).

---

## CLI (`scrape_all.py`)

```bash
python -m scraper.scrape_all [options]

Options:
  --output PATH          default: data/dndtools
  --categories LIST      comma-separated subset (default: all 13)
  --delay SECONDS        default: 0.5
  --cache PATH           default: data/dndtools/.cache
  --index-only           skip detail pages (stubs only)
  --resume               skip URLs already in output JSON
  --limit N              cap records per category (for testing)
  --dry-run              print plan, no writes
```

Also support scraping a single category:

```bash
python -m scraper.scrape_all --categories spells --limit 10
```

---

## Output format

Each `{category}.json`:

```json
[
  {
    "id": 3801,
    "slug": "acid-breath-3801",
    "name": "Acid Breath",
    "source_url": "https://new.dndtools.org/spells/acid-breath-3801",
    "scraped_at": "2026-07-13T14:00:00Z",
    "source": {
      "name": "Spell Compendium",
      "abbrev": "Sc",
      "edition": "Supplementals (3.5)",
      "page": 7,
      "url": null
    },
    "school": "Conjuration (Creation)",
    "casting_time": "1 standard action",
    "components": "V, S, M",
    "range": "15 ft.",
    "area": "15 ft. cone burst",
    "duration": "Instantaneous",
    "saving_throw": "Reflex half",
    "spell_resistance": "Yes",
    "target": null,
    "effect": null,
    "classes": [
      {"name": "Sorcerer", "level": 3, "slug": "sorcerer-98", "url": "/classes/sorcerer-98"},
      {"name": "Wizard", "level": 3, "slug": "wizard-99", "url": "/classes/wizard-99"}
    ],
    "descriptors": ["Acid"],
    "description_html": "<p>...</p>",
    "description_text": "You breathe forth...",
    "index": {
      "school": "Conjuration",
      "description_snippet": "You pop the fire ants...",
      "components": {"V": true, "S": true, "M": true, "F": false, "DF": false, "XP": false},
      "source_abbrev": "Sc",
      "edition": "Supplementals (3.5)"
    }
  }
]
```

Write `summary.json`:

```json
{
  "scraped_at": "...",
  "base_url": "https://new.dndtools.org",
  "categories": {
    "spells": {"expected": 5035, "scraped": 5030, "errors": 5, "duration_seconds": 3600}
  }
}
```

Write `errors.json` as an array of `{category, url, error, timestamp}` for failed fetches.

---

## Error handling & resume

- Retry HTTP 5xx / timeouts up to 3 times with exponential backoff.
- Do not retry 404 (log and continue).
- `--resume`: load existing `{category}.json`, skip `source_url` already present.
- Flush incremental writes every 100 records (crash-safe).
- Log progress: `[spells] 1500/5035 (29%) — acid-fog-2372`.

---

## Testing requirements

1. Save real HTML fixtures from new.dndtools.org under `scraper/tests/fixtures/`:
   - `{category}_index.html`
   - `{category}_detail.html` (at least spells, feats, monsters, classes)
2. Unit-test each parser against fixtures (no network in CI).
3. Test `normalize_records` with mismatched keys → unified schema with nulls.
4. Test source parsing edge cases: missing page, abbrev only, "Core (3.5)" edition.
5. Integration smoke test: `--categories spells --limit 3` produces valid JSON.

---

## Dependencies

```
httpx>=0.27
beautifulsoup4>=4.12
lxml>=5.0
pytest>=8.0
```

Add `data/dndtools/` and `data/dndtools/.cache/` to `.gitignore`.

---

## Implementation order

1. Scaffold `scraper/` package + `http_client.py` + `config.py`.
2. Implement `base.py` helpers for new.dndtools.org HTML (table rows, dl grid, prose, pagination).
3. Implement `spells` parser end-to-end as reference (index + detail + normalize + write).
4. Add CLI with `--limit` and verify `spells.json` output.
5. Implement remaining parsers (feats, monsters, classes first — highest value).
6. Add resume, summary, errors, full test suite.
7. Run full scrape locally; validate counts against site totals (±errors).

---

## Constraints

- **Personal/educational use** — respect site load; do not parallelize aggressively.
- Do not commit scraped JSON to git (large files).
- Preserve raw HTML descriptions (`description_html`) for downstream FG export tools.
- Use snake_case JSON keys to align with existing `skills/*-fg-wiki-json` export conventions.
- Keep parsers tolerant: new `<dt>` labels or sections should be captured, not crash the run.

---

## Acceptance criteria

- [ ] All 13 JSON files exist under `data/dndtools/`
- [ ] Each file is a JSON array with complete records (index + detail merged)
- [ ] Every record has `source`, `source_url`, `slug`, `name`, `scraped_at`
- [ ] Schema is unified per file (all keys present on every object, null when absent)
- [ ] `summary.json` reports counts within 1% of site totals
- [ ] `python -m pytest scraper/tests` passes without network
- [ ] `python -m scraper.scrape_all --categories spells --limit 5` works out of the box
