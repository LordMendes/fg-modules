"""JSON output and summary generation."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .models import BookContext, CategoryStats, ScrapeResult


@dataclass
class EditionBookRun:
    name: str
    folder_name: str
    source_url: str
    status: str
    records: int = 0
    errors: int = 0
    duration_seconds: float = 0.0
    message: str = ""


@dataclass
class EditionRunResult:
    edition_slug: str
    source_url: str
    scraped: list[EditionBookRun] = field(default_factory=list)
    skipped: list[EditionBookRun] = field(default_factory=list)
    failed: list[EditionBookRun] = field(default_factory=list)


def load_existing_records(path: Path) -> dict[str, dict[str, Any]]:
    """Load existing records keyed by source_url for --resume."""
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    records = data if isinstance(data, list) else data.get("records", [])
    return {r["source_url"]: r for r in records if r.get("source_url")}


def build_record(
    category: str,
    book: BookContext,
    index_data: dict[str, Any],
    detail_data: dict[str, Any] | None,
) -> dict[str, Any]:
    slug = index_data.get("slug") or ""
    global_id = index_data.get("global_id")
    return {
        "id": global_id,
        "slug": slug,
        "name": index_data.get("name", ""),
        "source_url": index_data.get("url", ""),
        "book_slug": book.slug,
        "category": category,
        "index": {k: v for k, v in index_data.items() if k not in ("name", "url", "slug", "global_id")},
        "detail": detail_data,
    }


def write_outputs(result: ScrapeResult, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    book = result.book

    summary = {
        "source_url": book.source_url,
        "book_slug": book.slug,
        "title": book.title,
        "edition_slug": book.edition_slug,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "categories": {
            cat: {
                "index_count": stats.index_count,
                "pages_crawled": stats.pages_crawled,
                "details_fetched": stats.details_fetched,
                "expected_total": stats.expected_total,
                "pagination_warning": stats.pagination_warning,
                "errors": stats.errors,
            }
            for cat, stats in result.stats.items()
        },
        "totals": {
            "records": result.total_records,
            "errors": result.total_errors,
            "duration_seconds": round(result.duration_seconds, 2),
        },
    }

    (output_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    book_payload: dict[str, Any] = {
        "source_url": book.source_url,
        "book_slug": book.slug,
        "title": book.title,
        "edition_slug": book.edition_slug,
        "scraped_at": summary["scraped_at"],
        "categories": {},
    }

    for category, records in result.categories.items():
        (output_dir / f"{category}.json").write_text(
            json.dumps(records, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        book_payload["categories"][category] = records

    (output_dir / "book.json").write_text(
        json.dumps(book_payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def print_summary_table(result: ScrapeResult) -> None:
    book = result.book
    print(f"\n{book.title} ({book.slug})")
    for category in sorted(result.stats.keys()):
        stats = result.stats[category]
        pages = stats.pages_crawled
        count = stats.index_count
        details = stats.details_fetched
        if count == 0:
            print(f"  {category:<8} {count:>4} records  -")
        else:
            page_str = f"{pages} page{'s' if pages != 1 else ''}"
            print(
                f"  {category:<8} {count:>4} records  {page_str:<10} {details}/{count} details OK"
            )
        if stats.pagination_warning:
            print(f"           WARNING: {stats.pagination_warning}")
        for err in stats.errors[:3]:
            print(f"           ERROR: {err.get('name', '?')}: {err.get('message', '')}")
        if len(stats.errors) > 3:
            print(f"           ... and {len(stats.errors) - 3} more errors")
    print(f"  errors: {result.total_errors}")
    print(f"  duration: {result.duration_seconds:.1f}s\n")


def _edition_book_run_dict(run: EditionBookRun) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": run.name,
        "folder_name": run.folder_name,
        "source_url": run.source_url,
        "status": run.status,
    }
    if run.status in ("ok", "errors"):
        payload["records"] = run.records
        payload["errors"] = run.errors
        payload["duration_seconds"] = run.duration_seconds
    if run.message:
        payload["message"] = run.message
    return payload


def write_edition_run_report(run: EditionRunResult, report_path: Path) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "edition_slug": run.edition_slug,
        "source_url": run.source_url,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "totals": {
            "scraped": len(run.scraped),
            "skipped": len(run.skipped),
            "failed": len(run.failed),
            "errors": sum(r.errors for r in run.scraped),
        },
        "books": {
            "scraped": [_edition_book_run_dict(r) for r in run.scraped],
            "skipped": [_edition_book_run_dict(r) for r in run.skipped],
            "failed": [_edition_book_run_dict(r) for r in run.failed],
        },
    }
    report_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def print_edition_rollup(run: EditionRunResult) -> None:
    print(f"\nEdition run: {run.edition_slug}")
    print(f"  scraped: {len(run.scraped)}")
    print(f"  skipped: {len(run.skipped)}")
    print(f"  failed:  {len(run.failed)}")
    total_errors = sum(r.errors for r in run.scraped)
    if total_errors:
        print(f"  record errors: {total_errors}")
    for failed in run.failed:
        print(f"  FAILED: {failed.name}: {failed.message}")
