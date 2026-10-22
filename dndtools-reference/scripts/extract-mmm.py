#!/usr/bin/env python3
"""Extract More Magic and Mayhem into supplemental JSON.

Reads bookmarked mechanical chapters: classes, feats, spells, runes,
alchemy, enchantments, magic items, and technological devices.
Skips the introduction, credits, and index.

    python scripts/extract-mmm.py
"""

from __future__ import annotations

import copy
import importlib.util
import json
import re
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "extract_wowrpg", Path(__file__).resolve().parent / "extract-wowrpg.py"
)
wow = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wow)

BOOK = "More Magic and Mayhem"
ABBREV = "MMM"
SUFFIX = "mmm"
EDITION = wow.EDITION

BASE_CLASSES = ["Inscriber", "Witch Doctor", "Runemaster"]
PRESTIGE = ["Argent Dawn Templar", "Enchanter", "Ley Walker", "Steam Warrior"]
CLASS_RANGES = {
    "Inscriber": (7, 9),
    "Witch Doctor": (9, 11),
    "Runemaster": (11, 16),
    "Argent Dawn Templar": (15, 18),
    "Enchanter": (18, 21),
    "Ley Walker": (21, 24),
    "Steam Warrior": (24, 26),
}
PATH_PARENTS = {"Inscriber": "Arcanist", "Witch Doctor": "Healer"}
MMM_CLASS_NAMES = set(BASE_CLASSES + PRESTIGE)

SCHOOLS = (
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
SCHOOL_RE = re.compile(rf"^({'|'.join(SCHOOLS)})\b(.*)$", re.I)
FIELD_RE = re.compile(
    r"^(Level|Components|Casting Time|Empowerment Time|Range|Target|Area|Effect|Duration|"
    r"Saving Throw|Spell Resistance|Focus|Material|Material Components)\s*:\s*(.*)$",
    re.I,
)
AURA_START_RE = re.compile(r"^(Faint|Moderate|Strong|Overwhelming)\b", re.I)
STAT_RE = re.compile(
    r"^(?P<strength>Faint|Moderate|Strong|Overwhelming)\s+(?P<school>[^;]+);\s*"
    r"CL\s*(?P<cl>\d+)(?:st|nd|rd|th)?\s*;\s*(?P<body>.*)$",
    re.I,
)
PRICE_RE = re.compile(r"Price\s+(.+?)(?:\.|$)", re.I)
SPLIT_CAP_RE = re.compile(r"\b([B-HJ-Z])\s+(?=[a-z])")
BULLET_RE = re.compile(
    r"^(?:•\s*)?(\d+)(?:st|nd|rd|th)\s+Level\s*-\s*([^:]{2,60}):\s*(.*)$"
)
SECTION_FEAT_RE = re.compile(
    r"^(Arcana|Additional Class Skills?|Inspirations|Domains|Turn or Rebuke)\s*:\s*(.*)$",
    re.I,
)
EP_RE = re.compile(r"^(.+?)\s*\(([\d,]+)\s*EP\):\s*(.*)$")
ALCHEMY_ENTRY_RE = re.compile(r"^([A-Z][^:]{2,70}):\s+(.*)$")
TABLE_GP_RE = re.compile(r"^([A-Z][A-Za-z0-9'’,() -]{2,55}?)\s+(\d[\d,]*\s*gp)$")
PATTERN_RE = re.compile(r"^[A-Z][A-Za-z' -]{0,40} Pattern$")
SMALL_WORDS = {"of", "the", "and", "a", "an", "in", "to", "for"}
SECTION_TYPES = {
    "ARMOR": "Armor",
    "WEAPONS": "Weapon",
    "POTIONS AND OILS": "Potion",
    "POTIONS": "Potion",
    "RINGS": "Ring",
    "RODS": "Rod",
    "SCROLLS": "Scroll",
    "STAFFS": "Staff",
    "STAVES": "Staff",
    "WANDS": "Wand",
    "WONDROUS ITEMS": "Wondrous Item",
    "SET ITEMS": "Wondrous Item",
    "MINOR ARTIFACTS": "Wondrous Item",
    "SPECIAL MATERIALS": "Wondrous Item",
}
TIER_HEADINGS = {
    "journeyman enchantments",
    "expert enchantments",
    "artisan enchantments",
    "master enchantments",
}
ALCHEMY_SKIP = {
    "site",
    "attunement",
    "draught",
    "philter",
    "alchemical oil",
    "transmutation",
    "item",
    "description",
    "miscellaneous",
}


def fix_split_cap(line: str) -> str:
    line = SPLIT_CAP_RE.sub(r"\1", line)
    return re.sub(
        r"\b(?:[A-Za-z] ){2,}[A-Za-z]\b",
        lambda match: match.group(0).replace(" ", ""),
        line,
    )


def lines_of(reader, start: int, end: int) -> list[tuple[int, str]]:
    return [(page, fix_split_cap(line)) for page, line in wow.page_lines(reader, start, end)]


def slugify(name: str) -> str:
    text = name.lower().replace("'", "")
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def ordinal(value: str) -> str:
    number = int(value)
    if 10 <= number % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(number % 10, "th")
    return f"{number}{suffix}"


def components_dict(raw: str) -> dict:
    flags = {key: False for key in ("V", "S", "M", "F", "DF", "XP")}
    for part in re.split(r"[,/\s]+", raw.upper()):
        if part in flags:
            flags[part] = True
    return flags


def class_slug(name: str) -> str:
    suffix = SUFFIX if name in MMM_CLASS_NAMES else "wow"
    return f"{slugify(name)}-{suffix}"


def parse_spell_classes(level_line: str) -> list[dict]:
    classes = []
    for part in re.split(r",|(?:\s+and\s+)", level_line):
        match = re.match(r"(.+?)\s+(\d+)\s*$", part.strip())
        if not match:
            continue
        level = int(match.group(2))
        for name in re.split(r"\s*/\s*", match.group(1).strip()):
            name = name.strip()
            if not name:
                continue
            classes.append(
                {
                    "name": name,
                    "slug": class_slug(name),
                    "level": level,
                    "url": None,
                    "id": None,
                }
            )
    return classes


def load_parents() -> dict[str, dict]:
    path = wow.OUT_DIR / "wowrpg_core_classes.json"
    records = json.loads(path.read_text(encoding="utf-8"))
    return {record["name"]: record for record in records}


def trim_class_lines(lines: list[tuple[int, str]], name: str) -> list[tuple[int, str]]:
    target = re.sub(r"[^A-Z]", "", name.upper())
    for index, (_, line) in enumerate(lines):
        letters = re.sub(r"[^A-Za-z]", "", line)
        compact = re.sub(r"[^A-Z]", "", line.upper())
        if letters and letters.upper() == letters and target in compact and len(line) < 70:
            return lines[index:]
    return lines


def parse_path_features(lines: list[str]) -> tuple[list[tuple[str, str, str]], list[tuple[int, str]], str, str]:
    features: list[tuple[str, str, str]] = []
    levels: list[tuple[int, str]] = []
    current: tuple[str, str, list[str]] | None = None
    skill_blob = ""
    sidebar: list[str] = []
    started = False
    side = False

    def flush() -> None:
        nonlocal current, skill_blob
        if not current:
            return
        name, kind, bits = current
        body = wow.plain(" ".join(bits))
        features.append((name, kind, body))
        if "skill" in name.lower():
            skill_blob = body
        current = None

    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        if not started:
            if line.lower().startswith("class features"):
                started = True
            continue
        if re.match(r"^(Arcane Spells as Runes|Witch Doctor Spell List|Table\s+\d)", line):
            side = True
        if side:
            sidebar.append(line)
            continue
        bullet = BULLET_RE.match(line)
        section = SECTION_FEAT_RE.match(line)
        if bullet:
            flush()
            label = wow.plain(bullet.group(2)).strip()
            levels.append((int(bullet.group(1)), label))
            current = (label, "", [bullet.group(3)])
            continue
        if section:
            flush()
            label = section.group(1).strip()
            rest = section.group(2).strip()
            current = (label, "", [rest] if rest else [])
            continue
        if current:
            current[2].append(line)
    flush()
    return features, levels, skill_blob, wow.plain(" ".join(sidebar))


def apply_path(record: dict, parent: dict, text: str, body_lines: list[str]) -> None:
    features, level_feats, skill_blob, sidebar = parse_path_features(body_lines)
    record["hit_die"] = parent["hit_die"]
    record["skill_points"] = parent["skill_points"]
    record["index"]["hit_die"] = parent["index"].get("hit_die", "")
    record["index"]["skill_points"] = parent["index"].get("skill_points", "")
    record["index"]["prestige_level"] = ""
    skills = [dict(skill) for skill in parent.get("class_skills") or []]
    known = {skill["name"].lower() for skill in skills}
    blob = re.sub(r"\band\b", ",", skill_blob or "", flags=re.I)
    blob = re.split(r"\.\s+", blob)[0]
    for skill in wow.parse_skills(blob):
        if skill["name"].lower() in {"and", ""} or skill["name"].lower() in known:
            continue
        if skill["name"].lower() not in known:
            skills.append(skill)
            known.add(skill["name"].lower())
    record["class_skills"] = skills
    rows = [copy.deepcopy(row) for row in parent.get("advancement") or []]
    for row in rows:
        special = str(row.get("special") or "").strip().rstrip(",")
        row["special"] = special or "-"
    for level, feat_name in level_feats:
        for row in rows:
            if int(row.get("level") or 0) != level:
                continue
            special = (row.get("special") or "-").strip().rstrip(",")
            if special == "-":
                row["special"] = feat_name
            elif feat_name.lower() not in special.lower():
                row["special"] = f"{special}, {feat_name}"
    record["advancement"] = rows
    record["advancement_html"] = wow.advancement_table(rows)
    record["advancement_text"] = wow.plain(
        " ".join(
            f"{row['level']} {row['bab']} {row['fort']} {row['ref']} {row['will']} {row['special']}"
            for row in rows
        )
    )
    intro_match = re.search(
        r"Description:\s*(.+?)(?:\bClass Features\b|\bHit Die:)",
        text,
        re.S | re.I,
    )
    intro = wow.plain(intro_match.group(1)) if intro_match else ""
    if len(intro) > 700:
        intro = intro[:700].rsplit(" ", 1)[0]
    parent_name = parent["name"].lower()
    article = "an" if parent_name[:1] in "aeiou" else "a"
    note = (
        f"{record['name']} is {article} {parent_name} path. "
        f"It uses the {parent_name} hit die, class skills, base attack bonus, and saves, "
        f"and adds the features below."
    )
    parts = [wow.paragraph(note)]
    if intro:
        parts.append(wow.paragraph(intro))
    parts.append(wow.features_html(features))
    if sidebar:
        parts.append(wow.paragraph(sidebar))
    description = "".join(parts)
    record["description_html"] = description
    record["description_text"] = wow.plain(re.sub(r"<[^>]+>", " ", description))


def normalize_skills(skills: list[dict]) -> list[dict]:
    cleaned = []
    seen: set[str] = set()
    for skill in skills:
        pieces = re.split(r"\s+and\s+", skill.get("name") or "")
        for piece in pieces:
            name = re.sub(r"^and\s+", "", piece, flags=re.I).strip(" ,.")
            if not name or name.lower() == "and":
                continue
            key = name.lower()
            if key in seen:
                continue
            seen.add(key)
            item = dict(skill)
            item["name"] = name
            item["slug"] = slugify(name)
            item["url"] = f"/skills/{item['slug']}"
            if name == "Speak Language":
                item["ability"] = None
            elif name == "Spellcraft":
                item["ability"] = "Int"
            cleaned.append(item)
    return cleaned


def specials_from_text(text: str) -> dict[int, str]:
    flat = wow.plain(text)
    found: dict[int, str] = {}
    pattern = re.compile(
        r"(\d+)(?:st|nd|rd|th)\s+\+\d+(?:/\+\d+)*\s+\+\d+\s+\+\d+\s+\+\d+\s+"
        r"(.+?)(?=\s+\d+(?:st|nd|rd|th)\s+\+\d|\s+Table\b|$)"
    )
    for match in pattern.finditer(flat):
        level = int(match.group(1))
        special = re.sub(r"\s+", " ", match.group(2)).strip().rstrip(",")
        if 1 <= level <= 20 and special and not special.startswith("+"):
            found[level] = special
    return found


def polish_advancement(record: dict, text: str) -> None:
    fuller = specials_from_text(text)
    rows = record.get("advancement") or []
    for row in rows:
        special = str(row.get("special") or "").strip().rstrip(",")
        level = int(row.get("level") or 0)
        candidate = fuller.get(level, "")
        prefix = special.lower()
        if candidate and (prefix in {"", "-"} or candidate.lower().startswith(prefix)):
            special = candidate
        row["special"] = special or "-"
    record["advancement_html"] = wow.advancement_table(rows)
    record["advancement_text"] = wow.plain(
        " ".join(
            f"{row['level']} {row['bab']} {row['fort']} {row['ref']} {row['will']} {row['special']}"
            for row in rows
        )
    )


def extract_classes(reader) -> list[dict]:
    parents = load_parents()
    records = []
    seen: set[str] = set()
    for name, (start, end) in CLASS_RANGES.items():
        lines = trim_class_lines(lines_of(reader, start, end), name)
        body = [text for _, text in lines]
        parent_name = PATH_PARENTS.get(name)
        parent = parents.get(parent_name) if parent_name else None
        record = wow.class_record(
            name,
            "\n".join(body),
            body,
            book=BOOK,
            abbrev=ABBREV,
            suffix=SUFFIX,
            page=start,
            prestige=name in PRESTIGE,
            seen=seen,
            hit_die=parent["hit_die"] if parent else "",
            skill_points=str(parent["index"].get("skill_points") or "") if parent else "",
        )
        if record and parent:
            apply_path(record, parent, "\n".join(body), body)
        if record:
            if name not in PRESTIGE:
                record["requirements_html"] = None
                record["requirements_text"] = None
                record["index"]["prestige_level"] = ""
            record["class_skills"] = normalize_skills(record.get("class_skills") or [])
            if name not in PATH_PARENTS:
                polish_advancement(record, "\n".join(body))
            records.append(record)
        else:
            print("  missing class", name)
    return records


def extract_feats(reader) -> list[dict]:
    lines = lines_of(reader, 26, 29)
    start = 0
    for index, (_, line) in enumerate(lines):
        if re.sub(r"[^A-Z]", "", line.upper()) in {"FEATS", "FEATSFEATS"}:
            start = index
            break
    return wow.extract_feats(lines[start:], ABBREV, BOOK, SUFFIX)


def extract_spell_range(reader, start: int, end: int, seen: set[str]) -> list[dict]:
    lines = lines_of(reader, start, end)
    rows = [line for _, line in lines if line]
    spells = []
    index = 0
    while index < len(rows) - 1:
        school = SCHOOL_RE.match(rows[index + 1])
        name = rows[index].strip()
        if (
            school
            and 2 < len(name) < 70
            and not name.endswith(".")
            and ":" not in name
            and not FIELD_RE.match(name)
            and not name.lower().startswith(("table", "this ", "when ", "if ", "the object"))
        ):
            fields: dict[str, str] = {}
            cursor = index + 2
            while cursor < len(rows):
                field = FIELD_RE.match(rows[cursor])
                if not field:
                    break
                fields[field.group(1).lower()] = field.group(2).strip()
                cursor += 1
            body: list[str] = []
            while cursor < len(rows):
                nxt = rows[cursor]
                if (
                    cursor + 1 < len(rows)
                    and SCHOOL_RE.match(rows[cursor + 1])
                    and not FIELD_RE.match(nxt)
                    and 2 < len(nxt) < 70
                    and not nxt.endswith(".")
                ):
                    break
                body.append(nxt)
                cursor += 1
            record = spell_record(name, school, fields, " ".join(body), start, seen)
            if record:
                spells.append(record)
            index = cursor
            continue
        index += 1
    return spells


def extract_spells(reader) -> list[dict]:
    seen: set[str] = set()
    spells = extract_spell_range(reader, 49, 64, seen)
    spells.extend(extract_spell_range(reader, 69, 92, seen))
    return spells


def spell_record(name: str, school_match: re.Match, fields: dict, body: str, page: int, seen: set[str]) -> dict | None:
    level = fields.get("level", "")
    if not level:
        return None
    school = school_match.group(1).title()
    tail = school_match.group(2).strip()
    descriptors = re.findall(r"\[([^\]]+)\]", tail)
    subschool = ""
    paren = re.search(r"\(([^)]+)\)", tail)
    if paren:
        subschool = paren.group(1)
    school_label = school
    if subschool:
        school_label += f" ({subschool})"
    if descriptors:
        school_label += " [" + ", ".join(descriptors) + "]"
    text = wow.plain(body)
    slug = wow.unique_slug(name, SUFFIX, seen)
    record = wow.base_record(slug, wow.plain(name), BOOK, ABBREV, page)
    components = fields.get("components", "")
    casting = fields.get("casting time") or fields.get("empowerment time") or ""
    record["index"].update(
        {
            "school": school_label,
            "components": components_dict(components),
            "description_snippet": text[:180],
        }
    )
    record.update(
        {
            "school": school_label,
            "casting_time": casting,
            "components": components,
            "range": fields.get("range", ""),
            "target": fields.get("target") or None,
            "area": fields.get("area") or None,
            "effect": fields.get("effect") or None,
            "duration": fields.get("duration", ""),
            "saving_throw": fields.get("saving throw", ""),
            "spell_resistance": fields.get("spell resistance", ""),
            "classes": parse_spell_classes(level),
            "description_html": wow.paragraph(text),
            "description_text": text,
            "descriptors": descriptors,
            "domains": None,
        }
    )
    return record


def section_type(line: str) -> str | None:
    compact = re.sub(r"[^A-Z ]", "", line.upper()).strip()
    compact = re.sub(r"\s+", " ", compact)
    return SECTION_TYPES.get(compact)


def is_item_heading(line: str) -> bool:
    if not line or len(line) > 45 or line.endswith(".") or ":" in line or ";" in line:
        return False
    if not line[:1].isupper() or re.search(r"\d", line):
        return False
    if "continued" in line.lower():
        return False
    words = [word.strip(",") for word in line.split()]
    if not words or len(words) > 6:
        return False
    if words[-1].lower() in {"the", "a", "of", "and", "to", "that", "this", "with", "for", "on", "from"}:
        return False
    for word in words:
        bare = word.strip("()")
        if not bare or bare.lower() in SMALL_WORDS:
            continue
        if not bare[:1].isupper():
            return False
    return True


def extract_items(reader) -> list[dict]:
    lines = lines_of(reader, 95, 157)
    items = []
    seen: set[str] = set()
    kind = "Wondrous Item"
    name = ""
    page = 95
    body: list[str] = []

    def flush(stat: str) -> None:
        nonlocal name, body
        if not name or not is_item_heading(name):
            name = ""
            body = []
            return
        match = STAT_RE.match(wow.plain(stat))
        if not match:
            body = []
            return
        price_match = PRICE_RE.search(match.group("body"))
        price = price_match.group(1).strip(" .") if price_match else ""
        weight_match = re.search(r"(\d+(?:/\d+)?)\s*lb", stat, re.I)
        text = wow.plain(" ".join(body))
        text = re.sub(r"^Description:\s*", "", text, flags=re.I)
        if len(text) < 20:
            name = ""
            body = []
            return
        slug = wow.unique_slug(name, SUFFIX, seen)
        record = wow.base_record(slug, name, BOOK, ABBREV, page)
        aura = f"{match.group('strength').title()} {match.group('school').strip()}"
        record["index"].update({"type": kind, "price": price})
        record.update(
            {
                "price": price,
                "caster_level": ordinal(match.group("cl")),
                "aura": aura,
                "activation": "",
                "weight": f"{weight_match.group(1)} lb." if weight_match else "",
                "slot": kind,
                "description_html": wow.paragraph(text),
                "description_text": text,
            }
        )
        items.append(record)
        name = ""
        body = []

    pending_stat = ""
    for line_page, line in lines:
        found = section_type(line)
        if found:
            kind = found
            continue
        if pending_stat:
            pending_stat = wow.plain(pending_stat + " " + line)
            if "price" in pending_stat.lower():
                flush(pending_stat)
                pending_stat = ""
            elif len(pending_stat) > 400:
                pending_stat = ""
            continue
        if AURA_START_RE.match(line) and "CL" in line.upper():
            if "price" in line.lower():
                flush(line)
            else:
                pending_stat = line
            continue
        if is_item_heading(line):
            if name and not body:
                name = f"{name} {wow.plain(line).strip(' -')}"
            else:
                name = wow.plain(line).strip(" -")
                page = line_page
                body = []
            continue
        if name:
            body.append(line)
    return items


def equipment_record(name: str, *, kind: str, category: str, cost: str, page: int, text: str, seen: set[str]) -> dict:
    slug = wow.unique_slug(name, SUFFIX, seen)
    record = wow.base_record(slug, name, BOOK, ABBREV, page)
    record["index"].update(
        {"kind": kind, "category": category, "stats": "", "cost": cost, "weight": "-"}
    )
    record.update(
        {
            "kind": kind,
            "category": category,
            "cost": cost,
            "weight": "-",
            "description_html": wow.paragraph(text),
            "description_text": text,
        }
    )
    return record


def extract_alchemy(reader, seen: set[str]) -> list[dict]:
    lines = lines_of(reader, 29, 36)
    costs: dict[str, str] = {}
    for _, line in lines:
        if ":" in line or line.lower().startswith("enchantments"):
            continue
        match = TABLE_GP_RE.match(line.strip())
        if match:
            costs[match.group(1).strip().lower()] = match.group(2)
    records = []
    by_name: dict[str, dict] = {}
    name = ""
    page = 29
    buf: list[str] = []

    def flush() -> None:
        nonlocal name, buf
        if not name:
            buf = []
            return
        text = wow.plain(" ".join(buf))
        price_match = re.search(r"Price\s+(.+?)(?:\.|$)", text, re.I)
        cost = price_match.group(1).strip() if price_match else costs.get(name.lower(), "-")
        key = name.lower()
        if key in by_name:
            if text and len(text) > len(by_name[key].get("description_text") or ""):
                by_name[key]["description_html"] = wow.paragraph(text)
                by_name[key]["description_text"] = text
            if cost != "-":
                by_name[key]["cost"] = cost
                by_name[key]["index"]["cost"] = cost
        else:
            record = equipment_record(
                name, kind="good", category="alchemy", cost=cost, page=page, text=text, seen=seen
            )
            by_name[key] = record
            records.append(record)
        name = ""
        buf = []

    for line_page, line in lines:
        if line.upper() in {"ALCHEMY", "ENCHANTMENTS"} or "enchantments are organized" in line.lower():
            continue
        match = ALCHEMY_ENTRY_RE.match(line)
        if match and match.group(1).strip().lower() not in ALCHEMY_SKIP and "product" not in match.group(1).lower():
            flush()
            name = wow.plain(match.group(1)).strip()
            page = line_page
            buf = [match.group(2)]
            continue
        if name:
            buf.append(line)
    flush()
    for label, cost in costs.items():
        if label not in by_name:
            records.append(
                equipment_record(
                    label.title(),
                    kind="good",
                    category="alchemy",
                    cost=cost,
                    page=29,
                    text="",
                    seen=seen,
                )
            )
    return records


def enchant_slot(line: str) -> str:
    lower = line.lower()
    if "weapon" in lower:
        return "Weapon"
    if "armor" in lower or "shield" in lower:
        return "Armor"
    return "Wondrous Item"


def extract_enchantments(reader, seen: set[str]) -> list[dict]:
    lines = lines_of(reader, 36, 44)
    items = []
    slot = "Wondrous Item"
    name = ""
    price = ""
    page = 36
    buf: list[str] = []

    def flush() -> None:
        nonlocal name, price, buf
        if not name:
            buf = []
            return
        text = wow.plain(" ".join(buf))
        if len(text) < 15:
            name = ""
            buf = []
            return
        slug = wow.unique_slug(name, SUFFIX, seen)
        record = wow.base_record(slug, name, BOOK, ABBREV, page)
        record["index"].update({"type": slot, "price": price})
        record.update(
            {
                "price": price,
                "caster_level": "",
                "aura": "",
                "activation": "",
                "weight": "",
                "slot": slot,
                "description_html": wow.paragraph(text),
                "description_text": text,
            }
        )
        items.append(record)
        name = ""
        price = ""
        buf = []

    started = False
    pending = ""
    slot_words = {
        "melee weapon",
        "ranged weapon",
        "armor",
        "shield",
        "glove",
        "gloves",
        "bracer",
        "bracers",
        "cloak",
        "boot",
        "boots",
        "helm",
        "helms",
    }
    for line_page, line in lines:
        lower = line.lower()
        if not started:
            if "enchantments are organized" in lower:
                started = True
            continue
        if lower in TIER_HEADINGS:
            pending = ""
            continue
        if lower in slot_words:
            pending = line
            continue
        if lower.endswith("enchantments") and len(line) < 40 and ":" not in line:
            flush()
            slot = enchant_slot(f"{pending} {line}".strip() if pending else line)
            pending = ""
            continue
        pending = ""
        match = EP_RE.match(line)
        if match:
            flush()
            name = wow.plain(match.group(1)).strip()
            price = f"{match.group(2)} EP"
            page = line_page
            buf = [match.group(3)]
            continue
        if name:
            buf.append(line)
    flush()
    return items


def extract_patterns(reader, seen: set[str]) -> list[dict]:
    lines = lines_of(reader, 44, 49)
    records = []
    name = ""
    page = 44
    buf: list[str] = []

    def flush() -> None:
        nonlocal name, buf
        if not name or name == "Rune Patterns":
            name = ""
            buf = []
            return
        text = wow.plain(" ".join(buf))
        site = re.search(r"Site:\s*(.+?)(?=Attunement:|$)", text)
        attune = re.search(r"Attunement:\s*(.+)", text)
        parts = []
        if site:
            parts.append(f"Site: {site.group(1).strip()}")
        if attune:
            parts.append(f"Attunement: {attune.group(1).strip()}")
        body = " ".join(parts) or text
        records.append(
            equipment_record(
                name,
                kind="good",
                category="rune pattern",
                cost="-",
                page=page,
                text=body,
                seen=seen,
            )
        )
        name = ""
        buf = []

    for line_page, line in lines:
        if PATTERN_RE.match(line) and not line.endswith("Runes"):
            flush()
            name = line
            page = line_page
            buf = []
            continue
        if name and not line.endswith("Pattern Runes"):
            buf.append(line)
    flush()
    return records


def extract_tech(reader, seen: set[str]) -> list[dict]:
    lines = lines_of(reader, 164, 201)
    records = wow.extract_tech(lines, set())
    retagged = []
    for record in records:
        slug = record["slug"]
        if slug.endswith("-wow"):
            slug = slug[:-4] + f"-{SUFFIX}"
        if slug in seen:
            slug = wow.unique_slug(record["name"], SUFFIX, seen)
        else:
            seen.add(slug)
        record["slug"] = slug
        record["source"] = {
            "name": BOOK,
            "abbrev": ABBREV,
            "edition": EDITION,
            "page": (record.get("source") or {}).get("page"),
            "url": None,
        }
        record["index"]["source_abbrev"] = ABBREV
        retagged.append(record)
    return retagged


def main() -> int:
    pdf = next(Path(wow.PDF_DIR).glob("WOWRPG*More*.pdf"))
    reader = wow.PdfReader(str(pdf))
    print(f"More Magic and Mayhem pages {len(reader.pages)}")
    classes = extract_classes(reader)
    feats = extract_feats(reader)
    spells = extract_spells(reader)
    items = extract_items(reader)
    item_slugs = {record["slug"] for record in items}
    items.extend(extract_enchantments(reader, item_slugs))
    equip_seen: set[str] = set()
    equipment = extract_alchemy(reader, equip_seen)
    equipment.extend(extract_patterns(reader, equip_seen))
    equipment.extend(extract_tech(reader, equip_seen))
    wow.write_json("wowrpg_mmm_classes.json", classes)
    wow.write_json("wowrpg_mmm_feats.json", feats)
    wow.write_json("wowrpg_mmm_spells.json", spells)
    wow.write_json("wowrpg_mmm_items.json", items)
    wow.write_json("wowrpg_mmm_equipment.json", equipment)
    print(
        f"  classes {len(classes)} feats {len(feats)} spells {len(spells)} "
        f"items {len(items)} equipment {len(equipment)}"
    )
    for record in classes:
        print(
            "   ",
            record["name"],
            "hd",
            record.get("hit_die"),
            "levels",
            len(record.get("advancement") or []),
            "skills",
            len(record.get("class_skills") or []),
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
