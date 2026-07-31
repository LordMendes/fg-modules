"""Item catalog and link resolution for DMG Treasure module."""

from __future__ import annotations

import json
import re
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
SCROLL_MOD = "DMG Scroll Tables"

WEAPON_CATEGORY_TABLES: dict[str, str] = {
    "Masterwork common melee weapon": "tables.treasure_mundane_weapons_common_melee",
    "Masterwork uncommon weapon": "tables.treasure_mundane_weapons_uncommon",
    "Masterwork common ranged weapon": "tables.treasure_mundane_weapons_common_ranged",
}

# Known 3.5E Basic Rules equipment slugs (lowercase alnum)
EQUIPMENT_MAP: dict[str, str] = {
    "chain shirt": "chainshirt",
    "masterwork studded leather": "studdedleather",
    "breastplate": "breastplate",
    "banded mail": "bandedmail",
    "half-plate": "halfplate",
    "full plate": "fullplate",
    "buckler": "buckler",
    "light wooden shield": "woodenshield",
    "light steel shield": "steelshield",
    "heavy wooden shield": "woodenshield",
    "heavy steel shield": "steelshield",
    "backpack, empty": "backpack",
    "crowbar": "crowbar",
    "lantern, bullseye": "lanternbullseye",
    "lock, simple": "simplelock",
    "lock, average": "averagelock",
    "lock, good": "goodlock",
    "lock, superior": "superiorlock",
    "manacles, masterwork": "manaclesmw",
    "mirror, small steel": "mirror",
    "rope, silk (50 ft.)": "ropesilk",
    "spyglass": "spyglass",
    "healer's kit": "healerskit",
    "holy symbol, silver": "holysymbolsilver",
    "hourglass": "hourglass",
    "magnifying glass": "magnifyingglass",
    "thieves' tools, masterwork": "thievestoolsmw",
    "alchemist's fire": "alchemistsfire",
    "acid": "acid",
    "smokesticks": "smokestick",
    "holy water": "holywater",
    "antitoxin": "antitoxin",
    "everburning torch": "everburningtorch",
    "tanglefoot bags": "tanglefootbag",
    "thunderstones": "thunderstone",
    "artisan's tools, masterwork": "artisanstoolsmw",
    "climber's kit": "climberskit",
    "disguise kit": "disguisekit",
    "musical instrument, masterwork": "musicalinstrumentmw",
    "rope, silk": "ropesilk",
}


def normalize_lookup(text: str) -> str:
    text = text.split("(")[0].strip().lower()
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    return text


def slugify(text: str) -> str:
    text = text.lower()
    text = text.replace("'", "")
    text = re.sub(r"[^a-z0-9]+", "", text)
    return text[:48] or "item"


def parse_cost_from_result(result: str) -> str:
    m = re.search(r"\((\d+(?:,\d+)?(?:\.\d+)?)\s*gp", result)
    if m:
        return f"{m.group(1).replace(',', '')} gp"
    m = re.search(r"(\d+(?:,\d+)?)\s*gp", result)
    if m:
        return f"{m.group(1).replace(',', '')} gp"
    return ""


def load_bundled_items() -> dict[str, dict]:
    items: dict[str, dict] = {}
    gems = json.loads((DATA / "gems.json").read_text(encoding="utf-8"))
    for row in gems:
        key = f"gem_{row['from']:02d}_{row['to']:02d}"
        items[key] = {
            "name": f"Gem ({row['average']})",
            "cost": row["average"],
            "type": "Treasure",
            "description": row["examples"],
        }
    art = json.loads((DATA / "art_objects.json").read_text(encoding="utf-8"))
    for row in art:
        key = f"art_{row['from']:02d}_{row['to']:02d}"
        items[key] = {
            "name": f"Art object ({row['average']})",
            "cost": row["average"],
            "type": "Treasure",
            "description": row["examples"],
        }
    mundane = json.loads((DATA / "mundane.json").read_text(encoding="utf-8"))
    for section, rows in mundane.items():
        if section == "root" or section == "weapons" or section == "armor":
            continue
        for row in rows:
            result = row["result"]
            key = f"mundane_{section}_{slugify(result)}"
            if key in items:
                key = f"{key}_{row['from']}"
            base_name = normalize_lookup(result)
            items[key] = {
                "name": result.split("(")[0].strip(),
                "cost": parse_cost_from_result(result) or "0 gp",
                "type": "Gear",
                "description": result,
                "equipment_slug": EQUIPMENT_MAP.get(base_name, EQUIPMENT_MAP.get(result.lower(), "")),
            }
    armor_path = DATA / "mundane_armor.json"
    if armor_path.exists():
        armor_data = json.loads(armor_path.read_text(encoding="utf-8"))
        for section, rows in armor_data.items():
            for row in rows:
                if row.get("subtable"):
                    continue
                key = f"mundane_armor_{slugify(row['result'])}_{row['from']}"
                base_name = normalize_lookup(row["result"])
                items[key] = {
                    "name": row["result"].split("(")[0].strip(),
                    "cost": parse_cost_from_result(row["result"]) or "0 gp",
                    "type": "Armor",
                    "description": row["result"],
                    "equipment_slug": row.get("equipment_slug") or EQUIPMENT_MAP.get(base_name, ""),
                }
    weapons_path = DATA / "mundane_weapons.json"
    if weapons_path.exists():
        weapons_data = json.loads(weapons_path.read_text(encoding="utf-8"))
        for table_key, rows in weapons_data.items():
            for row in rows:
                if row.get("subtable"):
                    continue
                key = weapon_item_key(table_key, row["from"], row["to"])
                label = format_masterwork_weapon(row)
                items[key] = {
                    "name": f"Masterwork {row['weapon']}",
                    "cost": row.get("cost", "0 gp").lstrip("+"),
                    "type": "Weapon",
                    "description": label,
                    "equipment_slug": row.get("equipment_slug", ""),
                }
    return items


def resolve_mundane_link(item_key: str, item: dict) -> tuple[str, str]:
    slug = item.get("equipment_slug") or ""
    if slug:
        return ("item", f"reference.equipment.{slug}@3.5E Basic Rules")
    return ("item", f"item.{item_key}")


def weapon_item_key(table_key: str, from_roll: int, to_roll: int) -> str:
    return f"weapon_{table_key}_{from_roll:02d}_{to_roll:02d}"


def format_masterwork_weapon(row: dict) -> str:
    weapon = row["weapon"]
    cost = row.get("cost", "")
    if cost:
        return f"Masterwork {weapon} ({cost})"
    return f"Masterwork {weapon}"


def resolve_weapon_row_link(table_key: str, row: dict) -> dict:
    if row.get("subtable"):
        return {
            "result": "Ammunition (roll again)",
            "link_class": "table",
            "recordname": f"tables.treasure_mundane_weapons_{row['subtable']}",
        }
    key = weapon_item_key(table_key, row["from"], row["to"])
    label = format_masterwork_weapon(row)
    link_class, recordname = resolve_mundane_link(
        key,
        {
            "equipment_slug": row.get("equipment_slug", ""),
        },
    )
    return {"result": label, "link_class": link_class, "recordname": recordname}


def gem_item_key(from_roll: int, to_roll: int) -> str:
    return f"gem_{from_roll:02d}_{to_roll:02d}"


def art_item_key(from_roll: int, to_roll: int) -> str:
    return f"art_{from_roll:02d}_{to_roll:02d}"


def quantity_result(text: str) -> str:
    text = text.strip()
    m = re.match(r"^(\d+d\d+)\s+(.+)$", text, re.I)
    if m:
        return f"[{m.group(1).lower()}x] {m.group(2)}"
    return text


def alchemical_result(result: str) -> str:
    return re.sub(
        r"\((\d+d\d+)\s+",
        lambda m: f"([{m.group(1).lower()}x] ",
        result,
        count=1,
    )


def interpret_goods(goods_text: str) -> dict | None:
    text = goods_text.strip().lower()
    if not text or text == "—":
        return None
    if "gem" in text:
        return {
            "result": quantity_result(goods_text),
            "link_class": "table",
            "recordname": "tables.treasure_gems",
        }
    if "art" in text:
        return {
            "result": quantity_result(goods_text),
            "link_class": "table",
            "recordname": "tables.treasure_art_objects",
        }
    if "medium" in text:
        return {
            "result": quantity_result(goods_text),
            "link_class": "table",
            "recordname": "tables.random_magic_medium",
        }
    if "major" in text:
        return {
            "result": quantity_result(goods_text),
            "link_class": "table",
            "recordname": "tables.random_magic_major",
        }
    return {"result": quantity_result(goods_text)}


def interpret_items(items_text: str) -> dict | None:
    text = items_text.strip().lower()
    if not text or text == "—":
        return None
    if "mundane" in text:
        return {
            "result": quantity_result(items_text),
            "link_class": "table",
            "recordname": "tables.treasure_mundane",
        }
    if "minor" in text:
        return {
            "result": quantity_result(items_text),
            "link_class": "table",
            "recordname": "tables.random_magic_minor",
        }
    if "medium" in text:
        return {
            "result": quantity_result(items_text),
            "link_class": "table",
            "recordname": "tables.random_magic_medium",
        }
    if "major" in text:
        return {
            "result": quantity_result(items_text),
            "link_class": "table",
            "recordname": "tables.random_magic_major",
        }
    return {"result": quantity_result(items_text)}


def coin_result(text: str) -> str:
    text = text.replace("×", "x").replace(",", "")
    text = re.sub(r"\s+", " ", text.strip())
    m = re.match(r"^(\d+d\d+)\s*x\s*([\d.]+)\s*(cp|sp|gp|pp)$", text, re.I)
    if m:
        return f"[{m.group(1)}x{m.group(2)} {m.group(3).lower()}]"
    return text
