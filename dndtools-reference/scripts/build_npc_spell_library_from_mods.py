#!/usr/bin/env python3
"""Extract NPC spell library entries from Fantasy Grounds .mod ZIP files.

Reads spell metadata and <actions> blocks from module db.xml and returns
entries keyed by normalized spell name for merge into srd-spell-library.json.

Usage:
  python scripts/build_npc_spell_library_from_mods.py
  python scripts/build_npc_spell_library_from_mods.py --mods-dir ../fg-builder/reviews/v3
"""

from __future__ import annotations

import argparse
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODS_DIR = ROOT.parent / "fg-builder" / "reviews" / "v3"

ARCANE_SCHOOLS = (
    "Abjuration",
    "Conjuration",
    "Divination",
    "Enchantment",
    "Evocation",
    "Illusion",
    "Necromancy",
    "Transmutation",
    "Universal",
)

LEVEL_WORDS = (
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
)

SCHOOL_SUBSCHOOL_TAGS: dict[str, str] = {
    "calling": "calling",
    "charm": "charm",
    "compulsion": "compulsion",
    "creation": "creation",
    "figment": "figment",
    "glamer": "glamer",
    "healing": "healing",
    "pattern": "pattern",
    "phantasm": "phantasm",
    "polymorph": "polymorph",
    "shadow": "shadow",
    "summoning": "summoning",
    "teleportation": "teleportation",
}


def normalize_spell_key(name: str) -> str:
    return (
        name.strip()
        .lower()
        .replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\xa0", " ")
        .replace("  ", " ")
        .replace("  ", " ")
    )


def parse_spell_school(raw: str | None) -> tuple[list[str], str | None]:
    if not raw or not raw.strip():
        return [], None

    subschool_match = re.search(r"\(([^)]+)\)$", raw.strip())
    subschool = subschool_match.group(1).strip() if subschool_match else None
    without_subschool = (
        raw[: subschool_match.start()].strip() if subschool_match else raw.strip()
    )

    schools: list[str] = []
    for token in [part.strip() for part in without_subschool.split("/") if part.strip()]:
        if token in ARCANE_SCHOOLS:
            schools.append(token)
        else:
            for school in ARCANE_SCHOOLS:
                if school in token:
                    schools.append(school)
                    break

    if not schools:
        for school in ARCANE_SCHOOLS:
            if school.lower() in without_subschool.lower():
                schools.append(school)
                break

    return schools, subschool


def school_short(raw: str | None) -> str:
    schools, _ = parse_spell_school(raw)
    if schools:
        return schools[0].lower()
    if not raw:
        return ""
    return raw.strip().split()[0].lower()


def parse_savetype(saving_throw: str | None) -> str:
    if not saving_throw:
        return ""
    lower = saving_throw.lower()
    if lower.startswith("none") or lower == "—":
        return ""
    if "fort" in lower:
        return "fort"
    if "reflex" in lower or "ref " in lower:
        return "reflex"
    if "will" in lower:
        return "will"
    return ""


def sr_not_allowed(spell_resistance: str | None) -> bool:
    if not spell_resistance:
        return False
    lower = spell_resistance.lower()
    return lower == "no" or "harmless" in lower

# Lower index = higher priority when the same spell name appears in multiple mods.
MOD_FILENAME_PRIORITY: dict[str, int] = {
    "player's handbook.mod": 0,
    "players handbook.mod": 0,
    "spell compendium.mod": 1,
    "player's handbook ii.mod": 2,
    "complete arcane.mod": 3,
    "complete mage.mod": 4,
    "complete divine.mod": 5,
    "complete champion.mod": 6,
    "complete warrior.mod": 7,
    "book of vile darkness.mod": 8,
    "complete adventurer.mod": 9,
    "forgotten realms campaign setting.mod": 10,
    "races of faerûn.mod": 11,
    "races of faerun.mod": 11,
    "unearthed arcana.mod": 12,
}

SAVE_TYPE_MAP = {
    "fortitude": "fort",
    "reflex": "reflex",
    "will": "will",
}


def _text(el: ET.Element | None) -> str:
    if el is None:
        return ""
    return "".join(el.itertext()).strip()


def _child_text(parent: ET.Element, tag: str) -> str:
    return _text(parent.find(tag))


def _normalize_mod_savetype(raw: str | None) -> str:
    if not raw:
        return ""
    key = raw.strip().lower()
    return SAVE_TYPE_MAP.get(key, key if key in {"fort", "reflex", "will"} else "")


def _min_level_from_level_str(level_str: str) -> int | None:
    nums = [int(n) for n in re.findall(r"\b(\d+)\b", level_str)]
    return min(nums) if nums else None


def _derive_othertags(
    school: str,
    level_str: str,
    follow_ups: list[dict[str, Any]],
) -> str:
    tags: list[str] = []

    school_lower = school.lower()
    for token in ("acid", "cold", "electricity", "fire", "force", "sonic", "negative"):
        if token in school_lower and token not in tags:
            tags.append(token)

    _, subschool = parse_spell_school(school)
    if subschool:
        mapped = SCHOOL_SUBSCHOOL_TAGS.get(subschool.strip().lower())
        if mapped and mapped not in tags:
            tags.append(mapped)

    for action in follow_ups:
        if action.get("type") == "damage" and action.get("dmgType"):
            dmg = str(action["dmgType"]).lower()
            if dmg not in tags:
                tags.append(dmg)

    min_level = _min_level_from_level_str(level_str)
    if min_level is not None and 0 <= min_level < len(LEVEL_WORDS):
        level_tag = LEVEL_WORDS[min_level]
        if level_tag not in tags:
            tags.append(level_tag)

    if not tags:
        return ""
    return "; ".join(tags) + "; "


def _parse_damage_action(action_el: ET.Element) -> dict[str, Any] | None:
    dmg_list = action_el.find("damagelist")
    if dmg_list is None:
        return None
    entry = next((child for child in dmg_list if child.tag.startswith("id-")), None)
    if entry is None:
        return None

    dice = _child_text(entry, "dice")
    if not dice:
        return None

    out: dict[str, Any] = {
        "type": "damage",
        "dice": dice,
        "bonus": int(_child_text(entry, "bonus") or "0"),
        "dmgType": _child_text(entry, "type") or "untyped",
    }
    dicestat = _child_text(entry, "dicestat")
    if dicestat in {"cl", "halfcl"}:
        out["dicestat"] = dicestat
        dicestatmax = _child_text(entry, "dicestatmax")
        if dicestatmax.isdigit():
            out["dicestatmax"] = int(dicestatmax)
    return out


def _parse_heal_action(action_el: ET.Element) -> dict[str, Any] | None:
    heal_list = action_el.find("heallist")
    if heal_list is None:
        return None
    entry = next((child for child in heal_list if child.tag.startswith("id-")), None)
    if entry is None:
        return None

    dice = _child_text(entry, "dice")
    if not dice:
        return None

    statmax_raw = _child_text(entry, "statmax")
    statmax = int(statmax_raw) if statmax_raw.isdigit() else 0

    out: dict[str, Any] = {
        "type": "heal",
        "dice": dice,
        "statmax": statmax,
    }
    statmult_raw = _child_text(entry, "statmult")
    if statmult_raw.isdigit() and int(statmult_raw) != 1:
        out["statmult"] = int(statmult_raw)
    return out


def _parse_effect_action(action_el: ET.Element) -> dict[str, Any] | None:
    label = _child_text(action_el, "label")
    if not label:
        return None

    out: dict[str, Any] = {"type": "effect", "label": label}
    durdice = _child_text(action_el, "durdice")
    if durdice:
        out["durdice"] = durdice
    durmod = _child_text(action_el, "durmod")
    if durmod.isdigit():
        out["durmod"] = int(durmod)
    durunit = _child_text(action_el, "durunit")
    if durunit:
        out["durunit"] = durunit
    return out


def _parse_actions(actions_el: ET.Element | None) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    cast_fields: dict[str, Any] = {}
    follow_ups: list[dict[str, Any]] = []

    if actions_el is None:
        return cast_fields, follow_ups

    ordered = sorted(
        [child for child in actions_el if child.tag.startswith("id-")],
        key=lambda el: int(_child_text(el, "order") or "999"),
    )

    for action_el in ordered:
        action_type = _child_text(action_el, "type")
        if action_type == "cast":
            savetype = _normalize_mod_savetype(_child_text(action_el, "savetype"))
            if savetype:
                cast_fields["savetype"] = savetype
            atktype = _child_text(action_el, "atktype")
            if atktype in {"rtouch", "mtouch", "ranged"}:
                cast_fields["atktype"] = atktype
            onmiss = _child_text(action_el, "onmissdamage")
            if onmiss == "half":
                cast_fields["onmissdamage"] = "half"
            if _child_text(action_el, "srnotallowed") == "1":
                cast_fields["srNotAllowed"] = True
            continue

        parsed: dict[str, Any] | None = None
        if action_type == "damage":
            parsed = _parse_damage_action(action_el)
        elif action_type == "heal":
            parsed = _parse_heal_action(action_el)
        elif action_type == "effect":
            parsed = _parse_effect_action(action_el)

        if parsed:
            follow_ups.append(parsed)

    return cast_fields, follow_ups


def _clean_level_str(raw: str) -> str:
    cleaned = re.sub(r"\s+", " ", raw.replace(",", " ,")).strip(" ,")
    return re.sub(r"\s+,", ",", cleaned)


def _map_spell_node(spell_el: ET.Element) -> dict[str, Any] | None:
    name = _child_text(spell_el, "name")
    if not name:
        return None

    school = _child_text(spell_el, "school")
    level_str = _clean_level_str(_child_text(spell_el, "level"))
    save = _child_text(spell_el, "save") or "None"
    sr = _child_text(spell_el, "sr") or "No"
    short = _child_text(spell_el, "shortdescription")
    description = _text(spell_el.find("description"))

    cast_fields, follow_ups = _parse_actions(spell_el.find("actions"))

    entry: dict[str, Any] = {
        "name": name,
        "schoolShort": school_short(school),
        "schoolFull": school.strip(),
        "levelStr": level_str,
        "castingTime": _child_text(spell_el, "castingtime"),
        "components": _child_text(spell_el, "components").strip(" ,"),
        "range": _child_text(spell_el, "range"),
        "area": _child_text(spell_el, "effect") or _child_text(spell_el, "area"),
        "duration": _child_text(spell_el, "duration"),
        "save": save,
        "sr": sr,
        "short": short,
        "description": description,
        "othertags": _derive_othertags(school, level_str, follow_ups),
        "srNotAllowed": cast_fields.get("srNotAllowed", sr_not_allowed(sr)),
        "savetype": cast_fields.get("savetype") or parse_savetype(save),
    }

    if cast_fields.get("atktype"):
        entry["atktype"] = cast_fields["atktype"]
    if cast_fields.get("onmissdamage"):
        entry["onmissdamage"] = cast_fields["onmissdamage"]

    if follow_ups:
        entry["actions"] = follow_ups
        entry["action2"] = follow_ups[0]

    return entry


def _mod_priority(mod_path: Path) -> int:
    key = mod_path.name.lower()
    if key in MOD_FILENAME_PRIORITY:
        return MOD_FILENAME_PRIORITY[key]
    return 100 + len(key)


def load_mod_spells(mods_dir: Path) -> dict[str, dict]:
    """Load spell entries from all .mod files in mods_dir."""
    if not mods_dir.is_dir():
        return {}

    mod_files = sorted(mods_dir.glob("*.mod"), key=_mod_priority)
    entries: dict[str, dict] = {}
    collisions = 0

    for mod_path in mod_files:
        try:
            with zipfile.ZipFile(mod_path) as archive:
                if "db.xml" not in archive.namelist():
                    continue
                root = ET.fromstring(archive.read("db.xml"))
        except (OSError, zipfile.BadZipFile, ET.ParseError):
            continue

        spell_root = root.find("spell")
        if spell_root is None:
            continue

        for category in spell_root.findall("category"):
            for spell_el in category:
                if not spell_el.tag.startswith("id-"):
                    continue
                mapped = _map_spell_node(spell_el)
                if not mapped:
                    continue
                key = normalize_spell_key(mapped["name"])
                if key in entries:
                    collisions += 1
                    continue
                entries[key] = mapped

    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract spell library entries from FG .mod files")
    parser.add_argument(
        "--mods-dir",
        type=Path,
        default=DEFAULT_MODS_DIR,
        help="Directory containing .mod ZIP files",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Optional JSON output path (stdout summary if omitted)",
    )
    args = parser.parse_args()

    entries = load_mod_spells(args.mods_dir)
    action_count = sum(
        1 for entry in entries.values() if entry.get("action2") or entry.get("actions")
    )

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(dict(sorted(entries.items())), indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"Wrote {len(entries)} entries to {args.output}")
    else:
        print(f"Mods dir: {args.mods_dir}")
        print(f"Spells extracted: {len(entries)}")
        print(f"With automation (action2/actions): {action_count}")


if __name__ == "__main__":
    main()
