# FG Modules — D&D 3.5 Scraper & Builder

## Monorepo layout

This repository is a **pnpm monorepo**:

| Package | Path | Description |
|---------|------|-------------|
| `@fg-modules/web` | `web/` | Next.js D&D 3.5 reference site |
| Python scraper | `scraper/` | Scrapes new.dndtools.org → `data/dndtools/` |

```bash
corepack enable
pnpm install          # install all workspace deps
pnpm dev              # start @fg-modules/web
pnpm import:dndtools  # load JSON into Postgres
```

See [`web/README.md`](web/README.md) for the full web app setup.

---

## Project goal

Fantasy Grounds is a virtual tabletop that loads **modules** — packaged rule content such as spells, feats, classes, items, and races — so players and GMs can drag entries onto character sheets and reference them in play. Building that content by hand for dozens of D&D 3.5 supplement books is slow and error-prone.

This project automates that workflow end to end:

1. **Scrape** rulebook pages from [dnd.arkalseif.info](https://dnd.arkalseif.info) into structured JSON (spells, feats, classes, skills, items, races).
2. **Convert** that JSON into Fantasy Grounds 3.5E database XML with fields aligned to the 3.5E ruleset conventions.
3. **Package** the result as installable `.mod` files you can load in Fantasy Grounds.

The intended outcome is a repeatable pipeline: point at an edition index (for example, all 3.5 supplementals), run one command, and get a folder of FG modules ready for personal use at the table — without manually retyping hundreds of entries per book.

## Requirements

- Python 3.10+
- Internet access to dnd.arkalseif.info

## Setup

From the project root:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r scraper/requirements.txt
```

On Linux/WSL:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r scraper/requirements.txt
```

## Quick start — full edition pipeline

Use **`build_edition.py`** to scrape every book listed on an edition index page, build FG modules, and package `.mod` files in one run.

Example — all 3.5 supplementals:

```powershell
python scraper/build_edition.py "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/index.html"
```

This will:

1. Discover all books on the index (49 for supplementals-35--5)
2. Scrape each book into `scraped/{book-slug}/`
3. Build each module into `modules/{Book Name}.mod`
4. Write a rollup report to `scraped/_supplementals-35--5-pipeline.json`

### Useful pipeline flags

| Flag | Description |
|------|-------------|
| `--list` | List discovered books and exit |
| `--only complete-divine,complete-arcane` | Process only named books (folder slug or display name) |
| `--limit 5` | Process at most N books |
| `--skip-existing` | Skip scraping when `summary.json` already exists |
| `--rebuild` | Rebuild modules even when output already exists |
| `--skip-scrape` | Build modules from existing scraped JSON only |
| `--skip-build` | Scrape only; do not build FG modules |
| `--no-zip` | Write unpacked module folders instead of `.mod` files |
| `--delay 0.5` | Seconds between HTTP requests (default: 0.5) |
| `--cache scraped/.cache` | HTTP response cache directory |

### Resume a long run

If a run stops partway through, rerun with `--skip-existing` to skip books already scraped:

```powershell
python scraper/build_edition.py "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/index.html" --skip-existing
```

### Process one book from an edition

```powershell
python scraper/build_edition.py "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/index.html" --only complete-divine
```

## Step-by-step (manual workflow)

You can also run each stage separately.

### 1. Scrape a single book

```powershell
python scraper/scrape_book.py "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/complete-divine--56/index.html" --output scraped/complete-divine --cache scraped/.cache
```

Output per book:

```
scraped/complete-divine/
  summary.json      # scrape stats
  book.json         # combined book data
  spells.json
  feats.json
  classes.json
  skills.json
  items.json
  races.json
```

### 2. Scrape all books in an edition (JSON only)

```powershell
python scraper/scrape_edition.py "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/index.html" --output scraped --cache scraped/.cache
```

Supports the same `--list`, `--only`, `--limit`, and `--skip-existing` flags as the pipeline.

### 3. Build a Fantasy Grounds module from scraped JSON

```powershell
python scraper/json_to_fg.py scraped/complete-divine --output "modules/Complete Divine.mod"
```

Produces:

```
modules/Complete Divine.mod
```

### Rebuild modules after converter changes

If you already have scraped JSON and only need to regenerate `.mod` files (for example after updating the FG builder):

```powershell
python scraper/build_edition.py "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/index.html" --skip-scrape --rebuild
```

Or rebuild a single book:

```powershell
python scraper/json_to_fg.py scraped/stormwrack --output "modules/Stormwrack.mod"
```

## Output layout

```
fg_modules/
├── scraped/              # scraped JSON per book
│   ├── .cache/           # HTTP cache (shared)
│   └── complete-divine/
├── modules/              # packaged .mod files
│   └── Complete Divine.mod
```

## Installing modules in Fantasy Grounds

1. Copy the `.mod` file from `modules/` into your Fantasy Grounds modules folder, or
2. In FG, use **Load Module** and point to the `.mod` file.

## Tests

```powershell
python -m pytest scraper/tests -q
```

Skip the slow live-network integration test:

```powershell
python -m pytest scraper/tests -q -k "not test_full_scrape_counts"
```

## Edition index URLs

Any edition index page under `/rulebooks/` works. Examples:

- [Supplementals 3.5](https://dnd.arkalseif.info/rulebooks/supplementals-35--5/index.html)
- Other edition lists at `https://dnd.arkalseif.info/rulebooks/`

Use `--list` first to preview which books will be processed:

```powershell
python scraper/build_edition.py "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/index.html" --list
```

## Notes

- Scraped content is for personal use. Respect the source site's terms and rate limits; the default `--delay 0.5` helps avoid hammering the server.
- Class automation in FG 3.5E depends on specific field names and feature text (hit die, BAB, saves, class skills, spellcasting features). The converter targets the Test 3.5E ruleset conventions where possible.
- Prestige class prerequisites are written to `<requirements type="formattedtext">` and duplicated in the Main tab `<text>` field (the Test 3.5E ruleset only displays `text` on the class Main tab). Requirements use block-level HTML (`<p>`, `<b>`) so FG renders line breaks and bold labels correctly.
- The builder strips invalid XML control characters (for example `0x01` from some source pages) so modules load cleanly in Fantasy Grounds.
- Per-category JSON files (`classes.json`, etc.) override embedded data in `book.json` when both exist.
