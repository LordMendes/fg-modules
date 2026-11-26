#!/usr/bin/env python3
"""Add Core Rules healer, path, and domain spells to wowrpg_core_spells.json.

Chapter 16 lists the healer, druid, priest, shaman, and domain spells.
Chapter 17 has the spell entries. Spells already in the core file keep their
text and gain the missing list tags. Spells that are not in the file are
appended, so existing Fantasy Grounds spell ids stay put.

    python scripts/extract_wow_healer_spells.py
    python scripts/extract_wow_healer_spells.py --write
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
SPELLS_PATH = ROOT / "data" / "dndtools" / "supplemental" / "wowrpg_core_spells.json"
PDF = next(REPO.glob("WOWRPG Core*.pdf"))

NOW = "2026-11-25T00:00:00Z"
BOOK = "World of Warcraft: The Roleplaying Game"

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

STAT_KEYS = (
    "Level",
    "Components",
    "Casting Time",
    "Range",
    "Target",
    "Targets",
    "Area",
    "Effect",
    "Duration",
    "Saving Throw",
    "Spell Resistance",
)

CLASS_ABBREV = {
    "Arc": "Arcanist",
    "Mag": "Mage",
    "Mge": "Mage",
    "Ncr": "Necromancer",
    "Wrl": "Warlock",
    "Hlr": "Healer",
    "Hel": "Healer",
    "Drd": "Druid",
    "Pre": "Priest",
    "Pri": "Priest",
    "Prs": "Priest",
    "Sha": "Shaman",
    "Shm": "Shaman",
    "Pal": "Paladin",
    "Elr": "Elven Ranger",
    "Htr": "Hunter",
    "Asn": "Assassin",
}

FULL_CLASSES = (
    "Elven Ranger",
    "Arcanist",
    "Necromancer",
    "Warlock",
    "Paladin",
    "Assassin",
    "Healer",
    "Hunter",
    "Druid",
    "Priest",
    "Shaman",
    "Mage",
)

DOMAINS = (
    "Animal",
    "Death",
    "Destruction",
    "Elements",
    "Healing",
    "Protection",
    "Spirits",
    "War",
    "Wild",
)

HEALER_LISTS = {
    "Healer",
    "Druid",
    "Priest",
    "Shaman",
    *(f"{name} Domain" for name in DOMAINS),
}

LIST_ORDER = (
    "Healer",
    "Druid",
    "Priest",
    "Shaman",
    *(f"{name} Domain" for name in DOMAINS),
)

_LEVEL_WORDS = FULL_CLASSES + DOMAINS + tuple(sorted(CLASS_ABBREV, key=len, reverse=True))
LEVEL_RE = re.compile(
    r"\b(" + "|".join(re.escape(word) for word in _LEVEL_WORDS) + r")\s*(\d+)"
)
STAT_RE = re.compile(r"^(" + "|".join(STAT_KEYS) + r"):\s*(.*)$")
HEADING_RE = re.compile(
    r"^(?:(\d+)(?:st|nd|rd|th)|0)-Level (Healer|Druid|Priest|Shaman) Spells\b"
)
DOMAIN_HEAD_RE = re.compile(r"^(" + "|".join(DOMAINS) + r") Domain\b")
DOMAIN_SPELL_RE = re.compile(
    r"^(\d+)(?:st|nd|rd|th)[\u2014\u2013\-]+\s*(.+?):\s*(.*)$"
)
LIST_ENTRY_RE = re.compile(r"^([A-Z][^:]{1,80}?)\s*:\s*(.*)$")
COMPONENT_PARA_RE = re.compile(
    r"((?:Arcane |Divine )?(?:Material Component|Focus|XP Cost):)"
)


def clean_line(line: str) -> str:
    line = (
        line.replace("\u00ad", "")
        .replace("\ufb01", "fi")
        .replace("\ufb02", "fl")
        .replace("ﬁ", "fi")
        .replace("ﬂ", "fl")
        .replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u2212", "-")
    )
    line = line.replace("\u00a0", " ").replace("\u2009", " ").replace("\u202f", " ")
    line = re.sub(r"fl\s+([a-z])", r"fl\1", line)
    line = re.sub(r"fi\s+([a-z])", r"fi\1", line)
    line = re.sub(r"\b([B-HJ-Z]) ([a-z])", r"\1\2", line)
    if re.match(r"^A [a-z]", line):
        joined = "A" + line[2:]
        if joined.startswith(SCHOOLS):
            line = joined
    line = re.sub(r"\s+", " ", line).strip()
    return collapse_doubled(line)


def collapse_doubled(line: str) -> str:
    if len(line) > 160 or ". " in line:
        return line
    compact = re.sub(r"[^A-Za-z0-9]", "", line)
    if len(compact) < 8 or len(compact) % 2 != 0:
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
    return "".join(out).strip(" ,:-") or line


def is_chrome(line: str) -> bool:
    if not line:
        return False
    upper = line.upper()
    if upper.startswith("CHAPTER "):
        return True
    if upper in {
        "HEALER SPELL LISTS",
        "ARCANIST SPELL LISTS",
        "PALADIN SPELLS",
    }:
        return True
    return False


def merge_hyphens(rows: list[tuple[int, str]]) -> list[tuple[int, str]]:
    merged: list[tuple[int, str]] = []
    for page, line in rows:
        prev_page, prev = merged[-1] if merged else (None, "")
        if prev_page == page and prev.endswith("-") and line[:1].islower():
            # "crea-" + "ture" joins. "50-ft.-" + "radius" keeps the hyphen.
            joined = prev[:-1] + line if prev[-2:-1].isalpha() else prev + line
            merged[-1] = (prev_page, joined)
        else:
            merged.append((page, line))
    return merged


def page_rows(reader: PdfReader, start: int, end: int) -> list[tuple[int, str]]:
    rows: list[tuple[int, str]] = []
    book_page = start
    for idx in range(start - 1, min(end, len(reader.pages))):
        raw = reader.pages[idx].extract_text() or ""
        if "CHAPTER EIGHTEEN" in raw.upper()[:400] or "CHAPTER 18" in raw.upper()[:400]:
            break
        for line in raw.splitlines():
            text = clean_line(line)
            if text.isdigit() and 200 <= int(text) <= 450:
                book_page = int(text)
                continue
            if is_chrome(text):
                continue
            if not text:
                rows.append((book_page, ""))
                continue
            rows.append((book_page, text))
        rows.append((book_page, ""))
    return merge_hyphens(rows)


def is_school_line(line: str) -> bool:
    """A school stat line, not a spell that shares a school name."""
    if not line or "." in line or len(line) > 80:
        return False
    if line.startswith("(") or line.startswith("["):
        return True
    for school in SCHOOLS:
        if line == school or line.startswith(school + " ") or line.startswith(school + "(") or line.startswith(school + "["):
            return True
    return False


def parse_level(text: str) -> tuple[list[tuple[str, int]], set[str]]:
    found: list[tuple[str, int]] = []
    unknown: set[str] = set()
    for match in LEVEL_RE.finditer(text):
        token = match.group(1)
        level = int(match.group(2))
        if token in DOMAINS:
            found.append((f"{token} Domain", level))
            continue
        name = CLASS_ABBREV.get(token, token if token in FULL_CLASSES else None)
        if name is None:
            unknown.add(token)
            continue
        found.append((name, level))
    return found, unknown


def parse_spells(rows: list[tuple[int, str]]) -> tuple[list[dict], set[str]]:
    lines = [text for _, text in rows]
    pages = [page for page, _ in rows]
    level_at = [i for i, line in enumerate(lines) if line.startswith("Level:")]
    unknown: set[str] = set()
    spells: list[dict] = []
    skipped = 0
    for pos, level_i in enumerate(level_at):
        name_i, name, school = _name_and_school(lines, level_i)
        if name_i is None or not name:
            orphan = _orphan_on_page(lines, pages, level_i)
            if orphan is None:
                skipped += 1
                continue
            name_i, name, school = orphan
        if not school and not name:
            continue
        next_name = len(lines)
        if pos + 1 < len(level_at):
            next_name_i, _, _ = _name_and_school(lines, level_at[pos + 1])
            if next_name_i is not None:
                next_name = next_name_i
        fields, cursor = _stat_fields(lines, level_i, next_name)
        level_text = fields.get("Level", "")
        classes, missed = parse_level(level_text)
        unknown |= missed
        body_lines = lines[cursor:next_name]
        description = _description(body_lines)
        if not classes or not description:
            continue
        spells.append(
            {
                "name": name.strip(" *"),
                "page": pages[name_i],
                "school": school,
                "level_text": level_text,
                "classes": classes,
                "components": fields.get("Components", ""),
                "casting_time": fields.get("Casting Time", ""),
                "range": fields.get("Range", ""),
                "target": fields.get("Target") or fields.get("Targets") or "",
                "area": fields.get("Area", ""),
                "effect": fields.get("Effect", ""),
                "duration": fields.get("Duration", ""),
                "saving_throw": fields.get("Saving Throw", ""),
                "spell_resistance": fields.get("Spell Resistance", ""),
                "description": description,
            }
        )
    _inherit_variant_stats(spells)
    print(f"level lines {len(level_at)}; skipped names {skipped}; kept {len(spells)}")
    return spells, unknown


_STAT_COPY = (
    "components",
    "casting_time",
    "range",
    "target",
    "area",
    "effect",
    "duration",
    "saving_throw",
    "spell_resistance",
)


def _inherit_variant_stats(spells: list[dict]) -> None:
    """'As frost nova, except...' entries omit the school and the stat block."""
    base: dict | None = None
    for spell in spells:
        if spell["school"]:
            if spell["components"]:
                base = spell
            continue
        if base is None:
            continue
        spell["school"] = base["school"]
        for field in _STAT_COPY:
            if not spell[field]:
                spell[field] = base[field]


def _is_school_piece(line: str) -> bool:
    if not line or len(line) > 80 or "." in line:
        return False
    if is_school_line(line) or line.startswith(("(", "[")):
        return True
    return line.endswith(("]", ","))


def _looks_like_name(line: str) -> bool:
    if not line or len(line) < 3 or len(line) > 80:
        return False
    if line[:1].islower() or line.endswith("."):
        return False
    return STAT_RE.match(line) is None


def _name_and_school(
    lines: list[str], level_i: int
) -> tuple[int | None, str, str]:
    """Spell name sits above Level. Variants omit the school line.

    School lines sometimes split across 'Enchantment' / '(Compulsion)' /
    '[Mind-Affecting]'. A spell named Divination is the copy of that word
    sitting directly above the school line.
    """
    j = level_i - 1
    while j >= 0 and not lines[j]:
        j -= 1
    school: list[str] = []
    while j >= 0 and _is_school_piece(lines[j]) and len(school) < 6:
        if lines[j] in SCHOOLS and j > 0 and lines[j - 1] == lines[j]:
            school.append(lines[j])
            j -= 1
            break
        school.append(lines[j])
        j -= 1
        while j >= 0 and not lines[j]:
            j -= 1
    if j < 0 or not lines[j] or not _looks_like_name(lines[j]):
        return None, "", ""
    school.reverse()
    return j, lines[j], " ".join(school)


def _orphan_on_page(
    lines: list[str], pages: list[int], level_i: int
) -> tuple[int, str, str] | None:
    """Column order can put the spell name at the bottom and Level at the top."""
    page = pages[level_i]
    i = level_i + 1
    while i < len(lines) and pages[i] == page:
        if lines[i] and _looks_like_name(lines[i]) and lines[i] not in SCHOOLS:
            k = i + 1
            while k < len(lines) and pages[k] == page and not lines[k]:
                k += 1
            if k < len(lines) and pages[k] == page and _is_school_piece(lines[k]):
                end = k
                parts: list[str] = []
                while end < len(lines) and pages[end] == page and _is_school_piece(lines[end]):
                    parts.append(lines[end])
                    end += 1
                while end < len(lines) and pages[end] == page and not lines[end]:
                    end += 1
                follows_level = end < len(lines) and pages[end] == page and lines[end].startswith("Level:")
                if not follows_level and any(part.startswith(SCHOOLS) for part in parts):
                    return i, lines[i], " ".join(parts)
        i += 1
    return None


def _stat_fields(
    lines: list[str], level_i: int, stop: int
) -> tuple[dict[str, str], int]:
    fields: dict[str, str] = {}
    current: str | None = None
    k = level_i
    while k < stop:
        line = lines[k]
        if not line:
            k += 1
            if current == "Spell Resistance":
                break
            continue
        match = STAT_RE.match(line)
        if match:
            current = match.group(1)
            fields[current] = match.group(2).strip()
            k += 1
            continue
        if current is None:
            break
        previous = fields[current]
        level_wrap = current == "Level" and (
            previous.endswith(",") or LEVEL_RE.fullmatch(line) is not None
        )
        if (
            not previous
            or line[:1].islower()
            or line.startswith("(")
            or level_wrap
            or previous.endswith((",", "(", "/"))
        ):
            fields[current] = (previous + " " + line).strip()
            k += 1
            continue
        break
    return fields, k


def _description(lines: list[str]) -> str:
    paragraphs: list[str] = []
    buf: list[str] = []

    def flush() -> None:
        if not buf:
            return
        text = re.sub(r"\s+", " ", " ".join(buf)).strip()
        text = re.sub(r"(?<=[\d.])/ ", "/", text)
        text = re.sub(r"\s+([,.;:])", r"\1", text)
        if text:
            paragraphs.append(text)
        buf.clear()

    for line in lines:
        if not line:
            flush()
            continue
        if buf and COMPONENT_PARA_RE.match(line):
            flush()
        buf.append(line)
    flush()
    cleaned: list[str] = []
    for para in paragraphs:
        parts = COMPONENT_PARA_RE.split(para)
        if len(parts) == 1:
            cleaned.append(para)
            continue
        lead = parts[0].strip()
        if lead:
            cleaned.append(lead)
        for i in range(1, len(parts), 2):
            label = parts[i]
            rest = parts[i + 1] if i + 1 < len(parts) else ""
            cleaned.append(f"{label}{rest}".strip())
    return "\n\n".join(cleaned).strip()


def strip_list_name(raw: str) -> str:
    name = re.sub(r"\[[A-Za-z]{2}\]", "", raw)
    name = name.replace("*", "")
    parts = name.split()
    while parts and re.fullmatch(
        r"(?:M|F|X|DF|XP)(?:/(?:M|F|X|DF|XP))*", parts[-1]
    ):
        parts.pop()
    return clean_line(" ".join(parts))


def parse_lists(rows: list[tuple[int, str]]) -> dict[str, dict[int, set[str]]]:
    lists: dict[str, dict[int, set[str]]] = {}
    current: tuple[str, int] | None = None
    skipping = False
    for _, line in rows:
        if not line:
            continue
        if line.upper().startswith("PALADIN SPELL"):
            break
        heading = HEADING_RE.match(line)
        if heading:
            level = int(heading.group(1) or 0)
            current = (heading.group(2), level)
            skipping = False
            continue
        domain = DOMAIN_HEAD_RE.match(line)
        if domain:
            current = (f"{domain.group(1)} Domain", -1)
            skipping = True
            continue
        if line.startswith("Lesser Power") or line.startswith("Greater Power"):
            skipping = True
            continue
        domain_spell = DOMAIN_SPELL_RE.match(line)
        if domain_spell and current and current[0].endswith(" Domain"):
            skipping = False
            name = strip_list_name(domain_spell.group(2))
            level = int(domain_spell.group(1))
            lists.setdefault(current[0], {}).setdefault(level, set()).add(name)
            continue
        if skipping or current is None:
            continue
        entry = LIST_ENTRY_RE.match(line)
        if not entry:
            continue
        name = strip_list_name(entry.group(1))
        if not name or len(name) > 70:
            continue
        list_name, level = current
        if level < 0:
            continue
        lists.setdefault(list_name, {}).setdefault(level, set()).add(name)
    return lists


def name_keys(name: str) -> set[str]:
    base = re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
    base = re.sub(r"\s+", " ", base)
    keys = {base}
    match = re.match(r"(.+) (mass|lesser|greater)$", base)
    if match:
        keys.add(f"{match.group(2)} {match.group(1)}")
    match = re.match(r"(mass|lesser|greater) (.+)$", base)
    if match:
        keys.add(f"{match.group(2)} {match.group(1)}")
    return keys


def slugify(name: str) -> str:
    base = name.lower().replace("'", "")
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return f"{base}-wow"


def class_entry(name: str, level: int) -> dict:
    return {
        "name": name,
        "slug": slugify(name),
        "level": level,
        "url": None,
        "id": None,
    }


def components_index(raw: str) -> dict[str, bool]:
    letters = set(re.findall(r"\b(V|S|M|F|DF|XP)\b", raw or ""))
    if "DF" in (raw or "") and "F" in letters and "DF" not in letters:
        letters.add("DF")
    return {key: key in letters or (key == "DF" and "DF" in (raw or "")) for key in ("V", "S", "M", "F", "DF", "XP")}


def paragraph_html(text: str) -> str:
    parts = []
    for para in text.split("\n\n"):
        clean = para.strip()
        if clean:
            parts.append(f"<p>{html.escape(clean, quote=False)}</p>")
    return "".join(parts)


def new_record(spell: dict, seen: set[str]) -> dict:
    slug = slugify(spell["name"])
    if slug in seen:
        n = 2
        while f"{slug}-{n}" in seen:
            n += 1
        slug = f"{slug}-{n}"
    seen.add(slug)
    classes = [class_entry(name, level) for name, level in spell["classes"]]
    description = spell["description"]
    snippet = re.sub(r"\s+", " ", description)[:160]
    return {
        "slug": slug,
        "name": spell["name"],
        "source_url": None,
        "scraped_at": NOW,
        "source": {
            "name": BOOK,
            "abbrev": "WoW",
            "edition": "WoW RPG (3.5)",
            "page": spell["page"],
            "url": None,
        },
        "index": {
            "source_abbrev": "WoW",
            "edition": "WoW RPG (3.5)",
            "school": spell["school"],
            "components": components_index(spell["components"]),
            "description_snippet": snippet,
        },
        "school": spell["school"],
        "casting_time": spell["casting_time"],
        "components": spell["components"],
        "range": spell["range"],
        "target": spell["target"] or None,
        "area": spell["area"] or None,
        "effect": spell["effect"] or None,
        "duration": spell["duration"],
        "saving_throw": spell["saving_throw"] or "None",
        "spell_resistance": spell["spell_resistance"] or "No",
        "classes": classes,
        "description_html": paragraph_html(description),
        "description_text": description,
        "descriptors": [],
        "domains": None,
    }


def healer_classes(spell: dict) -> list[tuple[str, int]]:
    ordered = []
    seen = set()
    for name, level in spell["classes"]:
        if name not in HEALER_LISTS or (name, level) in seen:
            continue
        seen.add((name, level))
        ordered.append((name, level))
    rank = {name: i for i, name in enumerate(LIST_ORDER)}
    ordered.sort(key=lambda item: (rank.get(item[0], 99), item[1], item[0]))
    return ordered


def merge(existing: list[dict], spells: list[dict]) -> tuple[list[dict], dict[str, int]]:
    by_key: dict[str, dict] = {}
    for record in existing:
        for key in name_keys(record.get("name") or ""):
            by_key.setdefault(key, record)
    seen_slugs = {record.get("slug") for record in existing}
    added = 0
    tagged = 0
    for spell in spells:
        wanted = healer_classes(spell)
        if not wanted:
            continue
        match = None
        for key in name_keys(spell["name"]):
            match = by_key.get(key)
            if match is not None:
                break
        if match is None:
            record = new_record(spell, seen_slugs)
            # Keep non-healer tags from the Level line on new spells.
            record["classes"] = [class_entry(name, level) for name, level in spell["classes"]]
            existing.append(record)
            for key in name_keys(record["name"]):
                by_key.setdefault(key, record)
            added += 1
            continue
        have = {(entry.get("name"), entry.get("level")) for entry in match.get("classes") or []}
        extra = [class_entry(name, level) for name, level in wanted if (name, level) not in have]
        if extra:
            match.setdefault("classes", []).extend(extra)
            tagged += 1
    return existing, {"added": added, "tagged": tagged}


def expand_slash(name: str) -> list[str]:
    """'Detect Chaos/Evil/Good/Law' is four spell names in Chapter 17."""
    if "/" not in name:
        return [name]
    slash = name.find("/")
    space = name.rfind(" ", 0, slash)
    if space < 0:
        return [name]
    prefix = name[: space + 1]
    parts = [prefix + part.strip() for part in name[space + 1 :].split("/") if part.strip()]
    return parts or [name]


def apply_chapter_lists(
    lists: dict[str, dict[int, set[str]]], spells: list[dict]
) -> list[str]:
    """Add a Chapter 16 list tag when the spell's Level line omitted it."""
    index = [(name_keys(spell["name"]), spell) for spell in spells]
    conflicts: list[str] = []
    for list_name, levels in lists.items():
        for level, names in levels.items():
            for raw in names:
                for name in expand_slash(raw):
                    hits = [
                        spell
                        for keys, spell in index
                        if not keys.isdisjoint(name_keys(name))
                    ]
                    if not hits:
                        continue
                    spell = hits[0]
                    have = [lv for listed, lv in spell["classes"] if listed == list_name]
                    if have:
                        if level not in have:
                            conflicts.append(
                                f"{spell['name']}: {list_name} list {level}, stat block {have[0]}"
                            )
                        continue
                    spell["classes"].append((list_name, level))
    return conflicts


def cross_check(
    lists: dict[str, dict[int, set[str]]], spells: list[dict]
) -> list[str]:
    have: dict[str, dict[int, set[str]]] = {}
    for spell in spells:
        keys = name_keys(spell["name"])
        for list_name, level in healer_classes(spell):
            have.setdefault(list_name, {}).setdefault(level, set()).update(keys)
    missing = []
    for list_name, levels in lists.items():
        for level, names in sorted(levels.items()):
            for name in sorted(names):
                found = have.get(list_name, {}).get(level, set())
                parts = expand_slash(name)
                if all(not name_keys(part).isdisjoint(found) for part in parts):
                    continue
                missing.append(f"{list_name} {level}: {name}")
    return missing


def main() -> int:
    write = "--write" in sys.argv
    reader = PdfReader(str(PDF))
    print(f"reading {PDF.name} ({len(reader.pages)} pages)")
    list_rows = page_rows(reader, 268, 276)
    spell_rows = page_rows(reader, 276, 400)
    lists = parse_lists(list_rows)
    spells, unknown = parse_spells(spell_rows)
    conflicts = apply_chapter_lists(lists, spells)
    healer = [spell for spell in spells if healer_classes(spell)]
    print(f"parsed spells: {len(spells)}; healer-list spells: {len(healer)}")
    if spells:
        print(f"first {spells[0]['name']!r} p{spells[0]['page']}; last {spells[-1]['name']!r} p{spells[-1]['page']}")
    index_path = Path(__file__).with_name("_healer_names.txt")
    index_path.write_text(
        "\n".join(f"{spell['page']}\t{spell['name']}\t{spell['level_text']}" for spell in spells),
        encoding="utf-8",
    )
    if unknown:
        print("unknown level abbreviations:", ", ".join(sorted(unknown)))
    for list_name in ("Healer", "Druid", "Priest", "Shaman", *(f"{n} Domain" for n in DOMAINS)):
        chapter = sum(len(names) for names in lists.get(list_name, {}).values())
        parsed = sum(1 for spell in healer if any(name == list_name for name, _ in healer_classes(spell)))
        print(f"  {list_name}: chapter 16 {chapter}, chapter 17 {parsed}")
    missing = cross_check(lists, healer)
    print(f"chapter 16 names not matched: {len(missing)}")
    indexed = [(name_keys(spell["name"]), spell) for spell in spells]
    for line in missing:
        print("  ", line)
        label, _, listed = line.partition(": ")
        hits = [spell for keys, spell in indexed if not keys.isdisjoint(name_keys(listed))]
        if not hits:
            print("     no spell with that name")
            continue
        for spell in hits[:3]:
            print(f"     parsed {spell['name']!r} level={spell['level_text']!r}")
    print(f"stat block / list level conflicts: {len(conflicts)}")
    for line in conflicts:
        print("  ", line)
    anchors = (
        "Cure Light Wounds",
        "Charm Animal",
        "Roar",
        "Bless",
        "Detect Magic",
        "Geas/Quest",
        "Inner Fire, Lesser",
        "Moonfire, Greater",
        "Withering Blight",
    )
    by_name = {spell["name"].lower(): spell for spell in spells}
    for anchor in anchors:
        spell = by_name.get(anchor.lower())
        if spell is None:
            print(f"MISSING ANCHOR {anchor}")
        else:
            preview = spell["description"][:140].replace("\n", " ")
            print(
                f"ANCHOR {anchor}: area={spell['area'][:60]!r} sr={spell['spell_resistance']!r}"
            )
            print(f"    {preview}")
    long_ones = [spell["name"] for spell in healer if len(spell["description"]) > 4500]
    if long_ones:
        print("long descriptions:", ", ".join(long_ones[:12]))
    if write:
        if any(anchor.lower() not in by_name for anchor in ("Cure Light Wounds", "Charm Animal", "Roar")):
            print("refusing to write: anchor spells missing", file=sys.stderr)
            return 1
        records = json.loads(SPELLS_PATH.read_text(encoding="utf-8"))
        records, counts = merge(records, healer)
        SPELLS_PATH.write_text(
            json.dumps(records, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"wrote {SPELLS_PATH} added={counts['added']} tagged={counts['tagged']} total={len(records)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
