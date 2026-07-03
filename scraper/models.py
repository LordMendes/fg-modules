"""Data models for scraper records and results."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class BookContext:
    slug: str
    title: str
    edition_slug: str
    source_url: str
    category_urls: dict[str, str]


@dataclass
class CategoryStats:
    index_count: int = 0
    pages_crawled: int = 0
    details_fetched: int = 0
    expected_total: int | None = None
    pagination_warning: str | None = None
    errors: list[dict[str, str]] = field(default_factory=list)


@dataclass
class ScrapeResult:
    book: BookContext
    categories: dict[str, list[dict[str, Any]]]
    stats: dict[str, CategoryStats]
    duration_seconds: float = 0.0

    @property
    def total_records(self) -> int:
        return sum(len(records) for records in self.categories.values())

    @property
    def total_errors(self) -> int:
        return sum(len(s.errors) for s in self.stats.values())
