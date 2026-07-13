"""Race index and detail parsers."""

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
    parse_heading_sections,
    parse_labeled_metadata,
    parse_table_rows,
    resolve_url,
)


def parse_races_index(soup: BeautifulSoup, page_url: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for cells in parse_table_rows(soup):
        if len(cells) < 3:
            continue
        href = cell_link_href(cells[0])
        if not href:
            continue
        url = resolve_url(page_url, href)
        slug = extract_slug_from_href(href) or ""
        records.append(
            {
                "name": cell_link_text(cells[0]),
                "url": url,
                "slug": slug,
                "global_id": extract_global_id(href),
                "rulebook": cell_link_text(cells[1]),
                "edition": cell_link_text(cells[2]),
            }
        )
    return records


def parse_race_detail(html: str, source_url: str) -> dict[str, Any]:
    soup = make_soup(html)
    content = soup.select_one("#content")
    metadata = parse_labeled_metadata(content) if content else {}
    textile = get_nice_textile(soup)
    sections = parse_heading_sections(textile) if textile else []

    traits = [
        {"heading": s["heading"], "text": s["text"], "html": s["html"]}
        for s in sections
        if s["heading"].lower() not in ("description",)
    ]

    return {
        "title": get_content_title(soup),
        "ability_adjustments": metadata.get("Ability Adjustments", metadata.get("Ability Scores", "")),
        "size": metadata.get("Size", ""),
        "speed": metadata.get("Speed", ""),
        "traits": traits,
        "description_html": html_inner(textile),
        "description_text": html_to_text(textile),
        "raw_sections": sections,
    }
