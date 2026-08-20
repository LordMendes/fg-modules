#!/usr/bin/env python3
"""Patch placeholder Core source names in scraped JSON files."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scraper.normalize import parse_source_line  # noqa: E402
from scraper.source_names import (  # noqa: E402
    EQUIPMENT_DEFAULT_SOURCE,
    PLACEHOLDER_SOURCE_NAME,
    build_abbrev_name_map,
    load_all_records,
    load_name_map,
    parse_deity_source_lines,
    resolve_canonical_name,
)

DATA = ROOT / "data" / "dndtools"
PATCH_FILES = (
    "classes.json",
    "deities.json",
    "templates.json",
    "equipment.json",
    "items.json",
    "domains.json",
)

AUTHOR_DRAGON_RE = re.compile(r"dragon\s*#\s*(\d+)", re.I)


def load_json(path: Path) -> list[dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, records: list[dict[str, Any]]) -> None:
    path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def source_abbrev(record: dict[str, Any]) -> str | None:
    src = record.get("source") or {}
    abbrev = src.get("abbrev")
    if abbrev:
        return str(abbrev).strip() or None
    index = record.get("index") or {}
    index_abbrev = index.get("source_abbrev")
    if index_abbrev:
        return str(index_abbrev).strip() or None
    return None


def should_patch_name(name: str | None, abbrev: str | None, name_map: dict[str, str]) -> bool:
    if not name or name == PLACEHOLDER_SOURCE_NAME:
        return bool(abbrev and abbrev in name_map)
    if abbrev and abbrev in name_map:
        canonical = name_map[abbrev]
        return canonical != name and canonical != PLACEHOLDER_SOURCE_NAME
    return False


def patch_source_block(
    source: dict[str, Any],
    name_map: dict[str, str],
    *,
    default_source: dict[str, Any] | None = None,
) -> bool:
    abbrev = source.get("abbrev")
    if isinstance(abbrev, str):
        abbrev = abbrev.strip() or None
    name = source.get("name")
    if isinstance(name, str):
        name = name.strip() or None

    if default_source and not abbrev and name in (None, PLACEHOLDER_SOURCE_NAME):
        source.update(default_source)
        return True

    if not abbrev or abbrev not in name_map:
        return False
    if not should_patch_name(name, abbrev, name_map):
        return False

    source["name"] = resolve_canonical_name(name, abbrev, name_map)
    source["abbrev"] = abbrev
    return True


def patch_class_record(record: dict[str, Any], name_map: dict[str, str]) -> bool:
    source = record.setdefault("source", {})
    abbrev = source_abbrev(record)
    if abbrev and not source.get("abbrev"):
        source["abbrev"] = abbrev
    return patch_source_block(source, name_map)


def build_monster_source_index(data_dir: Path) -> dict[str, dict[str, Any]]:
    path = data_dir / "monsters.json"
    if not path.exists():
        return {}
    records = load_json(path)
    index: dict[str, dict[str, Any]] = {}
    for record in records:
        slug = record.get("slug")
        if not isinstance(slug, str):
            continue
        src = record.get("source") or {}
        index[slug] = {
            "abbrev": src.get("abbrev") or (record.get("index") or {}).get("source_abbrev"),
            "name": src.get("name"),
            "edition": src.get("edition") or (record.get("index") or {}).get("edition"),
        }
    return index


def infer_template_source(
    record: dict[str, Any],
    monster_sources: dict[str, dict[str, Any]],
    name_map: dict[str, str],
) -> dict[str, Any] | None:
    samples = record.get("sample_monsters") or []
    for sample in samples:
        if not isinstance(sample, dict):
            continue
        slug = sample.get("slug")
        if not isinstance(slug, str):
            continue
        monster = monster_sources.get(slug)
        if monster and monster.get("abbrev"):
            return {
                "abbrev": monster["abbrev"],
                "name": monster.get("name"),
                "edition": monster.get("edition"),
                "page": None,
                "url": None,
            }

    author = record.get("author")
    if isinstance(author, str):
        match = AUTHOR_DRAGON_RE.search(author)
        if match:
            abbrev = f"D{match.group(1)}"
            if abbrev in name_map:
                return {
                    "abbrev": abbrev,
                    "name": name_map[abbrev],
                    "edition": "3.5",
                    "page": None,
                    "url": None,
                }

    return None


def patch_template_record(
    record: dict[str, Any],
    name_map: dict[str, str],
    monster_sources: dict[str, dict[str, Any]],
) -> bool:
    source = record.setdefault("source", {})
    inferred = infer_template_source(record, monster_sources, name_map)
    if inferred:
        source.update({k: v for k, v in inferred.items() if v is not None})

    raw = source.get("name")
    if isinstance(raw, str) and raw not in (None, "", PLACEHOLDER_SOURCE_NAME):
        parsed = parse_source_line(raw)
        if parsed.get("abbrev"):
            source["abbrev"] = parsed["abbrev"]
            if parsed.get("name"):
                source["name"] = parsed["name"]

    abbrev = source_abbrev(record)
    if abbrev and not source.get("abbrev"):
        source["abbrev"] = abbrev
    return patch_source_block(source, name_map)


def patch_deity_record(record: dict[str, Any], name_map: dict[str, str]) -> bool:
    source = record.setdefault("source", {})
    if source.get("name") and source.get("name") != PLACEHOLDER_SOURCE_NAME and source.get("abbrev"):
        return patch_source_block(source, name_map)

    pantheon = record.get("pantheon") or (record.get("index") or {}).get("pantheon")
    muted: list[str] = []
    if isinstance(source.get("name"), str) and source["name"] not in (PLACEHOLDER_SOURCE_NAME, ""):
        muted = [source["name"]]
    parsed = parse_deity_source_lines(muted, name_map, pantheon if isinstance(pantheon, str) else None)
    if not parsed:
        return False
    before = dict(source)
    source.update({k: v for k, v in parsed.items() if v is not None})
    source["name"] = resolve_canonical_name(source.get("name"), source.get("abbrev"), name_map)
    return source != before


def patch_equipment_record(record: dict[str, Any], name_map: dict[str, str]) -> bool:
    source = record.setdefault("source", {})
    before = dict(source)
    source.update(EQUIPMENT_DEFAULT_SOURCE)
    source["name"] = resolve_canonical_name(source["name"], source["abbrev"], name_map)
    return source != before


def patch_generic_record(record: dict[str, Any], name_map: dict[str, str]) -> bool:
    source = record.setdefault("source", {})
    abbrev = source_abbrev(record)
    if abbrev and not source.get("abbrev"):
        source["abbrev"] = abbrev
    return patch_source_block(source, name_map)


def patch_file(
    path: Path,
    name_map: dict[str, str],
    monster_sources: dict[str, dict[str, Any]],
) -> tuple[int, Counter[str], list[dict[str, Any]]]:
    records = load_json(path)
    patched = 0
    reasons: Counter[str] = Counter()
    category = path.stem

    for record in records:
        changed = False
        if category == "classes":
            changed = patch_class_record(record, name_map)
        elif category == "deities":
            changed = patch_deity_record(record, name_map)
        elif category == "templates":
            changed = patch_template_record(record, name_map, monster_sources)
        elif category == "equipment":
            changed = patch_equipment_record(record, name_map)
        else:
            changed = patch_generic_record(record, name_map)

        if changed:
            patched += 1
            reasons[category] += 1

    return patched, reasons, records


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--map", type=Path, default=DATA / ".index" / "source-names.json")
    args = parser.parse_args()

    name_map = load_name_map(args.map)
    if not name_map:
        all_records = load_all_records(DATA)
        name_map = build_abbrev_name_map(all_records)

    monster_sources = build_monster_source_index(DATA)

    total_patched = 0
    all_reasons: Counter[str] = Counter()

    for filename in PATCH_FILES:
        path = DATA / filename
        if not path.exists():
            print(f"Skip missing file: {path}")
            continue
        patched, reasons, records = patch_file(path, name_map, monster_sources)
        total_patched += patched
        all_reasons.update(reasons)
        print(f"{filename}: patched {patched} records")
        if not args.dry_run and patched:
            save_json(path, records)

    print(f"Total patched: {total_patched}")
    for category, count in sorted(all_reasons.items()):
        print(f"  {category}: {count}")

    if args.dry_run:
        print("Dry run — no files written")


if __name__ == "__main__":
    main()
