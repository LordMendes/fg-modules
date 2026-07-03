"""Core scrape orchestration."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup

from .http_client import HttpClient
from .models import BookContext, CategoryStats, ScrapeResult
from .pagination import IndexPaginator
from .parsers import DETAIL_PARSERS, INDEX_PARSERS
from .parsers.base import parse_pagination_total
from .resolver import BookResolver
from .writer import build_record, load_existing_records


class BookScraper:
    def __init__(
        self,
        client: HttpClient,
        index_only: bool = False,
        resume: bool = False,
        output_dir: Path | None = None,
    ) -> None:
        self.client = client
        self.index_only = index_only
        self.resume = resume
        self.output_dir = output_dir

    def scrape(
        self,
        rulebook_url: str,
        categories: list[str],
    ) -> ScrapeResult:
        start = time.monotonic()
        fetch = self.client.fetch
        resolver = BookResolver(fetch)
        book = resolver.resolve(rulebook_url)

        result_categories: dict[str, list[dict[str, Any]]] = {}
        result_stats: dict[str, CategoryStats] = {}

        for category in categories:
            print(f"Scraping {category}...")
            records, stats = self._scrape_category(book, category)
            result_categories[category] = records
            result_stats[category] = stats
            print(
                f"  {category}: {stats.index_count} index records, "
                f"{stats.details_fetched} details, {len(stats.errors)} errors"
            )

        duration = time.monotonic() - start
        return ScrapeResult(
            book=book,
            categories=result_categories,
            stats=result_stats,
            duration_seconds=duration,
        )

    def _scrape_category(
        self,
        book: BookContext,
        category: str,
    ) -> tuple[list[dict[str, Any]], CategoryStats]:
        stats = CategoryStats()
        index_url = book.category_urls[category]
        index_parser = INDEX_PARSERS[category]
        detail_parser = DETAIL_PARSERS[category]

        existing: dict[str, dict[str, Any]] = {}
        if self.resume and self.output_dir:
            existing = load_existing_records(self.output_dir / f"{category}.json")

        paginator = IndexPaginator(self.client.fetch, category)
        all_index_rows: list[dict[str, Any]] = []
        seen_urls: set[str] = set()

        for page_num, page_url_str, soup in paginator.iter_pages(index_url):
            stats.pages_crawled = page_num
            if page_num == 1:
                stats.expected_total = parse_pagination_total(soup)
            rows = index_parser(soup, page_url_str)
            for row in rows:
                url = row.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_index_rows.append(row)

        stats.index_count = len(all_index_rows)
        if stats.expected_total is not None and stats.index_count != stats.expected_total:
            stats.pagination_warning = (
                f"expected {stats.expected_total} items from pagination, "
                f"collected {stats.index_count}"
            )

        records: list[dict[str, Any]] = []
        for index_data in all_index_rows:
            source_url = index_data.get("url", "")
            name = index_data.get("name", "")

            if self.resume and source_url in existing:
                records.append(existing[source_url])
                if existing[source_url].get("detail") is not None:
                    stats.details_fetched += 1
                continue

            detail_data = None
            if not self.index_only and source_url:
                try:
                    if self.resume and source_url in existing and existing[source_url].get("detail"):
                        detail_data = existing[source_url]["detail"]
                    else:
                        html = self.client.fetch(source_url)
                        detail_data = detail_parser(html, source_url)
                    stats.details_fetched += 1
                except Exception as exc:
                    stats.errors.append(
                        {"name": name, "url": source_url, "message": str(exc)}
                    )

            records.append(build_record(category, book, index_data, detail_data))

        return records, stats
