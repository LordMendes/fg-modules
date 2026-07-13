#!/usr/bin/env python3
"""Review Fantasy Grounds modules for 3.5E compatibility."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scraper.fg.reviewer import ReviewReport, review_module_path

DEFAULT_BOOKS = [
    "Complete Adventurer",
    "Complete Arcane",
    "Complete Champion",
    "Complete Divine",
    "Complete Mage",
    "Complete Warrior",
    "Player's Handbook II",
]


def _slugify(name: str) -> str:
    text = name.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def _resolve_modules(
    modules_dir: Path,
    books: list[str] | None,
) -> list[Path]:
    if books:
        paths: list[Path] = []
        for book in books:
            mod = modules_dir / f"{book.strip()}.mod"
            if not mod.exists():
                raise FileNotFoundError(f"Module not found: {mod}")
            paths.append(mod)
        return paths

    return sorted(modules_dir.glob("*.mod"))


def _format_issue_lines(issues: list, limit: int | None = None) -> list[str]:
    lines: list[str] = []
    for issue in issues[: limit or len(issues)]:
        lines.append(
            f"- **[{issue.severity}]** `{issue.code}` — "
            f"{issue.record_name}: {issue.message}"
        )
        if issue.remediation:
            lines.append(f"  - Remediation: {issue.remediation}")
    if limit and len(issues) > limit:
        lines.append(f"- ... and {len(issues) - limit} more")
    return lines


def _write_module_markdown(report: ReviewReport, path: Path) -> None:
    lines = [
        f"# {report.module_name}",
        "",
        f"- **Path:** `{report.module_path}`",
        f"- **Book slug:** `{report.book_slug}`" if report.book_slug else "",
        f"- **Load ready:** {'yes' if report.load_ready else 'no'}",
        f"- **Errors:** {len(report.errors)}",
        f"- **Warnings:** {len(report.warnings)}",
        f"- **Info:** {len(report.infos)}",
        "",
        "## Record counts",
        "",
    ]
    lines = [line for line in lines if line != ""]

    if report.record_counts:
        lines.append("| Category | Count |")
        lines.append("|----------|------:|")
        for cat, count in sorted(report.record_counts.items()):
            lines.append(f"| {cat} | {count} |")
    else:
        lines.append("_No records found._")

    if report.build_warnings:
        lines.extend(["", "## Build warnings (embedded)", ""])
        for warning in report.build_warnings:
            lines.append(f"- {warning}")

    for severity, title in (
        ("error", "Errors"),
        ("warning", "Warnings"),
        ("info", "Info"),
    ):
        bucket = [i for i in report.issues if i.severity == severity]
        if not bucket:
            continue
        lines.extend(["", f"## {title}", ""])
        lines.extend(_format_issue_lines(bucket))

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_readme(reports: list[ReviewReport], path: Path) -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "# FG Module Compatibility Review — v1",
        "",
        f"Generated: {now}",
        "",
        "Target: Fantasy Grounds **3.5E** ruleset load + automation conventions "
        "(per `skills/` and `.cursor/skills/fantasy-grounds/`).",
        "",
        "## Summary",
        "",
        "| Module | .mod | Load ready | Errors | Warnings | Info | Records |",
        "|--------|------|:----------:|-------:|---------:|-----:|--------:|",
    ]

    total_errors = 0
    total_warnings = 0
    total_info = 0
    total_records = 0

    for report in reports:
        records = sum(report.record_counts.values())
        total_errors += len(report.errors)
        total_warnings += len(report.warnings)
        total_info += len(report.infos)
        total_records += records
        load = "yes" if report.load_ready else "no"
        slug = _slugify(report.module_name)
        mod_file = Path(report.module_path).name
        lines.append(
            f"| [{report.module_name}]({_slugify(report.module_name)}.md) "
            f"| `{mod_file}` | {load} | {len(report.errors)} | {len(report.warnings)} "
            f"| {len(report.infos)} | {records} |"
        )

    lines.extend(
        [
            "",
            "## Rollup totals",
            "",
            f"- **Modules reviewed:** {len(reports)}",
            f"- **Load ready:** {sum(1 for r in reports if r.load_ready)} / {len(reports)}",
            f"- **Total records:** {total_records}",
            f"- **Total errors:** {total_errors}",
            f"- **Total warnings:** {total_warnings}",
            f"- **Total info:** {total_info}",
            "",
            "## Verdict",
            "",
        ]
    )

    if all(r.load_ready for r in reports):
        lines.append(
            "All modules have valid packaging and XML structure — they should "
            "**load in FG 3.5E**. Automation gaps (class skills, spell actions) "
            "are documented per module; see warnings for converter fixes."
        )
    else:
        lines.append(
            "One or more modules have blocking errors — fix before loading in FG."
        )

    lines.extend(
        [
            "",
            "## Known cross-cutting issues",
            "",
            "| Issue | Impact | Fix |",
            "|-------|--------|-----|",
            "| `engineering)`, `royalty)` in classskills | FG won't recognize Knowledge sub-skills | Fix parser in `scraper/fg/converters/classes.py`, rebuild |",
            "| Psionic skills (Exemplar, Shadowmind) | Needs Expanded Psionics module | Expected unless psionics loaded |",
            "| Variant classes missing skill automation | Manual L1 skill selection | Improve scrape for variant class pages |",
            "",
            "## Contents",
            "",
            "This folder contains the reviewed `.mod` files plus per-module "
            "compatibility reports (`.json` / `.md`).",
            "",
            "## Manual test plan",
            "",
            "1. Copy `.mod` files from this folder into your Fantasy Grounds modules folder.",
            "2. Load each module in a 3.5E campaign with **3.5E Basic Rules** enabled.",
            "3. Open Library → Rules; verify classes, feats, spells drag to character sheets.",
            "4. Create a test PC; add a prestige class — confirm requirements and features display.",
            "5. Cast a spell with actions — confirm save/DC dialog appears.",
        ]
    )

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_rollup(reports: list[ReviewReport], path: Path) -> None:
    payload = {
        "version": "v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "modules": [r.to_dict() for r in reports],
        "totals": {
            "modules": len(reports),
            "load_ready": sum(1 for r in reports if r.load_ready),
            "errors": sum(len(r.errors) for r in reports),
            "warnings": sum(len(r.warnings) for r in reports),
            "info": sum(len(r.infos) for r in reports),
            "records": sum(sum(r.record_counts.values()) for r in reports),
        },
    }
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def run_review(
    modules_dir: Path,
    output_dir: Path,
    books: list[str] | None = None,
) -> list[ReviewReport]:
    modules_dir = modules_dir.resolve()
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    mod_paths = _resolve_modules(modules_dir, books)
    reports: list[ReviewReport] = []

    for mod_path in mod_paths:
        report = review_module_path(mod_path)
        slug = _slugify(report.module_name)

        dest_mod = output_dir / mod_path.name
        shutil.copy2(mod_path, dest_mod)
        report.module_path = str(dest_mod)

        json_path = output_dir / f"{slug}.json"
        md_path = output_dir / f"{slug}.md"
        json_path.write_text(
            json.dumps(report.to_dict(), indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        _write_module_markdown(report, md_path)
        reports.append(report)

        print(
            f"{report.module_name}: load_ready={report.load_ready} "
            f"errors={len(report.errors)} warnings={len(report.warnings)} "
            f"info={len(report.infos)} -> {dest_mod.name}"
        )

    _write_readme(reports, output_dir / "README.md")
    _write_rollup(reports, output_dir / "rollup.json")
    print(f"Wrote {len(reports)} reviewed modules and reports to {output_dir}")
    return reports


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Review FG .mod files for 3.5E compatibility."
    )
    parser.add_argument(
        "modules_dir",
        type=Path,
        nargs="?",
        default=Path("modules"),
        help="Directory containing .mod files (default: modules/)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("reviews/v1"),
        help="Output directory for reviewed .mod files and reports (default: reviews/v1/)",
    )
    parser.add_argument(
        "--books",
        default=",".join(DEFAULT_BOOKS),
        help="Comma-separated module names (without .mod extension)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Review all .mod files in modules_dir instead of --books list",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    books = None if args.all else [b.strip() for b in args.books.split(",") if b.strip()]

    if not args.modules_dir.is_dir():
        print(f"Error: not a directory: {args.modules_dir}", file=sys.stderr)
        return 1

    try:
        reports = run_review(args.modules_dir, args.output, books)
    except FileNotFoundError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    has_errors = any(not r.load_ready for r in reports)
    return 2 if has_errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
