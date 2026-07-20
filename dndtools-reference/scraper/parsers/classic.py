"""Shared HTML helpers for classic dndtools.org pages."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, Tag

from ..config import CLASSIC_BASE_URL
from ..normalize import clean_field_value
from .base import html_inner

TOTAL_ITEMS_RE = re.compile(r"\(total\s+(\d+)\s+items\)", re.I)
CLASSIC_ID_RE = re.compile(r"^(.+)--(\d+)$")
PAGE_RE = re.compile(r",\s*p\.\s*(\d+)", re.I)
ABILITY_MAP = {
    "STR": "Str",
    "DEX": "Dex",
    "CON": "Con",
    "INT": "Int",
    "WIS": "Wis",
    "CHA": "Cha",
}
ORDINAL_LEVEL_RE = re.compile(r"^(\d+)(?:st|nd|rd|th)?$", re.I)


def resolve_classic_url(href: str, base_url: str = CLASSIC_BASE_URL) -> str:
    return urljoin(base_url, href)


def parse_classic_pagination_total(soup: BeautifulSoup) -> int | None:
    for block in soup.select("div.pagination"):
        match = TOTAL_ITEMS_RE.search(block.get_text(" ", strip=True))
        if match:
            return int(match.group(1))
    return None


def classic_table_rows(soup: BeautifulSoup) -> list[list[Tag]]:
    table = soup.select_one("#content table.common")
    if not table:
        return []
    rows: list[list[Tag]] = []
    for tr in table.find_all("tr"):
        cells = tr.find_all("td")
        if cells:
            rows.append(cells)
    return rows


def cell_link_text(cell: Tag) -> str:
    link = cell.find("a")
    if link:
        return link.get_text(strip=True)
    return cell.get_text(" ", strip=True)


def cell_link_href(cell: Tag) -> str | None:
    link = cell.find("a")
    if link and link.get("href"):
        return link["href"]
    return None


def is_yes_icon(cell: Tag) -> bool:
    img = cell.find("img", class_="yes-no-icon")
    if not img:
        return False
    alt = (img.get("alt") or "").lower()
    src = img.get("src") or ""
    return alt == "yes" or "icon-yes" in src


def parse_classic_feat_slug(href: str) -> tuple[str | None, int | None, str | None]:
    """Return (slug, feat_id, book_slug) from a classic feat href."""
    parts = [p for p in urlparse(href).path.strip("/").split("/") if p]
    if len(parts) < 2:
        return None, None, None
    book_part = parts[-2]
    feat_part = parts[-1]
    book_match = CLASSIC_ID_RE.match(book_part)
    feat_match = CLASSIC_ID_RE.match(feat_part)
    book_slug = book_match.group(1) if book_match else book_part
    if feat_match:
        return f"{feat_match.group(1)}-{feat_match.group(2)}", int(feat_match.group(2)), book_slug
    return feat_part, None, book_slug


def parse_classic_class_slug(href: str) -> tuple[str | None, int | None, str | None]:
    """Return (slug, book_id, book_slug) from a classic class href.

    Classic class URLs lack a global numeric id, so uniqueness comes from
    ``{class-slug}-{book-id}``.
    """
    parts = [p for p in urlparse(href).path.strip("/").split("/") if p]
    if len(parts) < 2:
        return None, None, None
    book_part = parts[-2]
    class_part = parts[-1]
    book_match = CLASSIC_ID_RE.match(book_part)
    if book_match:
        book_slug = book_match.group(1)
        book_id = int(book_match.group(2))
        slug = f"{class_part}-{book_id}"
    else:
        book_slug = book_part
        book_id = None
        slug = class_part
    return slug, book_id, book_slug


def get_content(soup: BeautifulSoup) -> Tag | None:
    return soup.select_one("#content")


def get_content_title(soup: BeautifulSoup) -> str:
    heading = soup.select_one("#content h2")
    if heading:
        return heading.get_text(strip=True)
    return ""


def parse_classic_source(content: Tag) -> dict[str, Any]:
    """Parse book + page from the line immediately after the h2 title."""
    source: dict[str, Any] = {
        "name": None,
        "abbrev": None,
        "edition": None,
        "page": None,
        "url": None,
    }
    h2 = content.find("h2")
    if not h2:
        return source

    def _is_book_href(href: str) -> bool:
        return "/rulebooks/" in href or "/rulebook/" in href

    book_link = None
    chunk_parts: list[str] = []

    for sibling in h2.next_siblings:
        if not isinstance(sibling, Tag):
            text = str(sibling).strip()
            if text:
                chunk_parts.append(text)
            continue
        if sibling.name in ("h3", "h4", "table"):
            break
        if sibling.name == "div" and "nice-textile" in (sibling.get("class") or []):
            break
        if sibling.name == "br":
            if chunk_parts or book_link:
                break
            continue

        link = sibling if sibling.name == "a" else sibling.find("a", href=True)
        if link and _is_book_href(link.get("href") or ""):
            book_link = link
        text = sibling.get_text(" ", strip=True)
        if text:
            chunk_parts.append(text)
        if book_link and (PAGE_RE.search(" ".join(chunk_parts)) or sibling.name == "p"):
            break

    if book_link:
        source["name"] = book_link.get_text(strip=True) or None
        source["url"] = resolve_classic_url(book_link["href"])

    chunk = " ".join(chunk_parts)
    page_match = PAGE_RE.search(chunk)
    if page_match:
        source["page"] = int(page_match.group(1))
    return source


def parse_h4_sections_html(container: Tag) -> dict[str, dict[str, str | None]]:
    sections: dict[str, dict[str, str | None]] = {}
    for heading in container.find_all("h4"):
        title = heading.get_text(strip=True).rstrip(":").strip()
        if not title:
            continue
        key = title.lower()
        parts_html: list[str] = []
        for sibling in heading.next_siblings:
            if isinstance(sibling, Tag) and sibling.name in ("h3", "h4"):
                break
            if isinstance(sibling, Tag):
                if sibling.name == "div" and "nice-textile" in (sibling.get("class") or []):
                    # Nested textile under a section heading — keep walking children.
                    parts_html.append(html_inner(sibling))
                else:
                    parts_html.append(str(sibling))
            else:
                text = str(sibling).strip()
                if text:
                    parts_html.append(text)
        html = "".join(parts_html).strip()
        text = BeautifulSoup(html, "lxml").get_text("\n", strip=True) if html else ""
        sections[key] = {
            "description_html": clean_field_value(html) if html else None,
            "description_text": clean_field_value(text) if text else None,
        }
    return sections


def scraped_at() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def strip_banner(content: Tag) -> None:
    for selector in ("#dnd-new-site-banner", "#inaccurate"):
        node = content.select_one(selector)
        if node:
            node.decompose()
