"""JSON output, summary, errors, and incremental writes."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import BASE_URL, CATEGORY_CONFIG
from .normalize import normalize_records


@dataclass
class CategoryStats:
    expected: int = 0
    scraped: int = 0
    errors: int = 0
    duration_seconds: float = 0.0
    pages_crawled: int = 0


@dataclass
class ScrapeRunResult:
    categories: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    stats: dict[str, CategoryStats] = field(default_factory=dict)
    errors: list[dict[str, Any]] = field(default_factory=list)
    duration_seconds: float = 0.0


def load_existing_records(path: Path) -> dict[str, dict[str, Any]]:
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        return {}
    return {r["source_url"]: r for r in data if r.get("source_url")}


def write_category_json(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    normalized = normalize_records(records)
    path.write_text(
        json.dumps(normalized, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def write_index_cache(path: Path, stubs: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(stubs, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def append_error(errors: list[dict[str, Any]], category: str, url: str, error: str) -> None:
    errors.append(
        {
            "category": category,
            "url": url,
            "error": error,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )


def write_summary(output_dir: Path, stats: dict[str, CategoryStats]) -> None:
    payload = {
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "base_url": BASE_URL,
        "categories": {
            category: {
                "expected": CATEGORY_CONFIG[category]["expected"],
                "scraped": s.scraped,
                "errors": s.errors,
                "duration_seconds": round(s.duration_seconds, 2),
                "pages_crawled": s.pages_crawled,
            }
            for category, s in stats.items()
        },
    }
    (output_dir / "summary.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def write_errors(output_dir: Path, errors: list[dict[str, Any]]) -> None:
    (output_dir / "errors.json").write_text(
        json.dumps(errors, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def print_progress(category: str, current: int, total: int, slug: str) -> None:
    pct = int((current / total) * 100) if total else 0
    print(f"[{category}] {current}/{total} ({pct}%) — {slug}")
