"""Item index and detail parsers."""

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
    make_soup,
    parse_labeled_metadata,
    parse_table_rows,
    resolve_url,
)


def parse_items_index(soup: BeautifulSoup, page_url: str) -> list[dict[str, Any]]:
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
                "level": cell_text(cells[1]),
                "cost": cell_text(cells[2]),
                "slot_or_property": cell_text(cells[3]),
                "rulebook": cell_link_text(cells[4]),
                "edition": cell_link_text(cells[5]) if len(cells) > 5 else "",
            }
        )
    return records


def parse_item_detail(html: str, source_url: str) -> dict[str, Any]:
    soup = make_soup(html)
    content = soup.select_one("#content")
    metadata = parse_labeled_metadata(content) if content else {}
    textile = get_nice_textile(soup)

    return {
        "title": get_content_title(soup),
        "aura": metadata.get("Aura", ""),
        "cl": metadata.get("CL", metadata.get("Caster Level", "")),
        "slot": metadata.get("Slot", metadata.get("Body Slot", "")),
        "price": metadata.get("Price", metadata.get("Cost", "")),
        "weight": metadata.get("Weight", ""),
        "properties": metadata.get("Property", metadata.get("Properties", "")),
        "description_html": html_inner(textile),
        "description_text": html_to_text(textile),
    }
