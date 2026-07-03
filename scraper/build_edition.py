#!/usr/bin/env python3
"""Scrape all rulebooks in an edition index and build Fantasy Grounds modules."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scraper.config import ALL_CATEGORIES, DEFAULT_DELAY
from scraper.edition_pipeline import filter_edition_books
from scraper.edition_resolver import EditionBookEntry, EditionResolver, parse_edition_url
from scraper.engine import BookScraper
from scraper.fg.builder import build_module
from scraper.fg.loader import ALL_CATEGORIES as FG_CATEGORIES
from scraper.fg.packager import build_and_package_module
from scraper.http_client import HttpClient
from scraper.writer import print_summary_table, write_outputs


@dataclass
class BookPipelineResult:
    name: str
    folder_name: str
    source_url: str
    status: str
    scrape_records: int = 0
    scrape_errors: int = 0
    build_written: int = 0
    build_skipped: int = 0
    mod_path: str = ""
    message: str = ""


@dataclass
class EditionPipelineReport:
    edition_slug: str
    source_url: str
    completed: list[BookPipelineResult] = field(default_factory=list)
    skipped: list[BookPipelineResult] = field(default_factory=list)
    failed: list[BookPipelineResult] = field(default_factory=list)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Scrape every rulebook listed on a dnd.arkalseif.info edition index "
            "and build Fantasy Grounds 3.5E modules."
        )
    )
    parser.add_argument(
        "url",
        help="Edition index URL, e.g. .../rulebooks/supplementals-35--5/index.html",
    )
    parser.add_argument(
        "--scraped",
        type=Path,
        default=Path("scraped"),
        help="Base directory for scraped JSON (default: scraped/)",
    )
    parser.add_argument(
        "--modules",
        type=Path,
        default=Path("modules"),
        help="Directory for packaged .mod files (default: modules/)",
    )
    parser.add_argument(
        "--no-zip",
        action="store_true",
        help="Write unpacked module folders instead of .mod files",
    )
    parser.add_argument(
        "--author",
        default="FG Modules Scraper",
        help="Author in definition.xml",
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
        help="Scrape index tables only (skip detail pages)",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume detail fetch for partially scraped books",
    )
    parser.add_argument(
        "--skip-scrape",
        action="store_true",
        help="Build modules only (use existing scraped JSON)",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Scrape only (do not build FG modules)",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip scrape when summary.json already exists",
    )
    parser.add_argument(
        "--rebuild",
        action="store_true",
        help="Rebuild modules even when definition.xml already exists",
    )
    parser.add_argument(
        "--only",
        help="Comma-separated book names or folder slugs to process",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Process at most N books (after filters)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List discovered books and exit",
    )
    parser.add_argument(
        "--report",
        type=Path,
        help="Path for pipeline summary JSON (default: {scraped}/_{edition}-pipeline.json)",
    )
    return parser.parse_args(argv)


def _has_scraped_data(scraped_dir: Path) -> bool:
    if (scraped_dir / "summary.json").exists():
        return True
    return any((scraped_dir / f"{cat}.json").exists() for cat in FG_CATEGORIES)


def _write_pipeline_report(report: EditionPipelineReport, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    def _row(result: BookPipelineResult) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "name": result.name,
            "folder_name": result.folder_name,
            "source_url": result.source_url,
            "status": result.status,
        }
        if result.scrape_records or result.scrape_errors:
            payload["scrape_records"] = result.scrape_records
            payload["scrape_errors"] = result.scrape_errors
        if result.build_written or result.build_skipped:
            payload["build_written"] = result.build_written
            payload["build_skipped"] = result.build_skipped
        if result.mod_path:
            payload["mod_path"] = result.mod_path
        if result.message:
            payload["message"] = result.message
        return payload

    payload = {
        "edition_slug": report.edition_slug,
        "source_url": report.source_url,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "totals": {
            "completed": len(report.completed),
            "skipped": len(report.skipped),
            "failed": len(report.failed),
        },
        "books": {
            "completed": [_row(r) for r in report.completed],
            "skipped": [_row(r) for r in report.skipped],
            "failed": [_row(r) for r in report.failed],
        },
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def _print_pipeline_rollup(report: EditionPipelineReport) -> None:
    print(f"\nPipeline: {report.edition_slug}")
    print(f"  completed: {len(report.completed)}")
    print(f"  skipped:   {len(report.skipped)}")
    print(f"  failed:    {len(report.failed)}")
    for failed in report.failed:
        print(f"  FAILED: {failed.name}: {failed.message}")


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
        print("No books to process.", file=sys.stderr)
        return 1

    edition_slug = parse_edition_url(args.url)
    report = EditionPipelineReport(edition_slug=edition_slug, source_url=args.url)
    exit_code = 0

    for i, entry in enumerate(books, 1):
        scraped_dir = args.scraped / entry.folder_name
        module_dir = args.modules / entry.folder_name
        mod_path = args.modules / f"{entry.name}.mod"

        print(f"\n[{i}/{len(books)}] {entry.name}")
        print(f"  scrape -> {scraped_dir}")
        if args.no_zip:
            print(f"  module -> {module_dir}")
        else:
            print(f"  module -> {mod_path}")

        result = BookPipelineResult(
            name=entry.name,
            folder_name=entry.folder_name,
            source_url=entry.url,
            status="ok",
        )

        try:
            if not args.skip_scrape:
                if args.skip_existing and _has_scraped_data(scraped_dir):
                    print("  Scrape skipped (existing data)")
                else:
                    scraper = BookScraper(
                        client=client,
                        index_only=args.index_only,
                        resume=args.resume,
                        output_dir=scraped_dir,
                    )
                    scrape_result = scraper.scrape(entry.url, categories)
                    write_outputs(scrape_result, scraped_dir)
                    print_summary_table(scrape_result)
                    result.scrape_records = scrape_result.total_records
                    result.scrape_errors = scrape_result.total_errors
                    if scrape_result.total_errors:
                        exit_code = 2

            if not args.skip_build:
                if not _has_scraped_data(scraped_dir):
                    raise FileNotFoundError(f"no scraped data in {scraped_dir}")

                if args.no_zip:
                    exists = (
                        (module_dir / "definition.xml").exists()
                        and (module_dir / "db.xml").exists()
                    )
                else:
                    exists = mod_path.exists()

                if not args.rebuild and exists:
                    print("  Build skipped (module exists; use --rebuild to overwrite)")
                    result.status = "skipped"
                    if not args.no_zip and mod_path.exists():
                        result.mod_path = str(mod_path.resolve())
                    report.skipped.append(result)
                    continue

                if args.no_zip:
                    build_report = build_module(
                        scraped_dir=scraped_dir,
                        output_dir=module_dir,
                        categories=categories,
                        author=args.author,
                    )
                else:
                    build_report = build_and_package_module(
                        scraped_dir=scraped_dir,
                        mod_path=mod_path,
                        categories=categories,
                        author=args.author,
                    )
                    size_kb = mod_path.stat().st_size / 1024
                    result.mod_path = str(mod_path.resolve())
                    print(f"  Packaged {result.mod_path} ({size_kb:.1f} KB)")

                result.build_written = sum(build_report.written.values())
                result.build_skipped = sum(build_report.skipped.values())
                print(
                    f"  Built {result.build_written} records "
                    f"({result.build_skipped} skipped)"
                )

                if result.build_skipped:
                    exit_code = 2

            report.completed.append(result)
        except Exception as exc:
            print(f"  FAILED: {exc}", file=sys.stderr)
            result.status = "failed"
            result.message = str(exc)
            report.failed.append(result)
            exit_code = 2

    report_path = args.report or args.scraped / f"_{edition_slug}-pipeline.json"
    _write_pipeline_report(report, report_path)
    _print_pipeline_rollup(report)
    print(f"Pipeline report: {report_path.resolve()}")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
