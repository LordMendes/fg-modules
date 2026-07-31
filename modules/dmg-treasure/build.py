#!/usr/bin/env python3
"""Build DMG Treasure Tables FG module."""

from __future__ import annotations

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

MODULE_DIR = Path(__file__).resolve().parent
ROOT = MODULE_DIR.parent
sys.path.insert(0, str(ROOT))

from fg_common import (  # noqa: E402
    add_library_entry,
    build_table,
    make_root,
    package_mod,
    typed_string,
    write_xml,
)
from item_catalog import (  # noqa: E402
    SCROLL_MOD,
    WEAPON_CATEGORY_TABLES,
    alchemical_result,
    art_item_key,
    coin_result,
    gem_item_key,
    interpret_goods,
    interpret_items,
    load_bundled_items,
    quantity_result,
    resolve_mundane_link,
    resolve_weapon_row_link,
    slugify,
)
from magic_item_catalog import (  # noqa: E402
    load_bundled_magic_items,
    load_known_magic_keys,
    row_to_column,
    rows_for_tier,
)

DATA = MODULE_DIR / "data"
MAGIC_DATA = DATA / "magic_items"
FG_MODULES = Path.home() / "AppData/Roaming/SmiteWorks/Fantasy Grounds/modules"
MOD_NAME = "DMG Treasure Tables.mod"

TIERED_MAGIC_SOURCES = {
    "armor": "armor_and_shields",
    "weapons": "weapons",
    "potions": "potions",
    "rings": "rings",
    "rods": "rods",
    "staffs": "staffs",
    "wands": "wands",
}

TIERED_MAGIC_SUBTABLES = {
    "armor_special": "Armor Special Abilities",
    "shield_special": "Shield Special Abilities",
    "specific_armors": "Specific Armors",
    "specific_shields": "Specific Shields",
    "melee_special": "Melee Weapon Special Abilities",
    "ranged_special": "Ranged Weapon Special Abilities",
    "specific_weapons": "Specific Weapons",
}

SCROLL_SPELL_LEVELS = {
    "minor": [
        {"from": 1, "to": 5, "level": "0", "caster": "1st"},
        {"from": 6, "to": 50, "level": "1st", "caster": "1st"},
        {"from": 51, "to": 95, "level": "2nd", "caster": "3rd"},
        {"from": 96, "to": 100, "level": "3rd", "caster": "5th"},
    ],
    "medium": [
        {"from": 1, "to": 5, "level": "2nd", "caster": "3rd"},
        {"from": 6, "to": 65, "level": "3rd", "caster": "5th"},
        {"from": 66, "to": 95, "level": "4th", "caster": "7th"},
        {"from": 96, "to": 100, "level": "5th", "caster": "9th"},
    ],
    "major": [
        {"from": 1, "to": 5, "level": "4th", "caster": "7th"},
        {"from": 6, "to": 50, "level": "5th", "caster": "9th"},
        {"from": 51, "to": 70, "level": "6th", "caster": "11th"},
        {"from": 71, "to": 85, "level": "7th", "caster": "13th"},
        {"from": 86, "to": 95, "level": "8th", "caster": "15th"},
        {"from": 96, "to": 100, "level": "9th", "caster": "17th"},
    ],
}


def load_json(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def load_magic_rows(name: str) -> list[dict]:
    path = MAGIC_DATA / f"{name}.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8")).get("rows", [])


def build_items_section(items: dict[str, dict]) -> ET.Element:
    section = ET.Element("item")
    for key, item in sorted(items.items()):
        node = ET.SubElement(section, key)
        typed_string(node, "name", item["name"])
        typed_string(node, "cost", item["cost"])
        typed_string(node, "type", item["type"])
        desc = ET.SubElement(node, "description")
        desc.set("type", "formattedtext")
        p = ET.SubElement(desc, "p")
        p.text = item.get("description", item["name"])
        ET.SubElement(node, "effectlist")
    return section


def column(result: str, link_class: str | None = None, recordname: str | None = None) -> dict:
    col: dict = {"result": result}
    if link_class and recordname:
        col["link_class"] = link_class
        col["recordname"] = recordname
    return col


def build_treasure_level_tables(tables: ET.Element, levels: dict) -> None:
    for level_str in sorted(levels.keys(), key=int):
        coin_rows = []
        goods_rows = []
        item_rows = []
        for entry in levels[level_str]:
            if entry.get("coin_range") and entry.get("coins") not in {"—", "", "\ufffd"}:
                coin_rows.append(
                    {
                        "from": entry["coin_range"][0],
                        "to": entry["coin_range"][1],
                        "columns": [column(coin_result(entry["coins"]))],
                    }
                )
            if entry.get("goods_range") and entry.get("goods") not in {"—", "", "\ufffd"}:
                goods_link = interpret_goods(entry["goods"])
                goods_col = goods_link if goods_link else column(quantity_result(entry["goods"]))
                goods_rows.append(
                    {
                        "from": entry["goods_range"][0],
                        "to": entry["goods_range"][1],
                        "columns": [goods_col],
                    }
                )
            if entry.get("items_range") and entry.get("items") not in {"—", "", "\ufffd"}:
                items_link = interpret_items(entry["items"])
                items_col = items_link if items_link else column(quantity_result(entry["items"]))
                item_rows.append(
                    {
                        "from": entry["items_range"][0],
                        "to": entry["items_range"][1],
                        "columns": [items_col],
                    }
                )
        lvl = int(level_str)
        if coin_rows:
            build_table(
                tables,
                f"treasure_level_{lvl:02d}_coins",
                f"Treasure L{level_str} — Coins",
                coin_rows,
                labels=["Coins"],
                description=f"DMG treasure coins, encounter level {level_str}",
            )
        if goods_rows:
            build_table(
                tables,
                f"treasure_level_{lvl:02d}_goods",
                f"Treasure L{level_str} — Goods",
                goods_rows,
                labels=["Goods"],
                description=f"DMG treasure goods, encounter level {level_str}",
            )
        if item_rows:
            build_table(
                tables,
                f"treasure_level_{lvl:02d}_items",
                f"Treasure L{level_str} — Items",
                item_rows,
                labels=["Items"],
                description=f"DMG treasure items, encounter level {level_str}",
            )


def build_gem_art_tables(tables: ET.Element) -> None:
    gem_rows = []
    for row in load_json("gems.json"):
        key = gem_item_key(row["from"], row["to"])
        gem_rows.append(
            {
                "from": row["from"],
                "to": row["to"],
                "columns": [
                    column(
                        f"{row['value']} ({row['average']}) — {row['examples'][:60]}...",
                        "item",
                        f"item.{key}",
                    )
                ],
            }
        )
    build_table(
        tables,
        "treasure_gems",
        "Treasure — Gems",
        gem_rows,
        labels=["Gem"],
        description="DMG Table: Gems",
    )

    art_rows = []
    for row in load_json("art_objects.json"):
        key = art_item_key(row["from"], row["to"])
        art_rows.append(
            {
                "from": row["from"],
                "to": row["to"],
                "columns": [
                    column(
                        row["examples"],
                        "item",
                        f"item.{key}",
                    )
                ],
            }
        )
    build_table(
        tables,
        "treasure_art_objects",
        "Treasure — Art Objects",
        art_rows,
        labels=["Art object"],
        description="DMG Table: Art Objects",
    )


def build_weapon_determination_tables(tables: ET.Element) -> None:
    weapons_data = load_json("mundane_weapons.json")
    table_defs = {
        "common_melee": (
            "treasure_mundane_weapons_common_melee",
            "Treasure — Common Melee Weapons",
            "DMG Table: Common Melee Weapons (masterwork)",
        ),
        "uncommon": (
            "treasure_mundane_weapons_uncommon",
            "Treasure — Uncommon Weapons",
            "DMG Table: Uncommon Weapons (masterwork)",
        ),
        "common_ranged": (
            "treasure_mundane_weapons_common_ranged",
            "Treasure — Common Ranged Weapons",
            "DMG Table: Common Ranged Weapons (masterwork)",
        ),
        "ammunition": (
            "treasure_mundane_weapons_ammunition",
            "Treasure — Masterwork Ammunition",
            "DMG Table: Masterwork Ammunition (50)",
        ),
    }
    for table_key, (record_key, title, description) in table_defs.items():
        rows = weapons_data.get(table_key, [])
        table_rows = []
        for row in rows:
            table_rows.append(
                {
                    "from": row["from"],
                    "to": row["to"],
                    "columns": [resolve_weapon_row_link(table_key, row)],
                }
            )
        build_table(
            tables,
            record_key,
            title,
            table_rows,
            labels=["Weapon"],
            description=description,
        )


def build_mundane_armor_tables(tables: ET.Element, items: dict[str, dict]) -> None:
    armor_data = load_json("mundane_armor.json")
    table_defs = {
        "main": (
            "treasure_mundane_armor",
            "Treasure — Mundane Armor",
            "DMG mundane armor. Roll d% for size: 01–10 = Small, 11–100 = Medium.",
        ),
        "darkwood": (
            "treasure_mundane_armor_darkwood",
            "Treasure — Darkwood Shield",
            "DMG mundane darkwood shield type.",
        ),
        "masterwork_shield": (
            "treasure_mundane_armor_masterwork_shield",
            "Treasure — Masterwork Shield Type",
            "DMG mundane masterwork shield type.",
        ),
    }
    for section, (record_key, title, description) in table_defs.items():
        section_rows = []
        for row in armor_data.get(section, []):
            if row.get("subtable"):
                section_rows.append(
                    {
                        "from": row["from"],
                        "to": row["to"],
                        "columns": [
                            column(
                                row["result"],
                                "table",
                                f"tables.treasure_mundane_armor_{row['subtable']}",
                            )
                        ],
                    }
                )
                continue
            key = f"mundane_armor_{slugify(row['result'])}_{row['from']}"
            link_class, recordname = resolve_mundane_link(
                key,
                {"equipment_slug": row.get("equipment_slug", "")},
            )
            section_rows.append(
                {
                    "from": row["from"],
                    "to": row["to"],
                    "columns": [column(alchemical_result(row["result"]) if "(" in row["result"] else row["result"], link_class, recordname)],
                }
            )
        build_table(
            tables,
            record_key,
            title,
            section_rows,
            labels=["Armor"],
            description=description,
        )


def build_mundane_tables(tables: ET.Element, items: dict[str, dict]) -> None:
    mundane = load_json("mundane.json")
    root_rows = []
    for row in mundane["root"]:
        section = row["section"]
        root_rows.append(
            {
                "from": row["from"],
                "to": row["to"],
                "columns": [
                    column(row["result"], "table", f"tables.treasure_mundane_{section}")
                ],
            }
        )
    build_table(
        tables,
        "treasure_mundane",
        "Treasure — Mundane Items",
        root_rows,
        labels=["Category"],
        description="DMG Table: Mundane Items (router)",
    )

    for section in ("alchemical", "weapons", "tools"):
        section_rows = []
        for row in mundane.get(section, []):
            result = row["result"]
            if section == "alchemical":
                result = alchemical_result(result)
            if section == "weapons" and result in WEAPON_CATEGORY_TABLES:
                section_rows.append(
                    {
                        "from": row["from"],
                        "to": row["to"],
                        "columns": [
                            column(result, "table", WEAPON_CATEGORY_TABLES[result]),
                        ],
                    }
                )
                continue
            key = f"mundane_{section}_{slugify(result)}"
            match_key = next(
                (k for k in items if k.startswith(f"mundane_{section}_") and result.lower() in items[k]["description"].lower()),
                None,
            )
            if not match_key:
                match_key = key
            link_class, recordname = resolve_mundane_link(
                match_key, items.get(match_key, {"equipment_slug": ""})
            )
            section_rows.append(
                {
                    "from": row["from"],
                    "to": row["to"],
                    "columns": [column(result, link_class, recordname)],
                }
            )
        build_table(
            tables,
            f"treasure_mundane_{section}",
            f"Treasure — Mundane ({section.title()})",
            section_rows,
            labels=["Item"],
            description=f"DMG mundane sub-table: {section}",
        )

    build_mundane_armor_tables(tables, items)


def build_tier_table(
    tables: ET.Element,
    record_key: str,
    title: str,
    source_rows: list[dict],
    tier: str,
    known: set[str],
    *,
    parent_table: str | None = None,
    description: str = "",
) -> None:
    tier_rows = rows_for_tier(source_rows, tier)
    if not tier_rows:
        return
    table_rows = []
    for row in tier_rows:
        table_rows.append(
            {
                "from": row["from"],
                "to": row["to"],
                "columns": [
                    row_to_column(
                        row,
                        tier,
                        known=known,
                        parent_table=parent_table,
                    )
                ],
            }
        )
    build_table(
        tables,
        record_key,
        title,
        table_rows,
        labels=["Result"],
        description=description or f"DMG magic item table ({tier})",
    )


def build_shared_magic_tables(tables: ET.Element, known: set[str]) -> None:
    for source, title in (
        ("armor_type", "Magic — Random Armor Type"),
        ("shield_type", "Magic — Random Shield Type"),
        ("weapon_type", "Magic — Weapon Type Determination"),
    ):
        rows = load_magic_rows(source)
        if not rows:
            continue
        table_rows = []
        for row in rows:
            lo, hi = row["d_pct"]
            table_rows.append(
                {
                    "from": lo,
                    "to": hi,
                    "columns": [row_to_column(row, "minor", known=known)],
                }
            )
        build_table(
            tables,
            f"magic_{source}",
            title,
            table_rows,
            labels=["Type"],
            description=f"DMG Table: {title}",
        )


def build_magic_special_routers(tables: ET.Element, tier: str) -> None:
    build_table(
        tables,
        f"magic_armor_shield_special_{tier}",
        f"Magic — Armor or Shield Special ({tier.title()})",
        [
            {
                "from": 1,
                "to": 50,
                "columns": [
                    column(
                        "Armor special ability",
                        "table",
                        f"tables.magic_armor_special_{tier}",
                    )
                ],
            },
            {
                "from": 51,
                "to": 100,
                "columns": [
                    column(
                        "Shield special ability",
                        "table",
                        f"tables.magic_shield_special_{tier}",
                    )
                ],
            },
        ],
        labels=["Ability"],
        description="Roll armor or shield special ability, then roll again on armor/shields table.",
    )
    build_table(
        tables,
        f"magic_weapon_special_{tier}",
        f"Magic — Melee or Ranged Special ({tier.title()})",
        [
            {
                "from": 1,
                "to": 70,
                "columns": [
                    column(
                        "Melee weapon special ability",
                        "table",
                        f"tables.magic_melee_special_{tier}",
                    )
                ],
            },
            {
                "from": 71,
                "to": 100,
                "columns": [
                    column(
                        "Ranged weapon special ability",
                        "table",
                        f"tables.magic_ranged_special_{tier}",
                    )
                ],
            },
        ],
        labels=["Ability"],
        description="Roll melee or ranged special ability, then roll again on weapons table.",
    )


def build_magic_item_tables(tables: ET.Element, known: set[str]) -> list[str]:
    missing: list[str] = []
    build_shared_magic_tables(tables, known)

    for tier in ("minor", "medium", "major"):
        build_magic_special_routers(tables, tier)
        for sub_key, title in TIERED_MAGIC_SUBTABLES.items():
            if "armor" in sub_key or "shield" in sub_key:
                parent = f"magic_armor_shields_{tier}"
            else:
                parent = f"magic_weapons_{tier}"
            build_tier_table(
                tables,
                f"magic_{sub_key}_{tier}",
                f"Magic — {title} ({tier.title()})",
                load_magic_rows(sub_key),
                tier,
                known,
                parent_table=parent if "special" in sub_key else None,
            )

        for cat, source in TIERED_MAGIC_SOURCES.items():
            record_key = f"magic_armor_shields_{tier}" if cat == "armor" else f"magic_{cat}_{tier}"
            build_tier_table(
                tables,
                record_key,
                f"Magic — {'Armor and Shields' if cat == 'armor' else cat.title()} ({tier.title()})",
                load_magic_rows(source),
                tier,
                known,
                parent_table=record_key,
            )

        for wtier in ("minor", "medium", "major"):
            if wtier != tier:
                continue
            rows = load_magic_rows(f"wondrous_{wtier}")
            if not rows:
                continue
            table_rows = []
            for row in rows:
                lo, hi = row["d_pct"]
                col = row_to_column(row, tier, known=known)
                table_rows.append({"from": lo, "to": hi, "columns": [col]})
                if col.get("link_class") == "item" and "reference.magicitems." in col.get("recordname", ""):
                    slug = col["recordname"].split(".")[-1].split("@")[0]
                    if slug not in known:
                        missing.append(row.get("label", slug))
            build_table(
                tables,
                f"magic_wondrous_{tier}",
                f"Magic — Wondrous Items ({tier.title()})",
                table_rows,
                labels=["Item"],
                description="DMG Table: Wondrous Items",
            )

    return missing


def build_scroll_spell_tables(tables: ET.Element) -> None:
    for tier in ("minor", "medium", "major"):
        spell_rows = []
        for row in SCROLL_SPELL_LEVELS[tier]:
            lvl = row["level"]
            lvl_num = 0 if lvl == "0" else int(lvl[0])
            spell_rows.append(
                {
                    "from": row["from"],
                    "to": row["to"],
                    "columns": [
                        column(
                            f"Arcane L{lvl_num} (caster {row['caster']})",
                            "table",
                            f"tables.scroll_l{lvl_num}_arcane@{SCROLL_MOD}",
                        ),
                        column(
                            f"Divine L{lvl_num} (caster {row['caster']})",
                            "table",
                            f"tables.scroll_l{lvl_num}_divine@{SCROLL_MOD}",
                        ),
                    ],
                }
            )
        build_table(
            tables,
            f"scroll_spell_levels_{tier}",
            f"Scroll Spell Levels — {tier.title()}",
            spell_rows,
            labels=["Arcane", "Divine"],
            result_cols=2,
            description="DMG Table: Scroll Spell Levels",
        )


def build_epic_table(tables: ET.Element) -> None:
    epic = load_json("treasure_epic.json")
    rows = []
    for level_str in sorted(epic.keys(), key=int):
        extra = epic[level_str]
        rows.append(
            {
                "from": int(level_str),
                "to": int(level_str),
                "columns": [
                    column(
                        f"Roll Treasure L20, then {extra} major item{'s' if extra != 1 else ''}",
                        "table",
                        "tables.random_magic_major",
                    )
                ],
            }
        )
    build_table(
        tables,
        "treasure_epic",
        "Treasure — Epic (L21+)",
        rows,
        dice="d20",
        labels=["Extra major items"],
        description=(
            "Epic treasure: use Treasure L20 for coins, goods, and base items, "
            "then roll on Random Magic — Major once per extra major item for the encounter level."
        ),
    )


def build_random_magic_tables(tables: ET.Element, known: set[str]) -> list[str]:
    categories = load_json("random_magic_categories.json")
    category_targets = {
        "armor": "magic_armor_shields",
        "weapons": "magic_weapons",
        "potions": "magic_potions",
        "rings": "magic_rings",
        "rods": "magic_rods",
        "staffs": "magic_staffs",
        "wands": "magic_wands",
        "wondrous": "magic_wondrous",
        "scrolls": "scroll_spell_levels",
    }

    for tier, rows in categories.items():
        table_rows = []
        for row in rows:
            cat = row["category"]
            base = category_targets[cat]
            target = f"tables.{base}_{tier}"
            table_rows.append(
                {
                    "from": row["from"],
                    "to": row["to"],
                    "columns": [column(row["label"], "table", target)],
                }
            )
        build_table(
            tables,
            f"random_magic_{tier}",
            f"Random Magic Items — {tier.title()}",
            table_rows,
            labels=["Category"],
            description="DMG Table: Random Magic Item Generation",
        )

    missing = build_magic_item_tables(tables, known)
    build_scroll_spell_tables(tables)
    build_epic_table(tables)
    return missing


def audit_items(items: dict[str, dict]) -> None:
    external = sum(1 for i in items.values() if i.get("equipment_slug"))
    bundled = len(items) - external
    print(f"Item catalog: {len(items)} total, {external} linked to 3.5E Basic Rules, {bundled} bundled in mod")


def main() -> None:
    if not (DATA / "treasure_levels.json").exists():
        from extract_data import main as extract_main

        extract_main()

    if not MAGIC_DATA.exists() or not any(MAGIC_DATA.glob("*.json")):
        from extract_magic_items import main as extract_magic_main

        extract_magic_main()

    known_magic = load_known_magic_keys()
    all_magic_rows: list[dict] = []
    for path in MAGIC_DATA.glob("*.json"):
        all_magic_rows.extend(json.loads(path.read_text(encoding="utf-8")).get("rows", []))

    items = load_bundled_items()
    items.update(load_bundled_magic_items(all_magic_rows, known_magic))
    audit_items(items)

    root = make_root()
    add_library_entry(
        root,
        lib_key="dmgtreasure",
        lib_name="dmgtreasure",
        category="DMG Tables",
        display_name="DMG Treasure Tables",
    )
    root.append(build_items_section(items))
    tables = ET.SubElement(root, "tables")
    build_treasure_level_tables(tables, load_json("treasure_levels.json"))
    build_gem_art_tables(tables)
    build_mundane_tables(tables, items)
    build_weapon_determination_tables(tables)
    missing_magic = build_random_magic_tables(tables, known_magic)

    unique_missing = sorted(set(missing_magic))
    if unique_missing:
        print(f"Warning: {len(unique_missing)} magic item slugs not in 3.5E Magic Items (bundled fallback):")
        for line in unique_missing[:25]:
            print(f"  {line}")
        if len(unique_missing) > 25:
            print(f"  ... and {len(unique_missing) - 25} more")
    else:
        print("All magic item slugs resolved in 3.5E Magic Items (or bundled).")

    write_xml(root, MODULE_DIR / "db.xml")
    out = package_mod(MODULE_DIR, FG_MODULES / MOD_NAME)
    print(f"Built {out}")


if __name__ == "__main__":
    main()
