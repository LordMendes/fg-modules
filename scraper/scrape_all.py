"""CLI entry point for scraping new.dndtools.org."""

from __future__ import annotations

import argparse
from pathlib import Path

from .config import (
    ALL_CATEGORIES,
    CATEGORY_CONFIG,
    DEFAULT_CACHE_DIR,
    DEFAULT_OUTPUT_DIR,
    DEFAULT_WORKERS,
)
from .engine import ScrapeEngine
from .http_client import HttpClient


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape D&D 3.5 data from new.dndtools.org")
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory (default: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--categories",
        default=",".join(ALL_CATEGORIES),
        help="Comma-separated category list (default: all)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Delay between HTTP requests in seconds (default: 0.5)",
    )
    parser.add_argument(
        "--cache",
        default=DEFAULT_CACHE_DIR,
        help=f"HTTP cache directory (default: {DEFAULT_CACHE_DIR})",
    )
    parser.add_argument(
        "--index-only",
        action="store_true",
        help="Skip detail pages (index stubs only)",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip URLs already present in output JSON",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Cap records per category (for testing)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        help=f"Parallel detail-page workers (default: {DEFAULT_WORKERS})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print plan without writing output files",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    categories = [c.strip() for c in args.categories.split(",") if c.strip()]
    unknown = [c for c in categories if c not in CATEGORY_CONFIG]
    if unknown:
        raise SystemExit(f"Unknown categories: {', '.join(unknown)}")

    output_dir = Path(args.output)
    cache_dir = Path(args.cache) if args.cache else None

    if args.dry_run:
        print("Dry run plan:")
        for category in categories:
            expected = CATEGORY_CONFIG[category]["expected"]
            limit = args.limit or expected
            print(f"  {category}: up to {min(limit, expected)} records")
        print(f"  workers: {args.workers}")
        return

    client = HttpClient(cache_dir=cache_dir, delay=args.delay)
    engine = ScrapeEngine(
        client=client,
        output_dir=output_dir,
        index_only=args.index_only,
        resume=args.resume,
        limit=args.limit,
        dry_run=False,
        workers=args.workers,
    )
    result = engine.scrape_categories(categories)
    print(
        f"\nDone in {result.duration_seconds:.1f}s — "
        f"{sum(s.scraped for s in result.stats.values())} records, "
        f"{len(result.errors)} errors"
    )


if __name__ == "__main__":
    main()
