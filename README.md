# FG Modules — D&D 3.5 Scraper & Reference Site

Monorepo for scraping D&D 3.5 content from [new.dndtools.org](https://new.dndtools.org) into structured JSON, serving it via a Next.js reference site, and (legacy) building Fantasy Grounds modules.

## Monorepo layout

| Package | Path | Description |
|---------|------|-------------|
| `@fg-modules/web` | `web/` | Next.js D&D 3.5 reference site |
| Python scraper | `scraper/` | Scrapes new.dndtools.org → `data/dndtools/` |
| Legacy FG builder | `old/scraper/` | Scrapes dnd.arkalseif.info → `.mod` files |

```bash
corepack enable
pnpm install          # install all workspace deps
pnpm dev              # start @fg-modules/web
pnpm import:dndtools  # load scraped JSON into Postgres
```

See [`web/README.md`](web/README.md) for the full web app setup.

---

## Project goal

1. **Scrape** D&D 3.5 rules data from [new.dndtools.org](https://new.dndtools.org) into normalized JSON (spells, feats, classes, monsters, etc.).
2. **Serve** that data through the web reference site (`pnpm dev` after `pnpm import:dndtools`).

The legacy Fantasy Grounds pipeline (scrape rulebooks from dnd.arkalseif.info, convert to `.mod` files) lives under `old/scraper/` — see [Legacy FG builder](#legacy-fg-builder) below.

---

## Requirements

- **Python 3.10+** for the scraper
- **Node.js 22+** and **pnpm 10+** for the web app
- Internet access to new.dndtools.org

> **Ubuntu 20.04 note:** system `python3` is often 3.8. Check with `python3 --version`. If it is below 3.10, use `python3.11` or `python3.12` instead (already installed on many systems).

---

## Scraper setup

From the project root:

**Windows (PowerShell):**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Linux / macOS:**

```bash
python3.11 -m venv .venv   # use any 3.10+ interpreter; not plain python3 on older Ubuntu
source .venv/bin/activate
pip install -r requirements.txt
```

Confirm the venv is using the right Python:

```bash
python --version   # must be 3.10+
```

A virtual environment is recommended but not required — you can also run `python3.11 -m pip install -r requirements.txt` and invoke `python3.11 -m scraper.scrape_all` directly.

---

## Running the scraper

Always run from the **repo root** as a module:

```bash
python -m scraper.scrape_all
```

Do **not** run `python3 -m scrape_all` from inside `scraper/` — relative imports require the package path `scraper.scrape_all`.

### Quick test

```bash
python -m scraper.scrape_all --categories spells --limit 10 --dry-run
python -m scraper.scrape_all --categories spells --limit 10
```

### Full scrape

Scrapes all 13 categories into `data/dndtools/`:

```bash
python -m scraper.scrape_all
```

### CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `--output PATH` | `data/dndtools` | Output directory |
| `--categories LIST` | all 13 | Comma-separated subset (see table below) |
| `--delay SECONDS` | `0.5` | Delay between HTTP requests |
| `--cache PATH` | `data/dndtools/.cache` | HTTP response cache |
| `--workers N` | `8` | Parallel detail-page workers |
| `--limit N` | none | Cap records per category (testing) |
| `--resume` | off | Skip URLs already in output JSON |
| `--index-only` | off | Index pages only, skip detail pages |
| `--dry-run` | off | Print plan without writing files |

### Categories

| Category | Output file | ~Records |
|----------|-------------|----------|
| spells | `spells.json` | 5,035 |
| feats | `feats.json` | 3,665 |
| classes | `classes.json` | 1,054 |
| monsters | `monsters.json` | 807 |
| items | `items.json` | 816 |
| psionics | `psionics.json` | 703 |
| deities | `deities.json` | 670 |
| domains | `domains.json` | 368 |
| rules | `rules.json` | 273 |
| templates | `templates.json` | 155 |
| races | `races.json` | 150 |
| skills | `skills.json` | 80 |
| equipment | `equipment.json` | 65 |

Scrape a subset:

```bash
python -m scraper.scrape_all --categories spells,feats,classes
```

### Resume after interruption

```bash
python -m scraper.scrape_all --resume
```

---

## Output layout

```
data/dndtools/
├── .cache/           # HTTP cache (shared)
├── summary.json      # scrape stats per category
├── errors.json       # failed URLs (if any)
├── spells.json
├── feats.json
├── classes.json
└── …                 # one JSON file per category
```

Each `{category}.json` is an array of record objects with normalized fields, source metadata, and HTML/text descriptions.

---

## Load data into the web app

After scraping:

```bash
docker compose up -d postgres   # if not already running
pnpm import:dndtools
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Tests

```bash
python -m pytest scraper/tests -q
```

Tests use local HTML fixtures — no network required.

---

## Legacy FG builder

The original workflow for building Fantasy Grounds `.mod` files from [dnd.arkalseif.info](https://dnd.arkalseif.info) is preserved in `old/scraper/`:

```bash
pip install -r old/scraper/requirements.txt
python old/scraper/build_edition.py "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/index.html"
```

Key scripts: `build_edition.py` (full pipeline), `scrape_book.py`, `scrape_edition.py`, `json_to_fg.py`. Output goes to `scraped/` and `modules/`.

---

## Notes

- Scraped content is for personal use. Respect the source site's terms and rate limits; the default `--delay 0.5` helps avoid hammering the server.
- If you see `TypeError: 'type' object is not subscriptable`, you are on Python 3.8/3.9 — switch to 3.10+.
- The scraper prints a clear error at startup when the Python version is too old.
