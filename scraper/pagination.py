"""Index page URL building and pagination iteration."""

from __future__ import annotations

import re
from typing import Callable, Iterator
from urllib.parse import urlencode

from bs4 import BeautifulSoup

from .config import BASE_URL, CATEGORY_CONFIG, DEFAULT_PAGE_SIZE
from .parsers.base import make_soup

TOTAL_JSON_RE = re.compile(r'total\\":\s*(\d+)')
PAGE_SIZE_JSON_RE = re.compile(r'pageSize\\":\s*(\d+)')


def category_index_url(category: str, page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> str:
    path = str(CATEGORY_CONFIG[category]["path"])
    query = urlencode({"page": page, "rows": page_size})
    return f"{BASE_URL}/{path}?{query}"


def parse_pagination_total(soup: BeautifulSoup, html: str | None = None) -> int | None:
    for text in (html, str(soup)):
        if not text:
            continue
        match = TOTAL_JSON_RE.search(text)
        if match:
            return int(match.group(1))
    return None


def parse_page_size(soup: BeautifulSoup, html: str | None = None) -> int:
    for text in (html, str(soup)):
        if not text:
            continue
        match = PAGE_SIZE_JSON_RE.search(text)
        if match:
            return int(match.group(1))
    return DEFAULT_PAGE_SIZE


def expected_page_count(total: int | None, page_size: int = DEFAULT_PAGE_SIZE) -> int:
    if not total or total <= 0:
        return 1
    return (total + page_size - 1) // page_size


class IndexPaginator:
    def __init__(self, fetch: Callable[[str], str], category: str) -> None:
        self._fetch = fetch
        self._category = category

    def iter_pages(self) -> Iterator[tuple[int, str, BeautifulSoup]]:
        page = 1
        max_pages: int | None = None
        page_size = DEFAULT_PAGE_SIZE

        while True:
            url = category_index_url(self._category, page, page_size)
            html = self._fetch(url)
            soup = make_soup(html)

            if page == 1:
                total = parse_pagination_total(soup, html)
                page_size = parse_page_size(soup, html)
                if total is not None:
                    max_pages = expected_page_count(total, page_size)

            yield page, url, soup

            if max_pages is not None:
                if page >= max_pages:
                    break
            else:
                rows = soup.select("table tbody tr")
                if not rows and page > 1:
                    break
                if len(rows) < page_size:
                    break

            page += 1
