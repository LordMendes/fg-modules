#!/usr/bin/env python3
"""Extract World of Warcraft: Monster Guide creatures into supplemental JSON.

Reads creature and villain stat blocks (printed pages 10-172). Templates
without a numeric Hit Dice line are skipped; their sample creatures are kept.
Side-by-side stat tables become one NPC per column.

    python scripts/extract-monster-guide.py
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
PDF_PATH = REPO / "WOWRPG Monster guide.pdf"
OUT_PATH = ROOT / "data" / "dndtools" / "supplemental" / "wowrpg_mg_monsters.json"

BOOK = "World of Warcraft: Monster Guide"
ABBREV = "MG"
EDITION = "WoW RPG (3.5)"
SUFFIX = "mg"
NOW = "2026-10-02T00:00:00Z"

# Printed page 10 through the end of the villain chapter (page 172).
PAGE_START = 10
PAGE_END = 173

SIZES = (
    "Fine",
    "Diminutive",
    "Tiny",
    "Small",
    "Medium",
    "Large",
    "Huge",
    "Gargantuan",
    "Colossal",
)
SIZE_RE = re.compile(rf"(?:{'|'.join(SIZES)})\b")
LABELS = [
    "Hit Dice",
    "Initiative",
    "Speed",
    "Armor Class",
    "Base Attack/Grapple",
    "Full Attack",
    "Attack",
    "Space/Reach",
    "Special Attacks",
    "Special Qualities",
    "Saves",
    "Abilities",
    "Skills",
    "Feats",
    "Environment",
    "Area",
    "Organization",
    "Challenge Rating",
    "Treasure",
    "Alignment",
    "Advancement",
    "Level Adjustment",
    "Villain Points",
]
LABEL_RE = re.compile(
    r"^(" + "|".join(re.escape(label) for label in LABELS) + r")\s*:\s*(.*)$"
)
HD_RE = re.compile(
    r"\d+d\d+(?:\s*\+\s*\d+)*(?:\s+plus\s+\d+d\d+(?:\s*\+\s*\d+)*)*"
    r"(?:\s*\[[^\]]+\])?\s*\(\s*[\d,]+\s*hp\s*\)",
    re.I,
)
HD_ANY = re.compile(r"\d+d\d+")
SAVE_RE = re.compile(
    r"Fort\s+[+\-]?\d+\s*,\s*Ref\s+[+\-]?\d+\s*,\s*Will\s+[+\-]?\d+",
    re.I,
)
ABIL_RE = re.compile(
    r"Str\s*\S+?\s*,\s*Agy\s*\S+?\s*,\s*Sta\s*\S+?\s*,\s*Int\s*\S+?\s*,\s*"
    r"Spt\s*\S+?\s*,\s*Cha\s*\S+",
    re.I,
)
BAB_RE = re.compile(r"[+\-]?\d+\s*/\s*[+\-]?\d+")
AC_CHUNK_RE = re.compile(r"\d+\s*\([^)]*\)")
SPEED_RE = re.compile(
    r"(?:[Ff]ly\s+)?\d+\s*ft\.(?:\s*\([^)]+\))?(?:\s*\([^)]+\))?"
    r"(?:,\s*(?:climb|burrow|fly|swim|base)\s+\d+\s*ft\.(?:\s*\([^)]+\))?)*",
    re.I,
)
SPACE_RE = re.compile(r"\d+\s*ft\./\s*\d+\s*ft\.(?:\s*\([^)]+\))?", re.I)
ABILITY_START_RE = re.compile(
    r"^([A-Z][^:]{0,70}?\((?:Ex|Su|Sp)\))\s*:\s*(.*)$"
)
FLAVOR_RE = re.compile(
    r"^(The|This|These|Those|Unlike|When|Some|Many|Most|Its|His|Her)\b"
)
SENSE_RE = re.compile(
    r"(?:(?:blindsight|blindsense|darkvision|tremorsense)(?:\s+(?:out to\s+)?\d+\s*ft\.?)?"
    r"|low-light vision|scent)",
    re.I,
)
PREPOSITIONS = {"of", "the", "and", "or", "a", "an"}

# First rank-table of each elemental family. The PDF merges those headers.
ELEMENT_RANKS = {
    "Air Elemental": [
        "Lesser Wind Elemental",
        "Wind Elemental",
        "Greater Wind Elemental",
    ],
    "Earth Elemental": [
        "Lesser Rock Elemental",
        "Rock Elemental",
        "Greater Rock Elemental",
    ],
    "Fire Elemental": [
        "Lesser Living Flame",
        "Living Flame",
        "Greater Living Flame",
    ],
    "Water Elemental": [
        "Lesser Deep Elemental",
        "Deep Elemental",
        "Greater Deep Elemental",
    ],
}

DISPLAY_NAMES = {
    "dwarf, dark iron": "Dark Iron Dwarf",
    "elf, blood": "Blood Elf",
    "giant, frost": "Frost Giant",
    "giant, molten": "Molten Giant",
    "giant, sea": "Sea Giant",
    "gnome, leper": "Leper Gnome",
    "troll, ice": "Ice Troll",
    "arcane nullifier x -": "Arcane Nullifier X-21",
    "arcane nullifier x-": "Arcane Nullifier X-21",
    "arcane nullifier x": "Arcane Nullifier X-21",
    "crowd pummeler -": "Crowd Pummeler 9-60",
    "crowd pummeler": "Crowd Pummeler 9-60",
    "dreadlord (nathrezim)": "Dreadlord",
    "befouled water elemental sea spray sea elemental": "Befouled Water Elemental",
}


def esc(text: str) -> str:
    return html.escape(text, quote=False)


def clean_join(parts: list[str]) -> str:
    text = " ".join(part.strip() for part in parts if part and part.strip() and part.strip() != "B")
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"-\s+(?=\d)", "-", text)
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)
    text = text.replace("×", "x")
    text = re.sub(r"flat-\s+footed", "flat-footed", text, flags=re.I)
    text = re.sub(r"\s+,", ",", text)
    return text.strip(" ,")


def is_banner(text: str) -> bool:
    parts = text.split()
    if len(parts) < 3:
        return False
    singles = sum(1 for part in parts if len(part) == 1 and part.isalpha())
    if singles / len(parts) <= 0.7:
        return False
    letters = re.sub(r"[^A-Za-z]", "", text).upper()
    return "WARCRAFT" in letters or "MONSTERGUIDE" in letters or letters.startswith("CHAPTER")


def load_lines(reader: PdfReader) -> list[tuple[int, str]]:
    rows: list[tuple[int, str]] = []
    last = min(PAGE_END, len(reader.pages))
    for idx in range(PAGE_START, last):
        raw = reader.pages[idx].extract_text() or ""
        raw = (
            raw.replace("\u00ad", "")
            .replace("\ufb01", "fi")
            .replace("\ufb02", "fl")
            .replace("\u2019", "'")
            .replace("\u2018", "'")
            .replace("\u201c", '"')
            .replace("\u201d", '"')
            .replace("\u2013", "-")
            .replace("\u2014", "-")
            .replace("\u2212", "-")
            .replace("\u00d7", "x")
        )
        for line in raw.splitlines():
            text = line.strip().replace("64.69.87.237", "").strip()
            if not text or text.isdigit() or is_banner(text):
                continue
            if text.upper().startswith("CHAPTER "):
                continue
            rows.append((idx, text))
        rows.append((idx, ""))
    return rows


def is_type_line(line: str) -> bool:
    if ":" in line or len(line) > 180:
        return False
    if re.match(rf"(?:{'|'.join(SIZES)})\b", line):
        return True
    return bool(re.fullmatch(r"(?:\([A-Za-z, /\-]+\)\s*)+", line.strip()))


def is_dropcap_line(line: str) -> bool:
    if not line or len(line) > 28 or ":" in line:
        return False
    words = line.split()
    if not words or len(words) > 4:
        return False
    saw_letter = False
    for word in words:
        letters = re.sub(r"[^A-Za-z]", "", word)
        if not letters:
            continue
        saw_letter = True
        if not letters.isupper():
            return False
    return saw_letter


def is_name_line(line: str) -> bool:
    if not line or len(line) > 80 or ":" in line or line.endswith("."):
        return False
    words = line.split()
    if not words or len(words) > 10:
        return False
    if is_dropcap_line(line) or is_type_line(line):
        return False
    caps = sum(1 for word in words if word[:1].isupper())
    return caps >= max(1, (len(words) + 1) // 2)


def is_identity_line(line: str) -> bool:
    if re.match(r"^(Male|Female|Elite)\b", line):
        return True
    if re.search(r"\d+(?:st|nd|rd|th)-Level", line):
        return True
    if re.search(r"\b\d+-HD\b", line):
        return True
    return bool(re.search(r"\d", line) and "/" in line)


def is_terminator(line: str, fields: dict[str, list[str]]) -> bool:
    if line in {"Description", "Combat"}:
        return "Hit Dice" in fields
    if "Abilities" not in fields and "Challenge Rating" not in fields:
        return False
    if FLAVOR_RE.match(line) and len(line) > 45:
        return True
    if "Level Adjustment" in fields and (
        is_dropcap_line(line) or is_type_line(line) or is_name_line(line)
    ):
        return True
    if (
        "Challenge Rating" in fields
        and "Level Adjustment" not in fields
        and "Advancement" not in fields
        and is_type_line(line)
    ):
        return True
    return False


def header_lines(lines: list[tuple[int, str]], hd_index: int) -> list[str]:
    picked: list[str] = []
    i = hd_index - 1
    blanks = 0
    while i >= 0 and blanks < 2:
        text = lines[i][1].strip()
        i -= 1
        if not text:
            if picked:
                blanks += 1
            continue
        blanks = 0
        if re.fullmatch(r"[-—–,.'\"/]+", text):
            continue
        if (
            is_type_line(text)
            or is_dropcap_line(text)
            or is_name_line(text)
            or is_identity_line(text)
            or text.lower().startswith("sample ")
            or text.lower().startswith("example ")
        ):
            picked.append(text)
            continue
        break
    picked.reverse()
    return picked


def join_dropcaps(lines: list[str]) -> str:
    tokens: list[str] = []
    for line in lines:
        tokens.extend(line.split())
    words: list[str] = []
    i = 0
    while i < len(tokens):
        token = tokens[i]
        if (
            len(token) == 1
            and token.isalpha()
            and i + 1 < len(tokens)
            and re.sub(r"[^A-Za-z]", "", tokens[i + 1]).isupper()
        ):
            words.append(token + tokens[i + 1])
            i += 2
            continue
        words.append(token)
        i += 1
    pretty: list[str] = []
    for word in words:
        letters = re.sub(r"[^A-Za-z]", "", word)
        if letters.isupper() and len(letters) > 1:
            pretty.append(word.capitalize())
        else:
            pretty.append(word)
    text = " ".join(pretty)
    text = text.replace(" ,", ",").replace(" - ", "-").replace("- ", "-")
    return re.sub(r"\s+", " ", text).strip(" ,")


def display_name(name: str) -> str:
    cleaned = re.sub(r"\s+", " ", name).strip(" ,")
    mapped = DISPLAY_NAMES.get(cleaned.lower())
    if mapped:
        return mapped
    return cleaned


def compositions(total: int, parts: int):
    if parts == 1:
        yield (total,)
        return
    for first in range(1, total - parts + 2):
        for rest in compositions(total - first, parts - 1):
            yield (first,) + rest


def score_name_parts(chunks: list[str]) -> int:
    score = 0
    for chunk in chunks:
        words = chunk.split()
        if not words:
            return -100
        if words[0].lower() in PREPOSITIONS:
            score -= 6
        score += 3
        score -= abs(len(words) - 2)
        if len(words) > 4:
            score -= 2
        lowered = [word.lower() for word in words]
        if len(lowered) != len(set(lowered)):
            score -= 4
        if words[-1].lower() in PREPOSITIONS:
            score -= 3
    return score


def split_variant_names(raw: str, count: int, family: str) -> list[str]:
    raw = clean_join([raw])
    if count == 1:
        return [display_name(raw or family or "Creature")]
    if (
        count == 3
        and family in ELEMENT_RANKS
        and re.search(r"\bLesser\b", raw)
        and re.search(r"\bGreater\b", raw)
        and "Whirlwind" not in raw
        and "Boulderkin" not in raw
        and "Befouled" not in raw
        and "Destroyer" not in raw
    ):
        return ELEMENT_RANKS[family]
    if count == 3 and "Befouled" in raw:
        return ["Befouled Water Elemental", "Sea Spray", "Sea Elemental"]
    words = raw.split()
    if words:
        head = words[0]
        parts: list[str] = []
        current: list[str] = []
        for index, word in enumerate(words):
            if index and word == head and current:
                parts.append(" ".join(current))
                current = [word]
            else:
                current.append(word)
        if current:
            parts.append(" ".join(current))
        if len(parts) == count:
            return [display_name(part) for part in parts]
    if len(words) >= count:
        best: tuple[int, list[str]] | None = None
        for comp in compositions(len(words), count):
            chunks: list[str] = []
            cursor = 0
            for size in comp:
                chunks.append(" ".join(words[cursor : cursor + size]))
                cursor += size
            score = score_name_parts(chunks)
            if best is None or score > best[0]:
                best = (score, chunks)
        if best and best[0] > 0:
            return [display_name(part) for part in best[1]]
    base = family or "Creature"
    return [f"{base} {index + 1}" for index in range(count)]


def split_types(type_lines: list[str], count: int) -> list[str]:
    text = clean_join(type_lines)
    parts = [
        part.strip(" ,")
        for part in re.split(rf"(?=(?:{'|'.join(SIZES)})\b)", text)
        if part.strip(" ,")
    ]
    if len(parts) == count:
        return parts
    if len(parts) == 1 and count > 1:
        return parts * count
    if not parts:
        return ["Unknown"] * count
    if len(parts) > count:
        return parts[:count]
    return parts + [parts[-1]] * (count - len(parts))


def split_b_markers(parts: list[str], count: int) -> list[str] | None:
    if count < 2 or not any(part.strip() == "B" for part in parts):
        return None
    groups: list[list[str]] = [[]]
    for part in parts:
        if part.strip() == "B":
            groups.append([])
        else:
            groups[-1].append(part)
    cells = [clean_join(group).strip(" ,") for group in groups]
    cells = [cell for cell in cells if cell and cell != ","]
    if len(cells) < count:
        return None
    columns: list[list[str]] = [[] for _ in range(count)]
    for index, cell in enumerate(cells):
        columns[index % count].append(cell)
    return [clean_join(column) for column in columns]


def split_gutter(parts: list[str], count: int) -> list[str] | None:
    if count < 2:
        return None
    columns: list[list[str]] = [[] for _ in range(count)]
    hits = 0
    for part in parts:
        if part.strip() == "B":
            continue
        bits = [bit.strip(" ,") for bit in re.split(r"\s{2,}", part) if bit.strip()]
        if len(bits) == count:
            hits += 1
            for index, bit in enumerate(bits):
                columns[index].append(bit)
        elif len(bits) == 1 and hits:
            columns[0].append(bits[0])
    if hits == 0:
        return None
    return [clean_join(column) for column in columns]


def split_repeated_prefix(text: str, count: int) -> list[str] | None:
    words = text.split()
    if count < 2 or len(words) < count:
        return None
    for length in range(1, 5):
        if length > len(words):
            break
        prefix = tuple(word.lower().strip(",;") for word in words[:length])
        if not any(piece for piece in prefix):
            continue
        indexes = [
            index
            for index in range(0, len(words) - length + 1)
            if tuple(word.lower().strip(",;") for word in words[index : index + length])
            == prefix
        ]
        if len(indexes) == count and indexes[0] == 0:
            stops = indexes[1:] + [len(words)]
            return [" ".join(words[start:stop]).strip(" ,") for start, stop in zip(indexes, stops)]
    return None


def split_regex(pattern: re.Pattern[str], text: str, count: int) -> list[str] | None:
    found = [match.group(0).strip() for match in pattern.finditer(text)]
    if len(found) == count:
        return found
    return None


def split_ac(text: str, count: int) -> list[str] | None:
    adjacent = re.findall(
        r"\d+\s*\([^)]*\)\s*,\s*touch\s+\d+\s*,\s*flat-footed\s+\d+",
        text,
        flags=re.I,
    )
    if len(adjacent) == count:
        return [item.strip() for item in adjacent]
    cores = AC_CHUNK_RE.findall(text)
    touches = re.findall(r"touch\s+\d+", text, flags=re.I)
    flats = re.findall(r"flat-footed\s+\d+", text, flags=re.I)
    if len(cores) == count and len(flats) == count and len(touches) == count:
        # Wrapped tables sometimes emit the last column's touch before the
        # previous column's wrapped touch. Falling numbers are put back in order.
        touch_nums = [int(re.search(r"\d+", item).group(0)) for item in touches]
        if touch_nums != sorted(touch_nums) and sorted(touch_nums) == touch_nums[0:1] + sorted(touch_nums[1:]):
            touches = [f"touch {num}" for num in sorted(touch_nums)]
        return [
            f"{core}, {touch}, {flat}"
            for core, touch, flat in zip(cores, touches, flats)
        ]
    return None


def split_attacks(text: str, count: int) -> list[str] | None:
    atoms = re.findall(
        r"(?:\band\b|\bor\b)?\s*[^()]{3,}?\((?:[^()]|\([^()]*\))*\)",
        text,
        flags=re.I,
    )
    if not atoms:
        return None
    groups: list[list[str]] = []
    current: list[str] = []
    for atom in atoms:
        if current and not re.match(r"\s*(?:and|or)\b", atom, flags=re.I):
            groups.append(current)
            current = [atom.strip()]
        else:
            current.append(atom.strip())
    if current:
        groups.append(current)
    rendered = [re.sub(r"\s+", " ", " ".join(group)).strip() for group in groups]
    if len(rendered) == count:
        return rendered
    if count >= 2 and len(rendered) > count:
        return rendered[: count - 1] + [" ".join(rendered[count - 1 :])]
    return None


def split_field(label: str, parts: list[str], count: int) -> list[str]:
    if count <= 1:
        text = clean_join(parts)
        if text in {"-", "--", "—"}:
            return [""]
        return [text]
    b_split = split_b_markers(parts, count)
    if b_split:
        return b_split
    gutter = split_gutter(parts, count)
    if gutter and any(gutter):
        return gutter
    text = clean_join(parts)
    specific: list[str] | None = None
    if label == "Hit Dice":
        specific = split_regex(HD_RE, text, count)
    elif label == "Initiative":
        found = re.findall(r"[+\-]?\d+", text)
        if len(found) == count:
            specific = found
    elif label == "Saves":
        specific = split_regex(SAVE_RE, text, count)
    elif label == "Abilities":
        specific = split_regex(ABIL_RE, text, count)
    elif label == "Base Attack/Grapple":
        specific = split_regex(BAB_RE, text, count)
    elif label == "Armor Class":
        specific = split_ac(text, count)
    elif label == "Speed":
        specific = split_regex(SPEED_RE, text, count)
        if not specific:
            based = re.findall(r"\d+\s*ft\..*?base\s+\d+\s*ft\.", text)
            if len(based) == count:
                specific = [item.strip() for item in based]
    elif label == "Space/Reach":
        specific = split_regex(SPACE_RE, text, count)
    elif label == "Challenge Rating":
        found = re.findall(r"\d+\s*/\s*\d+|\d+", text)
        if len(found) >= count:
            specific = [re.sub(r"\s+", "", item) for item in found[:count]]
    elif label in {"Attack", "Full Attack"}:
        specific = split_attacks(text, count)
    if specific:
        return specific
    repeated = split_repeated_prefix(text, count)
    if repeated:
        return repeated
    words = text.split()
    if words and len(words) % count == 0:
        size = len(words) // count
        chunks = [" ".join(words[index * size : (index + 1) * size]) for index in range(count)]
        if len(set(chunks)) == 1:
            return chunks
    return [text] + [""] * (count - 1)


def parse_block(
    lines: list[tuple[int, str]], hd_index: int
) -> tuple[dict[str, list[str]], int]:
    fields: dict[str, list[str]] = {}
    current: str | None = None
    buf: list[str] = []
    index = hd_index
    while index < len(lines):
        line = lines[index][1].strip()
        if not line:
            index += 1
            continue
        match = LABEL_RE.match(line)
        if match:
            if current:
                fields[current] = buf
            current = match.group(1)
            buf = [match.group(2)] if match.group(2) else []
            # Commit now so the next line can end the block after Level Adjustment.
            fields[current] = buf
            index += 1
            continue
        if current and is_terminator(line, fields):
            break
        if current:
            buf.append(line)
            index += 1
            continue
        break
    if current:
        fields[current] = buf
    return fields, index


def ability_scores(text: str) -> dict[str, int | None]:
    mapping = {
        "str": "str",
        "agy": "dex",
        "agi": "dex",
        "sta": "con",
        "int": "int",
        "spt": "wis",
        "spi": "wis",
        "cha": "cha",
    }
    scores: dict[str, int | None] = {key: None for key in mapping.values()}
    for match in re.finditer(
        r"\b(Str|Agy|Agi|Sta|Int|Spt|Spi|Cha)\s*(\d+|-|—)",
        text,
        flags=re.I,
    ):
        key = mapping[match.group(1).lower()]
        raw = match.group(2)
        scores[key] = 0 if raw in {"-", "—"} else int(raw)
    return scores


def parse_saves(text: str) -> tuple[int, int, int] | None:
    match = re.search(
        r"Fort\s+([+\-]?\d+)\s*,\s*Ref\s+([+\-]?\d+)\s*,\s*Will\s+([+\-]?\d+)",
        text,
        flags=re.I,
    )
    if not match:
        return None
    return tuple(int(value) for value in match.groups())  # type: ignore[return-value]


def parse_hp(hit_dice: str) -> int | None:
    match = re.search(r"\(([\d,]+)\s*hp\)", hit_dice, flags=re.I)
    if not match:
        return None
    return int(match.group(1).replace(",", ""))


def dice_only(hit_dice: str) -> str:
    match = re.match(r"(.+?)\s*\([\d,]+\s*hp\)", hit_dice, flags=re.I)
    return match.group(1).strip() if match else hit_dice


def alignment_value(text: str) -> str:
    match = re.match(
        r"((?:Always|Usually|Often)\s+)?"
        r"(Lawful|Neutral|Chaotic|Any)"
        r"(?:\s+(Good|Evil|Neutral))?"
        r"(?:\s*\([^)]*\))?",
        text.strip(),
        flags=re.I,
    )
    if match:
        return re.sub(r"\s+", " ", match.group(0)).strip()
    return text.strip()


def cr_token(text: str) -> str:
    match = re.search(r"\d+\s*/\s*\d+|\d+", text or "")
    if not match:
        return ""
    return re.sub(r"\s+", "", match.group(0))


def parse_init(text: str) -> int | None:
    match = re.search(r"[+\-]?\d+", text)
    return int(match.group(0)) if match else None


def senses_from(qualities: str) -> str:
    found = []
    for match in SENSE_RE.finditer(qualities or ""):
        bit = re.sub(r"\s+", " ", match.group(0)).strip()
        if bit.lower() not in {item.lower() for item in found}:
            found.append(bit)
    return ", ".join(found)


def languages_from(text: str) -> str:
    match = re.search(
        r"\b(?:speaks?|can speak)\s+([A-Z][A-Za-z ,/']{2,80}?)(?:\.|;)",
        text,
    )
    if not match:
        return ""
    languages = match.group(1).strip()
    if len(languages) > 80 or any(char.isdigit() for char in languages):
        return ""
    return languages


def html_from_lines(source: list[str]) -> str:
    paragraphs: list[str] = []
    buf: list[str] = []

    def flush() -> None:
        if not buf:
            return
        text = clean_join(buf)
        buf.clear()
        if not text:
            return
        if text in {"Description", "Combat"}:
            paragraphs.append(f"<h>{esc(text)}</h>")
            return
        ability = ABILITY_START_RE.match(text)
        if ability:
            paragraphs.append(
                f"<p><b>{esc(ability.group(1))}:</b> {esc(ability.group(2))}</p>"
            )
            return
        paragraphs.append(f"<p>{esc(text)}</p>")

    for line in source:
        if not line:
            flush()
            continue
        if line in {"Description", "Combat"} or ABILITY_START_RE.match(line):
            flush()
        buf.append(line)
    flush()
    return "".join(paragraphs)


def split_prose(source: list[str], names: list[str]) -> list[str]:
    if len(names) < 2:
        return [html_from_lines(source)]
    headings = []
    for index, line in enumerate(source):
        if any(line.lower() == name.lower() for name in names):
            headings.append(index)
    if not headings:
        html_text = html_from_lines(source)
        return [html_text for _ in names]
    shared = source[: headings[0]]
    sections: dict[str, list[str]] = {}
    for start, stop in zip(headings, headings[1:] + [len(source)]):
        sections[source[start].lower()] = source[start + 1 : stop]
    rendered = []
    shared_html = html_from_lines(shared)
    for name in names:
        own = sections.get(name.lower(), [])
        rendered.append(shared_html + html_from_lines(own))
    return rendered


def slugify(name: str, seen: set[str]) -> str:
    base = name.lower().replace("'", "")
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-") or "creature"
    slug = f"{base}-{SUFFIX}"
    if slug not in seen:
        seen.add(slug)
        return slug
    number = 2
    while f"{base}-{number}-{SUFFIX}" in seen:
        number += 1
    slug = f"{base}-{number}-{SUFFIX}"
    seen.add(slug)
    return slug


def blank_score(text: str) -> str:
    return "" if text.strip() in {"-", "--", "—"} else text.strip()


def build_records(rows: list[tuple[int, str]]) -> list[dict]:
    texts = [text for _, text in rows]
    hd_indexes = []
    for index, text in enumerate(texts):
        if not text.startswith("Hit Dice:"):
            continue
        blob = " ".join(texts[index : index + 4])
        if HD_ANY.search(blob) and HD_RE.search(clean_join(texts[index : index + 4])):
            hd_indexes.append(index)

    blocks = []
    family = ""
    for position, hd_index in enumerate(hd_indexes):
        fields, end_index = parse_block(rows, hd_index)
        hit_text = clean_join(fields.get("Hit Dice", []))
        hit_parts = HD_RE.findall(hit_text)
        if not hit_parts:
            continue
        count = len(hit_parts)
        header = header_lines(rows, hd_index)
        drop_lines = [line for line in header if is_dropcap_line(line)]
        name_lines = [
            line
            for line in header
            if not is_identity_line(line)
            and (
                is_name_line(line)
                or line.lower().startswith(("sample ", "example "))
            )
        ]
        type_lines = [line for line in header if is_type_line(line)]
        identity = [line for line in header if is_identity_line(line)]
        drop_name = display_name(join_dropcaps(drop_lines)) if drop_lines else ""
        if drop_name:
            family = drop_name
        elif not family:
            family = ""
        names = split_variant_names(clean_join(name_lines), count, family or drop_name)
        if count == 1 and name_lines:
            sample = next(
                (
                    line
                    for line in name_lines
                    if line.lower().startswith(("sample ", "example "))
                ),
                "",
            )
            if sample and ":" in sample and sample.split(":", 1)[1].strip():
                names = [display_name(sample.split(":", 1)[1])]
            elif sample:
                rest = [line for line in name_lines if line is not sample]
                names = [display_name(rest[-1] if rest else drop_name or sample)]
            else:
                names = [display_name(name_lines[0])]
        elif count == 1 and drop_name:
            names = [drop_name]
        types = split_types(type_lines, count)
        split_fields = {
            label: split_field(label, parts, count) for label, parts in fields.items()
        }
        next_header = len(texts)
        if position + 1 < len(hd_indexes):
            next_header = header_start_index(texts, hd_indexes[position + 1])
        prose = [texts[index] for index in range(end_index, next_header)]
        page = rows[hd_index][0]
        blocks.append(
            {
                "family": family or names[0],
                "has_dropcap": bool(drop_lines),
                "names": names,
                "types": types,
                "identity": identity,
                "fields": split_fields,
                "prose": prose,
                "own_prose": prose,
                "page": page,
                "count": count,
            }
        )

    # Sibling tables under one drop cap share the family description.
    grouped: list[dict] = []
    for block in blocks:
        previous = grouped[-1]["members"][-1] if grouped else None
        sibling = (
            previous is not None
            and not block["has_dropcap"]
            and previous["family"] == block["family"]
            and not any(line.strip() for line in previous["own_prose"])
        )
        if sibling:
            grouped[-1]["members"].append(block)
        else:
            grouped.append({"family": block["family"], "members": [block]})
    for group in grouped:
        prose: list[str] = []
        for member in group["members"]:
            if any(line.strip() for line in member["prose"]):
                prose.extend(member["prose"])
                prose.append("")
        for member in group["members"]:
            member["shared_prose"] = prose

    seen: set[str] = set()
    records: list[dict] = []
    for block in blocks:
        prose_html = split_prose(block.get("shared_prose") or block["prose"], block["names"])
        for index in range(block["count"]):
            fields = block["fields"]

            def col(label: str, default: str = "") -> str:
                values = fields.get(label) or []
                if index < len(values):
                    return values[index]
                return default

            hit_dice = col("Hit Dice")
            scores = ability_scores(col("Abilities"))
            saves = parse_saves(col("Saves"))
            qualities = col("Special Qualities")
            name = block["names"][index] if index < len(block["names"]) else f"Creature {index + 1}"
            creature_type = block["types"][index] if index < len(block["types"]) else ""
            if name == "Dire Lion" and "fly" in col("Speed") and "Monstrous Humanoid" in creature_type:
                name = "Dire Gargoyle"
            if name == "Dragonspawn" and hit_dice.startswith("17d8+51"):
                name = "Dreadlord"
            notes = prose_html[index] if index < len(prose_html) else ""
            identity = "; ".join(block["identity"])
            villain = col("Villain Points")
            extras = []
            if identity:
                extras.append(f"<p><b>Identity:</b> {esc(identity)}</p>")
            if villain:
                extras.append(f"<p><b>Villain Points:</b> {esc(villain)}</p>")
            area = col("Area")
            environment = col("Environment")
            if area:
                environment = f"{environment} (Area: {area})" if environment else f"Area: {area}"
            description = "".join(extras) + notes
            record = {
                "id": None,
                "slug": slugify(name, seen),
                "name": name,
                "source_url": "",
                "scraped_at": NOW,
                "hit_dice": dice_only(hit_dice),
                "hit_points": parse_hp(hit_dice),
                "initiative": parse_init(col("Initiative")),
                "speed": col("Speed"),
                "armor_class": col("Armor Class"),
                "base_attack_grapple": col("Base Attack/Grapple"),
                "attack": col("Attack"),
                "full_attack": col("Full Attack"),
                "space_reach": col("Space/Reach"),
                "special_attacks": blank_score(col("Special Attacks")),
                "special_qualities": blank_score(qualities),
                "senses": senses_from(qualities),
                "fortitude": saves[0] if saves else None,
                "reflex": saves[1] if saves else None,
                "will": saves[2] if saves else None,
                "str": scores["str"],
                "dex": scores["dex"],
                "con": scores["con"],
                "int": scores["int"],
                "wis": scores["wis"],
                "cha": scores["cha"],
                "skills": blank_score(col("Skills")),
                "feats": blank_score(col("Feats")),
                "environment": environment,
                "organization": col("Organization"),
                "challenge_rating": cr_token(col("Challenge Rating")),
                "treasure": col("Treasure"),
                "alignment": alignment_value(col("Alignment")),
                "advancement": col("Advancement"),
                "level_adjustment": blank_score(col("Level Adjustment")),
                "creature_type": block["types"][index] if index < len(block["types"]) else "",
                "languages": languages_from(re.sub(r"<[^>]+>", " ", description)),
                "description_html": description,
                "index": {
                    "type": block["types"][index] if index < len(block["types"]) else "",
                    "cr": cr_token(col("Challenge Rating")),
                    "hd": dice_only(hit_dice),
                    "source_abbrev": ABBREV,
                    "edition": EDITION,
                    "rulebook": BOOK,
                },
                "source": {
                    "name": BOOK,
                    "abbrev": ABBREV,
                    "edition": EDITION,
                    "page": block["page"],
                },
            }
            records.append(record)
    return records


def header_start_index(texts: list[str], hd_index: int) -> int:
    index = hd_index - 1
    start = hd_index
    blanks = 0
    while index >= 0 and blanks < 2:
        text = texts[index].strip()
        if not text:
            if start != hd_index:
                blanks += 1
            index -= 1
            continue
        blanks = 0
        if re.fullmatch(r"[-—–,.'\"/]+", text):
            index -= 1
            continue
        if (
            is_type_line(text)
            or is_dropcap_line(text)
            or is_name_line(text)
            or is_identity_line(text)
            or text.lower().startswith(("sample ", "example "))
        ):
            start = index
            index -= 1
            continue
        break
    return start


def main() -> None:
    reader = PdfReader(str(PDF_PATH))
    rows = load_lines(reader)
    records = build_records(rows)
    OUT_PATH.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    missing_ac = [rec["name"] for rec in records if not rec.get("armor_class")]
    missing_atk = [rec["name"] for rec in records if not rec.get("attack")]
    missing_str = [rec["name"] for rec in records if rec.get("str") is None]
    print(f"wrote {OUT_PATH}")
    print(f"npcs {len(records)}")
    print(f"missing ac {len(missing_ac)} missing atk {len(missing_atk)} missing str {len(missing_str)}")
    if missing_ac:
        print("ac:", ", ".join(missing_ac[:20]))
    if missing_atk:
        print("atk:", ", ".join(missing_atk[:20]))
    if missing_str:
        print("str:", ", ".join(missing_str[:20]))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
