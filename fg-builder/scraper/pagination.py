"""Index page URL building and pagination iteration."""

from __future__ import annotations

from typing import Callable, Iterator
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from .config import PAGINATED_CATEGORIES
from .parsers.base import parse_pagination_total


def page_url(base_index_url: str, page: int) -> str:
    """Build paginated index URL using index.html_page=N convention."""
    parsed = urlparse(base_index_url)
    path = parsed.path
    if path.endswith("/"):
        path = path + "index.html"
    elif not path.endswith("index.html"):
        path = path.rstrip("/") + "/index.html"

    if page <= 1:
        new_path = path
    else:
        new_path = path.replace("index.html", f"index.html_page={page}")

    return parsed._replace(path=new_path, query="", fragment="").geturl()


def expected_page_count(total: int | None, page_size: int = 20) -> int:
    if total <= 0:
        return 1
    return (total + page_size - 1) // page_size


class IndexPaginator:
    def __init__(self, fetch: Callable[[str], str], category: str) -> None:
        self._fetch = fetch
        self._category = category

    def iter_pages(self, base_index_url: str) -> Iterator[tuple[int, str, BeautifulSoup]]:
        """Yield (page_number, url, soup) for each index page."""
        if self._category not in PAGINATED_CATEGORIES:
            html = self._fetch(base_index_url)
            soup = BeautifulSoup(html, "lxml")
            yield 1, base_index_url, soup
            return

        page = 1
        expected_total: int | None = None
        max_pages: int | None = None

        while True:
            url = page_url(base_index_url, page)
            html = self._fetch(url)
            soup = BeautifulSoup(html, "lxml")

            if page == 1:
                expected_total = parse_pagination_total(soup)
                if expected_total is not None:
                    max_pages = expected_page_count(expected_total)

            yield page, url, soup

            if max_pages is not None:
                if page >= max_pages:
                    break
            else:
                # No total found: stop when a page has zero data rows
                table = soup.select_one("#content table.common")
                data_rows = sum(
                    1 for tr in (table.find_all("tr") if table else []) if tr.find_all("td")
                )
                if data_rows == 0 and page > 1:
                    break
                if data_rows < 20:
                    break

            page += 1
