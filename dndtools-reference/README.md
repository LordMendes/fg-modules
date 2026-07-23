# D&D Tools Reference — Scraper & Web Site

Standalone project for scraping D&D 3.5 content from [new.dndtools.org](https://new.dndtools.org) into structured JSON (feat/class prerequisites overlaid from classic [dndtools.org](https://dndtools.org)), and serving it via a Next.js reference site.

## Layout

| Path | Description |
|------|-------------|
| `scraper/` | Python scraper → `data/dndtools/` |
| `web/` | Next.js reference site (`@fg-modules/web`) |
| `data/dndtools/` | Scraped JSON output |
| `scripts/` | Data maintenance utilities |

## Requirements

- **Python 3.10+** for the scraper
- **Node.js 22+** and **pnpm 10+** for the web app
- Internet access to new.dndtools.org and dndtools.org

> **Ubuntu 20.04 note:** system `python3` is often 3.8. Use `python3.11` or `python3.12` if below 3.10.

## Quick start

From this directory (`dndtools-reference/`):

```bash
corepack enable
pnpm install
```

### Scraper

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1   # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python -m scraper.scrape_all --categories spells --limit 10 --dry-run
```

Full scrape:

```bash
python -m scraper.scrape_all
```

### Web app

See **[`web/README.md` → Running locally](web/README.md#running-locally)** for the full step-by-step tutorial (Docker, migrations, import, troubleshooting).

Quick version:

```bash
docker compose up -d postgres
cp web/.env.example web/.env   # Windows: Copy-Item web\.env.example web\.env
pnpm db:deploy                # required — creates DB tables before dev
pnpm import:dndtools
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

See [`web/README.md`](web/README.md) for deployment, environment variables, and Coolify setup.

---

## Scraper CLI

Always run from **`dndtools-reference/`** as a module:

```bash
python -m scraper.scrape_all
```

Do **not** run `python scrape_all.py` from inside `scraper/` — relative imports require the package path `scraper.scrape_all`.

| Flag | Default | Description |
|------|---------|-------------|
| `--output PATH` | `data/dndtools` | Output directory |
| `--categories LIST` | all 13 | Comma-separated subset |
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
| feats | `feats.json` | 3,665 (+ classic prerequisites) |
| classes | `classes.json` | 1,054 (+ classic requirements) |
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

Resume after interruption:

```bash
python -m scraper.scrape_all --resume
```

## Output layout

```
data/dndtools/
├── .cache/           # HTTP cache
├── summary.json      # scrape stats per category
├── errors.json       # failed URLs (if any)
├── spells.json
├── feats.json
└── …                 # one JSON file per category
```

## Tests

```bash
python -m pytest scraper/tests -q
```

Tests use local HTML fixtures — no network required.

## Notes

- Scraped content is for personal use. Respect the source site's terms and rate limits.
- If you see `TypeError: 'type' object is not subscriptable`, switch to Python 3.10+.
