"""Scrape classic dndtools.org / dndtools.net items and merge into items.json."""

from __future__ import annotations

import argparse
import json
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

from .classic_merge import build_name_index, merge_classic_records, name_keys
from .config import CLASSIC_BASE_URL, DEFAULT_CACHE_DIR, DEFAULT_DELAY, DEFAULT_OUTPUT_DIR
from .http_client import HttpClient
from .parsers.classic_items import parse_classic_item_detail, parse_classic_item_index
from .source_names import load_name_map
from .writer import append_error, write_category_json, write_index_cache


def classic_item_index_url(base_url: str, page: int, page_size: int = 20) -> str:
    query = urlencode({"page": page, "page_size": page_size})
    return f"{base_url.rstrip('/')}/items/?{query}"


def iter_classic_item_index(
    fetch,
    base_url: str = CLASSIC_BASE_URL,
    page_size: int = 20,
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    page = 1
    max_pages = 1
    while page <= max_pages:
        url = classic_item_index_url(base_url, page, page_size)
        html = fetch(url)
        page_records, total = parse_classic_item_index(html, base_url)
        records.extend(page_records)
        if page == 1 and total:
            max_pages = max(1, (total + page_size - 1) // page_size)
        page += 1
    return records


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Scrape classic dndtools.org / dndtools.net items and merge "
            "into data/dndtools/items.json."
        )
    )
    parser.add_argument("--output", default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--cache", default=str(DEFAULT_CACHE_DIR))
    parser.add_argument("--delay", type=float, default=DEFAULT_DELAY)
    parser.add_argument("--base-url", default=CLASSIC_BASE_URL)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output)
    items_path = output_dir / "items.json"
    index_path = output_dir / ".index" / "items.json"
    name_map = load_name_map()

    existing: list[dict[str, Any]] = []
    if items_path.exists():
        data = json.loads(items_path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            existing = data

    client = HttpClient(cache_dir=Path(args.cache), delay=args.delay)
    errors: list[dict[str, Any]] = []
    existing_index = build_name_index(existing)

    print(f"Indexing classic items from {args.base_url}...")
    index_rows = iter_classic_item_index(client.fetch, base_url=args.base_url)
    print(f"  Found {len(index_rows)} classic item index entries")

    classic_records: list[dict[str, Any]] = []
    to_fetch = index_rows[: args.limit] if args.limit is not None else index_rows

    for row in to_fetch:
        if any(key in existing_index for key in name_keys(row["name"])):
            continue
        url = row["url"]
        try:
            html = client.fetch(url)
            record = parse_classic_item_detail(html, url, index_record=row, name_map=name_map)
            classic_records.append(record)
        except Exception as exc:  # noqa: BLE001
            append_error(errors, "classic_items", url, str(exc))

    print(f"  Scraped {len(classic_records)} classic-only item detail pages")

    if args.dry_run:
        print(f"[dry-run] Would merge {len(classic_records)} classic items into {items_path}")
        return

    merged, added = merge_classic_records(existing, classic_records)
    write_category_json(items_path, merged)
    print(f"  Wrote {items_path} ({len(merged)} total, +{added} classic-only)")

    index_stubs = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else []
    if not isinstance(index_stubs, list):
        index_stubs = []
    index_by_name = build_name_index(index_stubs)
    for row in index_rows:
        if any(key in index_by_name for key in name_keys(row["name"])):
            continue
        for key in name_keys(row["name"]):
            index_by_name[key] = row
            break
    write_index_cache(
        index_path,
        sorted(index_by_name.values(), key=lambda s: (s.get("name") or "").casefold()),
    )
    print(f"  Updated {index_path}")

    if errors:
        errors_path = output_dir / "classic_items_errors.json"
        errors_path.write_text(json.dumps(errors, indent=2), encoding="utf-8")
        print(f"  Wrote {len(errors)} errors to {errors_path}")


if __name__ == "__main__":
    main()
