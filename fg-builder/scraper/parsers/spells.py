"""Spell index and detail parsers."""

from __future__ import annotations

from typing import Any

from bs4 import BeautifulSoup, Tag

from ..config import BASE_URL
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
    make_soup,
    parse_component_flags,
    parse_labeled_metadata,
    parse_table_rows,
    resolve_url,
)


def parse_spells_index(soup: BeautifulSoup, page_url: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for cells in parse_table_rows(soup):
        if len(cells) < 5:
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
                "school": cell_link_text(cells[1]),
                "components": parse_component_flags(cells[2]),
                "rulebook": cell_link_text(cells[3]),
                "edition": cell_link_text(cells[4]),
            }
        )
    return records


def _parse_level_links(content: Tag) -> list[str]:
    levels: list[str] = []
    for strong in content.find_all("strong"):
        if strong.get_text(strip=True).rstrip(":") != "Level":
            continue
        for sibling in strong.next_siblings:
            if getattr(sibling, "name", None) == "strong":
                break
            if getattr(sibling, "name", None) == "br":
                continue
            if isinstance(sibling, Tag) and sibling.name == "a":
                levels.append(sibling.get_text(" ", strip=True))
    return levels


def _parse_also_appears_in(soup: BeautifulSoup) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for h3 in soup.select("#content h3"):
        if "also appears in" not in h3.get_text(strip=True).lower():
            continue
        ol = h3.find_next_sibling("ol")
        if not ol:
            continue
        for li in ol.find_all("li"):
            link = li.find("a")
            if link:
                results.append(
                    {
                        "name": link.get_text(strip=True),
                        "url": resolve_url(BASE_URL, link["href"]),
                    }
                )
    return results


def parse_spell_detail(html: str, source_url: str) -> dict[str, Any]:
    soup = make_soup(html)
    content = soup.select_one("#content")
    metadata = parse_labeled_metadata(content) if content else {}
    textile = get_nice_textile(soup)

    school = ""
    if content:
        for link in content.find_all("a"):
            href = link.get("href") or ""
            if "/spells/schools/" in href or "/schools/" in href:
                school = link.get_text(strip=True)
                break

    components_raw = metadata.get("Components", "")
    components = {
        key: key in components_raw
        for key in ("V", "S", "M", "AF", "DF", "XP")
    }

    return {
        "title": get_content_title(soup),
        "school": school or metadata.get("School", ""),
        "descriptors": [
            a.get_text(strip=True)
            for a in (content.find_all("a") if content else [])
            if "/descriptors/" in (a.get("href") or "")
        ],
        "level": metadata.get("Level", ""),
        "level_entries": _parse_level_links(content) if content else [],
        "components": components,
        "components_raw": components_raw,
        "casting_time": metadata.get("Casting Time", ""),
        "range": metadata.get("Range", ""),
        "target": metadata.get("Target", ""),
        "area": metadata.get("Area", ""),
        "effect": metadata.get("Effect", ""),
        "duration": metadata.get("Duration", ""),
        "saving_throw": metadata.get("Saving Throw", ""),
        "spell_resistance": metadata.get("Spell Resistance", ""),
        "description_html": html_inner(textile),
        "description_text": html_to_text(textile),
        "also_appears_in": _parse_also_appears_in(soup),
    }
