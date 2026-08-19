#!/usr/bin/env python3
"""Patch classes.json with PHB Bard content from classic dndtools.org."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import requests

from scraper.parsers.classes import parse_detail

ROOT = Path(__file__).resolve().parents[1]
CLASSES_PATH = ROOT / "data" / "dndtools" / "classes.json"
INDEX_PATH = ROOT / "data" / "dndtools" / ".index" / "classes.json"
CLASSIC_URL = "https://dndtools.org/classes/players-handbook-v35--6/bard/"


def fetch_phb_bard() -> dict:
    response = requests.get(CLASSIC_URL, timeout=60, allow_redirects=True)
    response.raise_for_status()
    detail = parse_detail(response.text, CLASSIC_URL)
    if not detail.get("advancement_html"):
        raise RuntimeError("Classic PHB Bard page did not return an advancement table")
    if not detail.get("class_skills"):
        raise RuntimeError("Classic PHB Bard page did not return class skills")
    return detail


def patch_record(record: dict, classic: dict) -> None:
    record["id"] = 90
    record["slug"] = "bard"
    record["name"] = "Bard"
    record["source_url"] = "https://new.dndtools.org/classes/bard"
    record["scraped_at"] = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    record["hit_die"] = "d6"
    record["skill_points"] = "6+ Int"
    record["advancement_html"] = classic["advancement_html"]
    record["advancement_text"] = classic.get("advancement_text")
    record["class_skills"] = classic["class_skills"]
    record["description_html"] = record.get("description_html")
    record["description_text"] = record.get("description_text")
    record["index"] = {
        "prestige_level": "",
        "hit_die": "6",
        "skill_points": "6",
        "source_abbrev": "PH",
        "edition": "Core (3.5)",
    }
    record["source"] = {
        "name": "Player's Handbook",
        "abbrev": "PH",
        "edition": "Core (3.5)",
        "page": 26,
        "url": None,
    }


def patch_index_record(record: dict) -> None:
    record["slug"] = "bard"
    record["id"] = 90
    record["url"] = "https://new.dndtools.org/classes/bard"
    record["index"] = {
        "prestige_level": "",
        "hit_die": "6",
        "skill_points": "6",
        "source_abbrev": "PH",
        "edition": "Core (3.5)",
    }


def main() -> None:
    classic = fetch_phb_bard()

    with CLASSES_PATH.open(encoding="utf-8") as handle:
        classes = json.load(handle)

    patched = 0
    for record in classes:
        if record.get("slug") == "bard" and record.get("name") == "Bard":
            patch_record(record, classic)
            patched += 1
            break

    if patched == 0:
        raise RuntimeError("Bard record not found in classes.json")

    with CLASSES_PATH.open("w", encoding="utf-8") as handle:
        json.dump(classes, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    with INDEX_PATH.open(encoding="utf-8") as handle:
        index_rows = json.load(handle)

    for record in index_rows:
        if record.get("slug") == "bard" and record.get("name") == "Bard":
            patch_index_record(record)
            break

    with INDEX_PATH.open("w", encoding="utf-8") as handle:
        json.dump(index_rows, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print(f"Patched PHB Bard in {CLASSES_PATH}")
    print(f"Patched Bard index row in {INDEX_PATH}")


if __name__ == "__main__":
    main()
