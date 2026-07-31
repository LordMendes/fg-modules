#!/usr/bin/env python3
"""Build DMG Scroll Tables FG module (all levels, arcane + divine)."""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

MODULE_DIR = Path(__file__).resolve().parent
ROOT = MODULE_DIR.parent
sys.path.insert(0, str(ROOT))

from extract_scrolls import resolve_scroll_key  # noqa: E402
from fg_common import (  # noqa: E402
    add_library_entry,
    build_table,
    item_link,
    make_root,
    package_mod,
    write_xml,
)

DATA_DIR = MODULE_DIR / "data"
SPELLS_PATH = DATA_DIR / "scroll-spells.json"
FG_MODULES = Path.home() / "AppData/Roaming/SmiteWorks/Fantasy Grounds/modules"
MOD_NAME = "DMG Scroll Tables.mod"
OLD_MOD_NAME = "DMG Scroll L0 Tables.mod"


def load_known_scroll_keys() -> set[str]:
    keys: set[str] = set()
    cache = (
        Path.home()
        / "AppData/Roaming/SmiteWorks/Fantasy Grounds/campaigns/Ploft/moduledb/3.5E Magic Items.xml"
    )
    if cache.exists():
        keys.update(re.findall(r"<(scroll[a-z0-9]+)>", cache.read_text(encoding="utf-8", errors="ignore")))
    for mod in FG_MODULES.glob("*.mod"):
        if "magic" not in mod.name.lower():
            continue
        import zipfile

        try:
            with zipfile.ZipFile(mod) as zf:
                for name in zf.namelist():
                    if name.endswith("db.xml"):
                        text = zf.read(name).decode("utf-8", errors="ignore")
                        keys.update(re.findall(r"<(scroll[a-z0-9]+)>", text))
        except zipfile.BadZipFile:
            continue
    return keys


def ensure_spell_data() -> dict:
    if not SPELLS_PATH.exists():
        from extract_scrolls import main as extract_main

        extract_main()
    return json.loads(SPELLS_PATH.read_text(encoding="utf-8"))


def scroll_rows(entries: list[dict], known: set[str]) -> tuple[list[dict], list[str]]:
    rows = []
    missing: list[str] = []
    for entry in entries:
        slug = resolve_scroll_key(entry["spell"], known)
        if slug not in known:
            missing.append(f"{entry['spell']} -> {slug}")
        rows.append(
            {
                "from": entry["from"],
                "to": entry["to"],
                "columns": [
                    {
                        "result": f"Scroll ({entry['spell']})",
                        "link_class": "item",
                        "recordname": item_link(slug),
                    }
                ],
            }
        )
    return rows, missing


def build_db(data: dict, known: set[str]) -> tuple[ET.Element, list[str]]:
    root = make_root()
    add_library_entry(
        root,
        lib_key="dmgscrolltables",
        lib_name="dmgscrolltables",
        category="DMG Tables",
        display_name="DMG Scroll Tables",
    )
    tables = ET.SubElement(root, "tables")
    all_missing: list[str] = []

    for kind in ("arcane", "divine"):
        label = kind.capitalize()
        for level in sorted(data[kind].keys(), key=int):
            entries = data[kind][level]
            rows, missing = scroll_rows(entries, known)
            all_missing.extend(missing)
            table_key = f"scroll_l{level}_{kind}"
            build_table(
                tables,
                table_key,
                f"Scroll L{level} — {label}",
                rows,
                dice="d100",
                description=f"DMG Table: {label} Spell Scrolls, level {level}",
                labels=["Scroll"],
            )
    return root, all_missing


def main() -> None:
    data = ensure_spell_data()
    known = load_known_scroll_keys()
    root, missing = build_db(data, known)

    unique_missing = sorted(set(missing))
    if unique_missing:
        print(f"Warning: {len(unique_missing)} scroll keys not found in 3.5E Magic Items:")
        for line in unique_missing[:20]:
            print(f"  {line}")
        if len(unique_missing) > 20:
            print(f"  ... and {len(unique_missing) - 20} more")
    else:
        print("All scroll slugs resolved in 3.5E Magic Items.")

    write_xml(root, MODULE_DIR / "db.xml")
    out = package_mod(MODULE_DIR, FG_MODULES / MOD_NAME)
    old = FG_MODULES / OLD_MOD_NAME
    if old.exists() and old != out:
        old.unlink()
        print(f"Removed superseded {old.name}")
    print(f"Built {out} ({len(list(root.find('tables')))} tables)")


if __name__ == "__main__":
    main()
