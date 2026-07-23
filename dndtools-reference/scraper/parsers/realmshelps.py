"""Parse flaw listings and detail pages from realmshelps.net."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Tag

from ..flaw_utils import REALMSHELPS_BASE, build_flaw_record, map_realmshelps_source, paragraph_html
from .base import make_soup

SECTION_LABELS = ("Prerequisite", "Benefit", "Normal", "Special")


def parse_flaw_index(html: str, page_url: str = f"{REALMSHELPS_BASE}/cgi-bin/feat-form.pl?sort=Flaw") -> list[dict[str, Any]]:
    soup = make_soup(html)
    rows: list[dict[str, Any]] = []

    for table in soup.select("table.table"):
        for tr in table.select("tr"):
            link = tr.select_one("td a[href]")
            if link is None:
                continue
            href = link.get("href", "").strip()
            name = link.get_text(" ", strip=True)
            if not href or not name:
                continue
            cells = tr.select("td")
            snippet = cells[1].get_text(" ", strip=True) if len(cells) > 1 else ""
            url = urljoin(f"{REALMSHELPS_BASE}/", href)
            rows.append(
                {
                    "name": name,
                    "url": url,
                    "path": href,
                    "description_snippet": snippet,
                }
            )
    return rows


def _extract_source_text(meta_paragraph: Tag | None) -> str:
    if meta_paragraph is None:
        return ""
    text = meta_paragraph.get_text("\n", strip=True)
    match = re.search(r"Source:\s*(.+)", text, flags=re.I)
    return match.group(1).strip() if match else ""


def _split_sections(content_paragraph: Tag | None) -> tuple[str, dict[str, str]]:
    if content_paragraph is None:
        return "", {}

    plain = content_paragraph.get_text(" ", strip=True)
    if not plain:
        return "", {}

    sections: dict[str, str] = {}
    label_pattern = "|".join(SECTION_LABELS)
    parts = re.split(rf"\b({label_pattern})\s*:", plain, flags=re.I)
    description = parts[0].strip() if parts else plain

    index = 1
    while index + 1 < len(parts):
        label = parts[index].strip().lower()
        body = parts[index + 1].strip()
        if label in {item.lower() for item in SECTION_LABELS} and body:
            sections[label] = body
        index += 2

    return description, sections


def parse_flaw_detail(html: str, source_url: str) -> dict[str, Any]:
    soup = make_soup(html)
    top = soup.select_one("div.top")
    if top is None:
        raise ValueError(f"Missing div.top in {source_url}")

    name = top.select_one("h1")
    if name is None:
        raise ValueError(f"Missing h1 in {source_url}")
    feat_name = name.get_text(" ", strip=True)

    paragraphs = top.select("p")
    meta = paragraphs[0] if paragraphs else None
    content = paragraphs[1] if len(paragraphs) > 1 else None

    source_raw = _extract_source_text(meta)
    source = map_realmshelps_source(source_raw)
    description, sections = _split_sections(content)

    return build_flaw_record(
        name=feat_name,
        slug_suffix="rh",
        source_url=source_url,
        source=source,
        description=description or None,
        prerequisite_html=paragraph_html(sections.get("prerequisite")),
        benefit_html=paragraph_html(sections.get("benefit")),
        special_html=paragraph_html(sections.get("special")),
        index_extra={"realmshelps_source": source_raw} if source_raw else None,
    )
