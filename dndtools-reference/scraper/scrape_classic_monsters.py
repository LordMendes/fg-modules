"""Scrape classic dndtools.org / dndtools.net monsters and merge into monsters.json."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

if sys.version_info < (3, 10):
    version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    raise SystemExit(
        f"Python 3.10+ is required (you are running {version}). "
        "Use python3.11 or newer."
    )

from .config import CLASSIC_BASE_URL, DEFAULT_CACHE_DIR, DEFAULT_DELAY, DEFAULT_OUTPUT_DIR
from .http_client import HttpClient
from .parsers.classic_monsters import parse_classic_monster_detail, parse_classic_monster_index
from .source_names import load_name_map
from .writer import append_error, write_category_json, write_index_cache


def _normalize_name(name: str) -> str:
    text = name.casefold()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def _name_keys(name: str) -> set[str]:
    """Normalized lookup keys, including comma-reversed variants (Hag, Night ↔ Night Hag)."""
    keys = {_normalize_name(name)}
    if "," in name:
        parts = [part.strip() for part in name.split(",", 1)]
        if len(parts) == 2 and parts[0] and parts[1]:
            keys.add(_normalize_name(f"{parts[1]} {parts[0]}"))
    devil_prefix = re.match(r"^devil,\s*(.+)$", name, re.I)
    if devil_prefix:
        keys.add(_normalize_name(devil_prefix.group(1)))
    return keys


def _build_name_index(records: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    for record in records:
        name = record.get("name")
        if not name:
            continue
        for key in _name_keys(name):
            index.setdefault(key, record)
    return index


def merge_classic_monsters(
    existing: list[dict[str, Any]],
    classic_records: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], int]:
    """Add classic-only monsters; new.dndtools.org records take precedence by name."""
    by_name = _build_name_index(existing)
    merged = list(existing)
    added = 0
    for record in classic_records:
        name = record.get("name")
        if not name:
            continue
        if any(key in by_name for key in _name_keys(name)):
            continue
        merged.append(record)
        for key in _name_keys(name):
            by_name[key] = record
        added += 1
    merged.sort(key=lambda r: (r.get("name") or "").casefold())
    return merged, added


def classic_monster_index_url(base_url: str, page: int, page_size: int = 20) -> str:
    query = urlencode({"page": page, "page_size": page_size})
    return f"{base_url.rstrip('/')}/monsters/?{query}"


def iter_classic_monster_index(
    fetch,
    base_url: str = CLASSIC_BASE_URL,
    page_size: int = 20,
) -> list[dict[str, Any]]:
    """Crawl all classic monster index pages (dndtools.org or dndtools.net)."""
    records: list[dict[str, Any]] = []
    page = 1
    max_pages = 1
    while page <= max_pages:
        url = classic_monster_index_url(base_url, page, page_size)
        html = fetch(url)
        page_records, total = parse_classic_monster_index(html, base_url)
        records.extend(page_records)
        if page == 1 and total:
            max_pages = max(1, (total + page_size - 1) // page_size)
        page += 1
    return records


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Scrape classic dndtools.org / dndtools.net monsters and merge "
            "into data/dndtools/monsters.json."
        )
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT_DIR,
        help="Output directory (monsters.json lives here)",
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
        "--base-url",
        default=CLASSIC_BASE_URL,
        help="Classic site base URL (dndtools.org or dndtools.net)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit detail pages (testing)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print plan without writing JSON",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output)
    monsters_path = output_dir / "monsters.json"
    index_path = output_dir / ".index" / "monsters.json"
    name_map = load_name_map()

    existing: list[dict[str, Any]] = []
    if monsters_path.exists():
        data = json.loads(monsters_path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            existing = data

    client = HttpClient(cache_dir=Path(args.cache), delay=args.delay)
    errors: list[dict[str, Any]] = []
    existing_index = _build_name_index(existing)

    print(f"Indexing classic monsters from {args.base_url}...")
    index_rows = iter_classic_monster_index(client.fetch, base_url=args.base_url)
    print(f"  Found {len(index_rows)} classic monster index entries")

    classic_records: list[dict[str, Any]] = []
    to_fetch = index_rows[: args.limit] if args.limit is not None else index_rows

    for row in to_fetch:
        if any(key in existing_index for key in _name_keys(row["name"])):
            continue
        url = row["url"]
        try:
            html = client.fetch(url)
            record = parse_classic_monster_detail(html, url, index_record=row, name_map=name_map)
            classic_records.append(record)
        except Exception as exc:  # noqa: BLE001 - collect scrape failures
            append_error(errors, "classic_monsters", url, str(exc))

    print(f"  Scraped {len(classic_records)} classic-only monster detail pages")

    if args.dry_run:
        print(f"[dry-run] Would merge {len(classic_records)} classic monsters into {monsters_path}")
        return

    merged, added = merge_classic_monsters(existing, classic_records)
    write_category_json(monsters_path, merged)
    print(f"  Wrote {monsters_path} ({len(merged)} total, +{added} classic-only)")

    index_stubs = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else []
    if not isinstance(index_stubs, list):
        index_stubs = []
    index_by_name = _build_name_index(index_stubs)
    for row in index_rows:
        if any(key in index_by_name for key in _name_keys(row["name"])):
            continue
        index_by_name[_normalize_name(row["name"])] = row
    write_index_cache(
        index_path,
        sorted(index_by_name.values(), key=lambda s: (s.get("name") or "").casefold()),
    )
    print(f"  Updated {index_path}")

    if errors:
        errors_path = output_dir / "classic_monsters_errors.json"
        errors_path.write_text(json.dumps(errors, indent=2), encoding="utf-8")
        print(f"  Wrote {len(errors)} errors to {errors_path}")


if __name__ == "__main__":
    main()
