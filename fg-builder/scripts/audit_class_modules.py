#!/usr/bin/env python3
"""Audit FG modules for class structural problems."""
from __future__ import annotations

import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

MODULES = [
    "Complete Divine",
    "Complete Warrior",
    "Complete Mage",
    "Complete Arcane",
    "Complete Adventurer",
    "Unearthed Arcana",
    "Book of Vile Darkness",
    "Complete Champion",
    "Player's Handbook II",
]

VALID_SAVES = {"Good", "Bad"}


def audit_mod(path: Path) -> dict:
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("db.xml"))
        xml = z.read("db.xml").decode("utf-8")

    section = root.find("class")
    if section is None:
        return {"mod": path.name, "classes": 0, "issues": ["no class section"]}

    issues: list[str] = []
    class_count = 0
    no_features = 0
    bad_saves = 0
    non_skills = 0
    prereq_table = 0
    h4_advancement = 0
    merged_hint = 0

    for cat in section:
        nodes = [cat] if cat.tag.startswith("id-") else list(cat)
        for node in nodes:
            if not node.tag.startswith("id-"):
                continue
            name_el = node.find("name")
            if name_el is None or not name_el.text:
                continue
            class_count += 1
            name = name_el.text

            cf = node.find("classfeatures")
            nfeat = 0 if cf is None else len(list(cf))
            if nfeat == 0:
                no_features += 1
                issues.append(f"{name}: no classfeatures")

            for tag in ("fort", "ref", "will"):
                el = node.find(tag)
                val = (el.text or "").strip() if el is not None else ""
                if val and val not in VALID_SAVES:
                    bad_saves += 1
                    issues.append(f"{name}: invalid {tag}={val!r}")

            skills = node.find("classskills")
            if skills is not None and skills.text and "(Non)" in skills.text:
                non_skills += 1
                issues.append(f"{name}: classskills contain (Non)")

    # Raw XML checks for table merge patterns
    if "<p><b>Prerequisites:</b></p><table>" in xml:
        prereq_table += xml.count("<p><b>Prerequisites:</b></p><table>")
    if "<h4>Advancement</h4>" in xml:
        h4_advancement += xml.count("<h4>Advancement</h4>")
    if "</table><h4>Advancement</h4><table>" in xml:
        merged_hint += xml.count("</table><h4>Advancement</h4><table>")

    return {
        "mod": path.name,
        "classes": class_count,
        "no_features": no_features,
        "bad_saves": bad_saves,
        "non_skills": non_skills,
        "prereq_table": prereq_table,
        "h4_advancement": h4_advancement,
        "merged_hint": merged_hint,
        "issues": issues,
    }


def main() -> None:
    root = Path("modules")
    totals = {
        "classes": 0,
        "no_features": 0,
        "bad_saves": 0,
        "non_skills": 0,
        "prereq_table": 0,
        "h4_advancement": 0,
    }
    for name in MODULES:
        path = root / f"{name}.mod"
        if not path.exists():
            print(f"MISSING {path}")
            continue
        r = audit_mod(path)
        print(
            f"{r['mod']}: classes={r['classes']} "
            f"no_features={r['no_features']} bad_saves={r['bad_saves']} "
            f"(Non)={r['non_skills']} prereq_table={r['prereq_table']} "
            f"h4_adv={r['h4_advancement']} merge_hint={r['merged_hint']}"
        )
        for key in totals:
            totals[key] += r.get(key, 0)
        # show a few sample issues
        for issue in r["issues"][:5]:
            print(f"  - {issue}")
        if len(r["issues"]) > 5:
            print(f"  ... +{len(r['issues']) - 5} more")
    print("\nTOTALS:", totals)


if __name__ == "__main__":
    main()
