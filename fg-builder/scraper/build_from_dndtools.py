#!/usr/bin/env python3
"""Build Fantasy Grounds modules from dndtools-reference web JSON."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scraper.dndtools_adapter import BOOKS, build_scraped_book
from scraper.fg.builder import EmptyModuleError
from scraper.fg.loader import ALL_CATEGORIES
from scraper.fg.packager import build_and_package_module


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build FG .mod files from dndtools-reference JSON (ground truth)."
    )
    parser.add_argument(
        "books",
        nargs="*",
        help="Book titles (e.g. 'Complete Divine'). Omit to build all known books.",
    )
    parser.add_argument(
        "--abbrev",
        help="Build by source abbrev instead of title (e.g. CD)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("modules"),
        help="Directory for packaged .mod files (default: modules/)",
    )
    parser.add_argument(
        "--scraped-root",
        type=Path,
        default=Path("scraped/dndtools"),
        help="Staging scraped JSON root (default: scraped/dndtools/)",
    )
    parser.add_argument(
        "--author",
        default="FG Modules (dndtools)",
        help="Author in definition.xml",
    )
    parser.add_argument(
        "--no-spell-actions",
        action="store_true",
        help="Omit spell automation actions",
    )
    return parser.parse_args(argv)


def resolve_books(args: argparse.Namespace) -> list[tuple[str, str, str]]:
    if args.abbrev:
        for title, (abbrev, slug) in BOOKS.items():
            if abbrev == args.abbrev:
                return [(title, abbrev, slug)]
        print(f"Unknown abbrev: {args.abbrev}", file=sys.stderr)
        return []

    if args.books:
        selected: list[tuple[str, str, str]] = []
        for book in args.books:
            key = book.strip()
            if key not in BOOKS:
                # case-insensitive fallback
                match = next((t for t in BOOKS if t.lower() == key.lower()), None)
                if not match:
                    print(f"Unknown book: {key}", file=sys.stderr)
                    continue
                key = match
            abbrev, slug = BOOKS[key]
            selected.append((key, abbrev, slug))
        return selected

    return [(title, abbrev, slug) for title, (abbrev, slug) in BOOKS.items()]


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    books = resolve_books(args)
    if not books:
        return 1

    exit_code = 0
    for title, abbrev, slug in books:
        scraped_dir = args.scraped_root / slug
        print(f"\n=== {title} ({abbrev}) ===")
        counts = build_scraped_book(title, abbrev, slug, scraped_dir)
        print(f"  staged: {counts}")

        mod_path = args.output_dir / f"{title}.mod"
        try:
            report = build_and_package_module(
                scraped_dir=scraped_dir,
                mod_path=mod_path,
                categories=list(ALL_CATEGORIES),
                author=args.author,
                skip_no_detail=False,
                spell_actions=not args.no_spell_actions,
            )
        except EmptyModuleError as exc:
            print(f"  skipped: {exc}", file=sys.stderr)
            exit_code = 1
            continue
        except Exception as exc:
            print(f"  failed: {exc}", file=sys.stderr)
            exit_code = 1
            continue

        print(f"  written: {report.written}")
        if report.warnings:
            print(f"  warnings: {len(report.warnings)}")
        print(f"  packaged: {mod_path.resolve()}")

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
