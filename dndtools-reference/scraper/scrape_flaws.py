"""CLI for scraping supplemental flaws from Realms Helps and D&D Wiki."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

if sys.version_info < (3, 10):
    version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    raise SystemExit(
        f"Python 3.10+ is required (you are running {version}). "
        "Use python3.11 or newer."
    )

from .config import DEFAULT_CACHE_DIR, DEFAULT_DELAY, DEFAULT_OUTPUT_DIR
from .flaw_utils import (
    REALMSHELPS_BASE,
    load_existing_flaw_names,
    should_skip_realmshelps,
)
from .http_client import HttpClient
from .normalize import normalize_records
from .parsers.dandwiki import parse_flaw_detail as parse_dandwiki_detail
from .parsers.dandwiki import parse_flaw_index as parse_dandwiki_index
from .parsers.realmshelps import parse_flaw_detail as parse_realmshelps_detail
from .parsers.realmshelps import parse_flaw_index as parse_realmshelps_index
from .writer import append_error

REALMSHELPS_INDEX_URL = f"{REALMSHELPS_BASE}/cgi-bin/feat-form.pl?sort=Flaw"
DANDWIKI_INDEX_URL = "https://www.dandwiki.com/wiki/3.5e_Flaws"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape supplemental 3.5 flaws from Realms Helps and D&D Wiki."
    )
    parser.add_argument(
        "--output",
        default=str(Path(DEFAULT_OUTPUT_DIR) / "supplemental"),
        help="Output directory for supplemental JSON files",
    )
    parser.add_argument(
        "--cache",
        default=str(DEFAULT_CACHE_DIR),
        help="HTTP response cache directory",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=DEFAULT_DELAY,
        help="Delay between HTTP requests in seconds",
    )
    parser.add_argument(
        "--source",
        choices=("all", "realmshelps", "dandwiki"),
        default="all",
        help="Which source(s) to scrape",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit detail pages per source (testing)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print scrape plan without writing JSON",
    )
    return parser.parse_args()


def _write_json(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    normalized = normalize_records(records)
    path.write_text(json.dumps(normalized, indent=2, ensure_ascii=False), encoding="utf-8")


def scrape_realmshelps(
    client: HttpClient,
    *,
    feats_path: Path,
    limit: int | None,
    errors: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    print("Scraping Realms Helps flaw index...")
    index_html = client.fetch(REALMSHELPS_INDEX_URL)
    index_rows = parse_realmshelps_index(index_html)
    existing_names = load_existing_flaw_names(feats_path)

    records: list[dict[str, Any]] = []
    skipped = 0
    to_fetch = index_rows[:limit] if limit is not None else index_rows

    for row in to_fetch:
        name = row["name"]
        if should_skip_realmshelps(name, existing_names):
            skipped += 1
            continue
        url = row["url"]
        try:
            detail_html = client.fetch(url)
            record = parse_realmshelps_detail(detail_html, url)
            records.append(record)
        except Exception as exc:  # noqa: BLE001 - collect scrape failures
            append_error(errors, "realmshelps_flaws", url, str(exc))

    print(
        f"  Realms Helps: {len(records)} scraped, "
        f"{skipped} skipped as existing dndtools flaws, "
        f"{len(errors)} errors"
    )
    return records


def scrape_dandwiki(
    client: HttpClient,
    *,
    limit: int | None,
    errors: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    print("Scraping D&D Wiki flaw index...")
    index_html = client.fetch(DANDWIKI_INDEX_URL)
    index_rows = parse_dandwiki_index(index_html)

    records: list[dict[str, Any]] = []
    to_fetch = index_rows[:limit] if limit is not None else index_rows

    for row in to_fetch:
        url = row["url"]
        try:
            detail_html = client.fetch(url)
            record = parse_dandwiki_detail(detail_html, url)
            records.append(record)
        except Exception as exc:  # noqa: BLE001 - collect scrape failures
            append_error(errors, "dandwiki_flaws", url, str(exc))

    print(f"  D&D Wiki: {len(records)} scraped, {len(errors)} errors")
    return records


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output)
    cache_dir = Path(args.cache)
    feats_path = Path(args.output).parents[1] / "feats.json"
    if not feats_path.exists():
        feats_path = Path(DEFAULT_OUTPUT_DIR) / "feats.json"

    errors: list[dict[str, Any]] = []
    client = HttpClient(cache_dir=cache_dir, delay=args.delay)

    realmshelps_records: list[dict[str, Any]] = []
    dandwiki_records: list[dict[str, Any]] = []

    if args.source in ("all", "realmshelps"):
        realmshelps_records = scrape_realmshelps(
            client,
            feats_path=feats_path,
            limit=args.limit,
            errors=errors,
        )
        if args.dry_run:
            print(f"[dry-run] Would write {len(realmshelps_records)} Realms Helps flaws")
        else:
            out_path = output_dir / "realmshelps_flaws.json"
            _write_json(out_path, realmshelps_records)
            print(f"  Wrote {out_path}")

    if args.source in ("all", "dandwiki"):
        dandwiki_records = scrape_dandwiki(
            client,
            limit=args.limit,
            errors=errors,
        )
        if args.dry_run:
            print(f"[dry-run] Would write {len(dandwiki_records)} D&D Wiki flaws")
        else:
            out_path = output_dir / "dandwiki_flaws.json"
            _write_json(out_path, dandwiki_records)
            print(f"  Wrote {out_path}")

    if errors and not args.dry_run:
        errors_path = output_dir / "flaws_errors.json"
        errors_path.parent.mkdir(parents=True, exist_ok=True)
        errors_path.write_text(json.dumps(errors, indent=2), encoding="utf-8")
        print(f"  Wrote {len(errors)} errors to {errors_path}")


if __name__ == "__main__":
    main()
