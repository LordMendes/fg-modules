#!/usr/bin/env python3
"""Extract WoW RPG Core Rules and Alliance Player's Guide into supplemental JSON.

Reads only the bookmarked mechanical chapters (races, classes, feats, gear).
Does not read skills, combat, spells, history, creatures, or adventures.

    python scripts/extract-wowrpg.py
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
PDF_DIR = REPO
OUT_DIR = ROOT / "data" / "dndtools" / "supplemental"
NOW = "2026-10-02T00:00:00Z"

EDITION = "WoW RPG (3.5)"

CORE_SOURCE = "World of Warcraft: The Roleplaying Game"
APG_SOURCE = "World of Warcraft: Alliance Player's Guide"
HPG_SOURCE = "World of Warcraft: Horde Player's Guide"

ABILITY_TO_FG = {
    "str": "Str",
    "strength": "Str",
    "agy": "Dex",
    "agility": "Dex",
    "dex": "Dex",
    "dexterity": "Dex",
    "sta": "Con",
    "stamina": "Con",
    "con": "Con",
    "constitution": "Con",
    "int": "Int",
    "intellect": "Int",
    "intelligence": "Int",
    "spt": "Wis",
    "spi": "Wis",
    "spirit": "Wis",
    "wis": "Wis",
    "wisdom": "Wis",
    "cha": "Cha",
    "charisma": "Cha",
}

CORE_BASE = [
    "Arcanist",
    "Barbarian",
    "Healer",
    "Hunter",
    "Paladin",
    "Rogue",
    "Scout",
    "Tinker",
    "Warrior",
]
CORE_PRESTIGE = [
    "Archmage of Kirin Tor",
    "Assassin",
    "Beastmaster",
    "Berserker",
    "Duelist",
    "Elven Ranger",
    "Fel-Sworn",
    "Gladiator",
    "Infiltrator",
    "Mounted Warrior",
]
APG_PRESTIGE = [
    "Ace",
    "Dead Shot",
    "Demon Hunter",
    "Exemplar",
    "Gunman",
    "Mountain King",
    "Sapper",
    "Savagekin",
    "Sister of Steel",
    "Ursa Totemic",
    "Warden",
    "Windwarrior",
]
APG_VARIANTS = [
    ("Lone Druid", "d8", "4"),
    ("Druid of the Claw", "d8", "4"),
    ("Druid of the Fang", "d8", "4"),
    ("Druid of the Talon", "d8", "4"),
    ("Focused Mage", "d6", "2"),
    ("Auradin", "d10", "2"),
    ("Furbolg Shaman", "d8", "4"),
    ("Gnome Tinker", "d6", "8"),
    ("High Elf Mage", "d6", "2"),
    ("Human Mage", "d6", "2"),
    ("Human Paladin", "d10", "2"),
    ("Dwarf Sharpshooter", "d10", "2"),
    ("Night Elf Druid", "d8", "4"),
    ("Wildhammer Barbarian", "d12", "4"),
]
APG_CREATURES = [
    "Ancient Protector",
    "Dryad",
    "Keeper of the Grove",
    "Mountain Giant",
]

CORE_RACES = [
    ("ironforge-dwarf", "Ironforge Dwarf", "Humanoid (dwarf)", ("IRONFORGE", "DWARF, IRONFORGE")),
    ("high-elf", "High Elf", "Humanoid (elf)", ("HIGH ELF", "ELF, HIGH")),
    ("night-elf", "Night Elf", "Humanoid (elf)", ("NIGHT ELF", "ELF, NIGHT")),
    ("gnome", "Gnome", "Humanoid (gnome)", ("GNOME",)),
    ("goblin", "Goblin", "Humanoid (goblin)", ("GOBLIN",)),
    ("human", "Human", "Humanoid (human)", ("HUMAN",)),
    ("orc", "Orc", "Humanoid (orc)", ("ORC",)),
    ("tauren", "Tauren", "Humanoid (tauren)", ("TAUREN",)),
    ("jungle-troll", "Jungle Troll", "Humanoid (troll)", ("JUNGLE TROLL", "TROLL, JUNGLE")),
    ("forsaken", "Forsaken", "Undead (Forsaken)", ("FORSAKEN", "UNDEAD, FORSAKEN")),
]
# Core races that may have a racial level table (Human/Orc have none; Gnome/Goblin warn).
CORE_RACIAL_CLASS_RACES = [
    "Ironforge Dwarf",
    "High Elf",
    "Night Elf",
    "Gnome",
    "Goblin",
    "Tauren",
    "Jungle Troll",
    "Forsaken",
]
CORE_RACIAL_CLASS_EXPECTED = [
    "Ironforge Dwarf",
    "High Elf",
    "Night Elf",
    "Tauren",
    "Jungle Troll",
    "Forsaken",
]
APG_RACES = [
    ("wildhammer-dwarf", "Wildhammer Dwarf", "Humanoid (dwarf)", ("WILDHAMMER",)),
    ("furbolg", "Furbolg", "Humanoid (furbolg)", ("FURBOLG",)),
    ("half-elf", "Half-Elf", "Humanoid (elf)", ("HALF-ELF", "HALF ELF", "HALF- ELF")),
]
APG_RACIAL_CLASS_RACES = [
    "Wildhammer Dwarf",
    "Furbolg",
]
HPG_RACES = [
    ("half-ogre", "Half-Ogre", "Humanoid (orc)", ("HALF-OGRE", "HALF OGRE")),
    ("half-orc", "Half-Orc", "Humanoid (orc)", ("HALF-ORC", "HALF ORC")),
    ("forest-troll", "Forest Troll", "Humanoid (troll)", ("FOREST TROLL",)),
]
HPG_RACIAL_CLASS_RACES = [
    "Half-Ogre",
]
HPG_RACIAL = ["Orc Racial Class"]
HPG_VARIANTS = [
    ("Melee Hunter", "d8", "4"),
    ("Wandering Hunter", "d8", "4"),
    ("Uncorrupted Necromancer", "d6", "2"),
    ("Battle Shaman", "d8", "4"),
    ("Far Seer", "d8", "4"),
    ("Hidden Warlock", "d6", "2"),
    ("Forsaken Apothecary", "d8", "4"),
    ("Jungle Troll Witch Doctor", "d8", "4"),
    ("Half-ogre Hunter", "d8", "4"),
    ("Orc Warrior", "d10", "2"),
    ("Tauren Shaman", "d8", "4"),
    ("Troll Barbarian", "d12", "4"),
]
HPG_CREATURES = [
    "Abomination",
    "Centaur",
    "Ogre",
    "Ogre Mage",
]
HPG_PRESTIGE = [
    "Bone Crusher",
    "Dark Ranger",
    "Hexer",
    "Lightslayer",
    "Plagueshifter",
    "Potion Doc",
    "Primal",
    "Pyremaster",
    "Shadow Ascendant",
    "Shadow Hunter",
    "Spirit Champion",
    "Spirit Walker",
    "Spymaster",
    "Techslayer",
    "Wilderness Stalker",
]

FEATURE_SKIP = {
    "hit die",
    "class skills",
    "skill points at 1st level",
    "skill points at each additional level",
    "description",
    "affiliation",
    "abilities",
    "alignment",
    "requirements",
    "skills",
    "feats",
    "feat",
    "special",
    "table",
    "level",
    "base attack bonus",
    "fort save",
    "ref save",
    "will save",
    "class level",
}

ROW_RE = re.compile(
    r"^(?P<level>\d+)(?:st|nd|rd|th)\s+"
    r"(?P<bab>\+\d+(?:/\+\d+)*)\s+"
    r"(?P<fort>\+\d+)\s+"
    r"(?P<ref>\+\d+)\s+"
    r"(?P<will>\+\d+)\s+"
    r"(?P<rest>.+)$"
)
CREATURE_ROW_RE = re.compile(
    r"^(?P<level>\d+)(?:st|nd|rd|th)\s+"
    r"\d+d\d+\s+"
    r"(?P<bab>\+\d+(?:/\+\d+)*)\s+"
    r"\d+\s+"
    r"(?P<fort>\+\d+)\s+"
    r"(?P<ref>\+\d+)\s+"
    r"(?P<will>\+\d+)\s+"
    r"(?P<rest>.+)$"
)
SPELL_BUMP_RE = re.compile(r"(\+1 level of existing .+)$", re.I)
HIT_DIE_RE = re.compile(r"Hit Die:\s*d(\d+)", re.I)
SKILL_POINTS_RE = re.compile(
    r"Skill Points at Each Additional Level:\s*(\d+)\s*\+\s*Int",
    re.I,
)
CLASS_SKILLS_RE = re.compile(
    r"class\s+skills\s+\(and\s+the\s+key\s+ability\s+for\s+each(?:\s+skill)?\)\s+are\s+([^.]{8,500})\.",
    re.I | re.S,
)
FEATURE_START_RE = re.compile(
    r"^(?:•\s*)?([A-Z][^:\n]{1,70}?)(?:\s*\((Ex|Su|Sp)\))?\s*:\s*(.*)$"
)
PATH_RE = re.compile(
    r"^(Mage|Necromancer|Warlock|Druid|Priest|Shaman)\s*\([A-Za-z]{2,5}\)$"
)
FEAT_TYPE_RE = re.compile(r"^\[([^\]]+)\]$")
REQ_LINE_RE = re.compile(
    r"^(Prerequisite|Prerequisites|B\s*enefits?|Normal|Special)\s*:\s*(.*)$",
    re.I,
)
INLINE_SECTION_RE = re.compile(
    r"\b(B\s*enefits?|Normals?|Specials?|Prerequisites?)\s*:\s*",
    re.I,
)


def feat_mode_from_label(label: str) -> str:
    compact = re.sub(r"\s+", "", label.casefold())
    if compact.startswith("prereq"):
        return "prerequisite"
    if compact.startswith("benefit"):
        return "benefit"
    if compact.startswith("normal"):
        return "normal"
    if compact.startswith("special"):
        return "special"
    return compact


def split_feat_section_chunks(text: str, default_mode: str) -> dict[str, str]:
    """Peel Benefit/Normal/Special labels that were glued onto another field."""
    if not text:
        return {}
    matches = list(INLINE_SECTION_RE.finditer(text))
    if not matches:
        return {default_mode: text}
    chunks: dict[str, str] = {}
    head = text[: matches[0].start()].strip()
    if head:
        chunks[default_mode] = head
    for index, match in enumerate(matches):
        dest = feat_mode_from_label(match.group(1))
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[match.end() : end].strip()
        if not body:
            continue
        chunks[dest] = f"{chunks[dest]} {body}".strip() if dest in chunks else body
    return chunks


def merge_feat_section_chunks(current: dict, chunks: dict[str, str]) -> str:
    last_mode = ""
    for mode, body in chunks.items():
        existing = current.get(mode) or ""
        current[mode] = f"{existing} {body}".strip() if existing else body
        last_mode = mode
    return last_mode


def normalize(text: str) -> str:
    text = text.replace("\u00ad", "")
    text = re.sub(r"\ufb01\s*", "fi", text)
    text = re.sub(r"\ufb02\s*", "fl", text)
    text = (
        text.replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u2212", "-")
        .replace("\u2022", "•")
    )
    replacements = (
        (r"\bT able\b", "Table"),
        (r"\bW eapon", "Weapon"),
        (r"\bY ou\b", "You"),
        (r"\bT o\b", "To"),
        (r"\bT rap\b", "Trap"),
        (r"\bT umble\b", "Tumble"),
        (r"\bT auren\b", "Tauren"),
        (r"\bT aur\b", "Taur"),
        (r"\bT rolls\b", "Trolls"),
        (r"\bAffi liation\b", "Affiliation"),
        (r"\bprofi cient\b", "proficient"),
        (r"\bProfi ciency\b", "Proficiency"),
        (r"\bProfi cient\b", "Proficient"),
        (r"\bmodifi er\b", "modifier"),
        (r"\bbenefit s\b", "benefits"),
        (r"\bBene fit\b", "Benefit"),
        (r"\bB enefit", "Benefit"),
    )
    for pattern, repl in replacements:
        text = re.sub(pattern, repl, text)
    return text


def is_letterspaced(line: str) -> bool:
    parts = line.split()
    if len(parts) < 3:
        return False
    singles = sum(1 for part in parts if len(part) == 1 and part.isalpha())
    return singles / len(parts) > 0.7


def is_chrome(line: str) -> bool:
    if not line:
        return False
    if line.isdigit():
        return True
    if is_letterspaced(line):
        return True
    upper = line.upper()
    if upper.startswith("CHAPTER "):
        return True
    if upper in {
        "FEAT DESCRIPTIONS",
        "TYPES OF FEATS",
        "WEAPONS",
        "ARMOR AND SHIELDS",
        "SPECIAL MATERIALS",
        "SAMPLE TECHNOLOGICAL DEVICES",
    }:
        return True
    if re.fullmatch(r"A L L I A N C E.*", line):
        return True
    return False


def collapse_doubled(line: str) -> str:
    if len(line) > 140 or ". " in line:
        return line
    compact = re.sub(r"[^A-Za-z0-9]", "", line)
    if len(compact) < 6 or len(compact) % 2 != 0:
        return line
    half = len(compact) // 2
    if compact[:half].lower() != compact[half:].lower():
        return line
    count = 0
    out: list[str] = []
    for ch in line:
        if ch.isalnum():
            if count >= half:
                break
            count += 1
        out.append(ch)
    collapsed = "".join(out).strip(" ,:-")
    return collapsed or line


def page_lines(reader: PdfReader, start: int, end: int) -> list[tuple[int, str]]:
    rows: list[tuple[int, str]] = []
    last = min(end, len(reader.pages))
    for idx in range(start, last):
        raw = normalize(reader.pages[idx].extract_text() or "")
        for line in raw.splitlines():
            text = collapse_doubled(line.strip())
            if is_chrome(text):
                continue
            rows.append((idx, text))
        rows.append((idx, ""))
    return rows


def joined(lines: list[tuple[int, str]]) -> str:
    return "\n".join(text for _, text in lines)


def esc(text: str) -> str:
    return html.escape(text, quote=False)


def paragraph(text: str) -> str:
    clean = re.sub(r"\s+", " ", text).strip()
    if not clean:
        return ""
    return f"<p>{esc(clean)}</p>"


def plain(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def slugify(name: str, suffix: str) -> str:
    base = name.lower().replace("'", "")
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return f"{base}-{suffix}"


def unique_slug(name: str, suffix: str, seen: set[str]) -> str:
    slug = slugify(name, suffix)
    if slug not in seen:
        seen.add(slug)
        return slug
    n = 2
    while f"{slug}-{n}" in seen:
        n += 1
    slug = f"{slug}-{n}"
    seen.add(slug)
    return slug


def skill_record(name: str, ability: str | None) -> dict:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().replace("'", "")).strip("-")
    return {
        "name": name,
        "slug": slug,
        "url": f"/skills/{slug}",
        "id": None,
        "ability": ability or "",
    }


def split_csv(text: str) -> list[str]:
    parts: list[str] = []
    buf: list[str] = []
    depth = 0
    for ch in text:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch == "," and depth == 0:
            parts.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
    tail = "".join(buf).strip()
    if tail:
        parts.append(tail)
    return [part for part in parts if part]


def parse_skills(blob: str) -> list[dict]:
    skills = []
    for token in split_csv(blob):
        token = token.strip().rstrip(".")
        token = re.sub(r"\s+", " ", token)
        if not token or token.lower().startswith("see chapter"):
            continue
        match = re.search(r"\(([A-Za-z]{2,12})\)\s*$", token)
        ability = None
        name = token
        if match and match.group(1).lower() in ABILITY_TO_FG:
            ability = ABILITY_TO_FG[match.group(1).lower()]
            name = token[: match.start()].strip()
        name = re.sub(r"\s+", " ", name).strip(" ,")
        if name:
            skills.append(skill_record(name, ability))
    return skills


def source_block(name: str, abbrev: str, page: int | None) -> dict:
    return {
        "name": name,
        "abbrev": abbrev,
        "edition": EDITION,
        "page": page,
        "url": None,
    }


def base_record(slug: str, name: str, book: str, abbrev: str, page: int | None) -> dict:
    return {
        "slug": slug,
        "name": name,
        "source_url": None,
        "scraped_at": NOW,
        "source": source_block(book, abbrev, page),
        "index": {"source_abbrev": abbrev, "edition": EDITION},
    }


def find_pdf(pattern: str) -> Path:
    matches = [path for path in PDF_DIR.glob("WOWRPG*.pdf") if pattern in path.name]
    if not matches:
        raise SystemExit(f"Missing PDF matching {pattern}")
    return matches[0]


def marker_hit(line: str, markers: tuple[str, ...]) -> bool:
    if not line or len(line) > 48:
        return False
    compact = re.sub(r"[^A-Z]", "", line.upper())
    if not compact:
        return False
    for marker in markers:
        target = re.sub(r"[^A-Z]", "", marker)
        if not target:
            continue
        if compact == target or compact == target + target:
            return True
        if target in compact and len(compact) <= len(target) + 10:
            return True
    return False


def bullets_from(text: str) -> list[str]:
    chunks = re.split(r"•\s*", text)
    items = []
    for chunk in chunks[1:]:
        chunk = re.sub(r"\s+", " ", chunk).strip(" -\n")
        chunk = re.split(
            r"\b(?:Vital Statistics|Chapter \w+|Appearance:|Region:|Faith:|Names:)\b",
            chunk,
        )[0].strip()
        if len(chunk) > 8:
            items.append(chunk)
    return items


def identify_race(
    chunk: str,
    catalog: list[tuple[str, str, str, tuple[str, ...]]],
    used: set[str],
) -> tuple[str, str, str] | None:
    head = chunk[:900].lower()
    hints = (
        (r"ironforge", "ironforge-dwarf"),
        (r"high el(?:f|ves)", "high-elf"),
        (r"night el(?:f|ves)", "night-elf"),
        (r"jungle troll", "jungle-troll"),
        (r"forsaken", "forsaken"),
        (r"wildhammer", "wildhammer-dwarf"),
        (r"half-elf|half elf", "half-elf"),
        (r"half-ogre|mok'nathal|moknathal", "half-ogre"),
        (r"half-orc", "half-orc"),
        (r"forest troll", "forest-troll"),
        (r"furbolg", "furbolg"),
        (r"\bgnomes?\b", "gnome"),
        (r"\bgoblins?\b", "goblin"),
        (r"\btauren\b", "tauren"),
        (r"\borcs?\b", "orc"),
        (r"\bhumans?\b", "human"),
    )
    for pattern, slug_base in hints:
        if slug_base in used or not re.search(pattern, head):
            continue
        for candidate, name, kind, _markers in catalog:
            if candidate == slug_base:
                return candidate, name, kind
    return None


def trait_items(chunk: str) -> list[str]:
    items = bullets_from(chunk)
    kept: list[str] = []
    for item in items:
        if re.match(r"(Male|Female|Family)\s+Names\b", item, re.I):
            break
        if re.match(r"(Description|Appearance|Region|Faith|Names)\s*:", item, re.I):
            break
        if re.search(r"Racial Traits\s*$", item, re.I):
            item = re.sub(r"\s*[A-Za-z' -]{0,40}Racial Traits\s*$", "", item).strip()
            if not item:
                continue
        kept.append(item)
    return kept


def extract_races(
    lines: list[tuple[int, str]],
    catalog: list[tuple[str, str, str, tuple[str, ...]]],
    abbrev: str,
    book: str,
    suffix: str,
) -> list[dict]:
    full = "\n".join(line for _, line in lines)
    page = lines[0][0] if lines else None
    chunks = re.split(r"(?:[A-Za-z' -]{0,40})Racial Traits", full, flags=re.I)
    records = []
    seen: set[str] = set()
    used_markers: set[str] = set()
    for chunk in chunks[1:]:
        items = trait_items(chunk)
        blob = " ".join(items)
        chosen = identify_race(blob[:800], catalog, used_markers)
        if not chosen:
            continue
        slug_base, name, kind = chosen
        if not re.search(r"\+\d|land speed|Medium:|Small:|Large:|None\b", blob, re.I):
            continue
        used_markers.add(slug_base)
        size = "Medium"
        for item in items:
            match = re.match(r"(Small|Medium|Large|Huge)\b", item)
            if match:
                size = match.group(1)
                break
        speed_match = re.search(
            r"(?:base )?land speed is (\d+) feet",
            blob,
            re.I,
        )
        speed = f"Land {speed_match.group(1)} ft." if speed_match else ""
        la_match = re.search(r"level adjustment\s*\+?\s*(\d+)", blob, re.I)
        level_adjustment = f"+{la_match.group(1)}" if la_match else None
        lang_match = re.search(
            r"Automatic Languages?:\s*([^.]+)",
            blob,
            re.I,
        )
        languages = plain(lang_match.group(1)) if lang_match else ""
        description = "<ul>" + "".join(f"<li>{esc(item)}</li>" for item in items) + "</ul>"
        slug = unique_slug(name, suffix, seen)
        record = base_record(slug, name, book, abbrev, page)
        record["index"]["level_adjustment"] = (level_adjustment or "").lstrip("+")
        record.update(
            {
                "size": size,
                "type": kind,
                "speed": speed,
                "level_adjustment": level_adjustment,
                "languages_html": languages,
                "languages_text": languages,
                "description_html": description,
                "description_text": plain(" ".join(items)),
            }
        )
        records.append(record)
    if abbrev == "WoW" and "forsaken" not in used_markers:
        match = re.search(r"Undead:\s*Forsaken are undead(.{200,8000})", full, re.S)
        if match:
            forsaken_items = trait_items("• Undead: Forsaken are undead" + match.group(1))
            blob = " ".join(forsaken_items)
            if forsaken_items and re.search(r"\+\d|land speed|undead", blob, re.I):
                size = "Medium"
                speed_match = re.search(r"(?:base )?land speed is (\d+) feet", blob, re.I)
                speed = f"Land {speed_match.group(1)} ft." if speed_match else "Land 30 ft."
                lang_match = re.search(r"Automatic Languages?:\s*([^.]+)", blob, re.I)
                languages = plain(lang_match.group(1)) if lang_match else ""
                description = "<ul>" + "".join(f"<li>{esc(item)}</li>" for item in forsaken_items) + "</ul>"
                slug = unique_slug("Forsaken", suffix, seen)
                record = base_record(slug, "Forsaken", book, abbrev, page)
                record["index"]["level_adjustment"] = ""
                record.update(
                    {
                        "size": size,
                        "type": "Undead (Forsaken)",
                        "speed": speed,
                        "level_adjustment": None,
                        "languages_html": languages,
                        "languages_text": languages,
                        "description_html": description,
                        "description_text": plain(blob),
                    }
                )
                records.append(record)
    if abbrev == "HPG" and "forest-troll" not in used_markers:
        # The book gives no separate trait list. Forest troll traits match jungle trolls,
        # except Zandali replaces Low Common.
        items = [
            "+2 Agility, -2 Intellect, -2 Charisma.",
            "Medium: As Medium creatures, forest trolls have no special bonuses or penalties due to their size.",
            "Forest troll base land speed is 30 feet.",
            "Low-Light Vision: Forest trolls can see twice as far as humans in starlight, moonlight, torchlight and similar conditions of poor illumination.",
            "Rapid Healing (Ex): Forest trolls heal twice as quickly as normal (they heal double the normal number of hit points after a period of rest).",
            "+1 racial bonus on attack rolls with thrown weapons.",
            "+2 racial bonus on Survival checks. Survival is a class skill for all forest troll characters.",
            "+2 racial bonus on Jump and Tumble checks. Jump and Tumble are class skills for all forest troll characters.",
            "Automatic Languages: Common and Zandali.",
            "Bonus Languages: Goblin, Orc and Taur-ahe.",
            "Racial Levels: Forest trolls can take levels in forest troll as a class to develop their racial qualities. These racial levels are identical to jungle troll racial levels.",
            "Favored Class: Barbarian.",
        ]
        description = "<ul>" + "".join(f"<li>{esc(item)}</li>" for item in items) + "</ul>"
        slug = unique_slug("Forest Troll", suffix, seen)
        record = base_record(slug, "Forest Troll", book, abbrev, page)
        record["index"]["level_adjustment"] = ""
        record.update(
            {
                "size": "Medium",
                "type": "Humanoid (troll)",
                "speed": "Land 30 ft.",
                "level_adjustment": None,
                "languages_html": "Common and Zandali",
                "languages_text": "Common and Zandali",
                "description_html": description,
                "description_text": plain(" ".join(items)),
            }
        )
        records.append(record)
    return records


def parse_advancement(lines: list[str]) -> list[dict]:
    rows = []
    for line in lines:
        stripped = line.strip()
        match = ROW_RE.match(stripped) or CREATURE_ROW_RE.match(stripped)
        if not match:
            continue
        rest = plain(match.group("rest"))
        bump = SPELL_BUMP_RE.search(rest)
        special = rest
        spellcasting = ""
        if bump:
            spellcasting = bump.group(1).strip()
            special = rest[: bump.start()].strip(" -")
        row = {
            "level": int(match.group("level")),
            "bab": match.group("bab"),
            "fort": match.group("fort"),
            "ref": match.group("ref"),
            "will": match.group("will"),
            "special": special or "-",
        }
        if spellcasting:
            row["spellcasting"] = spellcasting
        rows.append(row)
    # Drop obvious false positives (duplicate level 1 from unrelated tables).
    cleaned = []
    seen_levels: set[int] = set()
    for row in rows:
        level = row["level"]
        if level in seen_levels or level > 20:
            continue
        if cleaned and level < cleaned[-1]["level"]:
            break
        seen_levels.add(level)
        cleaned.append(row)
    return cleaned


def advancement_table(rows: list[dict]) -> str:
    if not rows:
        return ""
    has_spells = any(row.get("spellcasting") for row in rows)
    headers = ["Level", "BAB", "Fort", "Ref", "Will", "Special"]
    if has_spells:
        headers.append("Spells")
    head = "".join(f"<th>{esc(header)}</th>" for header in headers)
    body = []
    for row in rows:
        cells = [
            f"{row['level']}",
            row["bab"],
            row["fort"],
            row["ref"],
            row["will"],
            row.get("special") or "-",
        ]
        if has_spells:
            cells.append(row.get("spellcasting") or "")
        body.append("<tr>" + "".join(f"<td>{esc(cell)}</td>" for cell in cells) + "</tr>")
    return (
        "<table><thead><tr>"
        + head
        + "</tr></thead><tbody>"
        + "".join(body)
        + "</tbody></table>"
    )


def parse_features(text: str) -> list[tuple[str, str, str]]:
    features: list[tuple[str, str, str]] = []
    current: tuple[str, str, list[str]] | None = None

    def flush() -> None:
        nonlocal current
        if not current:
            return
        name, kind, bits = current
        body = plain(" ".join(bits))
        if body or kind:
            features.append((name, kind, body))
        current = None

    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            if current:
                current[2].append(" ")
            continue
        if PATH_RE.match(line):
            flush()
            current = (PATH_RE.match(line).group(1), "", [])
            continue
        match = FEATURE_START_RE.match(line)
        if match:
            label = plain(match.group(1))
            key = label.lower().rstrip(":")
            kind = match.group(2) or ""
            rest = match.group(3) or ""
            allowed = bool(kind) or key in {
                "weapon and armor proficiency",
                "weapon proficiency",
                "armor proficiency",
                "bonus weapon proficiency",
                "spells",
                "spell-like abilities",
                "size increase",
                "arcana",
                "illiteracy",
                "bonus feats",
                "track",
            }
            if allowed and key not in FEATURE_SKIP and len(label) < 60:
                flush()
                current = (label, kind, [rest] if rest else [])
                continue
        if current:
            if line.lower().startswith("starting package") or "starting package" in line.lower():
                flush()
                continue
            current[2].append(line)
    flush()
    return features


def features_html(features: list[tuple[str, str, str]]) -> str:
    parts = []
    for name, kind, body in features:
        label = f"{name} ({kind})" if kind else name
        parts.append(f"<p><strong>{esc(label)}:</strong> {esc(body)}</p>")
    return "".join(parts)


def is_name_header(line: str) -> bool:
    if not line or len(line) > 40 or ". " in line:
        return False
    compact = re.sub(r"[^A-Z]", "", line.upper())
    names = (
        CORE_BASE
        + CORE_PRESTIGE
        + APG_PRESTIGE
        + APG_CREATURES
        + HPG_RACIAL
        + HPG_PRESTIGE
        + HPG_CREATURES
    )
    targets = {re.sub(r"[^A-Z]", "", name.upper()) for name in names}
    return compact in targets


def strip_name_headers(text: str) -> str:
    return "\n".join(line for line in text.splitlines() if not is_name_header(line))


def class_record(
    name: str,
    text: str,
    lines: list[str],
    *,
    book: str,
    abbrev: str,
    suffix: str,
    page: int | None,
    prestige: bool,
    seen: set[str],
    hit_die: str = "",
    skill_points: str = "",
) -> dict | None:
    text = strip_name_headers(text)
    lines = [line for line in lines if not is_name_header(line)]
    die = HIT_DIE_RE.search(text)
    points = SKILL_POINTS_RE.search(text)
    hd = f"d{die.group(1)}" if die else hit_die
    sp = points.group(1) if points else skill_points
    skills_match = CLASS_SKILLS_RE.search(text)
    skills = parse_skills(skills_match.group(1)) if skills_match else []
    rows = parse_advancement(lines)
    full_class = name in set(
        CORE_BASE
        + CORE_PRESTIGE
        + APG_PRESTIGE
        + APG_CREATURES
        + HPG_RACIAL
        + HPG_PRESTIGE
        + HPG_CREATURES
    )
    owns_table = any("table" in line.lower() and name.lower() in line.lower() for line in lines)
    if not full_class and not owns_table:
        rows = []
    req_match = re.search(
        r"\bRequirements\b\s*(.+?)(?:\bClass Skills\b|\bClass Features\b|\bTable\s+\d)",
        text,
        re.S | re.I,
    )
    requirements = plain(req_match.group(1)) if req_match else ""
    requirements = re.sub(r"^(Hit Die:.*)$", "", requirements, flags=re.I).strip()
    if requirements.lower().startswith("to qualify"):
        requirements = plain(requirements)
    feature_text = text
    cut = re.search(r"\bClass Features\b", text)
    if cut:
        feature_text = text[cut.end() :]
    features = parse_features(feature_text)
    intro_match = re.search(r"Description:\s*(.+?)(?:Hit Die:|Requirements\b|Class Skills)", text, re.S | re.I)
    intro = plain(intro_match.group(1)) if intro_match else ""
    if not intro:
        intro = plain(text[:500])
        intro = re.split(r"Hit Die:", intro)[0].strip()
    if len(intro) > 700:
        intro = intro[:700].rsplit(" ", 1)[0]
    html_parts = []
    if intro:
        html_parts.append(paragraph(intro))
    html_parts.append(features_html(features))
    description = "".join(html_parts)
    if not hd and not rows and not features and not requirements:
        return None
    slug = unique_slug(name, suffix, seen)
    record = base_record(slug, name, book, abbrev, page)
    record["index"].update(
        {
            "hit_die": hd[1:] if hd.startswith("d") else hd,
            "skill_points": sp,
            "prestige_level": str(len(rows) or 10) if prestige else "",
        }
    )
    record.update(
        {
            "hit_die": hd,
            "skill_points": f"{sp} + Int" if sp else "",
            "class_skills": skills,
            "description_html": description,
            "description_text": plain(re.sub(r"<[^>]+>", " ", description)),
            "requirements_html": paragraph(requirements) if requirements else None,
            "requirements_text": requirements or None,
            "advancement": rows,
            "advancement_html": advancement_table(rows),
            "advancement_text": plain(
                " ".join(
                    f"{row['level']} {row['bab']} {row['fort']} {row['ref']} {row['will']} {row['special']}"
                    for row in rows
                )
            ),
        }
    )
    return record


def slice_by_markers(lines: list[tuple[int, str]], names: list[str]) -> list[tuple[str, int, str, list[str]]]:
    indexes: list[tuple[int, str, int]] = []
    folded = [(re.sub(r"[^A-Z]", "", name.upper()), name) for name in names]
    seen_names: set[str] = set()
    for index, (page, line) in enumerate(lines):
        if not line or len(line) > 80:
            continue
        compact = re.sub(r"[^A-Z]", "", line.upper())
        for target, name in folded:
            if name in seen_names:
                continue
            if compact == target or compact == target + target:
                indexes.append((index, name, page))
                seen_names.add(name)
                break
    chunks = []
    for nth, (index, name, page) in enumerate(indexes):
        end = indexes[nth + 1][0] if nth + 1 < len(indexes) else len(lines)
        if nth and indexes[nth - 1][1] == name and index - indexes[nth - 1][0] < 8:
            continue
        start = index
        prev = indexes[nth - 1][0] if nth else 0
        for back in range(index - 1, max(prev, index - 120) - 1, -1):
            earlier = lines[back][1]
            if "table" in earlier.lower() and name.lower() in earlier.lower():
                start = back
                page = lines[back][0]
                break
        body_lines = [text for _, text in lines[start:end]]
        chunks.append((name, page, "\n".join(body_lines), body_lines))
    return chunks


def extract_named_classes(
    lines: list[tuple[int, str]],
    names: list[str],
    *,
    book: str,
    abbrev: str,
    suffix: str,
    prestige: bool,
    seen: set[str],
) -> list[dict]:
    records = []
    for name, page, text, body_lines in slice_by_markers(lines, names):
        record = class_record(
            name,
            text,
            body_lines,
            book=book,
            abbrev=abbrev,
            suffix=suffix,
            page=page,
            prestige=prestige,
            seen=seen,
        )
        if record:
            records.append(record)
    return records


def _racial_class_skills(text: str) -> list:
    match = CLASS_SKILLS_RE.search(text)
    if match:
        return parse_skills(match.group(1))
    quoted = re.search(
        r'(?:"Class"\s+Skills|Class Skills)\s*:\s*(.+?)(?:\.\s*See|\.\s*Weapon and Armor|\.\s*Hit Die|$)',
        text,
        re.I | re.S,
    )
    if quoted:
        return parse_skills(quoted.group(1))
    return []


def trim_racial_advancement(rows: list[dict]) -> list[dict]:
    """Keep the contiguous racial table (levels 1..N, usually N=3)."""
    cleaned: list[dict] = []
    for row in rows:
        level = int(row.get("level") or 0)
        if level < 1 or level > 3:
            break
        if cleaned and level != cleaned[-1]["level"] + 1:
            break
        cleaned.append(row)
    return cleaned


_RACIAL_ABILITY_WORD = (
    r"(?:Strength|Agility|Stamina|Intellect|Spirit|Charisma|"
    r"Str|Agy|Sta|Int|Spt|Cha|Dexterity|Constitution|Intelligence|Wisdom)"
)
_RACIAL_STOP_LINE = re.compile(
    r"^(?:Table\s+[\d-]+:|[A-Za-z' -]+ Racial Traits|"
    r"[A-Za-z' -]+ Levels\s*$|Description:|Appearance:|Region:|Affiliation:|"
    r"Faith:|Names:|Hit Die:)",
    re.I,
)
_RACIAL_ALLCAPS_STOP = re.compile(r"^[A-Z][A-Z ,'-]{3,}$")


def clean_racial_special(special: str) -> str:
    """Drop narrative text that leaked past the Special column."""
    special = plain(special or "")
    special = re.split(
        r"\b(?:Appearance|Region|Description|Affiliation|Faith|Names)\s*:",
        special,
        maxsplit=1,
    )[0]
    special = re.split(
        r"\b(?:Rogno|The schism|These spells return|for using arcane magic)\b",
        special,
        maxsplit=1,
    )[0]
    special = re.sub(
        r"(bonus weapon proficiency)\b.*",
        r"\1",
        special,
        flags=re.I,
    )
    special = re.sub(r"(size increase)\b\s+[A-Z].*", r"\1", special, flags=re.I)
    special = re.sub(r"(increased Hit Die)\b.*", r"\1", special, flags=re.I)
    special = re.sub(r"\s+", " ", special).strip(" ,.;")
    if len(special) > 160:
        special = special[:160].rsplit(",", 1)[0].strip()
    return special


def parse_racial_advancement(lines: list[str]) -> list[dict]:
    """Parse racial tables and join wrapped Special-column text."""
    rows: list[dict] = []
    current: dict | None = None
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        match = ROW_RE.match(stripped) or CREATURE_ROW_RE.match(stripped)
        if match:
            if current:
                current["special"] = clean_racial_special(current.get("special") or "")
                rows.append(current)
            rest = plain(match.group("rest"))
            bump = SPELL_BUMP_RE.search(rest)
            special = rest
            spellcasting = ""
            if bump:
                spellcasting = bump.group(1).strip()
                special = rest[: bump.start()].strip(" -")
            current = {
                "level": int(match.group("level")),
                "bab": match.group("bab"),
                "fort": match.group("fort"),
                "ref": match.group("ref"),
                "will": match.group("will"),
                "special": special or "-",
            }
            if spellcasting:
                current["spellcasting"] = spellcasting
            continue
        if not current:
            continue
        if _RACIAL_STOP_LINE.match(stripped) or _RACIAL_ALLCAPS_STOP.match(stripped):
            current["special"] = clean_racial_special(current.get("special") or "")
            rows.append(current)
            current = None
            continue
        special = current.get("special") or ""
        # Only join a wrapped Special cell when the previous line is clearly incomplete.
        if special.rstrip().endswith((",", "and", "or", "vs.", "vs")):
            current["special"] = plain(f"{special} {stripped}".strip())
    if current:
        current["special"] = clean_racial_special(current.get("special") or "")
        rows.append(current)
    return trim_racial_advancement(rows)


def racial_levels_slice(
    lines: list[tuple[int, str]], start: int, end: int, name: str
) -> tuple[list[str], int]:
    """Return body lines for one racial class and the page of the levels header."""
    levels_at = None
    table_at = None
    key = name.lower()
    for index in range(start, end):
        line = lines[index][1]
        low = line.lower()
        if levels_at is None and f"{key} levels" in low:
            levels_at = index
        if table_at is None and "table" in low and f"the {key}" in low:
            table_at = index
    # Table and "Levels" header can appear in either order in the PDF text.
    candidates = [index for index in (levels_at, table_at) if index is not None]
    begin = min(candidates) if candidates else start
    page = lines[begin][0] if begin < len(lines) else lines[start][0]
    def _section_stop(stripped: str, index: int) -> bool:
        low = stripped.lower()
        if _RACIAL_ALLCAPS_STOP.match(stripped):
            # Two-column pages often inject the next race header before this
            # race's Skill Points / feature prose finishes.
            for peek_index in range(index + 1, min(end, index + 12)):
                peek = lines[peek_index][1].strip()
                peek_l = peek.lower()
                if not peek:
                    continue
                if (
                    "skill points" in peek_l
                    or "class\" skills" in peek_l
                    or "class skills" in peek_l
                    or peek_l.startswith("weapon and armor")
                    or FEATURE_START_RE.match(peek)
                ):
                    return False
                if _RACIAL_ALLCAPS_STOP.match(peek):
                    break
            return True
        if re.search(r" racial traits\b", low):
            return True
        other_levels = re.match(r"^([A-Za-z' -]{2,40}) levels\s*$", stripped, re.I)
        if other_levels and other_levels.group(1).strip().lower() != key:
            return True
        if re.match(
            r"^(?:Appearance|Region|Description|Affiliation|Faith|Names)\s*:",
            stripped,
            re.I,
        ):
            return True
        return False

    body: list[str] = []
    rows_found = 0
    past_table = False
    index = begin
    while index < end:
        line = lines[index][1]
        stripped = line.strip()
        if rows_found >= 3 and stripped and _section_stop(stripped, index):
            break
        # Skip injected next-race all-caps headers inside this race's block.
        if rows_found >= 3 and _RACIAL_ALLCAPS_STOP.match(stripped):
            index += 1
            continue
        body.append(line)
        if ROW_RE.match(stripped) or CREATURE_ROW_RE.match(stripped):
            rows_found += 1
            past_table = True
            index += 1
            continue
        if past_table and rows_found >= 3 and stripped:
            prev = body[-2].rstrip() if len(body) >= 2 else ""
            # Keep Special wraps, then keep post-table feature prose.
            if prev.endswith((",", "and", "or", "vs.", "vs")):
                index += 1
                continue
            if FEATURE_START_RE.match(stripped) or (
                body
                and FEATURE_START_RE.match((body[-2] if len(body) >= 2 else "").strip())
            ):
                index += 1
                continue
            # Continuation of a feature paragraph started above.
            if body and not ROW_RE.match(stripped) and not stripped.lower().startswith(
                "table "
            ):
                # Stop once narrative / next race begins.
                if _section_stop(stripped, index) or (
                    stripped[:1].isupper()
                    and re.match(r"^[A-Z][a-z]+(?:\s+[a-z]+){4,}", stripped)
                    and not FEATURE_START_RE.match(stripped)
                ):
                    body.pop()
                    break
                index += 1
                continue
            body.pop()
            break
        index += 1
    return body, page


def _feature_dict(level: int, name: str, kind: str, body: str) -> dict:
    label = f"{name} ({kind})" if kind else name
    text = body.strip() or name
    return {
        "level": level,
        "name": name,
        "type": kind or "",
        "text": f"{label}: {text}" if kind else text,
        "text_html": f"<p><strong>{esc(label)}:</strong> {esc(text)}</p>",
    }


def _norm_feature_key(name: str) -> str:
    text = re.sub(r"\s*\([^)]*\)", "", (name or "").lower())
    text = re.sub(r"^(improved|increased)\s+", "", text)
    text = re.sub(r"\s+", " ", text).strip(" :")
    return text


def build_racial_class_features(
    rows: list[dict],
    prose: list[tuple[str, str, str]],
    race_name: str,
) -> list[dict]:
    """One class ability per Special entry, using prose when the name matches."""
    features: list[dict] = []
    seen: set[tuple[int, str]] = set()

    for name, kind, body in prose:
        key = name.lower().rstrip(":")
        body = plain(body)
        body = re.split(r"\bTable\s+[\d-]+:", body, maxsplit=1)[0].strip()
        if key in {"weapon and armor proficiency", "weapon proficiency", "armor proficiency"}:
            if len(body) < 20:
                body = (
                    f"Proficient with the weapons and armor listed for {race_name} "
                    f"racial levels."
                )
            feat = _feature_dict(1, name, kind, body)
            features.append(feat)
            seen.add((1, name.lower()))

    for row in rows:
        level = int(row.get("level") or 1)
        special = clean_racial_special(row.get("special") or "")
        if not special or special == "-":
            continue
        parts = [part.strip() for part in re.split(r"\s*,\s*", special) if part.strip()]
        for part in parts:
            if len(part) < 2:
                continue
            part_l = part.lower()
            # High Elf spell-like abilities are represented by the Spells ability.
            if race_name == "High Elf" and "spell-like" in part_l:
                continue
            matched: tuple[str, str, str] | None = None
            part_key = _norm_feature_key(part)
            for pname, kind, body in prose:
                pl = _norm_feature_key(pname)
                if not pl:
                    continue
                if pl == part_key or pl in part_l or part_key in pl:
                    matched = (pname, kind, body)
                    break
            if matched:
                pname, kind, body = matched
                if race_name == "High Elf" and "spell-like" in pname.lower():
                    continue
                key = (level, pname.lower())
                if key in seen:
                    continue
                features.append(_feature_dict(level, pname, kind, body))
                seen.add(key)
                continue
            key = (level, part_l)
            if key in seen:
                continue
            features.append(
                {
                    "level": level,
                    "name": part,
                    "type": "",
                    "text": part,
                    "text_html": f"<p>{esc(part)}</p>",
                    "source": "advancement",
                }
            )
            seen.add(key)

    if race_name == "High Elf":
        spells_text = (
            "A high elf with an Intellect of 10 or higher can cast four 0-level spells "
            "chosen from the arcanist spell list each day as spell-like abilities. "
            "His caster level is that of a mage of his racial level. "
            "To cast a spell, a character must have an Intellect score equal to "
            "10 + the spell's level."
        )
        # Prefer the printed spell-like prose when present.
        for pname, kind, body in prose:
            if "spell-like" in pname.lower() and body:
                spells_text = (
                    f"{body.rstrip('. ')}. "
                    "To cast a spell, a character must have an Intellect score equal to "
                    "10 + the spell's level."
                )
                break
        features.insert(
            0,
            {
                "level": 1,
                "name": "Spells",
                "type": "",
                "text": spells_text,
                "text_html": f"<p><strong>Spells:</strong> {esc(spells_text)}</p>",
            },
        )

    features.sort(key=lambda feat: (feat.get("level", 0), feat.get("name", "")))
    return features


def _tag_racial_class(record: dict, race_name: str) -> dict:
    rows = trim_racial_advancement(record.get("advancement") or [])
    if rows:
        record["advancement"] = rows
        record["advancement_html"] = advancement_table(rows)
        record["advancement_text"] = plain(
            " ".join(
                f"{row['level']} {row['bab']} {row['fort']} {row['ref']} {row['will']} {row['special']}"
                for row in rows
            )
        )
    levelmax = max((int(row.get("level") or 0) for row in rows), default=3) or 3
    record["race"] = race_name
    record["levelmax"] = levelmax
    record["index"]["racial_class"] = True
    record["index"]["race"] = race_name
    record["index"]["levelmax"] = str(levelmax)
    record["index"]["prestige_level"] = ""
    return record


def extract_racial_classes(
    lines: list[tuple[int, str]],
    race_names: list[str],
    *,
    book: str,
    abbrev: str,
    suffix: str,
    seen: set[str],
) -> list[dict]:
    """Build optional racial level classes from race-chapter tables."""
    records = []
    hits: list[tuple[int, str, int]] = []
    seen_names: set[str] = set()
    for index, (page, line) in enumerate(lines):
        if not line:
            continue
        low = line.lower()
        for name in race_names:
            if name in seen_names:
                continue
            key = name.lower()
            if f"{key} levels" in low or (
                "table" in low and f"the {key}" in low
            ):
                hits.append((index, name, page))
                seen_names.add(name)
                break
    for nth, (index, name, page) in enumerate(hits):
        end = hits[nth + 1][0] if nth + 1 < len(hits) else len(lines)
        # Look back far enough that a table printed above the Levels header is included.
        start = max(0, index - 60)
        if nth:
            start = max(start, hits[nth - 1][0] + 1)
        body, page = racial_levels_slice(lines, start, end, name)
        text = "\n".join(body)
        if not re.search(r"\b1st\b.+\+\d", text, re.I):
            print(f"  WARN racial class missing table rows: {name}")
            continue
        die = HIT_DIE_RE.search(text)
        points = SKILL_POINTS_RE.search(text)
        hd = f"d{die.group(1)}" if die else "d8"
        sp = points.group(1) if points else "2"
        rows = parse_racial_advancement(body)
        if not rows:
            print(f"  WARN racial class unparsed advancement: {name}")
            continue
        # Feature prose can sit above or below the table; omit the table rows themselves.
        prose_lines = []
        for line in body:
            stripped = line.strip()
            if ROW_RE.match(stripped) or CREATURE_ROW_RE.match(stripped):
                continue
            if re.match(r"^Table\s+[\d-]+:", stripped, re.I):
                continue
            if re.match(r"^(?:[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+Base Attack\b", stripped):
                continue
            if re.match(r"^(?:Dwarf|Elf|Troll|Level)\s+Bonus\b", stripped):
                continue
            prose_lines.append(line)
        prose_text = "\n".join(prose_lines)
        features_prose = parse_features(prose_text)
        # Drop table crumbs that leaked into a feature body.
        cleaned_prose: list[tuple[str, str, str]] = []
        for fname, kind, body in features_prose:
            body = re.split(r"\bTable\s+[\d-]+:", body, maxsplit=1)[0].strip()
            body = re.split(rf"\b{re.escape(name)}\b.*Base Attack", body, maxsplit=1)[0].strip()
            if body or kind:
                cleaned_prose.append((fname, kind, body))
        skills = _racial_class_skills(prose_text)
        intro_m = re.search(
            rf"{re.escape(name)}\s+Levels\s*(.+?)(?:Hit Die:|Skill Points|Weapon and Armor|\"Class\" Skills|Class Skills|Starting Gold)",
            text,
            re.I | re.S,
        )
        if intro_m:
            intro = plain(intro_m.group(1))
        else:
            intro = f"{name} characters can take up to three levels in \"{name.lower()}\" as a racial class."
        intro = re.split(r"\bTable\s+[\d-]+:", intro, maxsplit=1)[0].strip()
        intro = re.split(
            r"\b(?:Appearance|Region|Description|The Problem of Evil)\b",
            intro,
            maxsplit=1,
        )[0].strip()
        if len(intro) > 700:
            intro = intro[:700].rsplit(" ", 1)[0]
        if len(intro) < 20:
            intro = f"{name} characters can take up to three levels in \"{name.lower()}\" as a racial class."
        class_features = build_racial_class_features(rows, cleaned_prose, name)
        html_parts = [paragraph(intro)]
        for feat in class_features:
            if feat.get("name") == "Spells":
                continue
            html_parts.append(feat.get("text_html") or paragraph(feat.get("text") or ""))
        if name == "High Elf":
            spells = next((f for f in class_features if f.get("name") == "Spells"), None)
            if spells:
                html_parts.insert(1, spells.get("text_html") or "")
        slug = unique_slug(name, suffix, seen)
        record = base_record(slug, name, book, abbrev, page)
        record["index"].update(
            {
                "hit_die": hd[1:] if hd.startswith("d") else hd,
                "skill_points": sp,
                "prestige_level": "",
            }
        )
        record.update(
            {
                "hit_die": hd,
                "skill_points": f"{sp} + Int" if sp else "",
                "class_skills": skills,
                "description_html": "".join(html_parts),
                "description_text": plain(re.sub(r"<[^>]+>", " ", "".join(html_parts))),
                "requirements_html": None,
                "requirements_text": None,
                "class_features": class_features,
                "advancement": rows,
                "advancement_html": advancement_table(rows),
                "advancement_text": plain(
                    " ".join(
                        f"{row['level']} {row['bab']} {row['fort']} {row['ref']} {row['will']} {row['special']}"
                        for row in rows
                    )
                ),
            }
        )
        records.append(_tag_racial_class(record, name))
    missing = [name for name in race_names if name not in {r["name"] for r in records}]
    for name in missing:
        print(f"  WARN racial class missing: {name}")
    return records


def clone_racial_class(
    source: dict,
    new_name: str,
    *,
    book: str,
    abbrev: str,
    suffix: str,
    seen: set[str],
) -> dict:
    """Copy a racial class under a new race name (Forest Troll from Jungle Troll)."""
    import copy

    record = copy.deepcopy(source)
    slug = unique_slug(new_name, suffix, seen)
    record["slug"] = slug
    record["name"] = new_name
    record["source"] = source_block(book, abbrev, record.get("source", {}).get("page"))
    record["index"]["source_abbrev"] = abbrev
    note = paragraph(
        f"Forest troll racial levels are identical to jungle troll racial levels "
        f"(see World of Warcraft RPG), except that forest trolls use Zandali as an "
        f"automatic language instead of Low Common."
    )
    # Rewrite jungle-troll wording in the copied body.
    desc = record.get("description_html") or ""
    desc = re.sub(r"\bjungle troll\b", "forest troll", desc, flags=re.I)
    desc = re.sub(r"\bJungle Troll\b", "Forest Troll", desc)
    record["description_html"] = note + desc
    record["description_text"] = plain(
        re.sub(r"<[^>]+>", " ", record["description_html"])
    )
    for feat in record.get("class_features") or []:
        for key in ("text", "text_html", "name"):
            val = feat.get(key)
            if isinstance(val, str):
                val = re.sub(r"\bjungle trolls\b", "forest trolls", val, flags=re.I)
                val = re.sub(r"\bjungle troll\b", "forest troll", val, flags=re.I)
                val = re.sub(r"\bJungle Trolls\b", "Forest Trolls", val)
                val = re.sub(r"\bJungle Troll\b", "Forest Troll", val)
                feat[key] = val
    return _tag_racial_class(record, new_name)


def ensure_orc_racial_features(record: dict) -> None:
    """Build class abilities for the HPG Orc Racial Class entry."""
    rows = trim_racial_advancement(record.get("advancement") or [])
    text = record.get("description_text") or ""
    text = re.sub(
        r"\s+([A-Z][^:]{2,50}\s*\((?:Ex|Su|Sp)\):)",
        r"\n\1",
        text,
    )
    text = re.sub(r"\.\s+(Rage\s+\d+/Day\s*\((?:Ex|Su|Sp)\):)", r".\n\1", text)
    prose = parse_features(text)
    # Drop prose names that absorbed the prior sentence.
    cleaned: list[tuple[str, str, str]] = []
    for pname, kind, body in prose:
        pname = re.sub(r"^.*\.\s*", "", pname).strip()
        if re.search(r"\bRage\b", pname, re.I):
            pname = re.sub(r"^.*?\b(Rage\s+\d+/Day)\b", r"\1", pname, flags=re.I)
        cleaned.append((pname, kind, body))
    record["class_features"] = build_racial_class_features(rows, cleaned, "Orc")
    intro = plain(
        re.split(r"\bFavored of the Spirits\b", text, maxsplit=1)[0]
    ).strip()
    if len(intro) > 700:
        intro = intro[:700].rsplit(" ", 1)[0]
    html_parts = [paragraph(intro)]
    for feat in record["class_features"]:
        html_parts.append(feat.get("text_html") or paragraph(feat.get("text") or ""))
    record["description_html"] = "".join(html_parts)
    record["description_text"] = plain(re.sub(r"<[^>]+>", " ", record["description_html"]))


def apply_dwarf_sharpshooter(apg_classes: list[dict], core_classes: list[dict]) -> None:
    """Fill Dwarf Sharpshooter from the warrior class, with the printed replacements."""
    import copy

    sharp = next((c for c in apg_classes if c["name"] == "Dwarf Sharpshooter"), None)
    warrior = next((c for c in core_classes if c["name"] == "Warrior"), None)
    if not sharp or not warrior or not warrior.get("advancement"):
        print("  WARN dwarf sharpshooter: missing warrior advancement")
        return
    rows = []
    replacements = {
        1: "Firearm Focus",
        6: "Avoid Misfire",
        12: "Clear Jam",
    }
    for row in warrior["advancement"]:
        copied = copy.deepcopy(row)
        level = int(copied.get("level") or 0)
        if level in replacements:
            copied["special"] = replacements[level]
        rows.append(copied)
    flavor = (
        "Ironforge dwarves have a strong tradition of firearms proficiency. "
        "In particular, they focus on the long rifle and the blunderbuss. "
        "Dwarven riflemen were valuable assets in the Third War, able to pick off "
        "vulnerable and important targets from behind their own lines. Honed senses "
        "allow these skilled dwarves to detect when their equipment is likely to break "
        "down on them, and they have a certain ability to quickly clear a jam so they "
        "can get back to fightin'."
    )
    alterations = (
        "Dwarf sharpshooters use the warrior class, except that they give up the warrior "
        "bonus feat at 1st, 6th, and 12th level in return for the features below. "
        "They still gain a bonus feat at 2nd level and at 4th, 8th, 10th, 14th, 16th, "
        "18th, and 20th level. These bonus feats must be drawn from the feats noted as "
        "warrior bonus feats."
    )
    features = [
        (
            "Weapon and Armor Proficiency",
            "A dwarf sharpshooter is proficient with all simple and martial weapons and "
            "with all armor (heavy, medium and light) and shields (including tower shields).",
        ),
        (
            "Bonus Feats",
            "At 2nd level, and at 4th, 8th, 10th, 14th, 16th, 18th, and 20th level, "
            "the dwarf sharpshooter gains a bonus combat-oriented feat. She does not "
            "gain the warrior bonus feat at 1st, 6th, or 12th level. These bonus feats "
            "must be drawn from the feats noted as warrior bonus feats. A dwarf "
            "sharpshooter must still meet all prerequisites for a bonus feat.",
        ),
        (
            "Firearm Focus (Ex)",
            "At 1st level, the dwarf sharpshooter is skilled with all firearms. She gains "
            "Weapon Focus with the flintlock pistol and the long rifle. This replaces "
            "the warrior bonus feat at 1st level.",
        ),
        (
            "Avoid Misfire (Ex)",
            "At 6th level, to avoid a catastrophic malfunction with a technological weapon "
            "(according to the \"When Good Weapons Go Bad\" sidebar in Weapons and Armor "
            "of the World of Warcraft RPG), the dwarf sharpshooter can reroll the second "
            "roll. If the GM is not using this optional rule, the dwarf sharpshooter gains "
            "a bonus feat at this level, as a warrior would. This replaces the warrior "
            "bonus feat at 6th level.",
        ),
        (
            "Clear Jam (Ex)",
            "At 12th level, when a technological weapon malfunctions in the hands of the "
            "dwarf sharpshooter, she immediately recognizes the problem and solves it. "
            "The weapon is ready to fire again, as normal, in the next round. This "
            "replaces the warrior bonus feat at 12th level.",
        ),
    ]
    html = paragraph(flavor) + paragraph(alterations)
    for name, body in features:
        html += f"<p><strong>{esc(name)}:</strong> {esc(body)}</p>"
    sharp["hit_die"] = warrior.get("hit_die") or "d10"
    sharp["skill_points"] = warrior.get("skill_points") or "2 + Int"
    sharp["class_skills"] = copy.deepcopy(warrior.get("class_skills") or [])
    sharp["advancement"] = rows
    sharp["advancement_html"] = advancement_table(rows)
    sharp["advancement_text"] = plain(
        " ".join(
            f"{row['level']} {row['bab']} {row['fort']} {row['ref']} {row['will']} {row['special']}"
            for row in rows
        )
    )
    sharp["description_html"] = html
    sharp["description_text"] = plain(re.sub(r"<[^>]+>", " ", html))
    sharp["parent_class"] = "Warrior"
    sharp["index"]["hit_die"] = "10"
    sharp["index"]["skill_points"] = "2"
    print(f"  dwarf sharpshooter: {len(rows)} warrior levels, replacements at 1/6/12")


def extract_variants(
    lines: list[tuple[int, str]],
    seen: set[str],
    variants: list[tuple[str, str, str]] | None = None,
    *,
    book: str = APG_SOURCE,
    abbrev: str = "APG",
    suffix: str = "apg",
) -> list[dict]:
    records = []
    catalog = variants or APG_VARIANTS
    names = [name for name, _hd, _sp in catalog]
    hits: list[tuple[int, str, int, str, str]] = []
    for index, (page, line) in enumerate(lines):
        window = line
        if index + 1 < len(lines) and lines[index + 1][1]:
            window = f"{line} {lines[index + 1][1]}"
        for name, hd, sp in catalog:
            if window.lower().startswith(name.lower()) and "alteration" in window.lower():
                hits.append((index, name, page, hd, sp))
                break
    for nth, (index, name, page, hd, sp) in enumerate(hits):
        end = hits[nth + 1][0] if nth + 1 < len(hits) else len(lines)
        body = [text for _, text in lines[index:end]]
        text = "\n".join(body)
        record = class_record(
            name,
            text,
            body,
            book=book,
            abbrev=abbrev,
            suffix=suffix,
            page=page,
            prestige=False,
            seen=seen,
            hit_die=hd,
            skill_points=sp,
        )
        if record:
            note = paragraph(
                f"Variant of a World of Warcraft RPG class. Uses the parent class advancement except where this entry changes it."
            )
            record["description_html"] = note + (record.get("description_html") or "")
            records.append(record)
    # Keep the name list referenced so a missing heading is obvious to the caller.
    found = {record["name"] for record in records}
    missing = [name for name in names if name not in found]
    if missing:
        print("  missing variants:", ", ".join(missing))
    return records


def extract_creatures(lines: list[tuple[int, str]], seen: set[str]) -> list[dict]:
    records = []
    hits: list[tuple[int, str, int]] = []
    seen_creatures: set[str] = set()
    for index, (page, line) in enumerate(lines):
        for name in APG_CREATURES:
            if name in seen_creatures:
                continue
            if name.lower() in line.lower() and "creature class" in line.lower():
                hits.append((index, name, page))
                seen_creatures.add(name)
                break
    # Tables often sit just before the "Creature Class" recap. Pull a window backward.
    for nth, (index, name, page) in enumerate(hits):
        end = hits[nth + 1][0] if nth + 1 < len(hits) else len(lines)
        start = max(0, index - 80)
        if nth:
            start = max(start, hits[nth - 1][0] + 1)
        body = [text for _, text in lines[start:end]]
        text = "\n".join(body)
        record = class_record(
            name,
            text,
            body,
            book=APG_SOURCE,
            abbrev="APG",
            suffix="apg",
            page=page,
            prestige=False,
            seen=seen,
            hit_die="d8",
            skill_points="2",
        )
        if record:
            records.append(record)
    return records


def extract_creature_headings(
    lines: list[tuple[int, str]],
    names: list[str],
    seen: set[str],
    *,
    book: str,
    abbrev: str,
    suffix: str,
    hit_die: str = "d8",
    skill_points: str = "2",
) -> list[dict]:
    """Creature classes headed 'Name Creature Class', not the trait bullet."""
    records = []
    hits: list[tuple[int, str, int]] = []
    seen_creatures: set[str] = set()
    for index, (page, line) in enumerate(lines):
        low = line.lower().strip()
        for name in names:
            if name in seen_creatures:
                continue
            heading = f"{name.lower()} creature class"
            if low == heading or low.startswith(heading):
                hits.append((index, name, page))
                seen_creatures.add(name)
                break
    for nth, (index, name, page) in enumerate(hits):
        end = hits[nth + 1][0] if nth + 1 < len(hits) else len(lines)
        start = max(0, index - 80)
        if nth:
            start = max(start, hits[nth - 1][0] + 1)
        body = [text for _, text in lines[start:end]]
        record = class_record(
            name,
            "\n".join(body),
            body,
            book=book,
            abbrev=abbrev,
            suffix=suffix,
            page=page,
            prestige=False,
            seen=seen,
            hit_die=hit_die,
            skill_points=skill_points,
        )
        if record:
            records.append(record)
    return records


def extract_feats(lines: list[tuple[int, str]], abbrev: str, book: str, suffix: str) -> list[dict]:
    feats = []
    seen: set[str] = set()
    current: dict | None = None

    def flush() -> None:
        nonlocal current
        if not current:
            return
        name = current["name"]
        if len(name) < 3 or name.lower() in {"general feats", "metamagic feats", "technology feats"}:
            current = None
            return
        for field in ("flavor", "prerequisite", "benefit", "normal", "special"):
            chunks = split_feat_section_chunks(current.get(field) or "", field)
            current[field] = chunks.get(field, "")
            for mode, body in chunks.items():
                if mode == field:
                    continue
                if not (current.get(mode) or "").strip():
                    current[mode] = body
        benefit = plain(current.get("benefit") or "")
        prereq = plain(current.get("prerequisite") or "")
        normal = plain(current.get("normal") or "")
        special = plain(current.get("special") or "")
        flavor = plain(current.get("flavor") or "")
        if not benefit and not flavor:
            current = None
            return
        slug = unique_slug(name, suffix, seen)
        record = base_record(slug, name, book, abbrev, current.get("page"))
        feat_type = current.get("type") or "General"
        snippet = (flavor or benefit)[:180]
        record["index"].update({"type": feat_type.split(",")[0].strip(), "description_snippet": snippet})
        record.update(
            {
                "type": feat_type,
                "description_html": paragraph(flavor) if flavor else "",
                "description_text": flavor,
                "benefit_html": benefit,
                "benefit_text": benefit,
                "prerequisite_html": paragraph(prereq) if prereq else None,
                "prerequisite_text": prereq or None,
                "special_html": paragraph(special) if special else None,
                "special_text": special or None,
                "normal_html": paragraph(normal) if normal else None,
                "normal_text": normal or None,
            }
        )
        feats.append(record)
        current = None

    pending_name: tuple[str, int] | None = None
    mode = ""
    for page, line in lines:
        if not line:
            continue
        type_match = FEAT_TYPE_RE.match(line)
        if pending_name and type_match:
            flush()
            current = {
                "name": pending_name[0],
                "page": pending_name[1],
                "type": plain(type_match.group(1)),
                "flavor": "",
                "benefit": "",
                "prerequisite": "",
                "normal": "",
                "special": "",
            }
            pending_name = None
            mode = "flavor"
            continue
        req = REQ_LINE_RE.match(line)
        if current and req:
            mode = feat_mode_from_label(req.group(1))
            current[mode] = req.group(2)
            pending_name = None
            continue
        inline = INLINE_SECTION_RE.search(line) if current else None
        if current and inline and inline.start() > 0:
            chunks = split_feat_section_chunks(line, mode or "flavor")
            switched = merge_feat_section_chunks(current, chunks)
            if switched:
                mode = switched
            pending_name = None
            continue
        # A short title line may start the next feat.
        if (
            2 < len(line) < 48
            and line[0].isupper()
            and not line.endswith(".")
            and not re.match(r"^(Prerequisite|Benefit|Normal|Special|Table|General|Metamagic|Technology)\b", line)
            and "feat" not in line.lower()
        ):
            pending_name = (line, page)
            continue
        pending_name = None
        if current and mode:
            current[mode] = (current.get(mode) or "") + " " + line
    flush()
    return feats


def weapon_category(header: str) -> str | None:
    lower = header.lower()
    if "exotic" in lower:
        return "exotic"
    if "martial" in lower:
        return "martial"
    if "simple" in lower:
        return "simple"
    return None


def handedness(header: str) -> str | None:
    lower = header.lower()
    if "two-handed" in lower or "two handed" in lower:
        return "2H"
    if "ranged" in lower:
        return "ranged"
    if "light" in lower or "one-handed" in lower or "unarmed" in lower:
        return "1H"
    return None


def damage_code(text: str) -> str:
    lower = text.lower()
    codes = []
    if "slash" in lower:
        codes.append("S")
    if "pierc" in lower:
        codes.append("P")
    if "bludg" in lower:
        codes.append("B")
    return ", ".join(codes) or plain(text)


WEAPON_RE = re.compile(
    r"^(?P<name>.+?)\s+"
    r"(?P<cost>(?:\d[\d,]*\s*(?:gp|sp|cp)|special|-))\s+"
    r"(?:(?P<mr>\d+)\s+)?"
    r"(?P<dmg_s>\d+d\d+(?:/\d+d\d+)?)\s*"
    r"(?P<dmg_m>\d+d\d+(?:/\d+d\d+)?)\s+"
    r"(?P<crit>(?:\d+-\d+/)?x\d+)\s+"
    r"(?P<range>(?:-|\d+\s*ft\.))\s+"
    r"(?P<weight>(?:\d+(?:/\d+)?\s*lb\.|special|-))\s+"
    r"(?P<dtype>.+)$",
    re.I,
)
ARMOR_RE = re.compile(
    r"^(?P<name>.+?)\s+"
    r"(?P<cost>\d[\d,]*\s*(?:gp|sp|cp))\s+"
    r"(?P<ac>\+\d+)\s*"
    r"(?P<maxdex>\+\d+|-)\s+"
    r"(?P<acp>-?\d+|0)\s+"
    r"(?P<asf>\d+%?)\s+"
    r"(?P<spd30>(?:\d+\s*ft\.?|-))\s*"
    r"(?P<spd20>(?:\d+\s*ft\.?|-))\s*"
    r"(?P<weight>\+?\d+\s*lb\.)$",
    re.I,
)
GOOD_RE = re.compile(
    r"^(?P<name>.+?)\s+"
    r"(?P<cost>\d[\d,]*\s*(?:gp|sp|cp))\s+"
    r"(?P<weight>(?:\*|[\d/]+\s*lb\.?|-|\*\*))\s*"
    r"(?P<holds>.*)$",
    re.I,
)


def clean_stat(value: str) -> str:
    return value.replace("†", "").replace("‡", "").replace("*", "").strip()


def fix_asf(value: str) -> str:
    value = value.strip()
    if value.endswith("%"):
        return value
    if value.isdigit() and int(value) > 100:
        value = value[:-1]
    if value.isdigit():
        return f"{int(value)}%"
    return value


def speed_num(value: str) -> str:
    match = re.search(r"\d+", value or "")
    return match.group(0) if match else ""


def equipment_record(
    name: str,
    *,
    kind: str,
    category: str,
    cost: str,
    weight: str,
    page: int,
    extra: dict | None = None,
    seen: set[str],
    book: str = CORE_SOURCE,
    abbrev: str = "WoW",
    suffix: str = "wow",
) -> dict:
    slug = unique_slug(name, suffix, seen)
    record = base_record(slug, name, book, abbrev, page)
    stats = ""
    if extra and extra.get("damage_m"):
        stats = f"{extra['damage_m']} · {extra.get('critical', '')}"
    elif extra and extra.get("ac_bonus"):
        stats = f"AC {extra['ac_bonus']}"
        if extra.get("max_dex"):
            stats += f" · Max Dex {extra['max_dex']}"
        if extra.get("armor_check_penalty"):
            stats += f" · ACP {extra['armor_check_penalty']}"
    record["index"].update(
        {
            "kind": kind,
            "category": category,
            "stats": stats,
            "cost": cost,
            "weight": weight,
        }
    )
    record.update(
        {
            "kind": kind,
            "category": category,
            "cost": cost,
            "weight": weight if weight != "*" else "-",
            "description_html": "",
            "description_text": "",
        }
    )
    if extra:
        record.update(extra)
    return record


def extract_weapons(lines: list[tuple[int, str]], seen: set[str]) -> list[dict]:
    records = []
    category = "simple"
    handed = "1H"
    pending = ""
    for page, line in lines:
        if not line:
            continue
        cat = weapon_category(line)
        if cat and "cost" not in line.lower():
            category = cat
            pending = ""
            continue
        hand = handedness(line)
        if hand and "cost" not in line.lower() and "gp" not in line.lower():
            handed = hand
            pending = ""
            continue
        if line.lower().startswith("table ") or line.lower().startswith("cost "):
            pending = ""
            continue
        candidate = plain(f"{pending} {line}" if pending else line)
        match = WEAPON_RE.match(candidate)
        if not match:
            if pending:
                pending = ""
            elif len(line) < 40 and not re.search(r"\d+\s*(gp|sp|cp)", line):
                pending = line
            continue
        pending = ""
        name = clean_stat(match.group("name")).strip(" -")
        if name.lower() in {"simple weapons", "martial weapons", "exotic weapons"}:
            continue
        dtype = damage_code(match.group("dtype"))
        extra = {
            "damage_s": clean_stat(match.group("dmg_s")),
            "damage_m": clean_stat(match.group("dmg_m")),
            "critical": clean_stat(match.group("crit")).replace("X", "x"),
            "range_increment": plain(match.group("range")),
            "damage_type": dtype,
            "handed": handed,
        }
        records.append(
            equipment_record(
                name,
                kind="weapon",
                category=category,
                cost=plain(match.group("cost")),
                weight=plain(match.group("weight")),
                page=page,
                extra=extra,
                seen=seen,
            )
        )
    return records


def extract_armor(lines: list[tuple[int, str]], seen: set[str]) -> list[dict]:
    records = []
    category = "light"
    kind = "armor"
    for page, line in lines:
        if not line:
            continue
        lower = line.lower()
        if lower.startswith("light armor"):
            category, kind = "light", "armor"
            continue
        if lower.startswith("medium armor"):
            category, kind = "medium", "armor"
            continue
        if lower.startswith("heavy armor"):
            category, kind = "heavy", "armor"
            continue
        if lower.startswith("shields"):
            category, kind = "light", "shield"
            continue
        if lower.startswith("extras") or lower.startswith("table ") or lower.startswith("armor "):
            continue
        cleaned = plain(line).replace("†", "").replace("‡", "").replace("*", "")
        cleaned = re.sub(r"(\d)\s+%", r"\1%", cleaned)
        match = ARMOR_RE.match(cleaned)
        if not match:
            continue
        name = clean_stat(match.group("name"))
        item_kind = kind
        item_cat = category
        if item_kind == "shield":
            if "tower" in name.lower():
                item_cat = "tower"
            elif "heavy" in name.lower():
                item_cat = "heavy"
            elif "buckler" in name.lower() or "light" in name.lower():
                item_cat = "light"
        ac = clean_stat(match.group("ac")).lstrip("+")
        max_dex = clean_stat(match.group("maxdex")).lstrip("+")
        if max_dex == "-":
            max_dex = ""
        extra = {
            "ac_bonus": ac,
            "max_dex": max_dex,
            "armor_check_penalty": clean_stat(match.group("acp")),
            "arcane_spell_failure": fix_asf(match.group("asf")),
            "speed_30": speed_num(match.group("spd30")),
            "speed_20": speed_num(match.group("spd20")),
        }
        records.append(
            equipment_record(
                name,
                kind=item_kind,
                category=item_cat,
                cost=plain(match.group("cost")),
                weight=plain(match.group("weight")).lstrip("+"),
                page=page,
                extra=extra,
                seen=seen,
            )
        )
    return records


def extract_goods(lines: list[tuple[int, str]], seen: set[str]) -> list[dict]:
    records = []
    pending = ""
    for page, line in lines:
        if not line:
            continue
        if line.lower().startswith("table ") or line.lower().startswith("item cost"):
            pending = ""
            continue
        candidate = plain(f"{pending} {line}" if pending else line)
        match = GOOD_RE.match(candidate)
        if not match:
            if line.startswith("(") or (pending and len(line) < 30):
                pending = plain(f"{pending} {line}")
            elif len(line) < 28 and not re.search(r"\d+\s*(gp|sp|cp)", line):
                pending = line
            else:
                pending = ""
            continue
        pending = ""
        name = plain(match.group("name")).strip(" -")
        if len(name) < 2 or name.lower().startswith("item"):
            continue
        holds = plain(match.group("holds"))
        extra = {}
        if holds and holds != "-":
            extra["description_html"] = paragraph(f"Holds or carries: {holds}")
            extra["description_text"] = f"Holds or carries: {holds}"
        records.append(
            equipment_record(
                name,
                kind="good",
                category="adventuring gear",
                cost=plain(match.group("cost")),
                weight=plain(match.group("weight")),
                page=page,
                extra=extra or None,
                seen=seen,
            )
        )
    return records


def extract_materials(lines: list[tuple[int, str]], seen: set[str]) -> list[dict]:
    text = "\n".join(line for _, line in lines)
    parts = re.split(r"\n(?=[A-Z][A-Za-z' ]{2,24}:\s)", text)
    records = []
    for part in parts:
        match = re.match(r"([A-Z][A-Za-z' ]{2,24}):\s+(.+)", part, re.S)
        if not match:
            continue
        name = plain(match.group(1))
        body = plain(match.group(2))
        if name.lower() in {"special materials", "table", "adventuring gear"}:
            continue
        if len(body) < 40:
            continue
        record = equipment_record(
            name,
            kind="good",
            category="special material",
            cost="-",
            weight="-",
            page=lines[0][0] if lines else 193,
            extra={"description_html": paragraph(body), "description_text": body},
            seen=seen,
        )
        records.append(record)
    return records


def extract_tech(lines: list[tuple[int, str]], seen: set[str]) -> list[dict]:
    records = []
    current_name = ""
    current_page = 0
    buf: list[str] = []

    def flush() -> None:
        nonlocal current_name, buf
        if not current_name:
            buf = []
            return
        text = plain(" ".join(buf))
        price = re.search(r"Price\s+(\d[\d,]*\s*gp)", text, re.I)
        weight = re.search(r"Weight\s+(\d+(?:/\d+)?\s*lb\.)", text, re.I)
        record = equipment_record(
            current_name,
            kind="good",
            category="technological device",
            cost=price.group(1) if price else "-",
            weight=weight.group(1) if weight else "-",
            page=current_page,
            extra={"description_html": paragraph(text), "description_text": text},
            seen=seen,
        )
        records.append(record)
        current_name = ""
        buf = []

    for page, line in lines:
        if not line:
            continue
        collapsed = collapse_doubled(line)
        if (
            collapsed != line
            or (
                len(line) < 40
                and line[:1].isupper()
                and not line.endswith(".")
                and "description" not in line.lower()
                and not re.search(r"\b(Hardness|Price|Operation|Malfunction)\b", line)
            )
            and page
        ):
            # Doubled titles mark a new device. Single short lines are weaker.
            if collapsed != line or (line.endswith("Goblin") is False and collapsed != line):
                pass
        if collapse_doubled(line) != line and " " not in collapse_doubled(line)[:1]:
            flush()
            current_name = collapse_doubled(line)
            current_page = page
            continue
        if current_name:
            buf.append(line)
    flush()
    # Second pass for "NameName" already collapsed by page_lines, using Description anchors.
    if len(records) < 3:
        records = extract_tech_by_description(lines, seen)
    return records


def extract_tech_by_description(lines: list[tuple[int, str]], seen: set[str]) -> list[dict]:
    records = []
    blocks: list[tuple[str, int, list[str]]] = []
    name = ""
    page = 0
    buf: list[str] = []
    for line_page, line in lines:
        if not line:
            continue
        if line.lower().startswith("description:"):
            if name:
                blocks.append((name, page, buf))
            # The previous short line is the name.
            name = buf[-1] if buf else "Technological Device"
            page = line_page
            buf = [line]
            continue
        buf.append(line)
    if name:
        blocks.append((name, page, buf))
    for device_name, device_page, device_lines in blocks:
        text = plain(" ".join(device_lines))
        if "price" not in text.lower():
            continue
        price = re.search(r"Price\s+(\d[\d,]*\s*gp)", text, re.I)
        weight = re.search(r"Weight\s+(\d+(?:/\d+)?\s*lb\.)", text, re.I)
        records.append(
            equipment_record(
                collapse_doubled(device_name),
                kind="good",
                category="technological device",
                cost=price.group(1) if price else "-",
                weight=weight.group(1) if weight else "-",
                page=device_page,
                extra={"description_html": paragraph(text), "description_text": text},
                seen=seen,
            )
        )
    return records


def extract_described_gear(
    lines: list[tuple[int, str]],
    seen: set[str],
    *,
    kind: str,
    category: str,
    book: str,
    abbrev: str,
    suffix: str,
) -> list[dict]:
    """Items whose entry starts with a short title and a Description: line."""
    records = []
    index = 0
    while index < len(lines):
        _page, line = lines[index]
        if not line.lower().startswith("description:"):
            index += 1
            continue
        name = ""
        page = _page
        for back in range(index - 1, max(-1, index - 8), -1):
            prev = lines[back][1]
            if not prev or len(prev) > 48 or prev.endswith("."):
                continue
            low = prev.lower()
            if low.startswith(("table", "item", "powers", "operation", "fuel", "hardness", "malfunction")):
                continue
            if "description" in low:
                continue
            name = collapse_doubled(prev)
            page = lines[back][0]
            break
        end = index + 1
        while end < len(lines) and not lines[end][1].lower().startswith("description:"):
            end += 1
        text = plain(" ".join(lines[step][1] for step in range(index, end) if lines[step][1]))
        index = end
        price = re.search(r"Price\s+([^.;]+)", text, re.I)
        if not price:
            price = re.search(r"\bcosts?\s+(\d[\d,]*\s*gp)", text, re.I)
        if not name or not price:
            continue
        weight = re.search(r"Weight\s+([^;]+)", text, re.I)
        cost = plain(price.group(1)) if price else "-"
        if cost and "gp" not in cost.lower() and re.search(r"\d", cost):
            cost = cost.strip() + " gp"
        records.append(
            equipment_record(
                name,
                kind=kind,
                category=category,
                cost=cost or "-",
                weight=plain(weight.group(1)) if weight else "-",
                page=page,
                extra={"description_html": paragraph(text), "description_text": text},
                seen=seen,
                book=book,
                abbrev=abbrev,
                suffix=suffix,
            )
        )
    return records


def extract_magic_weapons(lines: list[tuple[int, str]]) -> list[dict]:
    """Magic weapons with a Description block and a Price."""
    records = []
    seen: set[str] = set()
    index = 0
    while index < len(lines):
        page, line = lines[index]
        if not line.lower().startswith("description:"):
            index += 1
            continue
        name = ""
        item_page = page
        for back in range(index - 1, max(-1, index - 6), -1):
            prev = lines[back][1]
            if not prev or len(prev) > 48 or prev.endswith("."):
                continue
            if prev.lower().startswith(("table", "powers", "item", "price")):
                continue
            name = collapse_doubled(prev)
            item_page = lines[back][0]
            break
        end = index + 1
        while end < len(lines) and not lines[end][1].lower().startswith("description:"):
            end += 1
        text = plain(" ".join(lines[step][1] for step in range(index, end) if lines[step][1]))
        index = end
        price = re.search(r"Price\s+([^.;]+)", text, re.I)
        if not name or not price:
            continue
        slug = unique_slug(name, "hpg", seen)
        record = base_record(slug, name, HPG_SOURCE, "HPG", item_page)
        cost = plain(price.group(1))
        cl = re.search(r"\bCL\s+(\d+(?:st|nd|rd|th)?)", text, re.I)
        aura = re.search(
            r"\b(Faint|Moderate|Strong|Overwhelming)\s+([a-z]+)",
            text,
            re.I,
        )
        record["index"].update({"type": "Magic Weapon", "price": cost})
        record.update(
            {
                "price": cost,
                "caster_level": cl.group(1) if cl else "",
                "aura": f"{aura.group(1).title()} {aura.group(2).lower()}" if aura else "",
                "activation": "",
                "weight": "",
                "slot": "Weapon",
                "description_html": paragraph(text),
                "description_text": text,
            }
        )
        records.append(record)
    return records


def write_json(name: str, records: list[dict]) -> None:
    path = OUT_DIR / name
    path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  wrote {path.name}: {len(records)}")


def dedupe_classes(records: list[dict]) -> list[dict]:
    best: dict[str, dict] = {}
    order: list[str] = []
    for record in records:
        name = record["name"]
        score = (
            len(record.get("advancement") or []),
            len(record.get("class_skills") or []),
            len(record.get("description_html") or ""),
        )
        if name not in best:
            order.append(name)
            best[name] = record
            continue
        current = best[name]
        old = (
            len(current.get("advancement") or []),
            len(current.get("class_skills") or []),
            len(current.get("description_html") or ""),
        )
        if score > old:
            best[name] = record
    return [best[name] for name in order]


def names_of(records: list[dict]) -> list[str]:
    return [record["name"] for record in records]


def require(label: str, records: list[dict], expected: list[str]) -> None:
    found = set(names_of(records))
    missing = [name for name in expected if name not in found]
    if missing:
        print(f"  WARN {label} missing: {', '.join(missing)}")
    else:
        print(f"  OK {label}: {len(expected)}")


def main() -> int:
    core = PdfReader(str(find_pdf("Core")))
    apg = PdfReader(str(find_pdf("Alliance")))
    hpg = PdfReader(str(find_pdf("Horde")))
    print(f"Core pages {len(core.pages)}, APG pages {len(apg.pages)}, HPG pages {len(hpg.pages)}")

    core_race_lines = page_lines(core, 33, 55)
    core_class_lines = page_lines(core, 56, 92)
    core_prc_lines = page_lines(core, 92, 113)
    core_feat_lines = page_lines(core, 142, 163)
    weapon_lines = page_lines(core, 182, 185)
    armor_lines = page_lines(core, 191, 192)
    material_lines = page_lines(core, 193, 196)
    goods_lines = page_lines(core, 197, 203)
    tech_lines = page_lines(core, 213, 217)

    apg_race_lines = page_lines(apg, 6, 14)
    apg_class_lines = page_lines(apg, 14, 35)
    apg_feat_lines = page_lines(apg, 35, 43)
    apg_prc_lines = page_lines(apg, 42, 76)

    hpg_race_lines = page_lines(hpg, 7, 13)
    hpg_class_lines = page_lines(hpg, 13, 39)
    hpg_feat_lines = page_lines(hpg, 31, 39)
    hpg_prc_lines = page_lines(hpg, 39, 84)
    hpg_tech_lines = page_lines(hpg, 121, 133)
    hpg_weapon_lines = page_lines(hpg, 109, 115)

    print("slices", {
        "core races": len(core_race_lines),
        "core classes": len(core_class_lines),
        "core prc": len(core_prc_lines),
        "core feats": len(core_feat_lines),
        "weapons": len(weapon_lines),
        "apg classes": len(apg_class_lines),
        "apg prc": len(apg_prc_lines),
    })

    races = extract_races(core_race_lines, CORE_RACES, "WoW", CORE_SOURCE, "wow")
    apg_races = extract_races(apg_race_lines, APG_RACES, "APG", APG_SOURCE, "apg")

    seen_classes: set[str] = set()
    classes = extract_named_classes(
        core_class_lines, CORE_BASE, book=CORE_SOURCE, abbrev="WoW", suffix="wow", prestige=False, seen=seen_classes
    )
    classes += extract_named_classes(
        core_prc_lines,
        CORE_PRESTIGE,
        book=CORE_SOURCE,
        abbrev="WoW",
        suffix="wow",
        prestige=True,
        seen=seen_classes,
    )
    seen_apg: set[str] = set()
    apg_classes = extract_variants(apg_class_lines, seen_apg)
    apg_classes += extract_creatures(apg_class_lines, seen_apg)
    apg_classes += extract_named_classes(
        apg_prc_lines,
        APG_PRESTIGE,
        book=APG_SOURCE,
        abbrev="APG",
        suffix="apg",
        prestige=True,
        seen=seen_apg,
    )
    core_racial = extract_racial_classes(
        core_race_lines,
        CORE_RACIAL_CLASS_RACES,
        book=CORE_SOURCE,
        abbrev="WoW",
        suffix="wow",
        seen=seen_classes,
    )
    classes += core_racial
    classes = dedupe_classes(classes)

    apg_racial = extract_racial_classes(
        apg_race_lines,
        APG_RACIAL_CLASS_RACES,
        book=APG_SOURCE,
        abbrev="APG",
        suffix="apg",
        seen=seen_apg,
    )
    apg_classes += apg_racial
    apg_classes = dedupe_classes(apg_classes)
    apply_dwarf_sharpshooter(apg_classes, classes)

    feats = extract_feats(core_feat_lines, "WoW", CORE_SOURCE, "wow")
    apg_feats = extract_feats(apg_feat_lines, "APG", APG_SOURCE, "apg")

    seen_hpg: set[str] = set()
    hpg_classes = extract_named_classes(
        hpg_class_lines,
        HPG_RACIAL,
        book=HPG_SOURCE,
        abbrev="HPG",
        suffix="hpg",
        prestige=False,
        seen=seen_hpg,
    )
    hpg_classes += extract_variants(
        hpg_class_lines,
        seen_hpg,
        HPG_VARIANTS,
        book=HPG_SOURCE,
        abbrev="HPG",
        suffix="hpg",
    )
    hpg_classes += extract_creature_headings(
        hpg_class_lines,
        HPG_CREATURES,
        seen_hpg,
        book=HPG_SOURCE,
        abbrev="HPG",
        suffix="hpg",
    )
    hpg_classes += extract_named_classes(
        hpg_prc_lines,
        HPG_PRESTIGE,
        book=HPG_SOURCE,
        abbrev="HPG",
        suffix="hpg",
        prestige=True,
        seen=seen_hpg,
    )
    hpg_racial = extract_racial_classes(
        hpg_race_lines,
        HPG_RACIAL_CLASS_RACES,
        book=HPG_SOURCE,
        abbrev="HPG",
        suffix="hpg",
        seen=seen_hpg,
    )
    hpg_classes += hpg_racial
    jungle = next((c for c in classes if c["name"] == "Jungle Troll"), None)
    if jungle:
        hpg_classes.append(
            clone_racial_class(
                jungle,
                "Forest Troll",
                book=HPG_SOURCE,
                abbrev="HPG",
                suffix="hpg",
                seen=seen_hpg,
            )
        )
    for record in hpg_classes:
        if record["name"] == "Orc Racial Class":
            _tag_racial_class(record, "Orc")
            ensure_orc_racial_features(record)
    hpg_classes = dedupe_classes(hpg_classes)
    hpg_races = extract_races(hpg_race_lines, HPG_RACES, "HPG", HPG_SOURCE, "hpg")
    hpg_feats = extract_feats(hpg_feat_lines, "HPG", HPG_SOURCE, "hpg")
    seen_hpg_gear: set[str] = set()
    hpg_gear = extract_described_gear(
        hpg_tech_lines,
        seen_hpg_gear,
        kind="good",
        category="technological device",
        book=HPG_SOURCE,
        abbrev="HPG",
        suffix="hpg",
    )
    hpg_magic_weapons = extract_magic_weapons(hpg_weapon_lines)

    seen_gear: set[str] = set()
    gear = []
    gear += extract_weapons(weapon_lines, seen_gear)
    gear += extract_armor(armor_lines, seen_gear)
    gear += extract_materials(material_lines, seen_gear)
    gear += extract_goods(goods_lines, seen_gear)
    gear += extract_tech(tech_lines, seen_gear)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    write_json("wowrpg_core_races.json", races)
    write_json("wowrpg_core_classes.json", classes)
    write_json("wowrpg_core_feats.json", feats)
    write_json("wowrpg_core_equipment.json", gear)
    write_json("wowrpg_apg_races.json", apg_races)
    write_json("wowrpg_apg_classes.json", apg_classes)
    write_json("wowrpg_apg_feats.json", apg_feats)
    write_json("wowrpg_hpg_races.json", hpg_races)
    write_json("wowrpg_hpg_classes.json", hpg_classes)
    write_json("wowrpg_hpg_feats.json", hpg_feats)
    write_json("wowrpg_hpg_equipment.json", hpg_gear)
    write_json("wowrpg_hpg_items.json", hpg_magic_weapons)

    require("core races", races, [name for _s, name, _k, _m in CORE_RACES])
    require("apg races", apg_races, [name for _s, name, _k, _m in APG_RACES])
    require("core base", classes, CORE_BASE)
    require("core prestige", classes, CORE_PRESTIGE)
    require("apg variants", apg_classes, [name for name, _h, _s in APG_VARIANTS])
    require("apg creatures", apg_classes, APG_CREATURES)
    require("apg prestige", apg_classes, APG_PRESTIGE)
    require("hpg races", hpg_races, [name for _s, name, _k, _m in HPG_RACES])
    require("hpg racial", hpg_classes, HPG_RACIAL)
    require("hpg variants", hpg_classes, [name for name, _h, _s in HPG_VARIANTS])
    require("hpg creatures", hpg_classes, HPG_CREATURES)
    require("hpg prestige", hpg_classes, HPG_PRESTIGE)
    require("core racial classes", classes, CORE_RACIAL_CLASS_EXPECTED)
    require("apg racial classes", apg_classes, APG_RACIAL_CLASS_RACES)
    require("hpg racial classes", hpg_classes, HPG_RACIAL_CLASS_RACES + ["Forest Troll"])
    print(f"  feats core={len(feats)} apg={len(apg_feats)} hpg={len(hpg_feats)} gear={len(gear)}")
    print(f"  hpg tech={len(hpg_gear)} hpg magic weapons={len(hpg_magic_weapons)}")
    weapons = [item for item in gear if item["kind"] == "weapon"]
    armors = [item for item in gear if item["kind"] in {"armor", "shield"}]
    print(f"  weapons={len(weapons)} armor/shields={len(armors)}")
    thin = [item["name"] for item in classes + apg_classes if not item.get("advancement") and not item["index"].get("prestige_level") and item["name"] in CORE_BASE]
    if thin:
        print("  base classes without advancement:", ", ".join(thin))
    return 0


if __name__ == "__main__":
    sys.exit(main())
