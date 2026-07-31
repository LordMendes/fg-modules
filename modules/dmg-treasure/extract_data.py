"""Extract DMG treasure table data from dndtools rules.json into JSON."""

from __future__ import annotations

import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RULES = ROOT / "dndtools-reference" / "data" / "dndtools" / "rules.json"
OUT = Path(__file__).resolve().parent / "data"


class TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_cell = False
        self.current_row: list[str] = []
        self.rows: list[list[str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "td":
            self.in_cell = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "td":
            self.in_cell = False
        elif tag == "tr" and self.current_row:
            self.rows.append(self.current_row)
            self.current_row = []

    def handle_data(self, data: str) -> None:
        if self.in_cell:
            self.current_row.append(data.strip())


def load_rule_html() -> str:
    rules = json.loads(RULES.read_text(encoding="utf-8"))
    return next(r["description_html"] for r in rules if r.get("slug") == "using-the-treasure-table-214")


def load_rule_text() -> str:
    rules = json.loads(RULES.read_text(encoding="utf-8"))
    return next(r["description_text"] for r in rules if r.get("slug") == "using-the-treasure-table-214")


def extract_table_html(html: str, caption: str, next_caption: str | None = None) -> list[list[str]]:
    start = html.index(f"<caption>{caption}</caption>")
    end = html.index(f"<caption>{next_caption}</caption>", start + 1) if next_caption else len(html)
    parser = TableParser()
    parser.feed(html[start:end])
    return parser.rows


def clean(cell: str) -> str:
    return cell.replace("\u2014", "—").replace("\u2019", "'").strip()


def parse_range(value: str) -> list[int] | None:
    value = clean(value)
    if not value or value == "—":
        return None
    m = re.match(r"^(\d+)-(\d+)$", value)
    if m:
        return [int(m.group(1)), int(m.group(2))]
    if re.match(r"^\d+$", value):
        n = int(value)
        return [n, n]
    return None


def parse_level_marker(cell: str) -> int | None:
    m = re.match(r"^(\d+)(st|nd|rd|th)$", clean(cell))
    if not m:
        return None
    level = int(m.group(1))
    return level if 1 <= level <= 20 else None


def normalize_treasure_row(row: list[str]) -> list[str]:
    cells = [clean(c) for c in row]
    if cells and re.match(r"^\d+-\d+$", cells[0]) and not parse_level_marker(cells[0]):
        cells.insert(0, "")
    return (cells + [""] * 7)[:7]


def parse_treasure_levels(html: str) -> dict[str, list[dict]]:
    rows = extract_table_html(html, "Table: Treasure", "Table: Gems")
    levels: dict[str, list[dict]] = {}
    current_level: int | None = None
    for row in rows:
        level_cell, c_rng, coins, g_rng, goods, i_rng, items = normalize_treasure_row(row)
        level = parse_level_marker(level_cell)
        if level is not None:
            current_level = level
            levels[str(level)] = []
        if current_level is None:
            continue
        entry = {
            "coin_range": parse_range(c_rng),
            "coins": coins,
            "goods_range": parse_range(g_rng),
            "goods": goods,
            "items_range": parse_range(i_rng),
            "items": items,
        }
        if any(
            [
                entry["coin_range"],
                entry["coins"] not in {"", "—", "\ufffd"},
                entry["goods_range"],
                entry["goods"] not in {"", "—", "\ufffd"},
                entry["items_range"],
                entry["items"] not in {"", "—", "\ufffd"},
            ]
        ):
            levels[str(current_level)].append(entry)
    return levels


def parse_value_table(rows: list[list[str]]) -> list[dict]:
    parsed: list[dict] = []
    for row in rows:
        cells = [clean(c) for c in row if clean(c)]
        if not cells or cells[0].lower() in {"d%", "level"}:
            continue
        if len(cells) < 4:
            continue
        rng = parse_range(cells[0])
        if not rng:
            continue
        parsed.append(
            {
                "from": rng[0],
                "to": rng[1],
                "value": cells[1],
                "average": cells[2],
                "examples": cells[3],
            }
        )
    return parsed


def parse_mundane(text: str) -> dict[str, list[dict]]:
    part = text.split("Table: Mundane Items", 1)[1]
    lines = [l.strip() for l in part.split("\n") if l.strip()]
    sections: dict[str, list[dict]] = {}
    current = "root"
    sections[current] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line == "Alchemical item":
            current = "alchemical"
            sections[current] = []
            i += 1
            continue
        if line.startswith("Armor (roll d%"):
            current = "armor"
            sections[current] = []
            i += 1
            continue
        if line == "Weapons":
            current = "weapons"
            sections[current] = []
            i += 1
            continue
        if line == "Tools and gear":
            current = "tools"
            sections[current] = []
            i += 1
            continue
        m = re.match(r"^(\d+)-(\d+)$", line)
        if m and i + 1 < len(lines):
            result = lines[i + 1]
            if result in {"Alchemical item", "Weapons", "Tools and gear"} or result.startswith("Armor ("):
                i += 1
                continue
            target = "router" if current == "root" and result == "Alchemical item" else current
            if target == "router":
                sections.setdefault("root", []).append(
                    {"from": int(m.group(1)), "to": int(m.group(2)), "result": result, "section": "alchemical"}
                )
            else:
                sections.setdefault(current, []).append(
                    {"from": int(m.group(1)), "to": int(m.group(2)), "result": result}
                )
            i += 2
            continue
        i += 1
    sections["root"] = [
        {"from": 1, "to": 17, "result": "Alchemical item", "section": "alchemical"},
        {"from": 18, "to": 50, "result": "Armor", "section": "armor"},
        {"from": 51, "to": 83, "result": "Weapons", "section": "weapons"},
        {"from": 84, "to": 100, "result": "Tools and gear", "section": "tools"},
    ]
    return sections


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    html = load_rule_html()
    text = load_rule_text()
    gems = parse_value_table(extract_table_html(html, "Table: Gems", "Table: Art Objects"))
    art = parse_value_table(extract_table_html(html, "Table: Art Objects", "Table: Mundane Items"))
    levels = parse_treasure_levels(html)
    mundane = parse_mundane(text)

    random_magic = {
        "minor": [
            {"from": 1, "to": 4, "category": "armor", "label": "Armor and shields"},
            {"from": 5, "to": 9, "category": "weapons", "label": "Weapons"},
            {"from": 10, "to": 44, "category": "potions", "label": "Potions"},
            {"from": 45, "to": 46, "category": "rings", "label": "Rings"},
            {"from": 47, "to": 81, "category": "scrolls", "label": "Scrolls"},
            {"from": 82, "to": 91, "category": "wands", "label": "Wands"},
            {"from": 92, "to": 100, "category": "wondrous", "label": "Wondrous items"},
        ],
        "medium": [
            {"from": 1, "to": 10, "category": "armor", "label": "Armor and shields"},
            {"from": 11, "to": 20, "category": "weapons", "label": "Weapons"},
            {"from": 21, "to": 30, "category": "potions", "label": "Potions"},
            {"from": 31, "to": 40, "category": "rings", "label": "Rings"},
            {"from": 41, "to": 50, "category": "rods", "label": "Rods"},
            {"from": 51, "to": 65, "category": "scrolls", "label": "Scrolls"},
            {"from": 66, "to": 68, "category": "staffs", "label": "Staffs"},
            {"from": 69, "to": 83, "category": "wands", "label": "Wands"},
            {"from": 84, "to": 100, "category": "wondrous", "label": "Wondrous items"},
        ],
        "major": [
            {"from": 1, "to": 10, "category": "armor", "label": "Armor and shields"},
            {"from": 11, "to": 20, "category": "weapons", "label": "Weapons"},
            {"from": 21, "to": 25, "category": "potions", "label": "Potions"},
            {"from": 26, "to": 35, "category": "rings", "label": "Rings"},
            {"from": 36, "to": 45, "category": "rods", "label": "Rods"},
            {"from": 46, "to": 55, "category": "scrolls", "label": "Scrolls"},
            {"from": 56, "to": 75, "category": "staffs", "label": "Staffs"},
            {"from": 76, "to": 80, "category": "wands", "label": "Wands"},
            {"from": 81, "to": 100, "category": "wondrous", "label": "Wondrous items"},
        ],
    }

    (OUT / "gems.json").write_text(json.dumps(gems, indent=2), encoding="utf-8")
    (OUT / "art_objects.json").write_text(json.dumps(art, indent=2), encoding="utf-8")
    (OUT / "treasure_levels.json").write_text(json.dumps(levels, indent=2), encoding="utf-8")
    (OUT / "mundane.json").write_text(json.dumps(mundane, indent=2), encoding="utf-8")
    (OUT / "random_magic_categories.json").write_text(json.dumps(random_magic, indent=2), encoding="utf-8")
    print(f"gems={len(gems)} art={len(art)} levels={len(levels)} mundane={ {k: len(v) for k,v in mundane.items()} }")


if __name__ == "__main__":
    main()
