"""Shared helpers for edition-wide scrape and build pipelines."""

from __future__ import annotations

from scraper.edition_resolver import EditionBookEntry


def filter_edition_books(
    books: list[EditionBookEntry],
    only: str | None,
    limit: int | None,
) -> list[EditionBookEntry]:
    if only:
        filters = {f.strip() for f in only.split(",") if f.strip()}
        books = [b for b in books if _matches_only_filter(b, filters)]
    if limit is not None:
        books = books[:limit]
    return books


def _matches_only_filter(entry: EditionBookEntry, filters: set[str]) -> bool:
    if not filters:
        return True
    name_lower = entry.name.lower()
    for f in filters:
        fl = f.lower()
        if entry.folder_name == fl or entry.slug == fl or name_lower == fl:
            return True
    return False
