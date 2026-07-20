"""Shared HTML parsing helpers for new.dndtools.org."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Callable
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, Tag

from ..config import BASE_URL, SPELL_COMPONENT_KEYS
from ..normalize import (
    SOURCE_PAGE_RE,
    clean_field_value,
    is_source_line,
    label_to_snake,
    merge_source,
    parse_source_line,
)

ID_SUFFIX_RE = re.compile(r"-(\d+)$")
SAMPLE_SUFFIX_RE = re.compile(r"-(sample)$", re.I)


def make_soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "lxml")


def resolve_url(href: str, base_url: str = BASE_URL) -> str:
    return urljoin(base_url, href)


def parse_slug_and_id(href: str) -> tuple[str | None, int | str | None]:
    path = urlparse(href).path.strip("/")
    if not path:
        return None, None
    slug = path.split("/")[-1]
    sample_match = SAMPLE_SUFFIX_RE.search(slug)
    if sample_match:
        return slug, sample_match.group(1)
    match = ID_SUFFIX_RE.search(slug)
    if match:
        return slug, int(match.group(1))
    return slug, None


def html_inner(element: Tag | None) -> str:
    if element is None:
        return ""
    return "".join(str(child) for child in element.children).strip()


def html_to_text(element: Tag | None) -> str:
    if element is None:
        return ""
    return element.get_text("\n", strip=True)


def cell_text(cell: Tag) -> str:
    return cell.get_text(" ", strip=True)


def is_check_cell(cell: Tag) -> bool:
    return cell.select_one("svg.lucide-check") is not None


def parse_component_flags(cells: list[Tag]) -> dict[str, bool]:
    flags: dict[str, bool] = {}
    for key, cell in zip(SPELL_COMPONENT_KEYS, cells):
        flags[key] = is_check_cell(cell)
    return flags


def parse_table_headers(soup: BeautifulSoup) -> list[str]:
    return [th.get_text(strip=True) for th in soup.select("table thead th")]


def parse_table_rows(soup: BeautifulSoup) -> list[list[Tag]]:
    rows: list[list[Tag]] = []
    for tr in soup.select("table tbody tr"):
        cells = tr.find_all("td")
        if cells:
            rows.append(cells)
    return rows


def get_detail_title(soup: BeautifulSoup) -> str:
    h1 = soup.find("h1")
    return h1.get_text(strip=True) if h1 else ""


def get_muted_lines(soup: BeautifulSoup) -> list[str]:
    h1 = soup.find("h1")
    if not h1:
        return []
    container = h1.find_parent("div", class_=lambda c: c and "space-y-6" in c)
    if not container:
        container = h1.find_parent("div")
    if not container:
        return []
    lines: list[str] = []
    for p in container.select("p.text-muted-foreground"):
        title = p.get("title")
        text = title if title else p.get_text(" ", strip=True)
        if text:
            lines.append(text)
    return lines


def parse_detail_source(soup: BeautifulSoup) -> dict[str, Any] | None:
    lines = get_muted_lines(soup)
    for line in lines:
        if SOURCE_PAGE_RE.search(line):
            return parse_source_line(line)
    for line in lines:
        if is_source_line(line):
            return parse_source_line(line)
    return None


def parse_dl_grid(soup: BeautifulSoup) -> dict[str, str]:
    result: dict[str, str] = {}
    for div in soup.select("dl > div"):
        dt = div.find("dt")
        dd = div.find("dd")
        if not dt or not dd:
            continue
        key = label_to_snake(dt.get_text(strip=True))
        value = dd.get("title") or dd.get_text(strip=True)
        if value:
            result[key] = value
    return result


def parse_badge_links(container: Tag) -> list[dict[str, Any]]:
    links: list[dict[str, Any]] = []
    for a in container.select("a[href]"):
        href = a.get("href", "")
        text = a.get_text(" ", strip=True)
        slug, record_id = parse_slug_and_id(href)
        level = None
        name = text
        parts = text.rsplit(" ", 1)
        if len(parts) == 2 and parts[1].isdigit():
            name = parts[0].strip()
            level = int(parts[1])
        links.append(
            {
                "name": name,
                "level": level,
                "slug": slug,
                "url": href,
                "id": record_id,
            }
        )
    return links


def _prose_element(container: Tag) -> Tag | None:
    classes = container.get("class") or []
    if any("prose" in cls for cls in classes):
        return container
    return container.select_one(".prose")


def parse_badge_texts(container: Tag) -> list[str]:
    values: list[str] = []
    for badge in container.select("[data-slot='badge'], span[data-variant]"):
        text = badge.get_text(strip=True)
        if text:
            values.append(text)
    return values


def parse_ability_badges(container: Tag) -> list[dict[str, Any]]:
    abilities: list[dict[str, Any]] = []
    for badge in container.select("[data-slot='badge'], span[data-variant]"):
        text = badge.get_text(strip=True)
        if not text:
            continue
        parent_a = badge.find_parent("a")
        if parent_a and parent_a.get("href"):
            href = parent_a["href"]
            slug, record_id = parse_slug_and_id(href)
            abilities.append(
                {
                    "name": text,
                    "level": None,
                    "slug": slug,
                    "url": href,
                    "id": record_id,
                }
            )
        else:
            abilities.append(
                {
                    "name": text,
                    "level": None,
                    "slug": None,
                    "url": None,
                    "id": None,
                }
            )
    return abilities


def _section_content(heading: Tag) -> Tag | None:
    for sibling in heading.next_siblings:
        if isinstance(sibling, Tag):
            return sibling
    return None


def parse_sections(soup: BeautifulSoup) -> dict[str, Any]:
    sections: dict[str, Any] = {}
    headings = soup.select(
        "p.font-semibold, p.text-xs.font-semibold, h2.text-lg.font-semibold"
    )
    for heading in headings:
        title = heading.get_text(strip=True)
        if not title:
            continue
        key = label_to_snake(title)
        content_div = _section_content(heading)
        if content_div is None:
            continue

        prose = _prose_element(content_div)
        if prose:
            sections[key] = {
                "description_html": html_inner(prose),
                "description_text": html_to_text(prose),
            }
        elif content_div.select("[data-slot='badge'], span[data-variant]"):
            sections[key] = parse_ability_badges(content_div)
        elif content_div.select("a[href]"):
            sections[key] = parse_badge_links(content_div)
        else:
            sections[key] = {
                "description_html": html_inner(content_div),
                "description_text": html_to_text(content_div),
            }
    return sections


def parse_main_prose(soup: BeautifulSoup) -> tuple[str | None, str | None]:
    prose = soup.select_one(".prose")
    if not prose:
        return None, None
    return html_inner(prose), html_to_text(prose)


def build_index_record(
    category: str,
    href: str,
    name: str,
    index_fields: dict[str, Any],
) -> dict[str, Any]:
    slug, record_id = parse_slug_and_id(href)
    return {
        "name": name,
        "url": resolve_url(href),
        "slug": slug,
        "id": record_id,
        "category": category,
        "index": index_fields,
    }


IndexFieldParser = Callable[[list[Tag], list[str]], dict[str, Any]]


def _index_by_headers(cells: list[Tag], headers: list[str]) -> dict[str, str]:
    values: dict[str, str] = {}
    for header, cell in zip(headers, cells):
        if not header:
            continue
        values[header] = cell_text(cell)
    return values


def parse_spells_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    components = parse_component_flags(cells[3:9]) if len(cells) >= 9 else {}
    return {
        "school": values.get("School"),
        "description_snippet": values.get("Description"),
        "components": components,
        "source_abbrev": values.get("Source"),
        "edition": values.get("Edition"),
    }


def parse_feats_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    return {
        "type": values.get("Type"),
        "description_snippet": values.get("Description"),
        "source_abbrev": values.get("Source"),
        "edition": values.get("Edition"),
    }


def parse_monsters_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    return {
        "type": values.get("Type"),
        "subtypes": values.get("Subtypes"),
        "cr": values.get("CR"),
        "hd": values.get("HD"),
        "source_abbrev": values.get("Source"),
    }


def parse_templates_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    return {
        "type": values.get("Type"),
        "applies_to": values.get("Applies To") or values.get("Applies to"),
        "type_change": values.get("Type Change") or values.get("Type change"),
        "cr": values.get("CR"),
        "la": values.get("LA"),
        "summary": values.get("Summary"),
        "has_tables": is_check_cell(cells[-1]) if cells else False,
    }


def parse_classes_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    return {
        "prestige_level": values.get("Prestige"),
        "hit_die": values.get("Hit Die"),
        "skill_points": values.get("Skill Pts"),
        "source_abbrev": values.get("Source"),
        "edition": values.get("Edition"),
    }


def parse_skills_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    trained_idx = headers.index("Trained Only") if "Trained Only" in headers else None
    armor_idx = headers.index("Armor Penalty") if "Armor Penalty" in headers else None
    return {
        "key_ability": values.get("Key Ability"),
        "trained_only": is_check_cell(cells[trained_idx]) if trained_idx is not None else None,
        "armor_check_penalty": is_check_cell(cells[armor_idx]) if armor_idx is not None else None,
        "source_abbrev": values.get("Source"),
    }


def parse_equipment_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    return {
        "kind": values.get("Kind") or values.get("Type"),
        "category": values.get("Category"),
        "stats": values.get("Stats"),
        "cost": values.get("Cost"),
        "weight": values.get("Weight"),
    }


def parse_items_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    return {
        "type": values.get("Type"),
        "price": values.get("Price"),
        "source_abbrev": values.get("Source"),
        "edition": values.get("Edition"),
    }


def parse_races_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    return {
        "type": values.get("Type"),
        "level_adjustment": values.get("Level Adjustment") or values.get("LA"),
        "source_abbrev": values.get("Source"),
        "edition": values.get("Edition"),
    }


def parse_deities_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    return {
        "alignment": values.get("Alignment"),
        "pantheon": values.get("Pantheon"),
        "portfolio": values.get("Portfolio"),
        "favored_weapon": values.get("Favored Weapon"),
    }


def parse_domains_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    return {
        "granted_power_snippet": values.get("Granted Power") or values.get("Power"),
        "source_abbrev": values.get("Source"),
    }


def parse_psionics_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    return {
        "discipline": values.get("Discipline"),
        "description_snippet": values.get("Description"),
        "power_points": values.get("Power Points") or values.get("PP"),
        "classes": values.get("Classes"),
        "source_abbrev": values.get("Source"),
    }


def parse_rules_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    return {
        "category": values.get("Category"),
        "subcategory": values.get("Subcategory"),
        "source_abbrev": values.get("Source"),
    }


def parse_generic_index_row(cells: list[Tag], headers: list[str]) -> dict[str, Any]:
    values = _index_by_headers(cells, headers)
    result: dict[str, Any] = {}
    for header, value in values.items():
        if header == "Name":
            continue
        result[label_to_snake(header)] = value
    return result


INDEX_ROW_PARSERS: dict[str, IndexFieldParser] = {
    "spells": parse_spells_index_row,
    "feats": parse_feats_index_row,
    "monsters": parse_monsters_index_row,
    "templates": parse_templates_index_row,
    "classes": parse_classes_index_row,
    "skills": parse_skills_index_row,
    "equipment": parse_equipment_index_row,
    "items": parse_items_index_row,
    "races": parse_races_index_row,
    "deities": parse_deities_index_row,
    "domains": parse_domains_index_row,
    "psionics": parse_psionics_index_row,
    "rules": parse_rules_index_row,
}


def parse_index_page(soup: BeautifulSoup, category: str, page_url: str) -> list[dict[str, Any]]:
    headers = parse_table_headers(soup)
    row_parser = INDEX_ROW_PARSERS.get(category, parse_generic_index_row)
    records: list[dict[str, Any]] = []
    for cells in parse_table_rows(soup):
        link = cells[0].find("a")
        if not link or not link.get("href"):
            continue
        name = link.get_text(strip=True)
        href = link["href"]
        index_fields = row_parser(cells, headers)
        records.append(build_index_record(category, href, name, index_fields))
    return records


def _apply_sections(detail: dict[str, Any], sections: dict[str, Any]) -> None:
    for key, value in sections.items():
        if key == "description" and isinstance(value, dict):
            html = clean_field_value(value.get("description_html"))
            text = clean_field_value(value.get("description_text"))
            if html:
                detail.setdefault("description_html", html)
            if text:
                detail.setdefault("description_text", text)
        elif isinstance(value, list):
            detail[key] = value
        elif isinstance(value, dict):
            html = clean_field_value(value.get("description_html"))
            text = clean_field_value(value.get("description_text"))
            if html:
                detail.setdefault(f"{key}_html", html)
            if text:
                detail.setdefault(f"{key}_text", text)
        else:
            detail[key] = value


def parse_detail_page(
    html: str,
    source_url: str,
    category: str,
) -> dict[str, Any]:
    soup = make_soup(html)
    name = get_detail_title(soup)
    slug, record_id = parse_slug_and_id(urlparse(source_url).path)
    muted_lines = get_muted_lines(soup)
    detail_source = parse_detail_source(soup)
    dl_fields = parse_dl_grid(soup)
    sections = parse_sections(soup)
    description_html, description_text = parse_main_prose(soup)

    detail: dict[str, Any] = {
        "name": name,
        "slug": slug,
        "id": record_id,
        "source_url": source_url,
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        **dl_fields,
    }

    if category == "feats" and muted_lines:
        first_line = muted_lines[0]
        if not is_source_line(first_line):
            feat_type = re.sub(r"feat$", "", first_line, flags=re.I).strip()
            detail["type"] = feat_type or first_line

    if category == "monsters" and muted_lines:
        first_line = muted_lines[0]
        if not is_source_line(first_line):
            detail["stat_line"] = first_line

    _apply_sections(detail, sections)

    if category == "monsters":
        if description_html:
            detail["flavor_html"] = description_html
            detail["flavor_text"] = description_text
        if not detail.get("description_html") and description_html:
            detail["description_html"] = description_html
            detail["description_text"] = description_text
    elif description_html and not detail.get("description_html"):
        detail["description_html"] = clean_field_value(description_html)
        detail["description_text"] = clean_field_value(description_text)
    elif description_text and not detail.get("description_text"):
        detail["description_text"] = clean_field_value(description_text)

    index_stub = detail.pop("index", None)
    index_fields = index_stub if isinstance(index_stub, dict) else {}

    detail["source"] = merge_source(
        detail_source,
        index_source_abbrev=index_fields.get("source_abbrev"),
        index_edition=index_fields.get("edition"),
    )

    return detail


def merge_index_detail(
    index_record: dict[str, Any],
    detail_record: dict[str, Any] | None,
) -> dict[str, Any]:
    merged: dict[str, Any] = {
        "id": index_record.get("id"),
        "slug": index_record.get("slug"),
        "name": index_record.get("name"),
        "source_url": index_record.get("url"),
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "index": index_record.get("index", {}),
    }

    index_data = index_record.get("index", {})

    if detail_record:
        for key, value in detail_record.items():
            if key in ("index",):
                continue
            if key == "source":
                continue
            elif key not in merged or merged[key] in (None, "", []):
                merged[key] = value
            elif key not in ("name", "slug", "id", "source_url", "scraped_at"):
                merged[key] = value
        merged["scraped_at"] = detail_record.get("scraped_at", merged["scraped_at"])
        merged["source"] = merge_source(
            detail_record.get("source"),
            index_source_abbrev=index_data.get("source_abbrev"),
            index_edition=index_data.get("edition"),
        )
    else:
        index_data = index_record.get("index", {})
        merged["source"] = merge_source(
            None,
            index_source_abbrev=index_data.get("source_abbrev"),
            index_edition=index_data.get("edition"),
        )

    return merged
