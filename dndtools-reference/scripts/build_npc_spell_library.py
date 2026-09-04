#!/usr/bin/env python3
"""Build NPC Creator spell library from scraped dndtools spells.json and FG .mod files.

Merges spells from selected source abbrevs and Fantasy Grounds modules in
fg-builder/reviews/v3 into web/src/lib/npc-creator/data/srd-spell-library.json.

Usage:
  python scripts/build_npc_spell_library.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPELLS_JSON = ROOT / "data" / "dndtools" / "spells.json"
LIBRARY_JSON = (
    ROOT / "web" / "src" / "lib" / "npc-creator" / "data" / "srd-spell-library.json"
)

SOURCE_ABBREVS = ("Sc", "PH", "PH2", "CAr", "CM", "CD", "CC", "CW", "BV")
SOURCE_PRIORITY = {abbrev: index for index, abbrev in enumerate(SOURCE_ABBREVS)}

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

CLASS_ABBREVS: dict[str, str] = {
    "Adept": "Adp",
    "Assassin": "Asn",
    "Bard": "Brd",
    "Beguiler": "Beg",
    "Blackguard": "Blk",
    "Cleric": "Clr",
    "Consecrated Harrier": "CH",
    "Demonologist": "Dem",
    "Druid": "Drd",
    "Duskblade": "Dus",
    "Hathran": "Hat",
    "Hexblade": "Hex",
    "Merchant Prince": "MP",
    "Mortal Hunter": "MH",
    "Nentyar Hunter": "NH",
    "Paladin": "Pal",
    "Ranger": "Rgr",
    "Shugenja": "Shu",
    "Soldier of Light": "SoL",
    "Sorcerer": "Sor",
    "Spellthief": "STh",
    "Vigilante": "Vig",
    "Walker In the Waste": "WitW",
    "Warlock": "War",
    "Warmage": "Wmg",
    "Wizard": "Wiz",
    "Wu Jen": "Wuj",
}

CLASS_SORT_ORDER: dict[str, int] = {
    "Brd": 10,
    "Clr": 20,
    "Drd": 30,
    "Pal": 40,
    "Rgr": 50,
    "Sor/Wiz": 60,
    "Sor": 61,
    "Wiz": 62,
}

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

DESCRIPTOR_TAGS: dict[str, str] = {
    "acid": "acid",
    "air": "air",
    "chaotic": "chaotic",
    "cold": "cold",
    "darkness": "darkness",
    "death": "death",
    "earth": "earth",
    "electricity": "electricity",
    "evil": "evil",
    "fear": "fear",
    "fire": "fire",
    "force": "force",
    "good": "good",
    "language-dependent": "language",
    "lawful": "lawful",
    "light": "light",
    "mind-affecting": "mindaffecting",
    "sonic": "sonic",
    "water": "water",
}

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

AUTOMATION_FIELDS = ("action2", "actions", "atktype", "onmissdamage")


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
    token = raw.strip().split()[0].lower()
    return token


def append_descriptors(school: str | None, descriptors: list[str] | None) -> str:
    base = (school or "").strip()
    if not descriptors:
        return base

    existing = {part.strip("[] ").lower() for part in re.findall(r"\[[^\]]+\]", base)}
    extra: list[str] = []
    for descriptor in descriptors:
        clean = descriptor.strip()
        if not clean:
            continue
        if clean.lower() in existing:
            continue
        extra.append(clean)

    if not extra:
        return base
    suffix = " ".join(f"[{part}]" for part in extra)
    return f"{base} {suffix}".strip()


def abbrev_class(name: str) -> str:
    return CLASS_ABBREVS.get(name, name)


def build_level_str(
    classes: list[dict] | None,
    domains: list[dict] | None,
) -> str:
    entries: dict[str, int] = {}

    for row in classes or []:
        name = str(row.get("name") or "").strip()
        level = row.get("level")
        if not name or not isinstance(level, int):
            continue
        entries[abbrev_class(name)] = level

    sor_level = entries.pop("Sor", None)
    wiz_level = entries.pop("Wiz", None)
    if sor_level is not None and wiz_level is not None and sor_level == wiz_level:
        entries["Sor/Wiz"] = sor_level
    else:
        if sor_level is not None:
            entries["Sor"] = sor_level
        if wiz_level is not None:
            entries["Wiz"] = wiz_level

    for row in domains or []:
        name = str(row.get("name") or "").strip()
        level = row.get("level")
        if not name or not isinstance(level, int):
            continue
        entries[name] = level

    def sort_key(item: tuple[str, int]) -> tuple[int, int, str]:
        label, level = item
        return (CLASS_SORT_ORDER.get(label, 1000), level, label)

    parts = [f"{label} {level}" for label, level in sorted(entries.items(), key=sort_key)]
    return ", ".join(parts)


def first_sentence(text: str | None) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"\s+", " ", text.strip())
    match = re.split(r"(?<=[.!?])\s+", cleaned, maxsplit=1)
    return match[0] if match else cleaned


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


def min_spell_level(classes: list[dict] | None, domains: list[dict] | None) -> int | None:
    levels: list[int] = []
    for row in (classes or []) + (domains or []):
        level = row.get("level")
        if isinstance(level, int):
            levels.append(level)
    return min(levels) if levels else None


def descriptor_tokens(
    descriptors: list[str] | None,
    school: str | None,
    min_level: int | None,
) -> str:
    tags: list[str] = []

    for descriptor in descriptors or []:
        key = descriptor.strip().lower()
        mapped = DESCRIPTOR_TAGS.get(key)
        if mapped and mapped not in tags:
            tags.append(mapped)

    _, subschool = parse_spell_school(school)
    if subschool:
        mapped = SCHOOL_SUBSCHOOL_TAGS.get(subschool.strip().lower())
        if mapped and mapped not in tags:
            tags.append(mapped)

    if min_level is not None and 0 <= min_level < len(LEVEL_WORDS):
        level_tag = LEVEL_WORDS[min_level]
        if level_tag not in tags:
            tags.append(level_tag)

    if not tags:
        return ""
    return "; ".join(tags) + "; "


def effect_line(spell: dict) -> str:
    for key in ("area", "target", "effect"):
        value = spell.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def spell_source_abbrev(spell: dict) -> str:
    source = spell.get("source") or {}
    index = spell.get("index") or {}
    return str(source.get("abbrev") or index.get("source_abbrev") or "")


def map_scraped_spell(spell: dict) -> dict:
    school = spell.get("school")
    descriptors = spell.get("descriptors") or []
    classes = spell.get("classes") or []
    domains = spell.get("domains") or []
    min_level = min_spell_level(classes, domains)
    saving_throw = spell.get("saving_throw")
    spell_resistance = spell.get("spell_resistance")
    index = spell.get("index") or {}

    short = str(index.get("description_snippet") or "").strip()
    if not short:
        short = first_sentence(spell.get("description_text"))

    return {
        "name": str(spell.get("name") or "").strip(),
        "schoolShort": school_short(school),
        "schoolFull": append_descriptors(school, descriptors),
        "levelStr": build_level_str(classes, domains),
        "castingTime": str(spell.get("casting_time") or "").strip(),
        "components": str(spell.get("components") or "").strip(),
        "range": str(spell.get("range") or "").strip(),
        "area": effect_line(spell),
        "duration": str(spell.get("duration") or "").strip(),
        "save": str(saving_throw or "None").strip() or "None",
        "sr": str(spell_resistance or "No").strip() or "No",
        "short": short,
        "description": str(spell.get("description_text") or "").strip(),
        "othertags": descriptor_tokens(descriptors, school, min_level),
        "srNotAllowed": sr_not_allowed(spell_resistance),
        "savetype": parse_savetype(saving_throw),
    }


def has_automation(entry: dict) -> bool:
    return bool(entry.get("action2") or entry.get("actions"))


def merge_scrape_metadata(existing: dict, scrape: dict) -> dict:
    """Fill missing metadata from scrape without clobbering automation."""
    out = dict(existing)
    for key, value in scrape.items():
        if key in AUTOMATION_FIELDS:
            continue
        if key not in out or not out.get(key):
            out[key] = value
    return out


def merge_mod_entry(existing: dict, mod: dict) -> dict:
    """Mod wins metadata; mod wins automation when present."""
    out = {**existing, **mod}
    if has_automation(mod):
        return out
    for field in AUTOMATION_FIELDS:
        if existing.get(field):
            out[field] = existing[field]
    return out


def load_scraped_entries() -> dict[str, dict]:
    spells = json.loads(SPELLS_JSON.read_text(encoding="utf-8"))
    filtered = [
        spell
        for spell in spells
        if spell_source_abbrev(spell) in SOURCE_PRIORITY
    ]
    filtered.sort(
        key=lambda spell: (
            SOURCE_PRIORITY[spell_source_abbrev(spell)],
            normalize_spell_key(str(spell.get("name") or "")),
        )
    )

    entries: dict[str, dict] = {}
    for spell in filtered:
        name = str(spell.get("name") or "").strip()
        if not name:
            continue
        key = normalize_spell_key(name)
        if key in entries:
            continue
        entries[key] = map_scraped_spell(spell)
    return entries


def main() -> None:
    from build_npc_spell_library_from_mods import DEFAULT_MODS_DIR, load_mod_spells

    existing: dict[str, dict] = {}
    if LIBRARY_JSON.exists():
        existing = json.loads(LIBRARY_JSON.read_text(encoding="utf-8"))

    library = dict(existing)
    scrape_entries = load_scraped_entries()
    mod_entries = load_mod_spells(DEFAULT_MODS_DIR)

    scrape_added = 0
    scrape_updated = 0
    for key, entry in scrape_entries.items():
        if key not in library:
            library[key] = entry
            scrape_added += 1
        else:
            before = library[key]
            library[key] = merge_scrape_metadata(library[key], entry)
            if library[key] != before:
                scrape_updated += 1

    mod_added = 0
    mod_updated = 0
    for key, entry in mod_entries.items():
        if key not in library:
            library[key] = entry
            mod_added += 1
        else:
            before = library[key]
            library[key] = merge_mod_entry(library[key], entry)
            if library[key] != before:
                mod_updated += 1

    ordered = dict(sorted(library.items(), key=lambda item: item[0]))
    action_count = sum(1 for entry in ordered.values() if has_automation(entry))

    LIBRARY_JSON.parent.mkdir(parents=True, exist_ok=True)
    LIBRARY_JSON.write_text(
        json.dumps(ordered, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"Starting entries: {len(existing)}")
    print(f"Scrape added: {scrape_added}")
    print(f"Scrape metadata updated: {scrape_updated}")
    print(f"Mod added: {mod_added}")
    print(f"Mod updated: {mod_updated}")
    print(f"With automation: {action_count}")
    print(f"Final library size: {len(ordered)}")
    print(f"Wrote {LIBRARY_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
