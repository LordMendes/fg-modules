"""CLI for scraping mundane weapons and armor from Realms Helps."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from typing import Any

if sys.version_info < (3, 10):
    version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    raise SystemExit(
        f"Python 3.10+ is required (you are running {version}). "
        "Use python3.11 or newer."
    )

from .config import DEFAULT_CACHE_DIR, DEFAULT_DELAY, DEFAULT_OUTPUT_DIR
from .equipment_utils import REALMSHELPS_BASE
from .http_client import HttpClient
from .normalize import normalize_records
from .parsers.realmshelps_equipment import (
    ARMOR_URL,
    WEAPONS_URL,
    parse_armor_index,
    parse_weapons_index,
)
from .parsers.realmshelps_goods import GOODS_LIST_URL, GOODS_URL, parse_goods_index
from .writer import append_error

DEFAULT_OUTPUT_FILES = {
    "weapons": "realmshelps_weapons.json",
    "armor": "realmshelps_armor.json",
    "goods": "realmshelps_goods.json",
    "goods_tables": "realmshelps_goods_tables.json",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape mundane 3.5 weapons and armor from Realms Helps."
    )
    parser.add_argument(
        "--output",
        default=str(Path(DEFAULT_OUTPUT_DIR) / "supplemental"),
        help="Output directory for supplemental JSON files",
    )
    parser.add_argument(
        "--cache",
        default=str(DEFAULT_CACHE_DIR),
        help="HTTP response cache directory",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=DEFAULT_DELAY,
        help="Delay between HTTP requests in seconds",
    )
    parser.add_argument(
        "--kind",
        choices=("all", "weapons", "armor", "goods"),
        default="all",
        help="Which listings to scrape",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print scrape summary without writing JSON",
    )
    return parser.parse_args()


def _write_json(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    normalized = normalize_records(records)
    path.write_text(json.dumps(normalized, indent=2, ensure_ascii=False), encoding="utf-8")


def scrape_weapons(client: HttpClient, errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    print(f"Scraping Realms Helps weapons from {WEAPONS_URL} ...")
    try:
        html = client.fetch(WEAPONS_URL)
        records = parse_weapons_index(html)
    except Exception as exc:  # noqa: BLE001 - collect scrape failures
        append_error(errors, "realmshelps_weapons", WEAPONS_URL, str(exc))
        return []
    print(f"  weapons: {len(records)} scraped")
    return records


def _load_weapon_name_keys(output_dir: Path) -> set[str]:
    weapons_path = output_dir / DEFAULT_OUTPUT_FILES["weapons"]
    if not weapons_path.exists():
        return set()
    payload = json.loads(weapons_path.read_text(encoding="utf-8"))
    from .equipment_utils import normalize_item_name

    return {normalize_item_name(row["name"]) for row in payload if row.get("name")}


def scrape_goods(
    client: HttpClient,
    errors: list[dict[str, Any]],
    *,
    output_dir: Path,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    print(f"Scraping Realms Helps goods from {GOODS_URL} ...")
    try:
        html = client.fetch(GOODS_URL)
        price_list_html = client.fetch(GOODS_LIST_URL)
        weapon_names = _load_weapon_name_keys(output_dir)
        items, tables = parse_goods_index(
            html,
            weapon_names=weapon_names,
            price_list_html=price_list_html,
        )
    except Exception as exc:  # noqa: BLE001 - collect scrape failures
        append_error(errors, "realmshelps_goods", GOODS_URL, str(exc))
        return [], []
    print(f"  goods: {len(items)} items, {len(tables)} tables scraped")
    return items, tables


def scrape_armor(client: HttpClient, errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    print(f"Scraping Realms Helps armor from {ARMOR_URL} ...")
    try:
        html = client.fetch(ARMOR_URL)
        records = parse_armor_index(html)
    except Exception as exc:  # noqa: BLE001 - collect scrape failures
        append_error(errors, "realmshelps_armor", ARMOR_URL, str(exc))
        return []
    print(f"  armor: {len(records)} scraped")
    return records


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output)
    cache_dir = Path(args.cache)
    errors: list[dict[str, Any]] = []
    client = HttpClient(cache_dir=cache_dir, delay=args.delay)

    if args.kind in ("all", "weapons"):
        weapons = scrape_weapons(client, errors)
        if args.dry_run:
            print(f"[dry-run] Would write {len(weapons)} weapons")
        else:
            out_path = output_dir / DEFAULT_OUTPUT_FILES["weapons"]
            _write_json(out_path, weapons)
            print(f"  Wrote {out_path}")

    if args.kind in ("all", "armor"):
        armor = scrape_armor(client, errors)
        if args.dry_run:
            print(f"[dry-run] Would write {len(armor)} armor")
        else:
            out_path = output_dir / DEFAULT_OUTPUT_FILES["armor"]
            _write_json(out_path, armor)
            print(f"  Wrote {out_path}")

    if args.kind in ("all", "goods"):
        goods, tables = scrape_goods(client, errors, output_dir=output_dir)
        if args.dry_run:
            print(f"[dry-run] Would write {len(goods)} goods and {len(tables)} tables")
        else:
            goods_path = output_dir / DEFAULT_OUTPUT_FILES["goods"]
            tables_path = output_dir / DEFAULT_OUTPUT_FILES["goods_tables"]
            _write_json(goods_path, goods)
            _write_json(tables_path, tables)
            web_tables_path = (
                Path(__file__).resolve().parents[1]
                / "web"
                / "src"
                / "lib"
                / "stores"
                / "goods-tables.json"
            )
            web_tables_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(tables_path, web_tables_path)
            print(f"  Wrote {goods_path}")
            print(f"  Wrote {tables_path}")
            print(f"  Synced {web_tables_path}")

    if errors and not args.dry_run:
        errors_path = output_dir / "equipment_errors.json"
        errors_path.write_text(json.dumps(errors, indent=2), encoding="utf-8")
        print(f"  Wrote {len(errors)} errors to {errors_path}")


if __name__ == "__main__":
    main()
