"""Skill index and detail parsers."""

from __future__ import annotations

from typing import Any

from bs4 import BeautifulSoup

from .base import (
    cell_link_href,
    cell_link_text,
    cell_text,
    extract_global_id,
    extract_slug_from_href,
    get_content_title,
    get_nice_textile,
    html_inner,
    html_to_text,
    is_yes_icon,
    make_soup,
    parse_heading_sections,
    parse_table_rows,
    resolve_url,
)


def parse_skills_index(soup: BeautifulSoup, page_url: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for cells in parse_table_rows(soup):
        if len(cells) < 4:
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
                "key_ability": cell_text(cells[1]),
                "trained_only": is_yes_icon(cells[2]),
                "armor_check_penalty": is_yes_icon(cells[3]),
            }
        )
    return records


def parse_skill_detail(html: str, source_url: str) -> dict[str, Any]:
    soup = make_soup(html)
    content = soup.select_one("#content")
    textile = get_nice_textile(soup)
    sections = parse_heading_sections(textile) if textile else []

    synergy = ""
    check_modifiers = ""
    for section in sections:
        heading = section["heading"].lower()
        if "synergy" in heading:
            synergy = section["text"]
        elif "check" in heading or "modifier" in heading:
            check_modifiers = section["text"]

    return {
        "title": get_content_title(soup),
        "description_html": html_inner(textile),
        "description_text": html_to_text(textile),
        "synergy": synergy,
        "check_modifiers": check_modifiers,
        "raw_sections": sections,
    }
