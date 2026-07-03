#!/usr/bin/env python3
"""Scrape all rulebooks in a D&D Tools edition index into structured JSON."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scraper.config import ALL_CATEGORIES, DEFAULT_DELAY
from scraper.edition_pipeline import filter_edition_books
from scraper.edition_resolver import EditionBookEntry, EditionResolver, parse_edition_url
from scraper.engine import BookScraper
from scraper.http_client import HttpClient
from scraper.writer import (
    EditionBookRun,
    EditionRunResult,
    print_edition_rollup,
    print_summary_table,
    write_edition_run_report,
    write_outputs,
)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape all rulebooks in a dnd.arkalseif.info edition index."
    )
    parser.add_argument("url", help="Edition index URL")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("scraped"),
        help="Base output directory (default: scraped/)",
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
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip books whose output folder already has summary.json",
    )
    parser.add_argument(
        "--only",
        help="Comma-separated book names or folder slugs to scrape",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Scrape at most N books (after filters)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List discovered books and exit without scraping",
    )
    parser.add_argument(
        "--report",
        type=Path,
        help="Path for edition run summary JSON (default: {output}/_{edition}-run.json)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    categories = [c.strip() for c in args.categories.split(",") if c.strip()]
    invalid = set(categories) - set(ALL_CATEGORIES)
    if invalid:
        print(f"Error: unknown categories: {', '.join(sorted(invalid))}", file=sys.stderr)
        return 1

    client = HttpClient(cache_dir=args.cache, delay=args.delay)

    try:
        resolver = EditionResolver(client.fetch)
        books = resolver.resolve(args.url)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Failed to resolve edition: {exc}", file=sys.stderr)
        return 1

    books = filter_edition_books(books, args.only, args.limit)

    if args.list:
        print(f"Found {len(books)} book(s):")
        for entry in books:
            print(f"  {entry.folder_name:<45} {entry.name}")
        return 0

    if not books:
        print("No books to scrape.", file=sys.stderr)
        return 1

    edition_slug = parse_edition_url(args.url)
    run = EditionRunResult(edition_slug=edition_slug, source_url=args.url)
    exit_code = 0

    for i, entry in enumerate(books, 1):
        out_dir = args.output / entry.folder_name
        print(f"\n[{i}/{len(books)}] {entry.name} -> {out_dir}")

        if args.skip_existing and (out_dir / "summary.json").exists():
            print("  Skipped (summary.json exists)")
            run.skipped.append(
                EditionBookRun(
                    name=entry.name,
                    folder_name=entry.folder_name,
                    source_url=entry.url,
                    status="skipped",
                )
            )
            continue

        scraper = BookScraper(
            client=client,
            index_only=args.index_only,
            resume=args.resume,
            output_dir=out_dir,
        )

        try:
            result = scraper.scrape(entry.url, categories)
            write_outputs(result, out_dir)
            print_summary_table(result)
            print(f"  Output written to {out_dir.resolve()}")

            run.scraped.append(
                EditionBookRun(
                    name=entry.name,
                    folder_name=entry.folder_name,
                    source_url=entry.url,
                    status="ok" if result.total_errors == 0 else "errors",
                    records=result.total_records,
                    errors=result.total_errors,
                    duration_seconds=round(result.duration_seconds, 2),
                )
            )
            if result.total_errors:
                exit_code = 2
        except Exception as exc:
            print(f"  FAILED: {exc}", file=sys.stderr)
            run.failed.append(
                EditionBookRun(
                    name=entry.name,
                    folder_name=entry.folder_name,
                    source_url=entry.url,
                    status="failed",
                    message=str(exc),
                )
            )
            exit_code = 2

    report_path = args.report or args.output / f"_{edition_slug}-run.json"
    write_edition_run_report(run, report_path)
    print_edition_rollup(run)
    print(f"Edition run report: {report_path.resolve()}")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
