# FG Modules — D&D 3.5 Scraper & Builder

Scrape rulebook content from [dnd.arkalseif.info](https://dnd.arkalseif.info) into structured JSON, then convert it into Fantasy Grounds 3.5E modules (`.mod` files).

## Requirements

- Python 3.10+
- Internet access to dnd.arkalseif.info

## Setup

From the project root:

```powershell
cd C:\Users\User\Documents\fg_modules
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r scraper/requirements.txt
```

On Linux/WSL:

```bash
cd /path/to/fg_modules
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
- Per-category JSON files (`classes.json`, etc.) override embedded data in `book.json` when both exist.
