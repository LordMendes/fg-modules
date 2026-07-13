"""Core scrape orchestration."""

from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import Any

from .config import CATEGORY_CONFIG, DEFAULT_WORKERS, FLUSH_EVERY
from .http_client import AsyncHttpClient, HttpClient
from .pagination import IndexPaginator, parse_pagination_total
from .parsers import DETAIL_PARSERS, INDEX_PARSERS
from .parsers.base import merge_index_detail
from .writer import (
    CategoryStats,
    ScrapeRunResult,
    append_error,
    load_existing_records,
    print_progress,
    write_category_json,
    write_errors,
    write_index_cache,
    write_summary,
)


class ScrapeEngine:
    def __init__(
        self,
        client: HttpClient,
        output_dir: Path,
        index_only: bool = False,
        resume: bool = False,
        limit: int | None = None,
        dry_run: bool = False,
        workers: int = DEFAULT_WORKERS,
    ) -> None:
        self.client = client
        self.output_dir = output_dir
        self.index_only = index_only
        self.resume = resume
        self.limit = limit
        self.dry_run = dry_run
        self.workers = max(1, workers)
        self.errors: list[dict[str, Any]] = []

    def scrape_categories(self, categories: list[str]) -> ScrapeRunResult:
        return asyncio.run(self._scrape_categories_async(categories))

    async def _scrape_categories_async(self, categories: list[str]) -> ScrapeRunResult:
        start = time.monotonic()
        result = ScrapeRunResult()

        for category in categories:
            print(f"Scraping {category}...")
            records, stats = await self._scrape_category(category)
            result.categories[category] = records
            result.stats[category] = stats
            print(
                f"  {category}: {stats.scraped} records, "
                f"{stats.errors} errors, {stats.duration_seconds:.1f}s"
            )

        result.duration_seconds = time.monotonic() - start
        result.errors = list(self.errors)
        if not self.dry_run:
            write_summary(self.output_dir, result.stats)
            write_errors(self.output_dir, result.errors)
        return result

    async def _scrape_category(
        self,
        category: str,
    ) -> tuple[list[dict[str, Any]], CategoryStats]:
        start = time.monotonic()
        stats = CategoryStats(expected=int(CATEGORY_CONFIG[category]["expected"]))
        output_name = str(CATEGORY_CONFIG[category]["output"])
        output_path = self.output_dir / output_name
        index_cache_path = self.output_dir / ".index" / f"{category}.json"

        existing = load_existing_records(output_path) if self.resume else {}
        index_parser = INDEX_PARSERS[category]
        detail_parser = DETAIL_PARSERS[category]

        paginator = IndexPaginator(self.client.fetch, category)
        index_rows: list[dict[str, Any]] = []
        seen_urls: set[str] = set()

        for page_num, page_url, soup in paginator.iter_pages():
            stats.pages_crawled = page_num
            if page_num == 1:
                total = parse_pagination_total(soup)
                if total is not None:
                    stats.expected = total
            rows = index_parser(soup, page_url)
            for row in rows:
                url = row.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    index_rows.append(row)
            if self.limit and len(index_rows) >= self.limit:
                index_rows = index_rows[: self.limit]
                break

        if self.dry_run:
            stats.scraped = len(index_rows)
            stats.duration_seconds = time.monotonic() - start
            return index_rows, stats

        write_index_cache(index_cache_path, index_rows)

        total = len(index_rows)
        records: list[dict[str, Any] | None] = [None] * total
        pending: list[tuple[int, dict[str, Any]]] = []

        for idx, index_row in enumerate(index_rows):
            source_url = index_row.get("url", "")
            if self.resume and source_url in existing:
                records[idx] = existing[source_url]
                print_progress(category, idx + 1, total, index_row.get("slug", ""))
                continue
            if self.index_only or not source_url:
                records[idx] = merge_index_detail(index_row, None)
                print_progress(category, idx + 1, total, index_row.get("slug", ""))
                continue
            pending.append((idx, index_row))

        if pending:
            completed = sum(1 for record in records if record is not None)
            progress_lock = asyncio.Lock()

            async with AsyncHttpClient(
                cache_dir=self.client.cache.cache_dir,
                workers=self.workers,
                delay=self.client.delay if self.workers == 1 else 0.0,
                timeout=self.client.timeout,
            ) as async_client:
                async def fetch_one(position: int, index_row: dict[str, Any]) -> None:
                    nonlocal completed
                    source_url = index_row["url"]
                    slug = index_row.get("slug", "") or str(index_row.get("name", ""))
                    try:
                        html = await async_client.fetch(source_url)
                        detail_data = detail_parser(html, source_url)
                        records[position] = merge_index_detail(index_row, detail_data)
                    except Exception as exc:
                        stats.errors += 1
                        append_error(self.errors, category, source_url, str(exc))
                        records[position] = merge_index_detail(index_row, None)
                    async with progress_lock:
                        completed += 1
                        print_progress(category, completed, total, slug)
                        if completed % FLUSH_EVERY == 0:
                            write_category_json(
                                output_path,
                                [record for record in records if record is not None],
                            )

                await asyncio.gather(*(fetch_one(i, row) for i, row in pending))

        final_records = [record for record in records if record is not None]
        stats.scraped = len(final_records)
        stats.duration_seconds = time.monotonic() - start
        write_category_json(output_path, final_records)
        return final_records, stats
