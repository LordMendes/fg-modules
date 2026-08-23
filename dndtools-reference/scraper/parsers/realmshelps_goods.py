"""Parse Goods & Services from realmshelps.net/stores/goods.shtml."""

from __future__ import annotations

import re
from typing import Any

from bs4 import NavigableString, Tag

from ..equipment_utils import (
    REALMSHELPS_BASE,
    build_equipment_record,
    goods_name_to_slug,
    map_realmshelps_equipment_source,
    map_realmshelps_equipment_sources,
    normalize_item_name,
)
from ..flaw_utils import paragraph_html
from ..source_names import load_name_map
from .base import make_soup

GOODS_URL = f"{REALMSHELPS_BASE}/stores/goods.shtml"
GOODS_LIST_URL = f"{REALMSHELPS_BASE}/stores/goods-list.shtml"

ITEM_LINE_RE = re.compile(r"^(.+?)\s*:\s*(.+)$", re.DOTALL)
VEHICLE_LINE_RE = re.compile(
    r"^(.+?)\s*:\s*((?:Huge|Large|Gargantuan|Colossal)\s+vehicle;.+|CR\s*[-—].+construct.+)",
    re.I | re.DOTALL,
)
CONSTRUCT_LINE_RE = re.compile(r"^(.+?)\s*:\s*CR\s", re.I)

SECTION_KIND: dict[str, str] = {
    "adventuring-gear": "gear",
    "light-and-vision": "gear",
    "class-tools": "tool",
    "clothing": "clothing",
    "food-drink-lodging": "consumable",
    "mounts": "mount",
    "ships": "vehicle",
    "transportation": "service",
    "buildings": "building",
    "siege-engines": "siege",
    "adventuring-items-faerun": "gear",
    "gear-for-greeners": "gear",
    "frostfell-equipment": "gear",
    "frostfell-gear": "gear",
    "wastes-gear": "gear",
    "planar": "vehicle",
    "gear-of-the-waters": "gear",
    "gear-for-the-dungeoneer": "gear",
    "alternative-keys": "tool",
    "hired-passage": "service",
    "vehicles": "vehicle",
}

SECTION_DEFAULT_SOURCE: dict[str, str] = {
    "adventuring-gear": "Player's Handbook",
    "light-and-vision": "Player's Handbook",
    "class-tools": "Player's Handbook",
    "clothing": "Player's Handbook",
    "food-drink-lodging": "Player's Handbook",
    "mounts": "Player's Handbook",
    "ships": "Dungeon Master's Guide",
    "transportation": "Dungeon Master's Guide",
    "buildings": "Dungeon Master's Guide",
    "siege-engines": "Dungeon Master's Guide",
    "adventuring-items-faerun": "Races of Faerûn",
    "gear-for-greeners": "Dragon #323",
    "frostfell-equipment": "Frostfell",
    "frostfell-gear": "Frostfell",
    "wastes-gear": "Sandstorm",
    "planar": "Planar Handbook",
    "gear-of-the-waters": "Stormwrack",
    "gear-for-the-dungeoneer": "Dungeonscape",
    "alternative-keys": "Dragon #359",
    "hired-passage": "Planar Handbook",
    "vehicles": "Sandstorm",
    "expanded-equipment-list": "Dungeon Master's Guide",
}

SECTION_TITLE: dict[str, str] = {
    "adventuring-gear": "Adventuring Gear",
    "light-and-vision": "Light and Vision",
    "class-tools": "Class Tools And Skill Kits",
    "clothing": "Clothing",
    "food-drink-lodging": "Food, Drink, And Lodging",
    "mounts": "Mounts And Related Gear",
    "ships": "Ships",
    "transportation": "Transportation",
    "buildings": "Buildings",
    "siege-engines": "Siege Engines",
    "adventuring-items-faerun": "Adventuring Items of Faerûn",
    "gear-for-greeners": "Gear for Greeners",
    "frostfell-equipment": "Frostfell Equipment",
    "frostfell-gear": "Frostfell Gear",
    "wastes-gear": "Wastes Gear",
    "planar": "Planar",
    "gear-of-the-waters": "Gear Of The Waters",
    "gear-for-the-dungeoneer": "Gear for the Dungeoneer",
    "alternative-keys": "Alternative Keys",
    "hired-passage": "Hired Passage",
    "vehicles": "Vehicles",
    "expanded-equipment-list": "Expanded Equipment List",
}


def slugify_section(title: str) -> str:
    cleaned = re.sub(r"\([^)]*\)", "", title)
    cleaned = re.sub(r"by\s+.+$", "", cleaned, flags=re.I)
    slug = re.sub(r"[^a-z0-9]+", "-", cleaned.casefold()).strip("-")
    aliases = {
        "class-tools-and-skill-kits": "class-tools",
        "food-drink-and-lodging": "food-drink-lodging",
        "mounts-and-related-gear": "mounts",
        "adventuring-items-of-faer-n": "adventuring-items-faerun",
        "gear-for-greeners": "gear-for-greeners",
        "frostfell-equipment": "frostfell-equipment",
        "gear-of-the-waters": "gear-of-the-waters",
        "gear-for-the-dungeoneer": "gear-for-the-dungeoneer",
        "alternative-keys": "alternative-keys",
        "hired-passaqe": "hired-passage",
    }
    return aliases.get(slug, slug)


def _section_source(section_slug: str, name_map: dict[str, str]) -> dict[str, str]:
    raw = SECTION_DEFAULT_SOURCE.get(section_slug, "Player's Handbook")
    return map_realmshelps_equipment_source(raw, name_map)


def _section_url(section_slug: str) -> str:
    return f"{GOODS_URL}#{section_slug}"


def _cell_text(cell: Tag | None) -> str:
    if cell is None:
        return ""
    return cell.get_text(" ", strip=True)


def _extract_sources(cell: Tag | None) -> list[str]:
    if cell is None:
        return []
    links = cell.select("a")
    if links:
        return [link.get_text(" ", strip=True) for link in links if link.get_text(strip=True)]
    text = _cell_text(cell)
    return [text] if text else []


def _parse_cost_weight(cells: list[str]) -> tuple[str | None, str | None]:
    cost = None
    weight = None
    for value in cells:
        lowered = value.casefold()
        if re.search(r"\d+\s*(gp|sp|cp|pp)", lowered):
            cost = value
        elif re.search(r"\d.*\s*lb\.|\d/\d+\s*lb\.|^\*$|^-$", lowered) or "lb" in lowered:
            if weight is None and value not in ("-", "*"):
                weight = value if value != "*" else None
    return cost, weight


def _normalize_weight(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip()
    if cleaned in {"-", "*", "—"}:
        return None
    cleaned = cleaned.replace("***", "").replace("**", "").strip()
    return cleaned or None


def _normalize_for_price_match(name: str) -> str:
    cleaned = name.casefold()
    cleaned = re.sub(r"\([^)]*\)", "", cleaned)
    cleaned = re.sub(r"\d+\s*(?:ft\.|sq\.?\s*yd\.?|oz\.?).*", "", cleaned)
    cleaned = re.sub(r"[^a-z0-9]+", "", cleaned)
    return cleaned


def _price_match_keys(name: str) -> set[str]:
    keys = {
        normalize_item_name(name),
        _normalize_for_price_match(name),
    }
    if "," in name:
        parts = [part.strip() for part in name.split(",", 1)]
        if len(parts) == 2 and parts[0] and parts[1]:
            reversed_name = f"{parts[1]} {parts[0]}"
            keys.add(normalize_item_name(reversed_name))
            keys.add(_normalize_for_price_match(reversed_name))
    return {key for key in keys if key}


def _is_table_footnote(text: str) -> bool:
    lowered = text.casefold()
    return (
        text.startswith("*")
        or "these items weigh" in lowered
        or "empty weight" in lowered
        or "one set of clothing" in lowered
    )


def _is_sub_row_cell(cell: Tag) -> bool:
    return bool(re.match(r"[\s\u00a0]", cell.get_text() or ""))


def _resolve_item_key(items_by_name: dict[str, dict[str, Any]], names: list[str]) -> str | None:
    for candidate in names:
        for key in _price_match_keys(candidate):
            if key in items_by_name:
                return key
    return None


def _group_parent_names(parent: str) -> list[str]:
    names = [parent]
    if parent.casefold().endswith(" shield"):
        names.append(f"{parent}s")
    return names


TABLE_SECTION_HEADERS = frozenset(
    {
        "item",
        "goods",
        "service",
        "vehicle",
        "tools",
        "clothing",
        "food",
        "adventuring gear",
        "mounts and riding gear",
        "for your animal",
        "for the dungeoneer",
    }
)

TABLE_GROUP_VARIANTS = frozenset(
    {
        "standard",
        "sniper",
        "common",
        "superior",
        "adamantine",
        "iron",
        "wood",
        "silk and mithral",
    }
)

STANDARD_TABLE_HEADER_LABELS = frozenset(
    {
        "item",
        "object",
        "name",
        "goods",
        "service",
        "vehicle",
        "spell",
        "cost",
        "weight",
        "damage",
        "critical",
        "light",
        "duration",
        "crew",
    }
)


def _table_display_title(title: str | None, headers: list[str], section_slug: str) -> str:
    if title:
        return title
    if headers:
        first = headers[0].strip()
        first_key = first.casefold()
        if first_key not in STANDARD_TABLE_HEADER_LABELS and "cost" not in first_key:
            return first
    return SECTION_TITLE.get(section_slug, "Table")


def _table_headers(table: Tag) -> tuple[str | None, list[str], int]:
    rows = table.select("tr")
    title = None
    header_idx = 0
    for idx, row in enumerate(rows):
        cells = row.find_all(["th", "td"])
        texts = [_cell_text(cell) for cell in cells]
        if not any(texts):
            continue
        if len(cells) == 1 and texts[0] and not title:
            title = texts[0]
            header_idx = idx + 1
            continue
        lowered = [text.casefold() for text in texts]
        if any(
            key in lowered
            for key in ("item", "object", "name", "service", "vehicle", "goods", "spell")
        ):
            return title, texts, idx
        if "cost" in lowered and any(
            key in lowered for key in ("weight", "damage", "light", "duration", "crew")
        ):
            return title, texts, idx
        if title and idx == header_idx:
            return title, texts, idx
    first = rows[0].find_all(["th", "td"]) if rows else []
    return title, [_cell_text(cell) for cell in first], 0


def _header_map(headers: list[str]) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for idx, header in enumerate(headers):
        key = header.casefold()
        if key in ("item", "object", "name", "goods", "service", "vehicle"):
            mapping["name"] = idx
        elif key == "cost":
            mapping["cost"] = idx
        elif "weight" in key:
            mapping["weight"] = idx
        elif key == "light":
            mapping["light"] = idx
        elif key == "duration":
            mapping["duration"] = idx
        elif key == "damage":
            mapping["damage"] = idx
        elif key == "critical":
            mapping["critical"] = idx
        elif "range" in key:
            mapping["range"] = idx
        elif key == "crew":
            mapping["crew"] = idx
        elif "holds" in key or "carries" in key:
            mapping["capacity"] = idx
        elif "craft" in key:
            mapping["craft_dc"] = idx

    if "name" not in mapping and headers:
        first = headers[0].casefold()
        if first not in {"cost", "weight", "damage", "critical", "light", "duration", "crew"}:
            mapping["name"] = 0
    return mapping


def _is_reference_table(headers: list[str], title: str | None) -> bool:
    lowered = [header.casefold() for header in headers]
    if "light" in lowered and "duration" in lowered:
        return True
    if title and title.casefold() in {"light sources", "transportation", "buildings", "ships"}:
        return True
    if "spell" in lowered and "duration" in lowered:
        return True
    if len(headers) >= 2 and headers[0].casefold() == "barding":
        return True
    return False


def _content_root(soup: Any) -> Tag:
    h1 = soup.find("h1")
    if h1 and h1.parent:
        return h1.parent
    return soup.body or soup


def _iter_content_blocks(container: Tag):
    for child in container.children:
        if isinstance(child, NavigableString):
            continue
        if child.name in {"h2", "h3", "h4", "p", "table"}:
            yield child


def _parse_item_paragraph(
    text: str,
    html: str,
    *,
    section_slug: str,
    name_map: dict[str, str],
) -> dict[str, Any] | None:
    vehicle_match = VEHICLE_LINE_RE.match(text) or CONSTRUCT_LINE_RE.match(text)
    item_match = ITEM_LINE_RE.match(text)
    if not item_match and not vehicle_match:
        return None

    name = (vehicle_match or item_match).group(1).strip()
    body = (vehicle_match or item_match).group(2).strip()
    if not name or len(name) > 120:
        return None
    if name.casefold().startswith(("see ", "the dm ", "when ", "if ", "note ")):
        return None

    kind = SECTION_KIND.get(section_slug, "gear")
    source = _section_source(section_slug, name_map)
    source_url = _section_url(section_slug)
    section_title = SECTION_TITLE.get(section_slug, section_slug.replace("-", " ").title())

    index: dict[str, Any] = {
        "section_title": section_title,
        "section_slug": section_slug,
        "stats": body[:120] if vehicle_match else None,
    }
    fields: dict[str, Any] = {}

    if vehicle_match:
        kind = "vehicle"
        index["vehicle_stats"] = {"description": body}

    desc_html = paragraph_html(body)
    record = build_equipment_record(
        name=name,
        slug=goods_name_to_slug(name),
        source_url=source_url,
        source={**source, "url": source_url},
        kind=kind,
        category=section_slug,
        index={k: v for k, v in index.items() if v is not None},
        description_html=desc_html,
        description_text=body,
        **fields,
    )
    return record


def _merge_table_row(
    items_by_name: dict[str, dict[str, Any]],
    *,
    name: str,
    cells: list[str],
    header_map: dict[str, int],
    section_slug: str,
    name_map: dict[str, str],
    raw_sources: list[str] | None = None,
    lookup_names: list[str] | None = None,
) -> None:
    candidates = lookup_names or [name]
    key = _resolve_item_key(items_by_name, candidates)
    if key is None:
        key = normalize_item_name(name)
    cost = cells[header_map["cost"]] if "cost" in header_map and header_map["cost"] < len(cells) else None
    weight = cells[header_map["weight"]] if "weight" in header_map and header_map["weight"] < len(cells) else None
    if cost in ("-", "", None) and weight in ("-", "", None):
        cost, weight = _parse_cost_weight(cells[1:])
    weight = _normalize_weight(weight)

    table_stats = {}
    for stat_key in ("light", "duration", "damage", "critical", "range", "crew", "capacity", "craft_dc"):
        idx = header_map.get(stat_key)
        if idx is not None and idx < len(cells):
            value = cells[idx].strip()
            if value and value != "-":
                table_stats[stat_key] = value

    if key in items_by_name:
        existing = items_by_name[key]
        if cost:
            existing["cost"] = cost
            existing.setdefault("index", {})["cost"] = cost
        if weight:
            existing["weight"] = weight
            existing.setdefault("index", {})["weight"] = weight
        if table_stats:
            existing.setdefault("index", {})
            existing["index"]["table_stats"] = {
                **existing["index"].get("table_stats", {}),
                **table_stats,
            }
        if raw_sources:
            primary, all_sources = map_realmshelps_equipment_sources(raw_sources, name_map)
            if not existing.get("description_html"):
                existing["source"] = {**primary, "page": None, "url": existing.get("source_url")}
            if len(all_sources) > 1:
                existing.setdefault("index", {})
                existing["index"]["realmshelps_sources"] = [
                    f"{item['abbrev']}:{item['name']}" for item in all_sources
                ]
        return

    kind = SECTION_KIND.get(section_slug, "gear")
    if section_slug == "siege-engines":
        kind = "siege"
    elif section_slug in {"ships", "vehicles", "planar"}:
        kind = "vehicle"
    elif section_slug == "buildings":
        kind = "building"
    elif section_slug == "transportation" or section_slug == "hired-passage":
        kind = "service"

    if raw_sources:
        source, all_sources = map_realmshelps_equipment_sources(raw_sources, name_map)
    else:
        source = _section_source(section_slug, name_map)
        all_sources = [source]

    source_url = _section_url(section_slug)
    section_title = SECTION_TITLE.get(section_slug, section_slug.replace("-", " ").title())
    index: dict[str, Any] = {
        "section_title": section_title,
        "section_slug": section_slug,
        "cost": cost,
        "weight": weight,
    }
    if table_stats:
        index["table_stats"] = table_stats
        index["stats"] = " · ".join(f"{k}: {v}" for k, v in table_stats.items())

    record = build_equipment_record(
        name=name,
        slug=goods_name_to_slug(name),
        source_url=source_url,
        source={**source, "page": None, "url": source_url},
        kind=kind,
        category=section_slug,
        index=index,
        all_sources=all_sources if len(all_sources) > 1 else None,
        cost=cost,
        weight=weight,
    )
    items_by_name[key] = record


def _parse_table(
    table: Tag,
    *,
    section_slug: str,
    name_map: dict[str, str],
    items_by_name: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    title, headers, header_row_idx = _table_headers(table)
    if not headers:
        return None

    header_map = _header_map(headers)
    rows = table.select("tr")
    data_rows: list[list[str]] = []
    footnotes: list[str] = []
    group_parent: str | None = None

    for row in rows[header_row_idx + 1 :]:
        cell_tags = row.find_all(["th", "td"])
        cells = [_cell_text(cell) for cell in cell_tags]
        if not any(cells):
            continue
        joined = " ".join(cells)
        if _is_table_footnote(joined):
            footnotes.append(joined)
            continue
        if len(cells) == 1:
            candidate = cells[0].strip()
            if candidate and not _is_table_footnote(candidate):
                group_parent = candidate
            else:
                footnotes.append(cells[0])
            continue
        lowered_cells = [cell.casefold() for cell in cells]
        if (
            lowered_cells[0] in TABLE_SECTION_HEADERS
            and "cost" in lowered_cells
            and any(key in lowered_cells for key in ("weight", "damage", "light", "duration", "crew"))
        ):
            header_map = _header_map(cells)
            group_parent = None
            continue
        if cells[0].casefold() in {"medium", "heavy", "barding"} and "speed" in " ".join(headers).casefold():
            data_rows.append(cells)
            continue
        data_rows.append(cells)

        name_idx = header_map.get("name", 0)
        if name_idx >= len(cells):
            continue
        name = cells[name_idx].strip()
        if not name or name.casefold() in TABLE_SECTION_HEADERS | {"item", "object", "name", "service", "vehicle", "goods"}:
            continue

        source_idx = len(cells) - 1 if "source" in " ".join(headers).casefold() else None
        raw_sources = _extract_sources(cell_tags[source_idx]) if source_idx is not None else []

        is_sub_row = name_idx < len(cell_tags) and _is_sub_row_cell(cell_tags[name_idx])
        lookup_names = [name]
        if is_sub_row and group_parent:
            lookup_names = [f"{parent}, {name}" for parent in _group_parent_names(group_parent)]
            if name.casefold() in {"common", "standard"}:
                lookup_names.extend(_group_parent_names(group_parent))
        elif not is_sub_row:
            group_parent = name

        if (
            header_map.get("name") is not None
            or title
            or "cost" in header_map
            or "weight" in header_map
        ):
            _merge_table_row(
                items_by_name,
                name=name,
                cells=cells,
                header_map=header_map,
                section_slug=section_slug,
                name_map=name_map,
                raw_sources=raw_sources or None,
                lookup_names=lookup_names,
            )

    source = _section_source(section_slug, name_map)
    return {
        "section_slug": section_slug,
        "section_title": SECTION_TITLE.get(section_slug, section_slug.replace("-", " ").title()),
        "title": _table_display_title(title, headers, section_slug),
        "headers": headers,
        "rows": data_rows,
        "footnotes": footnotes,
        "source": source,
    }


def _link_weapon_collisions(items: list[dict[str, Any]], weapon_names: set[str]) -> None:
    for record in items:
        key = normalize_item_name(record["name"])
        if key in weapon_names:
            weapon_slug = goods_name_to_slug(record["name"])
            record.setdefault("index", {})
            record["index"]["related_slugs"] = [weapon_slug]


def parse_goods_price_list(html: str) -> dict[str, dict[str, str | None]]:
    soup = make_soup(html)
    prices: dict[str, dict[str, str | None]] = {}

    for table in soup.select("table"):
        rows = table.select("tr")
        if len(rows) < 2:
            continue

        _title, headers, header_row_idx = _table_headers(table)
        header_map = _header_map(headers)
        if "cost" not in header_map:
            continue

        for row in rows[header_row_idx + 1 :]:
            cells = [_cell_text(cell) for cell in row.find_all(["th", "td"])]
            if not any(cells):
                continue
            lowered = [cell.casefold() for cell in cells]
            if (
                lowered[0] in TABLE_SECTION_HEADERS
                and "cost" in lowered
                and any(key in lowered for key in ("weight", "damage", "light", "duration", "crew"))
            ):
                header_map = _header_map(cells)
                continue

            name_idx = header_map.get("name", 0)
            if name_idx >= len(cells):
                continue
            name = cells[name_idx].strip()
            if not name or name.casefold() in TABLE_SECTION_HEADERS:
                continue

            cost = cells[header_map["cost"]] if header_map["cost"] < len(cells) else None
            weight = (
                cells[header_map["weight"]]
                if "weight" in header_map and header_map["weight"] < len(cells)
                else None
            )
            if cost in ("-", "", None) and weight in ("-", "", None):
                cost, weight = _parse_cost_weight(cells[1:])
            weight = _normalize_weight(weight)

            entry = {
                "name": name,
                "cost": cost if cost not in ("-", "", None) else None,
                "weight": weight,
            }
            for key in _price_match_keys(name):
                prices[key] = entry

    return prices


def _apply_price_list(
    items_by_name: dict[str, dict[str, Any]],
    price_list: dict[str, dict[str, str | None]],
) -> None:
    for record in items_by_name.values():
        keys = _price_match_keys(record["name"])
        matched: dict[str, str | None] | None = None
        for key in keys:
            if key in price_list:
                matched = price_list[key]
                break
        if not matched:
            continue
        if not record.get("cost") and matched.get("cost"):
            record["cost"] = matched["cost"]
            record.setdefault("index", {})["cost"] = matched["cost"]
        if not record.get("weight") and matched.get("weight"):
            record["weight"] = matched["weight"]
            record.setdefault("index", {})["weight"] = matched["weight"]


def _apply_base_name_prices(items_by_name: dict[str, dict[str, Any]]) -> None:
    for record in items_by_name.values():
        if record.get("cost"):
            continue
        base_key = _normalize_for_price_match(record["name"])
        if not base_key:
            continue
        for other in items_by_name.values():
            if other is record or not other.get("cost"):
                continue
            other_key = _normalize_for_price_match(other["name"])
            if other_key.startswith(base_key) and len(other_key) > len(base_key):
                record["cost"] = other["cost"]
                record.setdefault("index", {})["cost"] = other["cost"]
                if not record.get("weight") and other.get("weight"):
                    record["weight"] = other["weight"]
                    record.setdefault("index", {})["weight"] = other["weight"]
                break


def parse_goods_index(
    html: str,
    *,
    weapon_names: set[str] | None = None,
    price_list_html: str | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    soup = make_soup(html)
    container = _content_root(soup)
    name_map = load_name_map()

    section_slug = "adventuring-gear"
    items_by_name: dict[str, dict[str, Any]] = {}
    tables: list[dict[str, Any]] = []

    for block in _iter_content_blocks(container):
        if block.name == "h2":
            section_slug = slugify_section(block.get_text(" ", strip=True))
            continue
        if block.name in {"h3", "h4"}:
            section_slug = slugify_section(block.get_text(" ", strip=True))
            continue
        if block.name == "p":
            text = block.get_text(" ", strip=True)
            record = _parse_item_paragraph(
                text,
                str(block),
                section_slug=section_slug,
                name_map=name_map,
            )
            if record:
                key = normalize_item_name(record["name"])
                if key in items_by_name:
                    existing = items_by_name[key]
                    if record.get("description_html") and not existing.get("description_html"):
                        existing["description_html"] = record["description_html"]
                        existing["description_text"] = record["description_text"]
                    if record.get("index", {}).get("vehicle_stats"):
                        existing.setdefault("index", {})
                        existing["index"]["vehicle_stats"] = record["index"]["vehicle_stats"]
                    if record.get("kind") == "vehicle" and existing.get("kind") != "vehicle":
                        existing["kind"] = record["kind"]
                else:
                    items_by_name[key] = record
            continue
        if block.name == "table":
            table_record = _parse_table(
                block,
                section_slug=section_slug,
                name_map=name_map,
                items_by_name=items_by_name,
            )
            if table_record and (table_record["rows"] or table_record["title"]):
                tables.append(table_record)

    if price_list_html:
        price_list = parse_goods_price_list(price_list_html)
        _apply_price_list(items_by_name, price_list)

    _apply_base_name_prices(items_by_name)

    items = list(items_by_name.values())
    if weapon_names:
        _link_weapon_collisions(items, weapon_names)

    items.sort(key=lambda row: (row.get("category") or "", row.get("name") or ""))
    return items, tables
