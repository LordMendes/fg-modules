"""Edition index URL resolution and rulebook list extraction."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from .config import BASE_URL
from .pagination import expected_page_count, page_url
from .parsers.base import extract_slug_from_href, make_soup, parse_pagination_total

EDITION_URL_RE = re.compile(
    r"/rulebooks/(?P<edition>[^/]+)/index\.html$",
    re.I,
)

RULEBOOK_NAME_HEADER = "rulebook name"


def parse_edition_url(url: str) -> str:
    """Return edition_slug from an edition index URL."""
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    if not path.endswith("/index.html"):
        path = path + "/index.html" if not path.endswith(".html") else path
    match = EDITION_URL_RE.search(path)
    if not match:
        raise ValueError(
            f"Invalid edition URL (expected .../rulebooks/{{edition}}/index.html): {url}"
        )
    return match.group("edition")


def slugify_rulebook_name(name: str) -> str:
    """Convert Rulebook name column text to a filesystem-safe folder slug."""
    text = name.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


@dataclass
class EditionBookEntry:
    name: str
    slug: str
    url: str
    folder_name: str


def _find_rulebook_name_column(table) -> int | None:
    for tr in table.find_all("tr"):
        cells = tr.find_all("th")
        if not cells:
            continue
        for idx, cell in enumerate(cells):
            if cell.get_text(strip=True).lower() == RULEBOOK_NAME_HEADER:
                return idx
    return None


def parse_edition_index(soup: BeautifulSoup, base_url: str) -> list[EditionBookEntry]:
    """Extract rulebook entries from one edition index page."""
    table = soup.select_one("#content table.common")
    if not table:
        return []

    name_col = _find_rulebook_name_column(table)
    if name_col is None:
        name_col = 0

    entries: list[EditionBookEntry] = []
    for tr in table.find_all("tr"):
        cells = tr.find_all("td")
        if not cells or len(cells) <= name_col:
            continue
        cell = cells[name_col]
        link = cell.find("a")
        if not link or not link.get("href"):
            continue

        name = link.get_text(strip=True)
        href = link["href"]
        absolute_url = urljoin(base_url, href)
        slug_href = href if href.startswith("/") else f"/{href}"
        slug = extract_slug_from_href(slug_href) or ""
        if not name or not slug:
            continue

        entries.append(
            EditionBookEntry(
                name=name,
                slug=slug,
                url=absolute_url,
                folder_name=slugify_rulebook_name(name),
            )
        )
    return entries


class EditionResolver:
    def __init__(self, fetch: Callable[[str], str]) -> None:
        self._fetch = fetch

    def resolve(self, edition_url: str) -> list[EditionBookEntry]:
        edition_slug = parse_edition_url(edition_url)
        if not edition_url.startswith("http"):
            edition_url = urljoin(BASE_URL, edition_url)

        seen_urls: set[str] = set()
        all_entries: list[EditionBookEntry] = []
        max_pages: int | None = None

        page = 1
        while True:
            url = page_url(edition_url, page)
            html = self._fetch(url)
            soup = make_soup(html)

            if page == 1:
                total = parse_pagination_total(soup)
                if total is not None:
                    max_pages = expected_page_count(total)

            for entry in parse_edition_index(soup, edition_url):
                if entry.url not in seen_urls:
                    seen_urls.add(entry.url)
                    all_entries.append(entry)

            if max_pages is not None:
                if page >= max_pages:
                    break
            else:
                table = soup.select_one("#content table.common")
                data_rows = sum(
                    1 for tr in (table.find_all("tr") if table else []) if tr.find_all("td")
                )
                if data_rows == 0 and page > 1:
                    break
                if data_rows < 20:
                    break

            page += 1

        return all_entries
