#!/usr/bin/env python3
"""Convert scraped D&D Tools JSON into a Fantasy Grounds 3.5E module."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scraper.fg.builder import EmptyModuleError
from scraper.fg.loader import ALL_CATEGORIES, load_book
from scraper.fg.packager import build_and_package_module


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert scraped rulebook JSON to a Fantasy Grounds module."
    )
    parser.add_argument(
        "scraped_dir",
        type=Path,
        help="Folder containing book.json (e.g. scraped/complete-divine--56)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Path for packaged .mod file (default: modules/{book title}.mod)",
    )
    parser.add_argument(
        "--unpacked",
        type=Path,
        help="Also write unpacked module files to this directory",
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
        "--include-no-detail",
        action="store_true",
        help="Include index records even when detail is missing",
    )
    parser.add_argument(
        "--no-spell-actions",
        action="store_true",
        help="Omit FG spell power actions (cast/save/damage/effect) from spell records",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    scraped_dir = args.scraped_dir.resolve()

    if not scraped_dir.is_dir():
        print(f"Error: not a directory: {scraped_dir}", file=sys.stderr)
        return 1

    book_json = scraped_dir / "book.json"
    summary_json = scraped_dir / "summary.json"
    if not book_json.exists() and not summary_json.exists():
        has_any = any((scraped_dir / f"{c}.json").exists() for c in ALL_CATEGORIES)
        if not has_any:
            print(f"Error: no book.json found in {scraped_dir}", file=sys.stderr)
            return 1

    categories = [c.strip() for c in args.categories.split(",") if c.strip()]
    invalid = set(categories) - set(ALL_CATEGORIES)
    if invalid:
        print(f"Error: unknown categories: {', '.join(sorted(invalid))}", file=sys.stderr)
        return 1

    output_mod = args.output or Path("modules") / f"{load_book(scraped_dir).title}.mod"

    try:
        report = build_and_package_module(
            scraped_dir=scraped_dir,
            mod_path=output_mod,
            categories=categories,
            author=args.author,
            skip_no_detail=not args.include_no_detail,
            spell_actions=not args.no_spell_actions,
        )
    except EmptyModuleError as exc:
        print(f"Build skipped: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Build failed: {exc}", file=sys.stderr)
        return 1

    if args.unpacked:
        from scraper.fg.builder import build_module

        build_module(
            scraped_dir=scraped_dir,
            output_dir=args.unpacked,
            categories=categories,
            author=args.author,
            skip_no_detail=not args.include_no_detail,
            spell_actions=not args.no_spell_actions,
        )
        print(f"Unpacked copy written to {args.unpacked.resolve()}")

    print(f"\n{report.book_title} ({report.book_slug})")
    for cat in sorted(set(list(report.written.keys()) + list(report.skipped.keys()))):
        w = report.written.get(cat, 0)
        s = report.skipped.get(cat, 0)
        print(f"  {cat:<8} written: {w:>4}  skipped: {s:>4}")
    print(f"  total written: {sum(report.written.values())}")
    print(f"  total skipped: {sum(report.skipped.values())}")
    if report.warnings:
        print(f"  warnings: {len(report.warnings)}")
        for w in report.warnings[:5]:
            print(f"    - {w}")
        if len(report.warnings) > 5:
            print(f"    ... and {len(report.warnings) - 5} more")
    print(f"\nModule packaged to {output_mod.resolve()}")
    size_kb = output_mod.stat().st_size / 1024
    print(f"  size: {size_kb:.1f} KB")

    return 0 if sum(report.skipped.values()) == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
