"""Shared helpers for Realms Helps mundane equipment scraping."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import unquote

from .flaw_utils import REALMSHELPS_SOURCE_MAP, slugify_name
from .source_names import load_name_map, match_book_name

REALMSHELPS_BASE = "https://realmshelps.net"

CORE_SOURCE_ABBREVS = frozenset(
    {
        "PH",
        "PHB",
        "DMG",
        "MM",
        "MM2",
        "MM3",
        "MM4",
        "MM5",
    }
)

REALMSHELPS_BOOK_ALIASES: dict[str, tuple[str, str]] = {
    "player's handbook": ("PH", "Player's Handbook v.3.5"),
    "dungeon master's guide": ("DMG", "Dungeon Master's Guide v.3.5"),
    "forgotten realms campaign setting": ("FRCS", "Forgotten Realms Campaign Setting"),
    "races of faerûn": ("Rac", "Races of Faerûn"),
    "races of faerun": ("Rac", "Races of Faerûn"),
    "races of stone": ("RS", "Races of Stone"),
    "races of the wild": ("RW", "Races of the Wild"),
    "arms and equipment guide": ("AE", "Arms and Equipment Guide"),
    "song and silence": ("SaS", "Song and Silence: A Guidebook to Bards and Rogues"),
    "planar handbook": ("PlH", "Planar Handbook"),
    "serpent kingdoms": ("SK", "Serpent Kingdoms"),
    "stormwrack": ("Sto", "Stormwrack"),
    "sandstorm": ("Sa", "Sandstorm"),
    "underdark": ("Und", "Underdark"),
    "ghostwalk": ("Gh", "Ghostwalk"),
    "complete warrior": ("CW", "Complete Warrior"),
    "compete warrior": ("CW", "Complete Warrior"),
    "sword and fist": ("SF", "Sword and Fist: A Guidebook to Monks and Fighters"),
    "sword and fist: a guidebook to monks and fighters": (
        "SF",
        "Sword and Fist: A Guidebook to Monks and Fighters",
    ),
}


def canonical_source_name(abbrev: str, fallback: str, name_map: dict[str, str]) -> str:
    return name_map.get(abbrev, fallback)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def source_edition(abbrev: str) -> str:
    if abbrev in CORE_SOURCE_ABBREVS:
        return "Core (3.5)"
    return "Supplementals (3.5)"


def map_realmshelps_equipment_source(raw: str, name_map: dict[str, str] | None = None) -> dict[str, str]:
    cleaned = " ".join(raw.split()).strip()
    if not cleaned:
        return {"name": "Unknown", "abbrev": "RH", "edition": "Supplementals (3.5)"}

    dragon_match = re.match(r"Dragon\s*#(\d+)", cleaned, flags=re.I)
    if dragon_match:
        number = dragon_match.group(1)
        return {
            "name": "Dragon Magazine",
            "abbrev": f"Dr{number}",
            "edition": "Supplementals (3.5)",
        }

    mapped = REALMSHELPS_SOURCE_MAP.get(cleaned.lower())
    if mapped:
        name, abbrev, edition = mapped
        if name_map is None:
            name_map = load_name_map()
        return {
            "name": canonical_source_name(abbrev, name, name_map),
            "abbrev": abbrev,
            "edition": edition,
        }

    alias = REALMSHELPS_BOOK_ALIASES.get(cleaned.lower())
    if alias:
        abbrev, name = alias
        return {"name": name, "abbrev": abbrev, "edition": source_edition(abbrev)}

    if name_map is None:
        name_map = load_name_map()
    matched = match_book_name(cleaned, name_map)
    if matched:
        abbrev, name = matched
        return {
            "name": canonical_source_name(abbrev, name, name_map),
            "abbrev": abbrev,
            "edition": source_edition(abbrev),
        }

    words = re.findall(r"[A-Za-z0-9]+", cleaned)
    abbrev = "".join(word[0].upper() for word in words[:4]) or "RH"
    return {"name": cleaned, "abbrev": abbrev, "edition": "Supplementals (3.5)"}


def map_realmshelps_equipment_sources(
    raw_sources: list[str],
    name_map: dict[str, str] | None = None,
) -> tuple[dict[str, str], list[dict[str, str]]]:
    mapped = [map_realmshelps_equipment_source(raw, name_map) for raw in raw_sources if raw.strip()]
    if not mapped:
        fallback = {"name": "Unknown", "abbrev": "RH", "edition": "Supplementals (3.5)"}
        return fallback, [fallback]
    return mapped[0], mapped


def path_to_slug(path: str, suffix: str = "rh") -> str:
    segment = unquote(path.split("/")[-1])
    segment = re.sub(r"3_", "-", segment, flags=re.I)
    segment = segment.replace("_", "-")
    slug = re.sub(r"[^a-z0-9]+", "-", segment.lower())
    slug = re.sub(r"-+", "-", slug).strip("-")
    return f"{slug}-{suffix}" if slug else suffix


def normalize_damage_type(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = " ".join(raw.split()).strip()
    if not cleaned or cleaned == "-":
        return None

    lowered = cleaned.casefold()
    replacements = {
        "slashing": "S",
        "piercing": "P",
        "bludgeoning": "B",
    }
    if lowered in replacements:
        return replacements[lowered]

    for word, abbrev in replacements.items():
        cleaned = re.sub(rf"\b{word}\b", abbrev, cleaned, flags=re.I)

    cleaned = re.sub(r"\s+and\s+", " and ", cleaned, flags=re.I)
    cleaned = re.sub(r"\s+or\s+", " or ", cleaned, flags=re.I)
    return cleaned


def normalize_numeric_bonus(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = " ".join(raw.split()).strip()
    if not cleaned or cleaned == "-":
        return None
    return cleaned.lstrip("+")


def normalize_speed(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = " ".join(raw.split()).strip()
    if not cleaned or cleaned == "-":
        return None
    match = re.search(r"(\d+)", cleaned)
    return match.group(1) if match else cleaned


def weapon_stats(
    *,
    damage_s: str | None,
    damage_m: str | None,
    critical: str | None,
    range_increment: str | None,
) -> str:
    parts: list[str] = []
    if damage_m and damage_m != "-":
        parts.append(damage_m)
    elif damage_s and damage_s != "-":
        parts.append(damage_s)
    if critical and critical != "-":
        parts.append(critical)
    if range_increment and range_increment != "-":
        parts.append(range_increment)
    return " · ".join(parts)


def armor_stats(
    *,
    ac_bonus: str | None,
    max_dex: str | None,
    armor_check_penalty: str | None,
) -> str:
    parts: list[str] = []
    if ac_bonus:
        parts.append(f"AC {ac_bonus}")
    if max_dex:
        parts.append(f"Max Dex {max_dex}")
    if armor_check_penalty:
        parts.append(f"ACP {armor_check_penalty}")
    return " · ".join(parts)


def build_equipment_record(
    *,
    name: str,
    slug: str,
    source_url: str,
    source: dict[str, str],
    kind: str,
    category: str | None,
    index: dict[str, Any],
    all_sources: list[dict[str, str]] | None = None,
    note: str | None = None,
    **fields: Any,
) -> dict[str, Any]:
    index_data = {
        **index,
        "source_abbrev": source["abbrev"],
        "edition": source["edition"],
    }
    if all_sources and len(all_sources) > 1:
        index_data["realmshelps_sources"] = [
            f"{item['abbrev']}:{item['name']}" for item in all_sources
        ]
    if note:
        index_data["note"] = note

    record: dict[str, Any] = {
        "slug": slug,
        "name": name,
        "source_url": source_url,
        "scraped_at": utc_now_iso(),
        "index": index_data,
        "kind": kind,
        "category": category,
        "source": {
            "name": source["name"],
            "abbrev": source["abbrev"],
            "edition": source["edition"],
            "page": None,
            "url": source_url,
        },
    }

    null_fields = {
        "cost": None,
        "weight": None,
        "damage_s": None,
        "damage_m": None,
        "critical": None,
        "damage_type": None,
        "handed": None,
        "range_increment": None,
        "ac_bonus": None,
        "max_dex": None,
        "armor_check_penalty": None,
        "arcane_spell_failure": None,
        "speed_30": None,
        "speed_20": None,
    }
    for key, value in fields.items():
        if value is not None:
            record[key] = value
            null_fields.pop(key, None)
    record.update(null_fields)
    return record
