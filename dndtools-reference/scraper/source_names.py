"""Canonical source book title resolution from abbreviations."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable

PLACEHOLDER_SOURCE_NAME = "Core"

REFERENCE_CATEGORIES = frozenset(
    {
        "feats",
        "spells",
        "monsters",
        "races",
        "skills",
        "items",
        "domains",
        "psionics",
        "rules",
    }
)

PANTHEON_DEFAULT_ABBREV: dict[str, str] = {
    "faerunian": "FP",
    "forgotten realms": "FP",
    "eberron": "ECS",
    "sovereign host": "ECS",
    "three faces": "ECS",
    "rushemé": "ECS",
    "olympian": "DD",
    "pharaonic": "DD",
    "mulhorandi": "DD",
    "asgardian": "DD",
    "celtic": "DD",
    "babylonian": "DD",
    "mesopotamian": "DD",
    "zoroastrian": "DD",
    "azcan": "DD",
    "oeridian": "DD",
    "draconic": "Dr",
    "thir": "Dr",
    "elven": "DD",
    "dwarven": "DD",
    "gnome": "DD",
    "halfling": "DD",
    "giant": "DD",
    "archdevils": "FCII",
    "ghostwalk": "Gh",
    "baklunish": "DD",
    "dragon-kings": "DSCS",
    "illumian": "RD",
    "warrior": "DD",
    "greyhawk": "DD",
    "flan": "DD",
}

EQUIPMENT_DEFAULT_SOURCE: dict[str, Any] = {
    "name": "Player's Handbook v.3.5",
    "abbrev": "PH",
    "edition": "Core (3.5)",
    "page": None,
    "url": None,
}


def pick_canonical_name(names: Iterable[str]) -> str | None:
    best: str | None = None
    for name in names:
        if not name:
            continue
        if name == PLACEHOLDER_SOURCE_NAME:
            if not best:
                best = name
            continue
        if not best or best == PLACEHOLDER_SOURCE_NAME or len(name) > len(best):
            best = name
    return best


def record_source(record: dict[str, Any]) -> tuple[str | None, str | None]:
    src = record.get("source") or {}
    abbrev = src.get("abbrev")
    if not abbrev:
        index = record.get("index") or {}
        abbrev = index.get("source_abbrev")
    name = src.get("name")
    if isinstance(abbrev, str):
        abbrev = abbrev.strip() or None
    if isinstance(name, str):
        name = name.strip() or None
    return abbrev, name


def build_abbrev_name_map(records: Iterable[dict[str, Any]]) -> dict[str, str]:
    names_by_abbrev: dict[str, set[str]] = defaultdict(set)
    for record in records:
        abbrev, name = record_source(record)
        if not abbrev or not name:
            continue
        names_by_abbrev[abbrev].add(name)

    out: dict[str, str] = {}
    for abbrev, names in names_by_abbrev.items():
        label = pick_canonical_name(names)
        if not label:
            continue
        out[abbrev] = abbrev if label == PLACEHOLDER_SOURCE_NAME else label
    return out


def resolve_canonical_name(
    name: str | None,
    abbrev: str | None,
    name_map: dict[str, str],
) -> str:
    current = name or PLACEHOLDER_SOURCE_NAME
    if current != PLACEHOLDER_SOURCE_NAME:
        if abbrev and abbrev in name_map:
            canonical = name_map[abbrev]
            if canonical != PLACEHOLDER_SOURCE_NAME and len(canonical) >= len(current):
                return canonical
        return current
    if abbrev and abbrev in name_map:
        return name_map[abbrev]
    return current


def load_json_records(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else []


def load_all_records(data_dir: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path in sorted(data_dir.glob("*.json")):
        records.extend(load_json_records(path))
    return records


def load_name_map(path: Path | None = None) -> dict[str, str]:
    if path is None:
        path = Path(__file__).resolve().parents[1] / "data" / "dndtools" / ".index" / "source-names.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def save_name_map(name_map: dict[str, str], path: Path | None = None) -> Path:
    if path is None:
        path = Path(__file__).resolve().parents[1] / "data" / "dndtools" / ".index" / "source-names.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(dict(sorted(name_map.items())), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def build_name_map_report(records: list[dict[str, Any]]) -> dict[str, Any]:
    names_by_abbrev: dict[str, set[str]] = defaultdict(set)
    for record in records:
        abbrev, name = record_source(record)
        if not abbrev or not name or name == PLACEHOLDER_SOURCE_NAME:
            continue
        names_by_abbrev[abbrev].add(name)

    conflicts = {
        abbrev: sorted(names)
        for abbrev, names in sorted(names_by_abbrev.items())
        if len(names) > 1
    }
    name_map = build_abbrev_name_map(records)
    return {
        "mapped_abbrevs": len(name_map),
        "conflicts": conflicts,
        "name_map": name_map,
    }


def match_book_name(segment: str, name_map: dict[str, str]) -> tuple[str, str] | None:
    cleaned = " ".join(segment.split()).strip()
    if not cleaned:
        return None
    lowered = cleaned.casefold()
    best: tuple[str, str] | None = None
    for abbrev, title in name_map.items():
        title_lower = title.casefold()
        if lowered == title_lower or title_lower.startswith(lowered) or lowered.startswith(title_lower):
            if not best or len(title) > len(best[1]):
                best = (abbrev, title)
    return best


def pantheon_default_abbrev(pantheon: str | None) -> str | None:
    if not pantheon:
        return None
    lowered = pantheon.casefold()
    for key, abbrev in PANTHEON_DEFAULT_ABBREV.items():
        if key in lowered:
            return abbrev
    return None


def parse_deity_source_lines(
    muted_lines: list[str],
    name_map: dict[str, str],
    pantheon: str | None = None,
) -> dict[str, Any] | None:
    from .normalize import parse_source_line

    if not muted_lines:
        return _deity_source_from_pantheon(pantheon, name_map)

    first_line = muted_lines[0]
    for segment in first_line.split(","):
        cleaned = " ".join(segment.split()).strip()
        if not cleaned:
            continue
        parsed = parse_source_line(cleaned)
        abbrev = parsed.get("abbrev")
        if abbrev and abbrev in name_map:
            return {
                "name": name_map[abbrev],
                "abbrev": abbrev,
                "edition": parsed.get("edition"),
                "page": parsed.get("page"),
                "url": None,
            }
        if abbrev:
            return {
                "name": parsed.get("name") or name_map.get(abbrev, abbrev),
                "abbrev": abbrev,
                "edition": parsed.get("edition"),
                "page": parsed.get("page"),
                "url": None,
            }
        matched = match_book_name(cleaned, name_map)
        if matched:
            abbrev, title = matched
            return {
                "name": title,
                "abbrev": abbrev,
                "edition": None,
                "page": None,
                "url": None,
            }

    return _deity_source_from_pantheon(pantheon, name_map)


def _deity_source_from_pantheon(
    pantheon: str | None,
    name_map: dict[str, str],
) -> dict[str, Any] | None:
    abbrev = pantheon_default_abbrev(pantheon)
    if not abbrev or abbrev not in name_map:
        return None
    return {
        "name": name_map[abbrev],
        "abbrev": abbrev,
        "edition": None,
        "page": None,
        "url": None,
    }
