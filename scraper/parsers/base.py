"""Shared HTML parsing helpers."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Tag

from ..config import BASE_URL, SPELL_COMPONENT_KEYS

TOTAL_ITEMS_RE = re.compile(r"\(total\s+(\d+)\s+items\)", re.I)
GLOBAL_ID_RE = re.compile(r"--(\d+)(?:/index\.html)?$")
SLUG_FROM_HREF_RE = re.compile(r"/([^/]+)/index\.html$")


def make_soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "lxml")


def parse_pagination_total(soup: BeautifulSoup) -> int | None:
    for block in soup.select("div.pagination"):
        text = block.get_text(" ", strip=True)
        match = TOTAL_ITEMS_RE.search(text)
        if match:
            return int(match.group(1))
    return None


def parse_table_rows(soup: BeautifulSoup) -> list[list[Tag]]:
    table = soup.select_one("#content table.common")
    if not table:
        return []
    rows: list[list[Tag]] = []
    for tr in table.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if not cells or all(c.name == "th" for c in cells):
            continue
        rows.append(cells)
    return rows


def cell_text(cell: Tag) -> str:
    return cell.get_text(" ", strip=True)


def cell_link_text(cell: Tag) -> str:
    link = cell.find("a")
    if link:
        return link.get_text(strip=True)
    return cell_text(cell)


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


def parse_component_flags(cell: Tag) -> dict[str, bool]:
    icons = cell.find_all("img", class_="yes-no-icon")
    flags: dict[str, bool] = {}
    for key, img in zip(SPELL_COMPONENT_KEYS, icons):
        alt = (img.get("alt") or "").lower()
        src = img.get("src") or ""
        flags[key] = alt == "yes" or "icon-yes" in src
    return flags


def resolve_url(base_url: str, href: str) -> str:
    return urljoin(base_url, href)


def extract_global_id(href: str) -> str | None:
    match = GLOBAL_ID_RE.search(href.rstrip("/"))
    if match:
        return match.group(1)
    return None


def extract_slug_from_href(href: str) -> str | None:
    match = SLUG_FROM_HREF_RE.search(href)
    if match:
        return match.group(1)
    return None


def html_inner(element: Tag | None) -> str:
    if element is None:
        return ""
    return "".join(str(child) for child in element.children).strip()


def html_to_text(element: Tag | None) -> str:
    if element is None:
        return ""
    return element.get_text("\n", strip=True)


def parse_labeled_metadata(content: Tag) -> dict[str, str]:
    """Parse strong-label lines like 'Level:', 'Casting Time:' before nice-textile."""
    result: dict[str, str] = {}
    for strong in content.find_all("strong"):
        label = strong.get_text(strip=True).rstrip(":")
        if not label:
            continue
        parts: list[str] = []
        for sibling in strong.next_siblings:
            if getattr(sibling, "name", None) == "strong":
                break
            if getattr(sibling, "name", None) == "div" and "nice-textile" in (
                sibling.get("class") or []
            ):
                break
            if getattr(sibling, "name", None) == "br":
                continue
            if isinstance(sibling, Tag):
                parts.append(sibling.get_text(" ", strip=True))
            else:
                text = str(sibling).strip()
                if text:
                    parts.append(text)
        value = " ".join(parts).strip().rstrip(",").strip()
        if value:
            result[label] = value
    return result


def parse_h4_sections(container: Tag) -> dict[str, str]:
    sections: dict[str, str] = {}
    for heading in container.find_all("h4"):
        title = heading.get_text(strip=True)
        if not title:
            continue
        parts: list[str] = []
        for sibling in heading.next_siblings:
            if getattr(sibling, "name", None) == "h4":
                break
            if isinstance(sibling, Tag):
                parts.append(html_inner(sibling))
            else:
                text = str(sibling).strip()
                if text:
                    parts.append(text)
        sections[title.rstrip(":").strip()] = "\n".join(p for p in parts if p).strip()
    return sections


def parse_heading_sections(container: Tag) -> list[dict[str, Any]]:
    sections: list[dict[str, Any]] = []
    for heading in container.find_all(["h3", "h4"]):
        title = heading.get_text(strip=True)
        if not title:
            continue
        parts: list[str] = []
        for sibling in heading.next_siblings:
            if getattr(sibling, "name", None) in ("h3", "h4"):
                break
            if isinstance(sibling, Tag):
                parts.append(html_inner(sibling))
            else:
                text = str(sibling).strip()
                if text:
                    parts.append(text)
        body = "\n".join(p for p in parts if p).strip()
        sections.append(
            {
                "heading": title,
                "html": body,
                "text": BeautifulSoup(body, "lxml").get_text("\n", strip=True) if body else "",
            }
        )
    return sections


def get_content_title(soup: BeautifulSoup) -> str:
    heading = soup.select_one("#content h2")
    if heading:
        return heading.get_text(strip=True)
    return ""


def get_nice_textile(soup: BeautifulSoup) -> Tag | None:
    return soup.select_one("#content div.nice-textile")
