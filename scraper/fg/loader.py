"""Load scraped book JSON."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

ALL_CATEGORIES = ("spells", "feats", "classes", "skills", "items", "races")
CATEGORY_ORDER = ("classes", "feats", "spells", "skills", "items", "races")


@dataclass
class BuildReport:
    book_title: str = ""
    book_slug: str = ""
    written: dict[str, int] = field(default_factory=dict)
    skipped: dict[str, int] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    def add_written(self, category: str) -> None:
        self.written[category] = self.written.get(category, 0) + 1

    def add_skipped(self, category: str, reason: str = "") -> None:
        self.skipped[category] = self.skipped.get(category, 0) + 1
        if reason:
            self.warnings.append(f"{category}: {reason}")

    def to_dict(self) -> dict[str, Any]:
        return {
            "book_title": self.book_title,
            "book_slug": self.book_slug,
            "written": self.written,
            "skipped": self.skipped,
            "warnings": self.warnings,
            "total_written": sum(self.written.values()),
            "total_skipped": sum(self.skipped.values()),
        }


@dataclass
class LoadedBook:
    title: str
    slug: str
    source_url: str
    categories: dict[str, list[dict[str, Any]]]


def load_book(scraped_dir: Path) -> LoadedBook:
    scraped_dir = Path(scraped_dir)
    summary_path = scraped_dir / "summary.json"
    book_path = scraped_dir / "book.json"

    summary: dict[str, Any] = {}
    if summary_path.exists():
        summary = json.loads(summary_path.read_text(encoding="utf-8"))

    title = summary.get("title", "")
    slug = summary.get("book_slug", scraped_dir.name)
    source_url = summary.get("source_url", "")

    categories: dict[str, list[dict[str, Any]]] = {cat: [] for cat in ALL_CATEGORIES}

    if book_path.exists():
        book = json.loads(book_path.read_text(encoding="utf-8"))
        title = title or book.get("title", slug.replace("-", " ").title())
        slug = slug or book.get("book_slug", scraped_dir.name)
        source_url = source_url or book.get("source_url", "")
        for cat in ALL_CATEGORIES:
            cat_path = scraped_dir / f"{cat}.json"
            if cat_path.exists():
                data = json.loads(cat_path.read_text(encoding="utf-8"))
                categories[cat] = data if isinstance(data, list) else data.get("records", [])
            else:
                categories[cat] = book.get("categories", {}).get(cat, [])
    else:
        for cat in ALL_CATEGORIES:
            cat_path = scraped_dir / f"{cat}.json"
            if cat_path.exists():
                data = json.loads(cat_path.read_text(encoding="utf-8"))
                categories[cat] = data if isinstance(data, list) else data.get("records", [])
        if not title:
            title = slug.replace("-", " ").rsplit("--", 1)[0].replace("-", " ").title()

    return LoadedBook(title=title, slug=slug, source_url=source_url, categories=categories)


def filter_records(
    records: list[dict[str, Any]],
    category: str,
    skip_no_detail: bool,
    report: BuildReport,
) -> list[dict[str, Any]]:
    kept: list[dict[str, Any]] = []
    for rec in records:
        if skip_no_detail and not rec.get("detail"):
            report.add_skipped(category, f"no detail: {rec.get('name', '?')}")
            continue
        kept.append(rec)
    return kept
