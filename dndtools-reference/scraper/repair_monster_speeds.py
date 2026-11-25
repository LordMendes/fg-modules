"""Restore fly, swim, climb, and burrow speeds dropped from monsters.json.

Classic dndtools.org stat blocks still list every movement mode. Animals that
are missing there, including the eagle, are filled from the SRD pages on
srd.dndtools.org. Other stat fields are left unchanged.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

if sys.version_info < (3, 10):
    version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    raise SystemExit(f"Python 3.10+ is required (you are running {version}).")

from .config import CLASSIC_BASE_URL, DEFAULT_CACHE_DIR, DEFAULT_OUTPUT_DIR
from .http_client import AsyncHttpClient, HttpClient
from .monster_speed import format_monster_speed, speed_adds_modes
from .parsers.classic_monsters import parse_classic_monster_detail
from .scrape_classic_monsters import _name_keys, iter_classic_monster_index

SRD_INDEX_URL = "https://srd.dndtools.org/srd/monsters/monsters/core/monstersAtoZ.html"
SRD_ANIMALS_URL = "https://srd.dndtools.org/srd/monsters/monsters/animalsvermin/animalsCore.html"

_HD_SPACE_RE = re.compile(r"\s+")
_HD_PAREN_RE = re.compile(r"\(.*?\)")
_SPEED_CELL_RE = re.compile(r"\d+\s*(?:ft\.?|feet)\b", re.IGNORECASE)
_DRAGON_AGES = {
    "wyrmling",
    "very young",
    "young",
    "juvenile",
    "young adult",
    "adult",
    "mature adult",
    "old",
    "very old",
    "ancient",
    "wyrm",
    "great wyrm",
}


def _pretty_name(raw: str) -> str:
    return " ".join(word.capitalize() for word in raw.split())


def _age_table_speeds(table: Any, species: str) -> list[tuple[str, str, str]]:
    """Dragon age tables list speed in a later grid, not in the stat-block spans."""
    entries: list[tuple[str, str, str]] = []
    species_name = _pretty_name(species)
    for row in table.find_all("tr"):
        cells = [" ".join(cell.get_text(" ", strip=True).split()) for cell in row.find_all(["td", "th"])]
        if len(cells) < 2 or cells[0].casefold() not in _DRAGON_AGES:
            continue
        speed = next((cell for cell in cells[1:] if _SPEED_CELL_RE.search(cell)), None)
        if not speed:
            continue
        entries.append((f"{species_name}, {_pretty_name(cells[0])}", "", speed))
    return entries


def hd_key(value: str | None) -> str:
    if not isinstance(value, str):
        return ""
    text = value.casefold().replace("\u2013", "-").replace("\u2014", "-")
    text = _HD_SPACE_RE.sub("", text)
    text = _HD_PAREN_RE.sub("", text)
    return text.strip(".,;")


def index_monsters_by_name(records: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    by_name: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        name = record.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        for key in _name_keys(name):
            by_name.setdefault(key, []).append(record)
    return by_name


def select_monster_records(
    by_name: dict[str, list[dict[str, Any]]],
    name: str,
    hit_dice: str | None,
) -> list[dict[str, Any]]:
    """Match on normalized name and hit dice so same-named creatures stay distinct."""
    seen: set[int] = set()
    matches: list[dict[str, Any]] = []
    for key in _name_keys(name):
        for record in by_name.get(key, ()):
            marker = id(record)
            if marker in seen:
                continue
            seen.add(marker)
            matches.append(record)
    if not matches:
        return []
    wanted = hd_key(hit_dice)
    if not wanted:
        return matches if len(matches) == 1 else []
    return [record for record in matches if hd_key(record.get("hit_dice")) == wanted]


def apply_speed_candidate(record: dict[str, Any], candidate: str | None) -> str | None:
    """Return the replacement speed when the candidate adds a movement mode."""
    if not candidate or not candidate.strip():
        return None
    current = record.get("speed")
    current_text = current if isinstance(current, str) else None
    if not speed_adds_modes(current_text, candidate):
        return None
    formatted = format_monster_speed(candidate)
    if not formatted or formatted == (current_text or "").strip():
        return None
    return formatted


def parse_srd_speed_entries(html: str) -> list[tuple[str, str, str]]:
    """Return (name, hit dice, speed) from an SRD monster HTML page."""
    soup = BeautifulSoup(html, "lxml")
    entries: list[tuple[str, str, str]] = []
    # h5/h6 hold variants such as "Angel, Solar" and "Dire Ape".
    for heading in soup.find_all(["h3", "h4", "h5", "h6"]):
        name = " ".join(heading.get_text(" ", strip=True).split())
        if not name:
            continue
        hit_dice = ""
        speed = ""
        for node in heading.next_elements:
            if node is heading:
                continue
            tag = getattr(node, "name", None)
            if tag in {"h2", "h3", "h4", "h5", "h6"}:
                break
            if tag == "table":
                entries.extend(_age_table_speeds(node, name))
            if tag != "span":
                continue
            classes = node.get("class") or []
            if "stat-block" not in classes:
                continue
            label = node.find(["b", "strong"])
            if label is None:
                continue
            label_text = label.get_text(" ", strip=True).rstrip(":").casefold()
            value = " ".join(node.get_text(" ", strip=True).split())
            prefix = label.get_text(" ", strip=True)
            if value.casefold().startswith(prefix.casefold()):
                value = value[len(prefix) :].lstrip(" :")
            if label_text == "hit dice":
                hit_dice = value
            elif label_text == "speed":
                speed = value
        if speed:
            entries.append((name, hit_dice, speed))
    return entries


def srd_page_urls(index_html: str, index_url: str = SRD_INDEX_URL) -> list[str]:
    soup = BeautifulSoup(index_html, "lxml")
    urls = {SRD_ANIMALS_URL}
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"]
        if not href.endswith(".html") and ".html#" not in href:
            continue
        urls.add(urljoin(index_url, href.split("#", 1)[0]))
    return sorted(urls)


def _patch_speed_text(blob: str, slug: str, old: str, new: str) -> str:
    slug_token = f'"slug": {json.dumps(slug, ensure_ascii=False)}'
    start = blob.find(slug_token)
    if start < 0:
        raise ValueError(f"slug not found: {slug}")
    next_slug = blob.find('"slug":', start + len(slug_token))
    window_end = next_slug if next_slug >= 0 else len(blob)
    window = blob[start:window_end]
    needle = f'"speed": {json.dumps(old, ensure_ascii=False)}'
    replacement = f'"speed": {json.dumps(new, ensure_ascii=False)}'
    if needle not in window:
        raise ValueError(f"speed field not found for {slug}")
    window = window.replace(needle, replacement, 1)
    return blob[:start] + window + blob[window_end:]


def _remember(
    updates: dict[str, tuple[str, str]],
    record: dict[str, Any],
    new_speed: str,
) -> None:
    slug = record.get("slug")
    old = record.get("speed")
    if not isinstance(slug, str) or not isinstance(old, str):
        return
    updates[slug] = (old, new_speed)
    record["speed"] = new_speed


def _apply_entries(
    by_name: dict[str, list[dict[str, Any]]],
    entries: list[tuple[str, str, str]],
    updates: dict[str, tuple[str, str]],
) -> int:
    applied = 0
    for name, hit_dice, speed in entries:
        for record in select_monster_records(by_name, name, hit_dice):
            replacement = apply_speed_candidate(record, speed)
            if not replacement:
                continue
            _remember(updates, record, replacement)
            applied += 1
    return applied


async def _fetch_urls(
    urls: list[str],
    cache_dir: Path,
    delay: float,
    workers: int,
) -> list[tuple[str, str | None, str | None]]:
    async with AsyncHttpClient(cache_dir=cache_dir, delay=delay, workers=workers) as client:
        async def one(url: str) -> tuple[str, str | None, str | None]:
            try:
                return url, await client.fetch(url), None
            except Exception as exc:  # noqa: BLE001 - keep crawling after a bad page
                return url, None, str(exc)

        return list(await asyncio.gather(*(one(url) for url in urls)))


def repair_monster_speeds(
    monsters: list[dict[str, Any]],
    classic_records: list[dict[str, Any]],
    srd_entries: list[tuple[str, str, str]],
) -> dict[str, tuple[str, str]]:
    """Apply classic speeds first, then SRD speeds that still add a mode."""
    by_name = index_monsters_by_name(monsters)
    updates: dict[str, tuple[str, str]] = {}
    classic_entries = [
        (
            record.get("name") or "",
            record.get("hit_dice") or "",
            record.get("speed") or "",
        )
        for record in classic_records
        if record.get("name") and record.get("speed")
    ]
    _apply_entries(by_name, classic_entries, updates)
    _apply_entries(by_name, srd_entries, updates)
    return updates


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--cache", default=str(DEFAULT_CACHE_DIR))
    parser.add_argument("--delay", type=float, default=0.15)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--base-url", default=CLASSIC_BASE_URL)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=None, help="Limit classic detail pages")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output)
    monsters_path = output_dir / "monsters.json"
    cache_dir = Path(args.cache)
    monsters = json.loads(monsters_path.read_text(encoding="utf-8"))
    if not isinstance(monsters, list):
        raise SystemExit(f"{monsters_path} is not a list")

    client = HttpClient(cache_dir=cache_dir, delay=args.delay)
    print(f"Indexing classic monsters from {args.base_url}...")
    index_rows = iter_classic_monster_index(client.fetch, base_url=args.base_url, page_size=1000)
    our_names = {key for record in monsters if record.get("name") for key in _name_keys(record["name"])}
    index_rows = [row for row in index_rows if _name_keys(row.get("name") or "") & our_names]
    if args.limit is not None:
        index_rows = index_rows[: args.limit]
    print(f"  Fetching {len(index_rows)} classic detail pages")

    fetched = asyncio.run(
        _fetch_urls([row["url"] for row in index_rows], cache_dir, args.delay, args.workers)
    )
    html_by_url = {url: html for url, html, error in fetched if html}
    errors = [(url, error) for url, _html, error in fetched if error]
    classic_records: list[dict[str, Any]] = []
    for row in index_rows:
        html = html_by_url.get(row["url"])
        if not html:
            continue
        try:
            classic_records.append(parse_classic_monster_detail(html, row["url"], index_record=row))
        except Exception as exc:  # noqa: BLE001
            errors.append((row["url"], str(exc)))
    print(f"  Parsed {len(classic_records)} classic stat blocks ({len(errors)} errors)")

    print("Fetching SRD monster pages...")
    index_html = client.fetch(SRD_INDEX_URL)
    page_urls = srd_page_urls(index_html)
    srd_fetched = asyncio.run(_fetch_urls(page_urls, cache_dir, args.delay, args.workers))
    srd_entries: list[tuple[str, str, str]] = []
    for url, html, error in srd_fetched:
        if error or not html:
            errors.append((url, error or "empty"))
            continue
        srd_entries.extend(parse_srd_speed_entries(html))
    print(f"  Parsed {len(srd_entries)} SRD speed lines from {len(page_urls)} pages")

    updates = repair_monster_speeds(monsters, classic_records, srd_entries)
    print(f"  {len(updates)} speeds gain a movement mode")
    for slug in ("eagle-550", "gargoyle-266", "baboon-532"):
        record = next((item for item in monsters if item.get("slug") == slug), None)
        if record:
            print(f"  {slug}: {record.get('speed')}")

    if args.dry_run:
        for slug, (old, new) in sorted(updates.items())[:30]:
            print(f"    {slug}: {old!r} -> {new!r}")
        print("[dry-run] monsters.json not written")
        return

    blob = monsters_path.read_text(encoding="utf-8")
    for slug, (old, new) in updates.items():
        blob = _patch_speed_text(blob, slug, old, new)
    monsters_path.write_text(blob, encoding="utf-8")
    print(f"  Updated {monsters_path}")
    if errors:
        print(f"  {len(errors)} fetch/parse errors (first: {errors[0][0]})")


if __name__ == "__main__":
    main()
