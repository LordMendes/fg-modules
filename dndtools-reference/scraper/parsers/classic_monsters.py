"""Parsers for classic dndtools.org / dndtools.net monster pages."""

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
    parse_classic_monster_slug,
    parse_classic_pagination_total,
    parse_classic_source,
    resolve_classic_url,
    scraped_at,
    strip_banner,
)

STAT_LABEL_MAP: dict[str, str] = {
    "hit dice": "hit_dice",
    "initiative": "initiative",
    "speed": "speed",
    "armor class": "armor_class",
    "base attack/grapple": "base_attack_grapple",
    "attack": "attack",
    "full attack": "full_attack",
    "challenge rating": "challenge_rating",
    "alignment": "alignment",
    "environment": "environment",
    "treasure": "treasure",
    "advancement": "advancement",
    "organization": "organization",
    "level adjustment": "level_adjustment",
}

ABILITY_RE = re.compile(
    r"\bStr\s+([^,]+),\s*Dex\s+([^,]+),\s*Con\s+([^,]+),\s*"
    r"Int\s+([^,]+),\s*Wis\s+([^,]+),\s*Cha\s+(.+)$",
    re.I,
)
SAVE_RE = re.compile(
    r"Fort\s+([^\s]+)\s+Ref\s+([^\s]+)\s+Will\s+(.+)$",
    re.I,
)


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


def parse_classic_monster_index(html: str, base_url: str) -> tuple[list[dict[str, Any]], int | None]:
    soup = BeautifulSoup(html, "lxml")
    total = parse_classic_pagination_total(soup)
    records: list[dict[str, Any]] = []
    for cells in classic_table_rows(soup):
        if len(cells) < 3:
            continue
        href = cell_link_href(cells[0])
        name = cell_link_text(cells[0])
        if not href or not name:
            continue
        rulebook = cell_link_text(cells[1])
        rulebook_href = cell_link_href(cells[1])
        edition = cell_link_text(cells[2])
        slug, record_id, book_slug = parse_classic_monster_slug(href)
        records.append(
            {
                "name": name,
                "url": resolve_classic_url(href, base_url),
                "slug": slug,
                "id": record_id,
                "category": "monsters",
                "index": {
                    "rulebook": rulebook or None,
                    "rulebook_url": resolve_classic_url(rulebook_href, base_url) if rulebook_href else None,
                    "edition": edition or None,
                    "book_slug": book_slug,
                },
            }
        )
    return records, total


def _paragraph_label(p: Tag) -> str | None:
    strong = p.find("strong")
    if not strong:
        return None
    return strong.get_text(strip=True).rstrip(":").strip().lower()


def _paragraph_value(p: Tag) -> str:
    strong = p.find("strong")
    if strong:
        strong.extract()
    return " ".join(p.get_text(" ", strip=True).split())


def _parse_ability_scores(text: str) -> dict[str, str]:
    match = ABILITY_RE.search(text)
    if not match:
        return {}
    keys = ("str", "dex", "con", "int", "wis", "cha")
    return {key: value.strip() for key, value in zip(keys, match.groups())}


def _parse_saves(text: str) -> str | None:
    match = SAVE_RE.search(text)
    if not match:
        return clean_field_value(text) if text else None
    return f"{match.group(1).strip()} / {match.group(2).strip()} / {match.group(3).strip()}"


def _parse_link_entries(container: Tag) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for a in container.find_all("a", href=True):
        href = a.get("href", "")
        text = a.get_text(" ", strip=True)
        if not text:
            continue
        slug, record_id, _book = parse_classic_feat_slug(href)
        entries.append(
            {
                "name": text.rstrip(",").strip(),
                "level": None,
                "slug": slug,
                "url": href,
                "id": record_id,
            }
        )
    return entries


def _parse_special_ability_names(text: str) -> list[dict[str, Any]]:
    names = [part.strip() for part in re.split(r",(?![^(]*\))", text) if part.strip()]
    return [
        {"name": name, "level": None, "slug": None, "url": None, "id": None}
        for name in names
    ]


def parse_classic_monster_stat_block(content: Tag) -> dict[str, Any]:
    result: dict[str, Any] = {}
    close = content.select_one("div.close-paragraphs")
    if not close:
        return result

    special_attacks: list[dict[str, Any]] = []
    special_qualities: list[dict[str, Any]] = []
    extra_lines: list[str] = []

    for p in close.find_all("p", recursive=False):
        label = _paragraph_label(p)
        if label is None:
            stat_line = p.get_text(" ", strip=True)
            if stat_line and "stat_line" not in result:
                result["stat_line"] = stat_line
            continue

        value = _paragraph_value(p)
        field = STAT_LABEL_MAP.get(label)
        if field:
            result[field] = clean_field_value(value)
            continue
        if label == "saves":
            result["fort_ref_will"] = _parse_saves(value)
            continue
        if label == "abilities":
            result.update(_parse_ability_scores(value))
            continue
        if label == "special attacks":
            special_attacks = _parse_special_ability_names(value)
            continue
        if label == "special qualities":
            special_qualities = _parse_special_ability_names(value)
            continue
        if label == "feats":
            result["feats"] = _parse_link_entries(p)
            continue
        if label == "skills":
            extra_lines.append(f"Skills: {value}")
            continue
        extra_lines.append(f"{label.title()}: {value}")

    if special_attacks or special_qualities:
        result["special_abilities"] = special_attacks + special_qualities
    if extra_lines:
        result["_extra_stat_lines"] = extra_lines
    return result


def _split_nice_textile(
    content: Tag,
) -> tuple[str | None, str | None, str | None, str | None, str | None, str | None]:
    textile = content.select_one("div.nice-textile")
    if not textile:
        return None, None, None, None

    flavor_parts: list[str] = []
    description_parts: list[str] = []
    combat_parts: list[str] = []
    mode = "flavor"

    for child in textile.children:
        if not isinstance(child, Tag):
            continue
        if child.name == "h3":
            heading = child.get_text(strip=True).casefold()
            mode = "combat" if "combat" in heading else "description"
            continue
        html = html_inner(child)
        text = html_to_text(child)
        if not text:
            continue
        if mode == "flavor":
            flavor_parts.append(html)
        elif mode == "combat":
            combat_parts.append(html)
        else:
            description_parts.append(html)

    flavor_html = clean_field_value("".join(flavor_parts)) if flavor_parts else None
    flavor_text = clean_field_value(html_to_text(BeautifulSoup(flavor_html or "", "lxml"))) if flavor_html else None
    description_html = clean_field_value("".join(description_parts)) if description_parts else None
    description_text = (
        clean_field_value(html_to_text(BeautifulSoup(description_html or "", "lxml")))
        if description_html
        else None
    )
    combat_html = clean_field_value("".join(combat_parts)) if combat_parts else None
    combat_text = clean_field_value(html_to_text(BeautifulSoup(combat_html or "", "lxml"))) if combat_html else None
    return flavor_html, flavor_text, description_html, description_text, combat_html, combat_text


def parse_classic_monster_detail(
    html: str,
    source_url: str,
    index_record: dict[str, Any] | None = None,
    name_map: dict[str, str] | None = None,
) -> dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")
    content = get_content(soup)
    if content is None:
        raise ValueError("Missing #content on classic monster page")

    strip_banner(content)
    slug, record_id, _book_slug = parse_classic_monster_slug(urlparse(source_url).path)
    name = content.find("h2").get_text(strip=True) if content.find("h2") else index_record.get("name") if index_record else ""
    source = parse_classic_source(content)
    stat_fields = parse_classic_monster_stat_block(content)
    extra_lines = stat_fields.pop("_extra_stat_lines", [])
    flavor_html, flavor_text, description_html, description_text, combat_html, combat_text = _split_nice_textile(content)

    if extra_lines:
        extra_text = "\n".join(extra_lines)
        combat_text = f"{combat_text}\n{extra_text}".strip() if combat_text else extra_text
        extra_html = "".join(f"<p>{line}</p>" for line in extra_lines)
        combat_html = f"{combat_html}{extra_html}" if combat_html else extra_html

    index_data = dict(index_record.get("index", {})) if index_record else {}
    abbrev = abbrev_for_source_name(source.get("name"), name_map or load_name_map())
    if abbrev:
        index_data["source_abbrev"] = abbrev
    if stat_fields.get("challenge_rating"):
        index_data["cr"] = stat_fields["challenge_rating"]
    if stat_fields.get("hit_dice"):
        index_data["hd"] = stat_fields["hit_dice"]
    if stat_fields.get("stat_line"):
        type_match = re.match(r"^[^(]+", stat_fields["stat_line"])
        if type_match:
            index_data.setdefault("type", type_match.group(0).strip())

    record: dict[str, Any] = {
        "id": record_id,
        "slug": slug,
        "name": name,
        "source_url": source_url,
        "scraped_at": scraped_at(),
        "index": index_data,
        **stat_fields,
        "flavor_html": flavor_html,
        "flavor_text": flavor_text,
        "description_html": description_html,
        "description_text": description_text,
        "combat_html": combat_html,
        "combat_text": combat_text,
        "source": merge_source(
            source,
            index_source_abbrev=index_data.get("source_abbrev"),
            index_edition=index_data.get("edition"),
            name_map=name_map or load_name_map(),
        ),
    }
    if index_data.get("edition") and not record["source"].get("edition"):
        record["source"]["edition"] = index_data["edition"]
    return record
