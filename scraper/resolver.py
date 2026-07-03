"""Rulebook URL resolution and metadata extraction."""

from __future__ import annotations

import re
from typing import Callable
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from .config import BASE_URL, CATEGORY_INDEX_PATHS
from .models import BookContext

RULEBOOK_URL_RE = re.compile(
    r"/rulebooks/(?P<edition>[^/]+)/(?P<book>[^/]+)/index\.html$",
    re.I,
)


def parse_rulebook_url(url: str) -> tuple[str, str]:
    """Return (edition_slug, book_slug) from a rulebook URL."""
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    if not path.endswith("/index.html"):
        path = path + "/index.html" if not path.endswith(".html") else path
    match = RULEBOOK_URL_RE.search(path)
    if not match:
        raise ValueError(
            f"Invalid rulebook URL (expected .../rulebooks/{{edition}}/{{book}}/index.html): {url}"
        )
    return match.group("edition"), match.group("book")


def build_category_urls(book_slug: str) -> dict[str, str]:
    urls: dict[str, str] = {}
    for category, template in CATEGORY_INDEX_PATHS.items():
        path = template.format(book_slug=book_slug)
        urls[category] = urljoin(BASE_URL, path)
    return urls


def extract_title_from_rulebook_html(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    heading = soup.select_one("#content h2")
    if heading:
        return heading.get_text(strip=True)
    title_tag = soup.find("title")
    if title_tag:
        text = title_tag.get_text(strip=True)
        return text.split("–")[0].strip()
    return ""


class BookResolver:
    def __init__(self, fetch: Callable[[str], str]) -> None:
        self._fetch = fetch

    def resolve(self, rulebook_url: str) -> BookContext:
        edition_slug, book_slug = parse_rulebook_url(rulebook_url)
        if not rulebook_url.startswith("http"):
            rulebook_url = urljoin(BASE_URL, rulebook_url)

        html = self._fetch(rulebook_url)
        title = extract_title_from_rulebook_html(html)
        if not title:
            title = book_slug.replace("-", " ").title()

        return BookContext(
            slug=book_slug,
            title=title,
            edition_slug=edition_slug,
            source_url=rulebook_url,
            category_urls=build_category_urls(book_slug),
        )
