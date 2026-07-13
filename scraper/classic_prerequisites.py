"""Fetch prerequisite/requirements fields from classic dndtools.org."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlencode

from bs4 import BeautifulSoup, Tag

from .config import CLASSIC_BASE_URL, CLASSIC_PAGE_SIZE
from .normalize import clean_field_value
from .parsers.base import make_soup
from .parsers.classic import (
    cell_link_href,
    cell_link_text,
    classic_table_rows,
    get_content,
    parse_classic_feat_slug,
    parse_classic_pagination_total,
    resolve_classic_url,
    strip_banner,
)

FetchFn = Callable[[str], str]


def _normalize_key(value: str | None) -> str:
    if not value:
        return ""
    text = value.casefold()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def classic_index_url(category: str, page: int = 1, page_size: int = CLASSIC_PAGE_SIZE) -> str:
    query = urlencode({"page": page, "page_size": page_size})
    return f"{CLASSIC_BASE_URL}/{category}/?{query}"


def _expected_page_count(total: int, page_size: int) -> int:
    return max(1, (total + page_size - 1) // page_size)


def _iter_classic_index_pages(fetch: FetchFn, category: str) -> list[BeautifulSoup]:
    pages: list[BeautifulSoup] = []
    page = 1
    max_pages = 1
    while page <= max_pages:
        url = classic_index_url(category, page)
        html = fetch(url)
        soup = make_soup(html)
        pages.append(soup)
        if page == 1:
            total = parse_classic_pagination_total(soup) or 0
            max_pages = _expected_page_count(total, CLASSIC_PAGE_SIZE) if total else 1
        page += 1
    return pages


def build_feat_lookup(fetch: FetchFn) -> dict[int, str]:
    """Map classic feat external id → detail URL."""
    lookup: dict[int, str] = {}
    for soup in _iter_classic_index_pages(fetch, "feats"):
        for cells in classic_table_rows(soup):
            if len(cells) < 1:
                continue
            href = cell_link_href(cells[0])
            name = cell_link_text(cells[0])
            if not href or not name:
                continue
            _slug, feat_id, _book = parse_classic_feat_slug(href)
            if feat_id is None:
                continue
            lookup[feat_id] = resolve_classic_url(href)
    return lookup


def build_class_lookup(fetch: FetchFn) -> dict[tuple[str, str], str]:
    """Map (normalized_name, normalized_rulebook) → classic detail URL."""
    lookup: dict[tuple[str, str], str] = {}
    for soup in _iter_classic_index_pages(fetch, "classes"):
        for cells in classic_table_rows(soup):
            if len(cells) < 3:
                continue
            href = cell_link_href(cells[0])
            name = cell_link_text(cells[0])
            if not href or not name:
                continue
            rulebook = cell_link_text(cells[2])
            key = (_normalize_key(name), _normalize_key(rulebook))
            lookup[key] = resolve_classic_url(href)
    return lookup


def save_lookup_cache(path: Path, lookup: dict[Any, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not lookup:
        payload: dict[str, str] = {}
    elif isinstance(next(iter(lookup.keys())), tuple):
        payload = {f"{k[0]}||{k[1]}": v for k, v in lookup.items()}  # type: ignore[index]
    else:
        payload = {str(k): v for k, v in lookup.items()}
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def _section_after_h4(content: Tag, title_match: str) -> tuple[str | None, str | None]:
    """Extract HTML/text under an h4 whose title contains title_match."""
    needle = title_match.casefold()
    for heading in content.find_all("h4"):
        title = heading.get_text(strip=True).rstrip(":").strip().casefold()
        if needle not in title:
            continue
        parts: list[str] = []
        for sibling in heading.next_siblings:
            if isinstance(sibling, Tag) and sibling.name in ("h3", "h4"):
                break
            if isinstance(sibling, Tag):
                if sibling.name == "div" and "nice-textile" in (sibling.get("class") or []):
                    # Prefer paragraphs inside nested textile blocks.
                    paragraphs = sibling.find_all("p")
                    if paragraphs:
                        parts.extend(str(p) for p in paragraphs)
                    else:
                        parts.append("".join(str(c) for c in sibling.children))
                else:
                    parts.append(str(sibling))
            else:
                text = str(sibling).strip()
                if text:
                    parts.append(text)
        html = "".join(parts).strip()
        if not html:
            return None, None
        text = BeautifulSoup(html, "lxml").get_text("\n", strip=True)
        return clean_field_value(html), clean_field_value(text)
    return None, None


def parse_classic_feat_prerequisite(html: str) -> dict[str, str | None]:
    soup = make_soup(html)
    content = get_content(soup)
    if not content:
        return {"prerequisite_html": None, "prerequisite_text": None}
    strip_banner(content)
    html_body, text = _section_after_h4(content, "prerequisite")
    return {"prerequisite_html": html_body, "prerequisite_text": text}


def parse_classic_class_requirements(html: str) -> dict[str, str | None]:
    soup = make_soup(html)
    content = get_content(soup)
    if not content:
        return {
            "requirements_html": None,
            "requirements_text": None,
            "min_bab_req": None,
        }
    strip_banner(content)
    html_body, text = _section_after_h4(content, "requirement")
    min_bab: str | None = None
    if html_body:
        soup_req = BeautifulSoup(html_body, "lxml")
        for p in soup_req.find_all("p"):
            strong = p.find("strong")
            label = strong.get_text(strip=True).rstrip(":").lower() if strong else ""
            if "base attack" in label:
                min_bab = re.sub(
                    r"(?i)^base attack bonus:\s*",
                    "",
                    p.get_text(" ", strip=True),
                ).strip() or None
                break
    return {
        "requirements_html": html_body,
        "requirements_text": text,
        "min_bab_req": min_bab,
    }


def resolve_classic_feat_url(record: dict[str, Any], lookup: dict[int, str]) -> str | None:
    record_id = record.get("id")
    if isinstance(record_id, int):
        return lookup.get(record_id)
    if isinstance(record_id, str) and record_id.isdigit():
        return lookup.get(int(record_id))
    return None


def resolve_classic_class_url(
    record: dict[str, Any],
    lookup: dict[tuple[str, str], str],
) -> str | None:
    name = _normalize_key(str(record.get("name") or ""))
    source = record.get("source") if isinstance(record.get("source"), dict) else {}
    index = record.get("index") if isinstance(record.get("index"), dict) else {}
    rulebook = (
        source.get("name")
        or index.get("rulebook")
        or index.get("source_abbrev")
        or ""
    )
    key = (name, _normalize_key(str(rulebook)))
    if key in lookup:
        return lookup[key]
    # Fallback: match by name only when unique.
    matches = [url for (n, _rb), url in lookup.items() if n == name]
    if len(matches) == 1:
        return matches[0]
    return None


def apply_feat_prerequisite_overlay(detail: dict[str, Any], classic_html: str) -> None:
    fields = parse_classic_feat_prerequisite(classic_html)
    if fields.get("prerequisite_html"):
        detail["prerequisite_html"] = fields["prerequisite_html"]
        detail["prerequisite_text"] = fields["prerequisite_text"]


def apply_class_requirements_overlay(detail: dict[str, Any], classic_html: str) -> None:
    fields = parse_classic_class_requirements(classic_html)
    if fields.get("requirements_html"):
        detail["requirements_html"] = fields["requirements_html"]
        detail["requirements_text"] = fields["requirements_text"]
    if fields.get("min_bab_req") and not detail.get("min_bab_req"):
        detail["min_bab_req"] = fields["min_bab_req"]
