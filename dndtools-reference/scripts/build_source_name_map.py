#!/usr/bin/env python3
"""Build abbrev -> canonical book title map from scraped JSON."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scraper.source_names import (  # noqa: E402
    PLACEHOLDER_SOURCE_NAME,
    build_name_map_report,
    load_all_records,
    save_name_map,
)

DATA = ROOT / "data" / "dndtools"
DEFAULT_OUT = DATA / ".index" / "source-names.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    records = load_all_records(DATA)
    report = build_name_map_report(records)
    name_map = report["name_map"]
    out_path = save_name_map(name_map, args.out)

    print(f"Wrote {len(name_map)} abbrev mappings to {out_path}")
    print(f"Conflicting titles for {len(report['conflicts'])} abbrevs:")
    for abbrev, names in report["conflicts"].items():
        print(f"  {abbrev}: {names} -> {name_map.get(abbrev)}")

    class_abbrevs = {
        abbrev
        for record in records
        if (record.get("index") or {}).get("source_abbrev")
        and (record.get("source") or {}).get("name") == PLACEHOLDER_SOURCE_NAME
        for abbrev in [(record.get("index") or {}).get("source_abbrev")]
    }
    unresolved = sorted(abbrev for abbrev in class_abbrevs if abbrev not in name_map)
    if unresolved:
        print(f"Abbrevs still missing canonical names ({len(unresolved)}): {', '.join(unresolved)}")


if __name__ == "__main__":
    main()
