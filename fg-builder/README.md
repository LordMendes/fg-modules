# FG Builder — Fantasy Grounds 3.5 Module Pipeline

Standalone Python pipeline that scrapes rulebooks from [dnd.arkalseif.info](https://dnd.arkalseif.info), converts them to Fantasy Grounds XML, and packages `.mod` files for the 3.5E ruleset.

## Layout

| Path | Description |
|------|-------------|
| `scraper/` | Scraper, FG converters, packager, and CLI scripts |
| `reviews/v1/` | Reviewed `.mod` files and compatibility reports |
| `variants/` | Class variant reference docs (e.g. Unearthed Arcana) |
| `skills/` | Cursor skills for FG export tooling |

## Requirements

- **Python 3.10+**
- Internet access to dnd.arkalseif.info

## Setup

From this directory (`fg-builder/`):

**Windows (PowerShell):**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Linux / macOS:**

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Build modules

Always run from **`fg-builder/`** as a module:

```bash
python -m scraper.build_edition "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/index.html"
```

### Other scripts

| Script | Purpose |
|--------|---------|
| `python -m scraper.scrape_book URL` | Scrape a single rulebook to JSON |
| `python -m scraper.scrape_edition URL` | Scrape all books in an edition index |
| `python -m scraper.json_to_fg PATH` | Convert scraped JSON folder to `.mod` |
| `python -m scraper.review_modules` | Review packaged modules for FG compatibility |

### Output directories

- `scraped/` — intermediate JSON per rulebook
- `modules/` — packaged `.mod` files

## Tests

```bash
python -m pytest scraper/tests -q
```

Tests use local HTML fixtures — no network required.

## Notes

- Scraped content is for personal use. Respect the source site's terms and rate limits.
- If you see `TypeError: 'type' object is not subscriptable`, switch to Python 3.10+.
