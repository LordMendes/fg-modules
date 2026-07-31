#!/usr/bin/env python3
"""Parse SRD magic item tables into JSON for dmg-treasure build."""

from __future__ import annotations

import json
import re
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
SRD = DATA / "srd"
OUT = DATA / "magic_items"


def normalize_dash(text: str) -> str:
    return text.replace("\u2013", "-").replace("\u2014", "-").replace("\u2212", "-")


def parse_range(text: str) -> list[int] | None:
    text = normalize_dash(text.strip())
    if not text or text in {"-", "--", "—"}:
        return None
    m = re.match(r"^(\d+)\s*-\s*(\d+)$", text)
    if m:
        return [int(m.group(1)), int(m.group(2))]
    if text.isdigit():
        n = int(text)
        return [n, n]
    return None


def is_footnote_row(cells: list[str]) -> bool:
    if not cells:
        return True
    first = cells[0].strip()
    return bool(re.match(r"^\d+\s", first)) or first.startswith("All magic")


def classify_action(label: str) -> tuple[str, str | None]:
    low = label.lower().strip()
    if "specific armor" in low:
        return ("subtable", "magic_specific_armors")
    if "specific shield" in low:
        return ("subtable", "magic_specific_shields")
    if "specific weapon" in low:
        return ("subtable", "magic_specific_weapons")
    if "roll twice again" in low or "roll again twice" in low:
        return ("roll_twice", None)
    if "roll again" in low:
        return ("roll_again", None)
    if re.search(r"\+(\d+)\s+(shield|armor)", low):
        kind = "shield" if "shield" in low else "armor"
        return ("subtable", f"magic_{kind}_type")
    if re.search(r"^\+\d+", low) and "weapon" not in low and "armor" not in low and "shield" not in low:
        return ("item", None)
    if re.search(r"^\+\d+\s*$", low) or re.match(r"^\+\d+\s*weapon", low):
        return ("subtable", "magic_weapon_type")
    if "special ability" in low:
        if "armor" in low or "shield" in low:
            return ("subtable", "magic_armor_shield_special")
        return ("subtable", "magic_weapon_special")
    if low.startswith("ammunition"):
        return ("subtable", "magic_weapon_ammunition")
    return ("item", None)


def row_dict(
    *,
    minor: list[int] | None,
    medium: list[int] | None,
    major: list[int] | None,
    label: str,
    price: str = "",
) -> dict:
    action, target = classify_action(label)
    row: dict = {
        "minor": minor,
        "medium": medium,
        "major": major,
        "label": label.strip(),
        "price": price.strip(),
        "action": action,
    }
    if target:
        row["target"] = target
    return row


def slugify_table(title: str) -> str:
    title = title.lower()
    title = re.sub(r"^table:\s*", "", title)
    mapping = [
        ("specific weapons", "specific_weapons"),
        ("specific armors", "specific_armors"),
        ("specific shields", "specific_shields"),
        ("common melee weapons", "common_melee_weapons"),
        ("common ranged weapons", "common_ranged_weapons"),
        ("uncommon weapons", "uncommon_weapons"),
        ("melee weapon special abilities", "melee_special"),
        ("ranged weapon special abilities", "ranged_special"),
        ("weapon type determination", "weapon_type"),
        ("armor and shields", "armor_and_shields"),
        ("random armor type", "armor_type"),
        ("random shield type", "shield_type"),
        ("armor special abilities", "armor_special"),
        ("shield special abilities", "shield_special"),
        ("minor wondrous items", "wondrous_minor"),
        ("medium wondrous items", "wondrous_medium"),
        ("major wondrous items", "wondrous_major"),
        ("weapons", "weapons"),
        ("staffs", "staffs"),
        ("wands", "wands"),
    ]
    for pat, key in mapping:
        if pat in title:
            return key
    return re.sub(r"[^a-z0-9]+", "_", title).strip("_")


def parse_pipe_tables(text: str) -> dict[str, list[dict]]:
    tables: dict[str, list[dict]] = {}
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        m = re.match(r"^\|\s*Table:\s*(.+?)\s*\|", lines[i])
        if not m:
            i += 1
            continue
        title = m.group(1).strip()
        i += 1
        if i >= len(lines) or not lines[i].startswith("| ---"):
            continue
        i += 1
        if i >= len(lines):
            break
        header = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        i += 1
        rows: list[dict] = []
        h0 = header[0].lower() if header else ""
        while i < len(lines):
            line = lines[i]
            if not line.startswith("|"):
                break
            if re.match(r"^\|\s*Table:\s*", line):
                break
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if is_footnote_row(cells):
                i += 1
                continue
            if h0 == "minor" and len(header) >= 4 and len(cells) >= 4:
                rows.append(
                    row_dict(
                        minor=parse_range(cells[0]),
                        medium=parse_range(cells[1]),
                        major=parse_range(cells[2]),
                        label=cells[3],
                        price=cells[4] if len(cells) > 4 else "",
                    )
                )
            elif h0 == "medium" and len(header) >= 3 and len(cells) >= 3:
                rows.append(
                    row_dict(
                        minor=None,
                        medium=parse_range(cells[0]),
                        major=parse_range(cells[1]),
                        label=cells[2],
                        price=cells[3] if len(cells) > 3 else "",
                    )
                )
            elif h0 == "d%" and len(cells) >= 2 and parse_range(cells[0]):
                label = cells[1]
                price = cells[2] if len(cells) > 2 else ""
                action, target = classify_action(label)
                rows.append(
                    {
                        "d_pct": parse_range(cells[0]),
                        "label": label,
                        "price": price,
                        "action": action,
                        "target": target,
                    }
                )
            else:
                break
            i += 1
        if rows:
            tables[slugify_table(title)] = rows
    return tables


def parse_markdown_pipe_blocks(text: str) -> dict[str, list[dict]]:
    """Parse ### Table: sections followed by pipe tables (magic-items-iv)."""
    tables: dict[str, list[dict]] = {}
    parts = re.split(r"^### Table:\s*(.+)$", text, flags=re.M)
    for idx in range(1, len(parts), 2):
        title = parts[idx].strip()
        body = parts[idx + 1]
        block = body.split("###", 1)[0]
        fake = f"| Table: {title} |\n| --- |\n" + "\n".join(
            ln for ln in block.splitlines() if ln.startswith("|")
        )
        tables.update(parse_pipe_tables(fake))
    return tables


def parse_vertical_table(block: list[str], *, tiers: tuple[str, ...]) -> list[dict]:
    rows: list[dict] = []
    i = 0
    n = len(tiers)
    while i < len(block):
        ranges: list[list[int] | None] = []
        for _ in tiers:
            if i >= len(block):
                break
            ranges.append(parse_range(block[i]))
            i += 1
        if len(ranges) < n:
            break
        if i + 1 >= len(block):
            break
        label = block[i].strip()
        price = block[i + 1].strip()
        i += 2
        if not label or label.startswith("###") or label.lower().startswith("market price"):
            continue
        rows.append(
            row_dict(
                minor=ranges[0] if n >= 1 else None,
                medium=ranges[1] if n >= 2 else None,
                major=ranges[2] if n >= 3 else None,
                label=label,
                price=price,
            )
        )
    return rows


def extract_vertical_tables(text: str) -> dict[str, list[dict]]:
    tables: dict[str, list[dict]] = {}
    parts = re.split(r"^### Table:\s*(.+)$", text, flags=re.M)
    for idx in range(1, len(parts), 2):
        title = parts[idx].strip()
        body = parts[idx + 1]
        lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
        start = 0
        for j, ln in enumerate(lines):
            if ln.lower() in {"minor", "medium"}:
                start = j
                break
        block = lines[start:]
        if title.lower().startswith("potions"):
            tables["potions"] = parse_vertical_table(block[5:], tiers=("minor", "medium", "major"))
        elif title.lower().startswith("rings"):
            tables["rings"] = parse_vertical_table(block[5:], tiers=("minor", "medium", "major"))
        elif title.lower().startswith("rods"):
            tables["rods"] = parse_vertical_table(block[4:], tiers=("medium", "major"))
    return tables


def extract_wondrous_from_md(text: str) -> dict[str, list[dict]]:
    tables: dict[str, list[dict]] = {}
    for tier in ("minor", "medium", "major"):
        pat = rf"\|\s*Table:\s*{tier.title()} Wondrous Items\s*\|"
        m = re.search(pat, text, re.I)
        if not m:
            continue
        chunk = text[m.start() : m.start() + 12000]
        rows = []
        for line in chunk.splitlines():
            if not line.startswith("|"):
                if rows:
                    break
                continue
            if "---" in line or "Table:" in line or "d%" in line.lower():
                continue
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) < 3:
                continue
            rng = parse_range(cells[0])
            if not rng:
                continue
            label = cells[1]
            price = cells[2] if len(cells) > 2 else ""
            action, target = classify_action(label)
            rows.append(
                {
                    "d_pct": rng,
                    "label": label,
                    "price": price,
                    "action": action,
                    "target": target,
                }
            )
        tables[f"wondrous_{tier}"] = rows
    return tables


def merge_all() -> dict[str, list[dict]]:
    all_tables: dict[str, list[dict]] = {}
    ii = (SRD / "magic-items-ii.md").read_text(encoding="utf-8")
    all_tables.update(parse_pipe_tables(ii))
    iv = (SRD / "magic-items-iv.md").read_text(encoding="utf-8")
    all_tables.update(parse_pipe_tables(iv))
    all_tables.update(parse_markdown_pipe_blocks(iv))
    iii = (SRD / "magic-items-iii.md").read_text(encoding="utf-8")
    all_tables.update(extract_vertical_tables(iii))
    wondrous = (SRD / "wondrous-items.md").read_text(encoding="utf-8")
    all_tables.update(extract_wondrous_from_md(wondrous))
    return all_tables


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    tables = merge_all()
    for key, rows in sorted(tables.items()):
        path = OUT / f"{key}.json"
        path.write_text(json.dumps({"rows": rows}, indent=2), encoding="utf-8")
        print(f"  {key}: {len(rows)} rows")
    print(f"Wrote {len(tables)} tables to {OUT}")


if __name__ == "__main__":
    main()
