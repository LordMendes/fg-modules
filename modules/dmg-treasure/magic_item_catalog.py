#!/usr/bin/env python3
"""Magic item slug resolution and FG column building for dmg-treasure."""

from __future__ import annotations

import re
import zipfile
from pathlib import Path

from fg_common import item_link

FG_MODULES = Path.home() / "AppData/Roaming/SmiteWorks/Fantasy Grounds/modules"
CAMPAIGN_CACHE = (
    Path.home()
    / "AppData/Roaming/SmiteWorks/Fantasy Grounds/campaigns/Ploft/moduledb/3.5E Magic Items.xml"
)

WEAPON_TYPE_LINKS = {
    "common melee weapon": "tables.treasure_mundane_weapons_common_melee",
    "uncommon weapon": "tables.treasure_mundane_weapons_uncommon",
    "common ranged weapon": "tables.treasure_mundane_weapons_common_ranged",
}

ALIASES: dict[str, str] = {
    "cure light wounds (potion)": "potioncurelightwounds",
    "feather token, anchor": "wondrousitemfeathertokenanchor",
    "stone of alarm": "wondrousitemstoneofalarm",
    "boots of striding and springing": "wondrousitembootsofstridingandspringing",
    "protection +1": "ringofprotection1",
    "protection +2": "ringofprotection2",
    "protection +3": "ringofprotection3",
    "protection +4": "ringofprotection4",
    "protection +5": "ringofprotection5",
}


def normalize_name(text: str) -> str:
    text = text.lower().strip()
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = re.sub(r"\s+", " ", text)
    return text


def slugify_magic(text: str) -> str:
    text = normalize_name(text)
    text = text.replace("'", "")
    text = re.sub(r"\([^)]*\)", "", text)
    text = re.sub(r"[^a-z0-9]+", "", text)
    return text


def candidate_keys(label: str) -> list[str]:
    norm = normalize_name(label)
    if norm in ALIASES:
        return [ALIASES[norm]]
    base = slugify_magic(label)
    cands: list[str] = []
    low = norm
    if "(potion)" in low or " potion" in low:
        potion_name = re.sub(r"\(potion\)", "", low)
        cands.append(f"potion{slugify_magic(potion_name)}")
    if "(oil)" in low or low.endswith(" oil"):
        oil_name = re.sub(r"\(oil\)", "", low)
        cands.append(f"potion{slugify_magic(oil_name)}")
    if "ring" in low or norm.startswith("protection +"):
        cands.append(f"ring{base}")
        cands.append(f"ringof{base.replace('ring', '', 1)}")
    if "wand" in low:
        cands.append(f"wand{base}")
        cands.append(f"wandof{base.replace('wand', '', 1)}")
    if "staff" in low or norm in {"charming", "fire", "healing", "power", "frost", "defense"}:
        cands.append(f"staff{base}")
        cands.append(f"staffof{base}")
    if "rod" in low or "metamagic" in low:
        cands.append(f"rod{base}")
    cands.append(f"wondrousitem{base}")
    cands.append(base)
    seen: set[str] = set()
    out: list[str] = []
    for key in cands:
        if key and key not in seen:
            seen.add(key)
            out.append(key)
    return out


def load_known_magic_keys() -> set[str]:
    keys: set[str] = set()
    if CAMPAIGN_CACHE.exists():
        text = CAMPAIGN_CACHE.read_text(encoding="utf-8", errors="ignore")
        keys.update(re.findall(r"<([a-z][a-z0-9]+)>\s*<public", text))
    for mod in FG_MODULES.glob("*.mod"):
        if "magic" not in mod.name.lower():
            continue
        try:
            with zipfile.ZipFile(mod) as zf:
                for name in zf.namelist():
                    if not name.endswith("db.xml"):
                        continue
                    text = zf.read(name).decode("utf-8", errors="ignore")
                    keys.update(re.findall(r"<magicitems>\s*<([a-z][a-z0-9]+)>", text))
        except zipfile.BadZipFile:
            continue
    return keys


def resolve_magic_item(label: str, known: set[str]) -> tuple[str, str]:
    for cand in candidate_keys(label):
        if cand in known:
            return cand, item_link(cand)
    key = candidate_keys(label)[0] if candidate_keys(label) else slugify_magic(label)
    return key, item_link(key)


def format_result(label: str, price: str = "") -> str:
    text = label.strip()
    if price and price not in {"-", "—", ""}:
        return f"{text} ({price})"
    return text


def tier_range(row: dict, tier: str) -> tuple[int, int] | None:
    val = row.get(tier)
    if val and len(val) == 2:
        return int(val[0]), int(val[1])
    return None


def resolve_subtable(target: str, tier: str) -> str:
    static = {
        "magic_armor_type": "magic_armor_type",
        "magic_shield_type": "magic_shield_type",
        "magic_weapon_type": "magic_weapon_type",
        "magic_weapon_ammunition": "treasure_mundane_weapons_ammunition",
    }
    if target in static:
        return static[target]
    if target == "magic_armor_shield_special":
        return f"magic_armor_shield_special_{tier}"
    if target == "magic_weapon_special":
        return f"magic_weapon_special_{tier}"
    short = target.replace("magic_", "")
    return f"magic_{short}_{tier}"


def row_to_column(
    row: dict,
    tier: str,
    *,
    known: set[str],
    parent_table: str | None = None,
) -> dict:
    label = row.get("label", "")
    price = row.get("price", "")
    action = row.get("action", "item")
    target = row.get("target")
    result = format_result(label, price)

    low = label.lower()
    if low in WEAPON_TYPE_LINKS:
        return {
            "result": result,
            "link_class": "table",
            "recordname": WEAPON_TYPE_LINKS[low],
        }

    if action == "subtable" and target:
        table_key = resolve_subtable(target, tier)
        return {
            "result": result,
            "link_class": "table",
            "recordname": f"tables.{table_key}",
        }

    if action == "roll_again" and parent_table:
        return {
            "result": f"{result} — roll again",
            "link_class": "table",
            "recordname": f"tables.{parent_table}",
        }

    if action == "roll_twice" and parent_table:
        return {
            "result": f"{result} — roll twice",
            "link_class": "table",
            "recordname": f"tables.{parent_table}",
        }

    _key, recordname = resolve_magic_item(label, known)
    return {
        "result": result,
        "link_class": "item",
        "recordname": recordname,
    }


def rows_for_tier(rows: list[dict], tier: str) -> list[dict]:
    out: list[dict] = []
    for row in rows:
        if "d_pct" in row:
            lo, hi = row["d_pct"]
            out.append({"from": lo, "to": hi, **row})
            continue
        rng = tier_range(row, tier)
        if rng:
            out.append({"from": rng[0], "to": rng[1], **row})
    return out


def load_bundled_magic_items(all_rows: list[dict], known: set[str]) -> dict[str, dict]:
    items: dict[str, dict] = {}
    for row in all_rows:
        if row.get("action") != "item":
            continue
        label = row.get("label", "")
        key, _ = resolve_magic_item(label, known)
        if key in known or key in items:
            continue
        items[key] = {
            "name": label.split("(")[0].strip(),
            "cost": row.get("price", "0 gp") or "0 gp",
            "type": "Magic Item",
            "description": format_result(label, row.get("price", "")),
        }
    return items
