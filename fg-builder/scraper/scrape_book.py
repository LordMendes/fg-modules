#!/usr/bin/env python3
"""Scrape a D&D Tools rulebook into structured JSON."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow running as script from repo root or scraper dir
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scraper.config import ALL_CATEGORIES, DEFAULT_DELAY
from scraper.engine import BookScraper
from scraper.http_client import HttpClient
from scraper.resolver import parse_rulebook_url
from scraper.writer import print_summary_table, write_outputs


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape a dnd.arkalseif.info rulebook into JSON."
    )
    parser.add_argument("url", help="Rulebook index URL")
    parser.add_argument(
        "--output",
        type=Path,
        help="Output directory (default: scraped/{book-slug})",
    )
    parser.add_argument(
        "--categories",
        default=",".join(ALL_CATEGORIES),
        help=f"Comma-separated categories (default: all). Options: {','.join(ALL_CATEGORIES)}",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=DEFAULT_DELAY,
        help=f"Delay between HTTP requests in seconds (default: {DEFAULT_DELAY})",
    )
    parser.add_argument(
        "--cache",
        type=Path,
        default=Path("scraped/.cache"),
        help="Disk cache directory for HTTP responses",
    )
    parser.add_argument(
        "--index-only",
        action="store_true",
        help="Skip detail page fetching (index tables only)",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip detail fetch for records already in output JSON",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    try:
        _, book_slug = parse_rulebook_url(args.url)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    output_dir = args.output or Path("scraped") / book_slug
    categories = [c.strip() for c in args.categories.split(",") if c.strip()]
    invalid = set(categories) - set(ALL_CATEGORIES)
    if invalid:
        print(f"Error: unknown categories: {', '.join(sorted(invalid))}", file=sys.stderr)
        return 1

    client = HttpClient(cache_dir=args.cache, delay=args.delay)
    scraper = BookScraper(
        client=client,
        index_only=args.index_only,
        resume=args.resume,
        output_dir=output_dir,
    )

    try:
        result = scraper.scrape(args.url, categories)
    except Exception as exc:
        print(f"Scrape failed: {exc}", file=sys.stderr)
        return 1

    write_outputs(result, output_dir)
    print_summary_table(result)
    print(f"Output written to {output_dir.resolve()}")
    return 0 if result.total_errors == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
