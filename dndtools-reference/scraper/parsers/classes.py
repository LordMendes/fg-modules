"""Class detail parser — adds level advancement tables and class features."""

from __future__ import annotations

import re
from typing import Any

from .base import html_inner, make_soup, parse_detail_page, parse_slug_and_id

ORDINAL_LEVEL_RE = re.compile(r"^(\d+)(?:st|nd|rd|th)?$", re.I)


def _parse_advancement_table(soup) -> tuple[list[dict[str, Any]], str]:
    rows: list[dict[str, Any]] = []
    table_html = ""

    for heading in soup.find_all(["h2", "h3"]):
        if heading.get_text(strip=True).lower() != "advancement":
            continue
        table = heading.find_next("table")
        if not table:
            continue

        table_html = html_inner(table)
        for tr in table.find_all("tr"):
            cells = tr.find_all(["td", "th"])
            if not cells or cells[0].name == "th":
                continue
            texts = [c.get_text(" ", strip=True) for c in cells]
            if len(texts) < 2:
                continue

            level_match = ORDINAL_LEVEL_RE.match(texts[0].replace(" ", ""))
            if not level_match:
                continue

            row: dict[str, Any] = {"level": int(level_match.group(1))}
            if len(texts) >= 6:
                row.update(
                    {
                        "bab": texts[1],
                        "fort": texts[2],
                        "ref": texts[3],
                        "will": texts[4],
                        "special": texts[5],
                    }
                )
                if len(texts) >= 7:
                    row["spellcasting"] = texts[6]
            elif len(texts) >= 2:
                row["special"] = texts[-1]
            rows.append(row)
        break

    return rows, table_html


def _parse_class_skills(soup) -> list[dict[str, Any]]:
    skills: list[dict[str, Any]] = []

    for heading in soup.find_all(["h2", "h3"]):
        if heading.get_text(strip=True).lower() != "class skills":
            continue

        grid = heading.find_next_sibling("div")
        if grid:
            for link in grid.find_all("a", href=True):
                href = link["href"]
                slug, record_id = parse_slug_and_id(href)
                skills.append(
                    {
                        "name": link.get_text(strip=True),
                        "slug": slug,
                        "url": href,
                        "id": record_id,
                    }
                )
            break

        table = heading.find_next("table")
        if table:
            for row in table.find_all("tr"):
                cells = row.find_all("td")
                if len(cells) < 2:
                    continue
                link = cells[0].find("a")
                href = link["href"] if link else ""
                slug, record_id = parse_slug_and_id(href) if href else ("", None)
                name = link.get_text(strip=True) if link else cells[0].get_text(" ", strip=True)
                skills.append(
                    {
                        "name": name,
                        "slug": slug or None,
                        "url": href or None,
                        "id": record_id,
                        "ability": cells[1].get_text(" ", strip=True) or None,
                    }
                )
            break

    return skills


def parse_index(soup, page_url: str):
    from .base import parse_index_page

    return parse_index_page(soup, "classes", page_url)


def parse_detail(html: str, source_url: str) -> dict[str, Any]:
    detail = parse_detail_page(html, source_url, "classes")
    soup = make_soup(html)
    advancement, advancement_html = _parse_advancement_table(soup)
    class_skills = _parse_class_skills(soup)

    if advancement:
        detail["advancement"] = advancement
    if advancement_html:
        detail["advancement_html"] = f"<table>{advancement_html}</table>"
    if class_skills:
        detail["class_skills"] = class_skills

    # Prefer Class Features as description; leave Requirements for overlay.
    class_features = detail.pop("class_features_html", None)
    class_features_text = detail.pop("class_features_text", None)
    requirements_html = detail.pop("requirements_html", None)
    requirements_text = detail.pop("requirements_text", None)

    if class_features:
        detail["description_html"] = class_features
        detail["description_text"] = class_features_text
    elif detail.get("description_html") == requirements_html:
        # parse_detail_page may have set description from first prose (Requirements).
        detail["description_html"] = None
        detail["description_text"] = None

    # Keep new-site requirements as fallback until classic overlay replaces them.
    if requirements_html:
        detail["requirements_html"] = requirements_html
        detail["requirements_text"] = requirements_text

    return detail
