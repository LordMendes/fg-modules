"""Feat index and detail parsers."""

from __future__ import annotations

from typing import Any

from bs4 import BeautifulSoup

from .base import (
    cell_link_href,
    cell_link_text,
    extract_global_id,
    extract_slug_from_href,
    get_content_title,
    get_nice_textile,
    html_inner,
    html_to_text,
    make_soup,
    parse_h4_sections,
    parse_table_rows,
    resolve_url,
)


def parse_feats_index(soup: BeautifulSoup, page_url: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for cells in parse_table_rows(soup):
        if len(cells) < 3:
            continue
        href = cell_link_href(cells[0])
        if not href:
            continue
        url = resolve_url(page_url, href)
        slug = extract_slug_from_href(href) or ""
        summary_cell = cells[1]
        full_summary = summary_cell.get("title") or summary_cell.get_text(strip=True)
        records.append(
            {
                "name": cell_link_text(cells[0]),
                "url": url,
                "slug": slug,
                "global_id": extract_global_id(href),
                "summary": full_summary,
                "summary_short": summary_cell.get_text(strip=True),
                "rulebook": cell_link_text(cells[2]),
            }
        )
    return records


def parse_feat_detail(html: str, source_url: str) -> dict[str, Any]:
    soup = make_soup(html)
    content = soup.select_one("#content")
    textile = get_nice_textile(soup)
    sections = parse_h4_sections(content) if content else {}
    textile_sections = parse_h4_sections(textile) if textile else {}

    feat_type = ""
    if content:
        for link in content.find_all("a"):
            href = link.get("href") or ""
            if "/categories/" in href and "rulebooks" not in href:
                feat_type = link.get_text(strip=True)
                break

    return {
        "title": get_content_title(soup),
        "type": feat_type,
        "prerequisites": sections.get("Prerequisite", sections.get("Prerequisites", "")),
        "benefit": textile_sections.get("Benefit", sections.get("Benefit", "")),
        "normal": textile_sections.get("Normal", sections.get("Normal", "")),
        "special": textile_sections.get("Special", sections.get("Special", "")),
        "description_html": html_inner(textile),
        "description_text": html_to_text(textile),
    }
