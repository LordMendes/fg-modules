#!/usr/bin/env python3
"""Spot-check class text quality for several classes per module."""
from __future__ import annotations

import zipfile
from pathlib import Path

SAMPLES = {
    "Complete Divine": ["Radiant Servant of Pelor", "Black Flame Zealot", "Favored Soul"],
    "Complete Warrior": ["Frenzied Berserker", "Exotic Weapon Master"],
    "Unearthed Arcana": ["Cloistered Cleric", "Battle Sorcerer", "Totem Barbarian"],
    "Book of Vile Darkness": ["Ur-priest", "Cancer Mage"],
    "Player's Handbook II": ["Knight", "Beguiler"],
}


def check(mod: Path, names: list[str]) -> None:
    with zipfile.ZipFile(mod) as z:
        xml = z.read("db.xml").decode("utf-8")
    print(f"\n== {mod.name} ==")
    for name in names:
        needle = f"{name}</name>"
        i = xml.find(needle)
        if i < 0:
            print(f"  MISSING {name}")
            continue
        chunk = xml[i : i + 25000]
        cf = chunk.find("<classfeatures>")
        cfe = chunk.find("</classfeatures>")
        nfeat = chunk[cf:cfe].count("<level type") if cf >= 0 else 0
        ts = chunk.find('<text type="formattedtext">', cfe if cfe > 0 else 0)
        te = chunk.find("</text>", ts)
        body = chunk[ts:te] if ts >= 0 else ""
        has_prereq_para = "<p><b>Prerequisites:</b></p><p>" in body
        has_prereq_table = "<p><b>Prerequisites:</b></p><table>" in body
        has_adv = "<p><b>Advancement</b></p><table>" in body
        adv_rows = body.count("<tr>") - 1 if has_adv else 0  # minus header
        print(
            f"  {name}: features={nfeat} prereq_para={has_prereq_para} "
            f"prereq_table={has_prereq_table} advancement={has_adv} adv_rows~={max(adv_rows,0)}"
        )


def main() -> None:
    for mod_name, names in SAMPLES.items():
        path = Path("modules") / f"{mod_name}.mod"
        if path.exists():
            check(path, names)


if __name__ == "__main__":
    main()
