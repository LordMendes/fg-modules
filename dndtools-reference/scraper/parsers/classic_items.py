"""Parsers for classic dndtools.org / dndtools.net item pages."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

from bs4 import BeautifulSoup, Tag

from ..normalize import clean_field_value, merge_source
from ..source_names import load_name_map
from .base import html_inner, html_to_text
from .classic import (
    cell_link_href,
    cell_link_text,
    classic_table_rows,
    get_content,
    parse_classic_feat_slug,
    parse_classic_item_slug,
    parse_classic_pagination_total,
    parse_classic_source,
    resolve_classic_url,
    scraped_at,
    strip_banner,
)

ITEM_TYPE_MAP = {
    "item_MAG": "Magic Item",
    "item_ENH": "Enhancement",
    "item_CUR": "Cursed",
    "item_ALC": "Alchemical",
    "item_MUN": "Mundane",
}


def _normalize_key(value: str | None) -> str:
    if not value:
        return ""
    text = value.casefold()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def abbrev_for_source_name(name: str | None, name_map: dict[str, str]) -> str | None:
    if not name:
        return None
    needle = _normalize_key(name)
    for abbrev, canonical in name_map.items():
        if _normalize_key(canonical) == needle:
            return abbrev
    return None


def parse_classic_item_index(html: str, base_url: str) -> tuple[list[dict[str, Any]], int | None]:
    soup = BeautifulSoup(html, "lxml")
    total = parse_classic_pagination_total(soup)
    records: list[dict[str, Any]] = []
    for cells in classic_table_rows(soup):
        if len(cells) < 6:
            continue
        href = cell_link_href(cells[0])
        name = cell_link_text(cells[0])
        if not href or not name:
            continue
        level = cell_link_text(cells[1])
        cost = cell_text(cells[2])
        slot = cell_text(cells[3])
        rulebook = cell_link_text(cells[4])
        rulebook_href = cell_link_href(cells[4])
        edition = cell_link_text(cells[5])
        slug, record_id, book_slug = parse_classic_item_slug(href)
        records.append(
            {
                "name": name,
                "url": resolve_classic_url(href, base_url),
                "slug": slug,
                "id": record_id,
                "category": "items",
                "index": {
                    "price": cost or None,
                    "slot": slot or None,
                    "level": None if level in ("—", "-", "") else level,
                    "rulebook": rulebook or None,
                    "rulebook_url": resolve_classic_url(rulebook_href, base_url) if rulebook_href else None,
                    "edition": edition or None,
                    "book_slug": book_slug,
                },
            }
        )
    return records, total


def cell_text(cell: Tag) -> str:
    return " ".join(cell.get_text(" ", strip=True).split())


def _parse_item_type(content: Tag) -> str | None:
    for cls, label in ITEM_TYPE_MAP.items():
        node = content.select_one(f"div.{cls}")
        if node:
            return node.get_text(strip=True) or label
    return None


def _parse_labeled_fields(content: Tag) -> dict[str, str]:
    fields: dict[str, str] = {}
    for strong in content.find_all("strong"):
        label = strong.get_text(strip=True).rstrip(":").strip().lower()
        if not label:
            continue
        parts: list[str] = []
        for sibling in strong.next_siblings:
            if isinstance(sibling, Tag) and sibling.name in ("strong", "br", "div"):
                if sibling.name == "strong":
                    break
                if sibling.name == "br":
                    continue
            if isinstance(sibling, Tag):
                parts.append(sibling.get_text(" ", strip=True))
            else:
                text = str(sibling).strip()
                if text:
                    parts.append(text)
            if isinstance(sibling, Tag) and sibling.name == "br":
                break
        value = " ".join(parts).strip()
        if value:
            fields[label] = value
    return fields


def _normalize_caster_level(value: str | None) -> str | None:
    if not value:
        return None
    match = re.search(r"(\d+)", value)
    return match.group(1) if match else clean_field_value(value)


def _normalize_aura(content: Tag, fields: dict[str, str]) -> str | None:
    raw = fields.get("aura")
    if not raw:
        return None
    school_link = None
    for strong in content.find_all("strong"):
        if strong.get_text(strip=True).rstrip(":").lower() == "aura":
            for sibling in strong.next_siblings:
                if isinstance(sibling, Tag) and sibling.name == "a":
                    school_link = sibling.get_text(strip=True)
                    break
            break
    strength = raw.split(";", 1)[0].strip()
    if school_link:
        return f"{strength}{school_link}".replace(" ", "")
    return clean_field_value(raw.replace(" ", ""))


def _parse_price_fields(price: str | None) -> tuple[str | None, str | None]:
    if not price:
        return None, None
    cleaned = price.strip()
    if cleaned.startswith("+"):
        return None, cleaned
    return cleaned, None


def parse_classic_item_detail(
    html: str,
    source_url: str,
    index_record: dict[str, Any] | None = None,
    name_map: dict[str, str] | None = None,
) -> dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")
    content = get_content(soup)
    if content is None:
        raise ValueError("Missing #content on classic item page")

    strip_banner(content)
    slug, record_id, _book_slug = parse_classic_item_slug(urlparse(source_url).path)
    name = content.find("h2").get_text(strip=True) if content.find("h2") else index_record.get("name") if index_record else ""
    source = parse_classic_source(content)
    item_type = _parse_item_type(content)
    labeled = _parse_labeled_fields(content)
    textile = content.select_one("div.nice-textile")
    description_html = clean_field_value(html_inner(textile)) if textile else None
    description_text = clean_field_value(html_to_text(textile)) if textile else None

    if not description_html:
        for p in content.find_all("p"):
            italic = p.find("i")
            if italic and italic.get_text(strip=True):
                description_html = clean_field_value(html_inner(p))
                description_text = clean_field_value(italic.get_text(" ", strip=True))
                break

    price, price_bonus = _parse_price_fields(labeled.get("price"))
    index_data = dict(index_record.get("index", {})) if index_record else {}
    abbrev = abbrev_for_source_name(source.get("name"), name_map or load_name_map())
    if abbrev:
        index_data["source_abbrev"] = abbrev
    if item_type:
        index_data["type"] = item_type
    if price:
        index_data["price"] = price
    elif price_bonus:
        index_data["price"] = "—"

    record: dict[str, Any] = {
        "id": record_id,
        "slug": slug,
        "name": name,
        "source_url": source_url,
        "scraped_at": scraped_at(),
        "index": index_data,
        "price": price or index_data.get("price"),
        "price_bonus": price_bonus,
        "caster_level": _normalize_caster_level(labeled.get("caster level")),
        "aura": _normalize_aura(content, labeled),
        "activation": clean_field_value(labeled.get("activation")),
        "weight": clean_field_value(labeled.get("weight")),
        "description_html": description_html,
        "description_text": description_text,
        "source": merge_source(
            source,
            index_source_abbrev=index_data.get("source_abbrev"),
            index_edition=index_data.get("edition"),
            name_map=name_map or load_name_map(),
        ),
    }
    if index_data.get("edition") and not record["source"].get("edition"):
        record["source"]["edition"] = index_data["edition"]
    if item_type == "Cursed":
        record["cursed"] = True
    return record
