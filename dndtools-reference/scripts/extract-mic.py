#!/usr/bin/env python3
"""Extract Magic Item Compendium chapters 1-5 into supplemental item JSON.

Reads the three-column PDF with text positions so entries stay in reading
order. Writes data/dndtools/supplemental/mic_items.json and a name index.

    python scripts/extract-mic.py
"""

from __future__ import annotations

import html
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
PDF_PATH = REPO / "Magic Item Compendium.pdf"
ITEMS_PATH = ROOT / "data" / "dndtools" / "items.json"
OUT_PATH = ROOT / "data" / "dndtools" / "supplemental" / "mic_items.json"
INDEX_PATH = ROOT / "reviews" / "mic-item-index.md"
NOW = "2026-11-15T00:00:00Z"
EDITION = "Supplementals (3.5)"
SOURCE_NAME = "Magic Item Compendium"

# 0-based PDF page indexes. Printed page numbers on these pages match the index.
# Chapter 6 (using items) starts at printed page 218.
PAGE_START = 6
PAGE_END = 218  # exclusive

COL_BOUNDS = (240.0, 405.0)

LABEL_RE = re.compile(
    r"^(Price \(Item Level\)|Synergy Prerequisite|Caster Level|Cost to Create|"
    r"Body Slot|Prerequisites|Prerequisite|Activation|Property|Weight|Price|Aura)"
    r"\s*:\s*(.*)$",
    re.I,
)
NON_ITEM_TITLES = {"collection benefits", "lore", "behind the curtain", "behind the curtain:"}
SMALL_WORDS = {"of", "the", "and", "a", "an", "or", "in", "on", "for", "to", "from", "with", "de"}


@dataclass
class Line:
    text: str
    scale: float
    y: float
    column: int


@dataclass
class RawItem:
    title: str
    lines: list[str] = field(default_factory=list)
    page: int = 0
    chapter: str = ""
    set_name: str = ""


def clean_chunk(text: str, *, strip: bool = True) -> str:
    text = text.replace("\u00ad", "")
    text = (
        text.replace("ﬃ", "ffi")
        .replace("ﬄ", "ffl")
        .replace("ﬁ", "fi")
        .replace("ﬂ", "fl")
        .replace("ﬀ", "ff")
        .replace("ﬅ", "st")
    )
    # Ligatures were often split from the rest of the word by extra spaces.
    text = re.sub(r"fi\s+(?=[a-z])", "fi", text)
    text = re.sub(r"fl\s+(?=[a-z])", "fl", text)
    text = collapse_letter_spacing(text)
    text = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    text = text.replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = repair_split_words(text)
    return text.strip() if strip else text


def repair_split_words(text: str) -> str:
    """Join labels the PDF text extractor split inside a single run."""
    replacements = (
        (r"\bPr\s+ice\b", "Price"),
        (r"\bAc\s+tivation\b", "Activation"),
        (r"\bCa\s+ster\b", "Caster"),
        (r"\bLe\s+vel\b", "Level"),
        (r"\bBo\s+dy\b", "Body"),
        (r"\bSl\s+ot\b", "Slot"),
        (r"\bWe\s+ight\b", "Weight"),
        (r"\bAu\s+ra\b", "Aura"),
        (r"\bProp\s+erty\b", "Property"),
        (r"\bSyn\s+ergy\b", "Synergy"),
        (r"\bPrereq\s+uisites\b", "Prerequisites"),
    )
    for pattern, repl in replacements:
        text = re.sub(pattern, repl, text)
    return re.sub(r"(?<=[a-z]):(?=[A-Z])", ": ", text)


def collapse_letter_spacing(text: str) -> str:
    """Turn 'W h e n  i t' into 'When it' without touching normal prose."""
    if text.count(" ") < 8:
        return text
    tokens = text.split(" ")
    singles = [token for token in tokens if len(token) == 1 and token.isalpha()]
    if len(singles) < 8 or len(singles) < 0.55 * len([token for token in tokens if token]):
        return text
    words: list[str] = []
    current: list[str] = []
    for token in tokens:
        if token == "":
            if current:
                words.append("".join(current))
                current = []
            continue
        if len(token) == 1:
            current.append(token)
            continue
        if current:
            words.append("".join(current))
            current = []
        words.append(token)
    if current:
        words.append("".join(current))
    return " ".join(words)


def chapter_for(page: int) -> str:
    if page < 28:
        return "Armor"
    if page < 68:
        return "Weapons"
    if page < 149:
        return "Clothing"
    if page < 191:
        return "Tools"
    return "Magic Item Sets"


def column_index(x: float) -> int:
    if x < COL_BOUNDS[0]:
        return 0
    if x < COL_BOUNDS[1]:
        return 1
    return 2


def extract_page(page, page_index: int) -> tuple[int, list[Line]]:
    chunks: list[tuple[float, float, float, str]] = []

    def visitor(text, cm, tm, font_dict, font_size):
        if not text or not str(text).strip():
            return
        chunks.append((tm[5], tm[4], abs(tm[0]), str(text)))

    page.extract_text(visitor_text=visitor)
    printed = page_index
    for _y, _x, scale, text in chunks:
        token = clean_chunk(text)
        if scale >= 20 and token.isdigit():
            printed = int(token)
            break

    columns: list[list[tuple[float, float, float, str]]] = [[], [], []]
    for y, x, scale, text in chunks:
        if scale >= 20 or scale < 6:
            continue
        token = clean_chunk(text, strip=False)
        stripped = token.strip()
        if not stripped or "indd" in stripped.lower() or "12/21/06" in stripped:
            continue
        if re.fullmatch(r"\d{1,3}", stripped):
            continue
        if re.fullmatch(r"CHAPTER\s+\d+", stripped, flags=re.I):
            continue
        columns[column_index(x)].append((y, x, scale, token))

    lines: list[Line] = []
    for column in columns:
        column.sort(key=lambda item: (-item[0], item[1]))
        bucket: list[tuple[float, float, float, str]] = []

        def flush_bucket() -> None:
            if not bucket:
                return
            bucket.sort(key=lambda item: item[1])
            pieces: list[str] = []
            for part_index, part in enumerate(bucket):
                token = part[3]
                if part_index:
                    prev = bucket[part_index - 1]
                    prev_text = prev[3].rstrip()
                    prev_width = max(len(prev_text), 1) * max(prev[2], 1) * 0.48
                    gap = part[1] - (prev[1] + prev_width)
                    boundary = token[:1].isspace() or prev[3][-1:].isspace()
                    if not boundary and gap > 1.2:
                        pieces.append(" ")
                pieces.append(token)
            text = clean_chunk("".join(pieces))
            text = re.sub(r"\s+", " ", text).strip()
            if text:
                scale = max(part[2] for part in bucket)
                y = max(part[0] for part in bucket)
                lines.append(Line(text, scale, y, column_index(bucket[0][1])))
            bucket.clear()

        for chunk in column:
            if bucket and abs(bucket[0][0] - chunk[0]) > 2.2:
                flush_bucket()
            bucket.append(chunk)
        flush_bucket()
    return printed, lines


def is_section(line: Line) -> bool:
    return 16.5 <= line.scale < 20


def is_title(line: Line) -> bool:
    return 13.0 <= line.scale < 16.5


def _is_pull_quote(line: Line) -> bool:
    if not (11.5 <= line.scale < 13 and len(line.text) > 40):
        return False
    return '"' in line.text or "“" in line.text or line.text.endswith('"')


def strip_chapter_preamble(text: str) -> str:
    """Drop chapter-opening rules text that leaked into the first item."""
    if "this chapter" not in text.casefold():
        return text
    match = re.search(
        r"^.{0,1200}?this chapter.*?(?:works\.|below\.|section\.|items\.)\s*",
        text,
        flags=re.I | re.S,
    )
    if match and len(text) - match.end() > 40:
        text = text[match.end() :].strip()
    text = re.sub(r"\s*This chapter (?:collects|includes|discusses)\b.*", "", text, flags=re.I | re.S)
    text = re.sub(r"\s*Later sections of this chapter\b.*", "", text, flags=re.I | re.S)
    return text.strip()


def is_generic_section(text: str) -> bool:
    folded = re.sub(r"\s+", " ", text).strip().casefold()
    if folded.startswith("chapter"):
        return True
    markers = (
        "properties",
        "specific ",
        "augment crystal",
        "tool description",
        "magic item set",
        "using magic",
    )
    return any(marker in folded for marker in markers)


def title_case_name(raw: str) -> str:
    tags = re.findall(r"\[(synergy|relic)\]", raw, flags=re.I)
    core = re.sub(r"\[(synergy|relic)\]", "", raw, flags=re.I)
    core = re.sub(r"\s+", " ", core).strip(" ,")
    words = []
    for index, word in enumerate(core.split(" ")):
        if not word:
            continue
        pieces = []
        for part in word.split("-"):
            lower = part.casefold()
            if re.fullmatch(r"[ivx]+", lower) and len(lower) > 1:
                pieces.append(lower.upper())
            elif index > 0 and lower in SMALL_WORDS:
                pieces.append(lower)
            else:
                pieces.append(lower[:1].upper() + lower[1:] if lower else "")
        words.append("-".join(pieces))
    name = re.sub(r"'S\b", "'s", " ".join(words))
    if tags:
        pretty = " ".join(f"[{tag.capitalize()}]" for tag in tags)
        name = f"{name} {pretty}".strip()
    return name


def norm_name(name: str, *, keep_tags: bool) -> str:
    text = name.casefold().replace("'", "")
    if keep_tags:
        text = re.sub(r"\[(.*?)\]", r" \1 ", text)
    else:
        text = re.sub(r"\[.*?\]", " ", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def non_item_kind(title: str) -> str | None:
    folded = re.sub(r"\s+", " ", title).strip().casefold().rstrip(":")
    if folded in NON_ITEM_TITLES or folded.startswith("behind the curtain"):
        if "benefit" in folded:
            return "benefits"
        if folded == "lore":
            return "lore"
        return "drop"
    if folded == "collection benefits":
        return "benefits"
    return None


def join_body_lines(lines: list[str]) -> str:
    """Join wrapped lines. Caller already split paragraphs with blank lines."""
    paragraphs: list[str] = []
    current = ""
    for line in lines:
        if not line:
            if current:
                paragraphs.append(current.strip())
                current = ""
            continue
        if not current:
            current = line
            continue
        if current.endswith("-") and line[:1].islower():
            current = current[:-1] + line
        else:
            current = f"{current} {line}"
    if current:
        paragraphs.append(current.strip())
    return "\n".join(paragraphs)


def looks_like_prose(line: str) -> bool:
    if len(line) > 90 and "." in line:
        return True
    return bool(re.match(r"^(This |These |A |An |When |While |You |If |Once |In addition|On command)", line))


def parse_stat_block(lines: list[str]) -> dict[str, str]:
    fields: dict[str, str] = {}
    body: list[str] = []
    current_label = ""
    in_body = False
    header_ready = False
    seen_stat = False

    def close_label() -> None:
        nonlocal current_label
        current_label = ""

    for line in lines:
        match = LABEL_RE.match(line)
        label = match.group(1).casefold() if match else ""
        if not seen_stat:
            if not match:
                continue
            seen_stat = True
        stat_label = label in {
            "price",
            "price (item level)",
            "property",
            "body slot",
            "caster level",
            "aura",
            "activation",
            "weight",
            "synergy prerequisite",
        }
        if match and (not in_body or label in {"prerequisites", "prerequisite", "cost to create"} or (stat_label and len(body) < 2)):
            in_body = False
            key = {
                "price (item level)": "price",
                "prerequisite": "prerequisites",
            }.get(label, label)
            fields[key] = match.group(2).strip()
            current_label = key
            if key in {"activation", "weight", "synergy prerequisite"}:
                header_ready = True
            continue
        if current_label and not body and len(line) < 90 and (line[:1] in "([-" or line[:1].islower()):
            fields[current_label] = f"{fields.get(current_label, '')} {line}".strip()
            continue
        if not in_body and current_label and not header_ready:
            fields[current_label] = f"{fields.get(current_label, '')} {line}".strip()
            continue
        if not in_body and (header_ready or looks_like_prose(line) or not current_label):
            if current_label and not header_ready and not looks_like_prose(line):
                fields[current_label] = f"{fields.get(current_label, '')} {line}".strip()
                continue
            in_body = True
            close_label()
        if in_body:
            body.append(line)
            continue
        if current_label:
            fields[current_label] = f"{fields.get(current_label, '')} {line}".strip()
    fields["body"] = strip_chapter_preamble(join_body_lines(body))
    return fields


def paragraphs_to_html(text: str) -> str:
    parts = [part.strip() for part in re.split(r"\n+", text) if part.strip()]
    return "".join(f"<p>{html.escape(part)}</p>" for part in parts)


def html_to_text(value: str) -> str:
    text = re.sub(r"</p>\s*<p>", "\n", value)
    text = re.sub(r"<[^>]+>", "", text)
    return html.unescape(text).strip()


def is_psionic(name: str, prereq: str, body: str) -> bool:
    prereq_l = prereq.casefold()
    name_l = name.casefold()
    if "craft psionic" in prereq_l or "psicraft" in prereq_l:
        return True
    if "mind blade" in name_l:
        return True
    return "psionic" in prereq_l


def slugify(name: str) -> str:
    text = name.casefold().replace("'", "")
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text


def load_existing() -> tuple[dict[str, dict], dict[str, list[dict]], set[str]]:
    records = json.loads(ITEMS_PATH.read_text(encoding="utf-8"))
    by_tag: dict[str, dict] = {}
    by_plain: dict[str, list[dict]] = {}
    slugs: set[str] = set()
    for record in records:
        slug = str(record.get("slug") or "")
        if slug:
            slugs.add(slug)
        abbrev = (record.get("source") or {}).get("abbrev") or (record.get("index") or {}).get(
            "source_abbrev"
        )
        if abbrev != "MIC":
            continue
        name = str(record.get("name") or "")
        by_tag.setdefault(norm_name(name, keep_tags=True), record)
        by_plain.setdefault(norm_name(name, keep_tags=False), []).append(record)
    return by_tag, by_plain, slugs


def match_existing(name: str, by_tag: dict[str, dict], by_plain: dict[str, list[dict]]) -> dict | None:
    tagged = by_tag.get(norm_name(name, keep_tags=True))
    if tagged:
        return tagged
    plain = by_plain.get(norm_name(name, keep_tags=False), [])
    if len(plain) == 1:
        return plain[0]
    if len(plain) > 1:
        want_relic = "relic" in name.casefold()
        want_synergy = "synergy" in name.casefold()
        for record in plain:
            existing = str(record.get("name") or "").casefold()
            if want_relic and "relic" in existing:
                return record
            if want_synergy and "synergy" in existing:
                return record
        return plain[0]
    return None


def build_description(parsed: dict[str, str], set_name: str, benefits: str, lore: str) -> str:
    parts: list[str] = []
    if set_name:
        parts.append(f"Set: {set_name}.")
    body = parsed.get("body") or ""
    if body:
        parts.append(body)
    synergy = parsed.get("synergy prerequisite") or ""
    if synergy:
        parts.append(f"Synergy prerequisite: {synergy}.")
    if benefits:
        parts.append(f"Collection benefits: {benefits}")
    if lore and lore not in body:
        parts.append(f"Lore: {lore}")
    prereq = parsed.get("prerequisites") or ""
    if prereq:
        parts.append(f"Prerequisites: {prereq}")
    cost = parsed.get("cost to create") or ""
    if cost:
        parts.append(f"Cost to Create: {cost}")
    return "\n".join(parts)


def price_bonus(price: str) -> str | None:
    match = re.search(r"\+(\d+)\s*bonus", price, flags=re.I)
    if match:
        return f"+{match.group(1)}"
    return None


def caster_level(raw: str) -> str:
    match = re.search(r"\d+", raw or "")
    return match.group(0) if match else (raw or "").strip()


def blank_to_empty(value: str) -> str:
    text = (value or "").strip()
    if text in {"-", "—", "–", "--"}:
        return ""
    return text


def item_type_for(name: str, parsed: dict[str, str], body: str) -> str:
    if parsed.get("property"):
        kind = "Enhancement"
    else:
        kind = "Magic Item"
    prereq = parsed.get("prerequisites") or ""
    if is_psionic(name, prereq, body):
        return "PSI"
    return kind


def mic_group_for(chapter: str) -> str:
    return {
        "Armor": "armor",
        "Weapons": "weapons",
        "Clothing": "clothing",
        "Tools": "tools",
        "Magic Item Sets": "sets",
    }.get(chapter, "item")


def _same_column_run(prev: Line, nxt: Line, max_gap: float) -> bool:
    """True when nxt continues a heading in the same column, just below prev."""
    if prev.column != nxt.column:
        return False
    gap = prev.y - nxt.y
    return 0 < gap <= max_gap


def extract_sets_and_items(reader: PdfReader) -> tuple[list[RawItem], dict[str, dict[str, str]]]:
    """Read chapters 1-5 in column order and split entries on display titles."""
    raw_items: list[RawItem] = []
    sets: dict[str, dict[str, str]] = {}
    current: RawItem | None = None
    set_name = ""
    block: str | None = None
    block_lines: list[str] = []
    chapter = "Armor"

    def finish_block() -> None:
        nonlocal block, block_lines
        if block in {"benefits", "lore"} and set_name:
            text = join_body_lines(block_lines).strip()
            if text:
                sets.setdefault(set_name, {"benefits": "", "lore": ""})[block] = text
        block = None
        block_lines = []

    def finish_item() -> None:
        nonlocal current
        if current and current.title and current.lines:
            raw_items.append(current)
        current = None

    for index in range(PAGE_START, min(PAGE_END, len(reader.pages))):
        printed, lines = extract_page(reader.pages[index], index)
        if printed >= 218:
            break
        chapter = chapter_for(printed)
        index_line = 0
        while index_line < len(lines):
            line = lines[index_line]
            if re.match(r"^CHAPTER\s+\d+", line.text, flags=re.I):
                index_line += 1
                continue
            if is_section(line):
                parts = [line.text]
                probe = index_line + 1
                while probe < len(lines) and is_section(lines[probe]) and _same_column_run(
                    lines[probe - 1], lines[probe], 18
                ):
                    parts.append(lines[probe].text)
                    probe += 1
                header = " ".join(parts)
                finish_block()
                finish_item()
                if is_generic_section(header) or chapter != "Magic Item Sets":
                    if chapter != "Magic Item Sets":
                        set_name = ""
                    elif is_generic_section(header):
                        set_name = ""
                else:
                    set_name = title_case_name(header)
                    sets.setdefault(set_name, {"benefits": "", "lore": ""})
                index_line = probe
                continue
            if is_title(line):
                parts = [line.text]
                probe = index_line + 1
                while probe < len(lines) and is_title(lines[probe]) and _same_column_run(
                    lines[probe - 1], lines[probe], 18
                ):
                    if ":" in lines[probe].text and not lines[probe].text.startswith("["):
                        break
                    parts.append(lines[probe].text)
                    probe += 1
                title = " ".join(parts)
                kind = non_item_kind(title)
                finish_block()
                finish_item()
                if kind:
                    block = kind
                    block_lines = []
                else:
                    current = RawItem(
                        title=title,
                        page=printed,
                        chapter=chapter,
                        set_name=set_name if chapter == "Magic Item Sets" else "",
                    )
                index_line = probe
                continue
            if (
                current
                and not current.lines
                and re.fullmatch(r"\[(SYNERGY|RELIC)\]", line.text, flags=re.I)
            ):
                current.title = f"{current.title} {line.text}".strip()
                index_line += 1
                continue
            if block is not None:
                if not _is_pull_quote(line):
                    block_lines.append(line.text)
                index_line += 1
                continue
            if current is not None:
                if not _is_pull_quote(line):
                    current.lines.append(line.text)
            index_line += 1
    finish_block()
    finish_item()
    return raw_items, sets


def to_records(raw_items: list[RawItem], sets: dict[str, dict[str, str]]) -> tuple[list[dict], list[str]]:
    by_tag, by_plain, used_slugs = load_existing()
    claimed: set[str] = set()
    records: list[dict] = []
    for raw in raw_items:
        name = title_case_name(raw.title)
        parsed = parse_stat_block(raw.lines)
        price = re.sub(r"\s+", " ", parsed.get("price") or "").strip()
        if not price and not parsed.get("caster level"):
            continue
        if re.search(r"\bof( the)?$", name, flags=re.I) and len(parsed.get("body") or "") < 40:
            continue
        if (
            not parsed.get("property")
            and not parsed.get("body slot")
            and raw.chapter in {"Armor", "Weapons"}
            and re.search(r"\+\d+\s*bonus", price, flags=re.I)
        ):
            parsed["property"] = "Armor or shield" if raw.chapter == "Armor" else "Weapon"
        set_info = sets.get(raw.set_name, {}) if raw.set_name else {}
        description = build_description(
            parsed,
            raw.set_name,
            set_info.get("benefits", ""),
            set_info.get("lore", ""),
        )
        slot = re.sub(r"\s+", " ", parsed.get("property") or parsed.get("body slot") or "").strip()
        aura = re.sub(r"\s+", " ", parsed.get("aura") or "").strip()
        activation = re.sub(r"\s+", " ", parsed.get("activation") or "").strip()
        weight = re.sub(r"\s+", " ", parsed.get("weight") or "").strip()
        kind = item_type_for(name, parsed, description)
        existing = match_existing(name, by_tag, by_plain)
        if existing and str(existing.get("slug")) not in claimed:
            slug = str(existing["slug"])
            record_id = existing.get("id")
            source_url = existing.get("source_url")
            claimed.add(slug)
        else:
            base = slugify(name)
            slug = f"{base}-mic"
            suffix = 2
            while slug in used_slugs:
                slug = f"{base}-mic-{suffix}"
                suffix += 1
            used_slugs.add(slug)
            record_id = None
            source_url = None
        bonus = price_bonus(price)
        record = {
            "id": record_id,
            "slug": slug,
            "name": name,
            "source_url": source_url,
            "scraped_at": NOW,
            "index": {
                "type": kind,
                "price": price or None,
                "source_abbrev": "MIC",
                "edition": EDITION,
                "book_slug": "magic-item-compendium",
                "level": None,
                "rulebook": SOURCE_NAME,
                "rulebook_url": None,
                "slot": slot or None,
                "activation": activation or None,
                "weight": weight or None,
            },
            "price": price or None,
            "price_bonus": bonus,
            "caster_level": caster_level(parsed.get("caster level") or "") or None,
            "aura": aura or None,
            "activation": activation or None,
            "weight": blank_to_empty(weight) or None,
            "description_html": paragraphs_to_html(description),
            "description_text": description,
            "source": {
                "name": SOURCE_NAME,
                "abbrev": "MIC",
                "edition": EDITION,
                "page": raw.page,
                "url": None,
            },
            "type": kind,
            "slot": slot or None,
            "cursed": None,
            "mic_kind": "property" if parsed.get("property") else "item",
            "mic_group": mic_group_for(raw.chapter),
            "mic_chapter": raw.chapter,
        }
        records.append(record)
    missing = []
    for group in by_plain.values():
        for existing in group:
            if str(existing.get("slug")) not in claimed:
                missing.append(str(existing.get("name")))
    missing = sorted(set(missing))
    return records, missing


def write_index(records: list[dict], missing: list[str]) -> None:
    groups: dict[str, list[dict]] = {}
    for record in records:
        groups.setdefault(record.get("mic_chapter") or "Items", []).append(record)
    lines = [
        "# Magic Item Compendium items",
        "",
        f"{len(records)} entries extracted from chapters 1-5 of Magic Item Compendium.",
        "Chapter 6 and the appendix price tables are not separate items.",
        "",
        f"Existing MIC rows whose names did not match an extracted entry: {len(missing)}.",
    ]
    if missing:
        lines.append("")
        lines.append("Unmatched existing names:")
        lines.append("")
        for name in missing:
            lines.append(f"- {name}")
    for chapter in ("Armor", "Weapons", "Clothing", "Tools", "Magic Item Sets"):
        rows = groups.get(chapter) or []
        lines.extend(["", f"## {chapter}", "", f"{len(rows)} entries.", ""])
        for record in rows:
            price = record.get("price") or "no price"
            page = (record.get("source") or {}).get("page") or "?"
            kind = "property" if record.get("mic_kind") == "property" else "item"
            lines.append(f"- {record['name']}: {price} ({kind}, p. {page})")
    lines.append("")
    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text("\n".join(lines), encoding="utf-8")


def appendix_coverage(reader: PdfReader, records: list[dict]) -> tuple[int, int]:
    """Count how many extracted names appear in the appendix tables."""
    chunks: list[str] = []
    for index in range(230, len(reader.pages)):
        text = reader.pages[index].extract_text() or ""
        chunks.append(clean_chunk(text))
    blob = " ".join(chunks).casefold()
    blob = re.sub(r"\s+", " ", blob)
    found = 0
    for record in records:
        token = norm_name(str(record["name"]), keep_tags=False)
        if token and token in blob:
            found += 1
    return found, len(records)


def assert_samples(records: list[dict]) -> None:
    by_name = {}
    for record in records:
        by_name.setdefault(record["name"].casefold(), record)
    acidic = by_name.get("acidic")
    if acidic is None:
        raise SystemExit("Acidic was not extracted")
    if "2d4" not in (acidic.get("description_text") or ""):
        raise SystemExit("Acidic is missing the acid damage text")
    boots = by_name.get("acrobat boots")
    if boots is None:
        raise SystemExit("Acrobat Boots was not extracted")
    if "900" not in str(boots.get("price") or ""):
        raise SystemExit(f"Acrobat Boots price was {boots.get('price')!r}")
    slot = str(boots.get("slot") or "")
    if "feet" not in slot.casefold():
        raise SystemExit(f"Acrobat Boots slot was {slot!r}")
    crystals = [
        record
        for record in records
        if "crystal of" in record["name"].casefold()
        and "least" in (record.get("description_text") or "").casefold()
        and "greater" in (record.get("description_text") or "").casefold()
    ]
    if not crystals:
        raise SystemExit("No tiered augment crystal kept Least and Greater together")
    sets = [record for record in records if str(record.get("description_text") or "").startswith("Set:")]
    if not sets:
        raise SystemExit("No magic item set piece includes its set name")
    if not (600 <= len(records) <= 1200):
        raise SystemExit(f"Unexpected item count: {len(records)}")


def main() -> None:
    if not PDF_PATH.exists():
        raise SystemExit(f"Missing PDF: {PDF_PATH}")
    reader = PdfReader(str(PDF_PATH))
    raw_items, sets = extract_sets_and_items(reader)
    records, missing = to_records(raw_items, sets)
    assert_samples(records)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_index(records, missing)
    covered, total = appendix_coverage(reader, records)
    chapters: dict[str, int] = {}
    for record in records:
        chapters[record.get("mic_chapter") or "?"] = chapters.get(record.get("mic_chapter") or "?", 0) + 1
    print(f"wrote {len(records)} items to {OUT_PATH}")
    print(f"chapters: {chapters}")
    print(f"unmatched existing MIC names: {len(missing)}")
    print(f"appendix name coverage: {covered}/{total}")
    print(f"set blocks: {len(sets)}")


if __name__ == "__main__":
    sys.exit(main())
