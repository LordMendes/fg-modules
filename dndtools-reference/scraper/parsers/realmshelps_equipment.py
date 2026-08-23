"""Parse mundane weapon and armor listings from realmshelps.net."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin

from bs4 import Tag

from ..equipment_utils import (
    REALMSHELPS_BASE,
    armor_stats,
    build_equipment_record,
    map_realmshelps_equipment_sources,
    normalize_damage_type,
    normalize_numeric_bonus,
    normalize_speed,
    path_to_slug,
    weapon_stats,
)
from ..source_names import load_name_map
from .base import make_soup

WEAPONS_URL = f"{REALMSHELPS_BASE}/stores/all-weapons.shtml"
ARMOR_URL = f"{REALMSHELPS_BASE}/stores/all-armor.shtml"

WEAPON_SECTION_RE = re.compile(
    r"^(Simple|Martial|Exotic) Weapons\s*-\s*(Melee|Ranged)$",
    re.I,
)
ARMOR_SECTION_RE = re.compile(
    r"^(Light|Medium|Heavy)(?:\s+(Exotic))?\s+(Armor)|"
    r"^(Shields|Extras|Exotic\s+(?:Shields|Extras))$",
    re.I,
)

WEAPON_HEADERS = (
    "Name",
    "Cost",
    "Dmg(S)",
    "Dmg(M)",
    "Crit",
    "Range Inc",
    "Weight",
    "Type",
    "Source",
)
ARMOR_HEADERS = (
    "Name",
    "Cost",
    "Armor Bonus",
    "Max Dex Bonus",
    "AC Penalty",
    "Arcane Spell Failure",
    "Base spd (30 ft.)",
    "Base spd (20 ft.)",
    "Weight*",
    "Source",
)


def _cell_text(cell: Tag | None) -> str:
    if cell is None:
        return ""
    return cell.get_text(" ", strip=True)


def _extract_source_names(source_cell: Tag | None) -> list[str]:
    if source_cell is None:
        return []
    links = source_cell.select("a")
    if links:
        names = [link.get_text(" ", strip=True) for link in links]
        return [name for name in names if name]
    text = _cell_text(source_cell)
    return [text] if text else []


def _is_header_row(cells: list[Tag]) -> bool:
    if not cells:
        return False
    first = _cell_text(cells[0]).casefold()
    return first in {"name", "**name**"}


def _weapon_category(section: str | None) -> tuple[str, str | None]:
    if not section:
        return "weapon", None
    match = WEAPON_SECTION_RE.match(section)
    if not match:
        return "weapon", "other"
    proficiency, style = match.groups()
    return "weapon", proficiency.lower()


def _armor_kind_and_category(section: str | None) -> tuple[str, str | None]:
    if not section:
        return "armor", None

    lowered = section.casefold()
    if lowered == "shields":
        return "shield", "light"
    if lowered == "exotic shields":
        return "shield", "exotic"
    if lowered in {"extras", "exotic extras"}:
        return "armor", "extra"

    match = ARMOR_SECTION_RE.match(section)
    if not match:
        return "armor", None

    weight_class, exotic, _armor, simple = match.groups()
    if simple:
        simple_lower = simple.casefold()
        if "shield" in simple_lower:
            return "shield", "exotic" if "exotic" in simple_lower else "light"
        return "armor", "extra"

    category = weight_class.lower()
    if exotic:
        category = f"{category}-exotic"
    return "armor", category


def _parse_weapon_row(
    cells: list[Tag],
    *,
    section: str | None,
    pending_note: str | None,
    name_map: dict[str, str],
) -> dict[str, Any]:
    link = cells[0].select_one("a[href]")
    if link is None:
        raise ValueError("Weapon row missing detail link")

    href = link.get("href", "").strip()
    name = link.get_text(" ", strip=True)
    source_url = urljoin(f"{REALMSHELPS_BASE}/stores/", href)
    slug = path_to_slug(href)

    values = [_cell_text(cell) for cell in cells[1:]]
    padded = values + [""] * max(0, len(WEAPON_HEADERS) - 1 - len(values))
    field_map = dict(zip(WEAPON_HEADERS[1:], padded))

    raw_sources = _extract_source_names(cells[-1])
    source, all_sources = map_realmshelps_equipment_sources(raw_sources, name_map)

    kind, category = _weapon_category(section)
    damage_s = field_map.get("Dmg(S)") or None
    damage_m = field_map.get("Dmg(M)") or None
    critical = field_map.get("Crit") or None
    range_increment = field_map.get("Range Inc") or None
    cost = field_map.get("Cost") or None
    weight = field_map.get("Weight") or None
    damage_type = normalize_damage_type(field_map.get("Type"))

    index = {
        "kind": kind,
        "category": category,
        "stats": weapon_stats(
            damage_s=damage_s,
            damage_m=damage_m,
            critical=critical,
            range_increment=range_increment,
        ),
        "cost": cost,
        "weight": weight,
        "realmshelps_source": ", ".join(raw_sources) if raw_sources else None,
    }

    return build_equipment_record(
        name=name,
        slug=slug,
        source_url=source_url,
        source=source,
        all_sources=all_sources,
        kind=kind,
        category=category,
        index=index,
        note=pending_note,
        cost=cost,
        weight=weight,
        damage_s=damage_s or None,
        damage_m=damage_m or None,
        critical=critical or None,
        range_increment=range_increment or None,
        damage_type=damage_type,
    )


def _parse_armor_row(
    cells: list[Tag],
    *,
    section: str | None,
    pending_note: str | None,
    name_map: dict[str, str],
) -> dict[str, Any]:
    link = cells[0].select_one("a[href]")
    if link is None:
        raise ValueError("Armor row missing detail link")

    href = link.get("href", "").strip()
    name = link.get_text(" ", strip=True)
    source_url = urljoin(f"{REALMSHELPS_BASE}/stores/", href)
    slug = path_to_slug(href)

    values = [_cell_text(cell) for cell in cells[1:]]
    padded = values + [""] * max(0, len(ARMOR_HEADERS) - 1 - len(values))
    field_map = dict(zip(ARMOR_HEADERS[1:], padded))

    raw_sources = _extract_source_names(cells[-1])
    source, all_sources = map_realmshelps_equipment_sources(raw_sources, name_map)

    kind, category = _armor_kind_and_category(section)
    ac_bonus = normalize_numeric_bonus(field_map.get("Armor Bonus"))
    max_dex = normalize_numeric_bonus(field_map.get("Max Dex Bonus"))
    armor_check_penalty = normalize_numeric_bonus(field_map.get("AC Penalty"))
    arcane_spell_failure = field_map.get("Arcane Spell Failure") or None
    speed_30 = normalize_speed(field_map.get("Base spd (30 ft.)"))
    speed_20 = normalize_speed(field_map.get("Base spd (20 ft.)"))
    cost = field_map.get("Cost") or None
    weight = field_map.get("Weight*") or None

    index = {
        "kind": kind,
        "category": category,
        "stats": armor_stats(
            ac_bonus=ac_bonus,
            max_dex=max_dex,
            armor_check_penalty=armor_check_penalty,
        ),
        "cost": cost,
        "weight": weight,
        "realmshelps_source": ", ".join(raw_sources) if raw_sources else None,
    }

    return build_equipment_record(
        name=name,
        slug=slug,
        source_url=source_url,
        source=source,
        all_sources=all_sources,
        kind=kind,
        category=category,
        index=index,
        note=pending_note,
        cost=cost,
        weight=weight,
        ac_bonus=ac_bonus,
        max_dex=max_dex,
        armor_check_penalty=armor_check_penalty,
        arcane_spell_failure=arcane_spell_failure or None,
        speed_30=speed_30,
        speed_20=speed_20,
    )


def _parse_equipment_table(
    html: str,
    *,
    page_url: str,
    item_path: str,
    parse_row,
) -> list[dict[str, Any]]:
    soup = make_soup(html)
    table = soup.select_one("table")
    if table is None:
        raise ValueError(f"Missing equipment table in {page_url}")

    name_map = load_name_map()
    records: list[dict[str, Any]] = []
    section: str | None = None
    pending_note: str | None = None

    for row in table.select("tr"):
        cells = row.select("td")
        heading_cells = row.select("td, th")

        if len(heading_cells) == 1 and len(cells) <= 1:
            text = _cell_text(heading_cells[0])
            if item_path == "weapons" and WEAPON_SECTION_RE.match(text):
                section = text
                pending_note = None
                continue
            if item_path == "armor" and ARMOR_SECTION_RE.match(text):
                section = text
                pending_note = None
                continue
            if item_path == "weapons" and text.casefold() == "other":
                section = "Other"
                pending_note = None
                continue
            if not cells:
                continue
            if cells[0].select_one(f'a[href*="{item_path}/"]') is None:
                if text and not _is_header_row(cells):
                    pending_note = text
                continue

        if not cells:
            continue

        if _is_header_row(cells):
            continue

        if cells[0].select_one(f'a[href*="{item_path}/"]') is None:
            continue

        record = parse_row(
            cells,
            section=section,
            pending_note=pending_note,
            name_map=name_map,
        )
        records.append(record)
        pending_note = None

    return records


def parse_weapons_index(html: str, page_url: str = WEAPONS_URL) -> list[dict[str, Any]]:
    return _parse_equipment_table(
        html,
        page_url=page_url,
        item_path="weapons",
        parse_row=_parse_weapon_row,
    )


def parse_armor_index(html: str, page_url: str = ARMOR_URL) -> list[dict[str, Any]]:
    return _parse_equipment_table(
        html,
        page_url=page_url,
        item_path="armor",
        parse_row=_parse_armor_row,
    )
