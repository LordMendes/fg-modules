# FG Modules

This repository contains two **independent** projects:

| Project | Path | Description |
|---------|------|-------------|
| **FG Builder** | [`fg-builder/`](fg-builder/) | Scrape dnd.arkalseif.info → Fantasy Grounds `.mod` files |
| **D&D Tools Reference** | [`dndtools-reference/`](dndtools-reference/) | Scrape new.dndtools.org → JSON + Next.js reference site |

Each project has its own README, dependencies, and setup. Work from the project directory you need — there are no cross-dependencies between them.

## FG Builder (legacy)

Fantasy Grounds 3.5 module pipeline:

```bash
cd fg-builder
python -m venv .venv && .venv\Scripts\Activate.ps1   # or source .venv/bin/activate
pip install -r requirements.txt
python -m scraper.build_edition "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/index.html"
```

See [`fg-builder/README.md`](fg-builder/README.md).

## D&D Tools Reference (new)

Scraper + web reference site:

```bash
cd dndtools-reference
corepack enable && pnpm install
python -m venv .venv && .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m scraper.scrape_all --categories spells --limit 10
docker compose up -d postgres && pnpm import:dndtools && pnpm dev
```

See [`dndtools-reference/README.md`](dndtools-reference/README.md) and [`dndtools-reference/web/README.md`](dndtools-reference/web/README.md).
