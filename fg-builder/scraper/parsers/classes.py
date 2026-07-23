"""Class index and detail parsers."""

from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup, NavigableString, Tag

from ..resolver import base_url_from
from .base import (
    cell_link_href,
    cell_link_text,
    cell_text,
    extract_slug_from_href,
    get_content_title,
    html_inner,
    html_to_text,
    is_yes_icon,
    make_soup,
    parse_table_rows,
    resolve_url,
)

ABILITY_MAP = {
    "STR": "Str",
    "DEX": "Dex",
    "CON": "Con",
    "INT": "Int",
    "WIS": "Wis",
    "CHA": "Cha",
}

LEVEL_IN_TEXT_RE = re.compile(
    r"\bat\s+(\d+)(?:st|nd|rd|th)\s+level\b",
    re.I,
)
FEATURE_STRONG_RE = re.compile(
    r"^(.+?)(?:\(([^)]+)\))?\s*:?\s*$",
)
ORDINAL_LEVEL_RE = re.compile(r"^(\d+)(?:st|nd|rd|th)?$", re.I)
_SPELLCASTING_ADVANCEMENT_RE = re.compile(
    r"(?:"
    r"\+?\s*1\s+level of existing\b|"
    r"gains new spells per day|"
    r"determines spells per day"
    r")",
    re.I,
)


def parse_classes_index(soup: BeautifulSoup, page_url: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for cells in parse_table_rows(soup):
        if len(cells) < 2:
            continue
        href = cell_link_href(cells[0])
        if not href:
            continue
        url = resolve_url(page_url, href)
        slug = extract_slug_from_href(href)
        if slug:
            host = base_url_from(page_url)
            url = f"{host}/classes/{slug}/index.html"
        records.append(
            {
                "name": cell_link_text(cells[0]),
                "url": url,
                "slug": slug or "",
                "global_id": None,
                "is_prestige": is_yes_icon(cells[1]),
            }
        )
    return records


def _text_after_heading(heading: Tag) -> str:
    for sibling in heading.next_siblings:
        if isinstance(sibling, Tag):
            if sibling.name in ("h3", "h4"):
                break
            if sibling.name == "p":
                return sibling.get_text(" ", strip=True)
            if sibling.name == "table":
                break
            if sibling.name == "div":
                first_p = sibling.find("p", recursive=False)
                if first_p:
                    return first_p.get_text(" ", strip=True)
                break
            text = sibling.get_text(" ", strip=True)
            if text:
                return text
        else:
            text = str(sibling).strip()
            if text:
                return text
    return ""


def _parse_h4_fields(content: Tag) -> dict[str, str]:
    fields: dict[str, str] = {}
    for h4 in content.find_all("h4"):
        label = h4.get_text(strip=True).lower()
        value = _text_after_heading(h4)
        if not value:
            continue
        if "hit die" in label:
            fields["hit_die"] = value
        elif "skill point" in label:
            fields["skill_points"] = value
        elif "base attack" in label or label == "bab":
            fields["bab"] = value
        elif "saving throw" in label:
            fields["saves"] = value
        elif "class skill" in label and "feature" not in label:
            fields["class_skills"] = value
    return fields


def _paragraph_html(tag: Tag) -> str:
    """Preserve outer <p> wrapper; html_inner() drops it."""
    if tag.name == "p":
        return str(tag)
    return html_inner(tag)


def _parse_requirements_block(content: Tag) -> dict[str, Any]:
    result: dict[str, Any] = {
        "text": "",
        "html": "",
        "alignment": "",
        "skills": [],
        "feats": [],
        "special": "",
        "base_attack_bonus": "",
    }
    for h4 in content.find_all("h4"):
        if "requirement" not in h4.get_text(strip=True).lower():
            continue
        block_parts: list[str] = []
        html_parts: list[str] = []
        for sibling in h4.next_siblings:
            if isinstance(sibling, Tag) and sibling.name == "h4":
                break
            if isinstance(sibling, Tag):
                for p in sibling.find_all("p") if sibling.name != "p" else [sibling]:
                    strong = p.find("strong")
                    label = strong.get_text(strip=True).rstrip(":") if strong else ""
                    text = p.get_text(" ", strip=True)
                    block_parts.append(text)
                    html_parts.append(_paragraph_html(p))
                    ll = label.lower()
                    if ll == "alignment":
                        result["alignment"] = text.replace("Alignment:", "").strip()
                    elif ll == "skills":
                        result["skills"].append(text.replace("Skills:", "").strip())
                    elif ll == "feats":
                        result["feats"].append(text.replace("Feats:", "").strip())
                    elif ll == "special":
                        result["special"] = text.replace("Special:", "").strip()
                    elif "base attack" in ll:
                        result["base_attack_bonus"] = text.replace("Base Attack Bonus:", "").strip()
        result["text"] = "\n".join(block_parts).strip()
        result["html"] = "".join(html_parts)
        break
    return result


def _parse_intro_description(content: Tag) -> tuple[str, str]:
    for div in content.find_all("div", class_="nice-textile"):
        if div.find("h4"):
            continue
        html = html_inner(div)
        if html.strip():
            return html, html_to_text(div)
    return "", ""


def _parse_feature_paragraph(p: Tag) -> dict[str, Any] | None:
    strong = p.find("strong")
    if not strong:
        return None

    label = strong.get_text(strip=True)
    match = FEATURE_STRONG_RE.match(label)
    if not match:
        return None

    name = match.group(1).strip()
    feat_type = (match.group(2) or "").strip()
    body_html = _paragraph_html(p)
    body_text = p.get_text("\n", strip=True)

    level = 1
    level_match = LEVEL_IN_TEXT_RE.search(body_text)
    if level_match:
        level = int(level_match.group(1))

    return {
        "level": level,
        "name": name,
        "type": feat_type,
        "text_html": body_html,
        "text": body_text,
    }


def _parse_class_features_section(content: Tag) -> tuple[list[dict[str, Any]], str, str]:
    features: list[dict[str, Any]] = []
    notes_html = ""
    notes_text = ""

    for h4 in content.find_all("h4"):
        if "class feature" not in h4.get_text(strip=True).lower():
            continue
        container = h4.parent if h4.parent and h4.parent.name == "div" else content
        section_parts: list[str] = []
        for sibling in h4.next_siblings:
            if isinstance(sibling, Tag) and sibling.name == "h3":
                break
            if isinstance(sibling, Tag):
                if sibling.name == "p":
                    feat = _parse_feature_paragraph(sibling)
                    if feat:
                        features.append(feat)
                section_parts.append(_paragraph_html(sibling))
                for p in sibling.find_all("p"):
                    feat = _parse_feature_paragraph(p)
                    if feat and feat not in features:
                        features.append(feat)
            else:
                text = str(sibling).strip()
                if text:
                    section_parts.append(text)
        notes_html = "".join(section_parts)
        notes_text = BeautifulSoup(notes_html, "lxml").get_text("\n", strip=True) if notes_html else ""
        break

    return features, notes_html, notes_text


def _stats_summary_html(h4_fields: dict[str, str]) -> str:
    parts: list[str] = []
    if h4_fields.get("hit_die"):
        parts.append(f"<p><b>Hit Die:</b> {h4_fields['hit_die']}</p>")
    if h4_fields.get("skill_points"):
        parts.append(f"<p><b>Skill Points:</b> {h4_fields['skill_points']}</p>")
    return "".join(parts)


def _parse_advancement_table(content: Tag) -> tuple[list[dict[str, Any]], str]:
    rows: list[dict[str, Any]] = []
    table_html = ""
    for h3 in content.find_all("h3"):
        if "advancement" not in h3.get_text(strip=True).lower():
            continue
        table = h3.find_next("table")
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
            level_raw = texts[0]
            level_match = ORDINAL_LEVEL_RE.match(level_raw.replace(" ", ""))
            if not level_match:
                continue
            level = int(level_match.group(1))
            row: dict[str, Any] = {"level": level}
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
            elif len(texts) >= 2:
                row["special"] = texts[-1]
            rows.append(row)
        break
    return rows, table_html


def _parse_spell_tables(content: Tag) -> list[dict[str, Any]]:
    tables: list[dict[str, Any]] = []
    for h4 in content.find_all("h4"):
        title = h4.get_text(strip=True)
        if "spell" not in title.lower():
            continue
        table = h4.find_next("table")
        if not table:
            continue
        headers = [th.get_text(" ", strip=True) for th in table.find_all("th")]
        data_rows: list[list[str]] = []
        for tr in table.find_all("tr"):
            cells = tr.find_all("td")
            if cells:
                data_rows.append([c.get_text(" ", strip=True) for c in cells])
        tables.append(
            {
                "title": title,
                "headers": headers,
                "rows": data_rows,
                "html": html_inner(table),
            }
        )
    return tables


def _parse_class_skills_table(content: Tag) -> tuple[list[dict[str, str]], str]:
    skills: list[dict[str, str]] = []
    for h3 in content.find_all("h3"):
        if "class skill" not in h3.get_text(strip=True).lower():
            continue
        table = h3.find_next("table", class_="common")
        if not table:
            continue
        for tr in table.find_all("tr"):
            cells = tr.find_all("td")
            if len(cells) < 2:
                continue
            name = cell_link_text(cells[0]) or cell_text(cells[0])
            ability = cell_text(cells[1]).upper()
            skills.append(
                {
                    "name": name,
                    "ability": ABILITY_MAP.get(ability, ability.title()),
                }
            )
        break

    if not skills:
        return [], ""

    formatted_parts = [
        f"{s['name']} ({s['ability']})" for s in skills if s["name"]
    ]
    if len(formatted_parts) > 1:
        fg_text = ", ".join(formatted_parts[:-1]) + f", and {formatted_parts[-1]}"
    else:
        fg_text = formatted_parts[0] if formatted_parts else ""
    return skills, fg_text


def _parse_int_bonus(value: str) -> int | None:
    if not value:
        return None
    match = re.search(r"[-+]?\d+", value.replace(" ", ""))
    return int(match.group()) if match else None


def _classify_save(max_level: int, save_value: str) -> str:
    val = _parse_int_bonus(save_value)
    if val is None or max_level <= 0:
        return ""
    threshold = max(3, 2 + max_level // 2)
    return "Good" if val >= threshold else "Bad"


def _classify_bab(max_level: int, bab_value: str) -> str:
    bab = _parse_int_bonus(bab_value)
    if bab is None or max_level <= 0:
        return ""
    ratio = bab / max_level
    if ratio >= 0.9:
        return "Fast"
    if ratio >= 0.55:
        return "Medium"
    return "Slow"


def _derive_progression(advancement: list[dict[str, Any]]) -> dict[str, str]:
    if not advancement:
        return {}
    max_row = max(advancement, key=lambda r: r.get("level", 0))
    max_level = max_row.get("level", 0)
    result: dict[str, str] = {}
    if max_row.get("bab") is not None:
        result["bab"] = _classify_bab(max_level, str(max_row["bab"]))
    for key in ("fort", "ref", "will"):
        if max_row.get(key) is not None:
            result[key] = _classify_save(max_level, str(max_row[key]))
    return result


def _is_spellcasting_advancement(special: str) -> bool:
    return bool(_SPELLCASTING_ADVANCEMENT_RE.search(special or ""))


def _merge_advancement_features(
    features: list[dict[str, Any]],
    advancement: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    merged = list(features)
    existing = {(f.get("level"), f.get("name", "").lower()) for f in merged}
    for row in advancement:
        special = (row.get("special") or "").strip()
        if not special:
            continue
        level = row.get("level", 0)
        if _is_spellcasting_advancement(special):
            key = (level, "spells per day")
            if key not in existing:
                merged.append(
                    {
                        "level": level,
                        "name": "Spells per Day",
                        "type": "",
                        "text_html": f"<p>{special}</p>",
                        "text": special,
                        "source": "advancement",
                    }
                )
                existing.add(key)
            continue
        for part in re.split(r"\s*,\s*|\s+and\s+", special):
            name = part.strip()
            if not name or len(name) < 3:
                continue
            if name.lower() in {"or", "and", "the", "see", "text"}:
                continue
            key = (level, name.lower())
            if key in existing:
                continue
            merged.append(
                {
                    "level": level,
                    "name": name,
                    "type": "",
                    "text_html": f"<p>{name}</p>",
                    "text": name,
                    "source": "advancement",
                }
            )
            existing.add(key)
    merged.sort(key=lambda f: (f.get("level", 0), f.get("name", "")))
    return merged


def _parse_skill_ranks_number(skill_points: str) -> int | None:
    if not skill_points:
        return None
    match = re.search(r"(\d+)", skill_points)
    return int(match.group(1)) if match else None


def parse_class_detail(html: str, source_url: str) -> dict[str, Any]:
    soup = make_soup(html)
    content = soup.select_one("#content")
    if not content:
        return {"title": get_content_title(soup), "class_type": "base"}

    h4_fields = _parse_h4_fields(content)
    requirements = _parse_requirements_block(content)
    desc_html, desc_text = _parse_intro_description(content)
    paragraph_features, notes_html, notes_text = _parse_class_features_section(content)
    advancement, advancement_html = _parse_advancement_table(content)
    spell_tables = _parse_spell_tables(content)
    skills_list, class_skills_fg = _parse_class_skills_table(content)
    progression = _derive_progression(advancement)

    class_features = _merge_advancement_features(paragraph_features, advancement)

    title = get_content_title(soup)
    has_req = bool(requirements.get("text") or requirements.get("skills"))
    class_type = "prestige" if has_req else "base"

    bab = h4_fields.get("bab") or progression.get("bab", "")
    if bab and bab[0].isdigit():
        bab = progression.get("bab", bab)

    stats_html = _stats_summary_html(h4_fields)
    description_html = desc_html
    if stats_html:
        description_html = f"{desc_html}{stats_html}" if desc_html else stats_html
    description_text = desc_text
    if h4_fields.get("hit_die") or h4_fields.get("skill_points"):
        stat_lines = []
        if h4_fields.get("hit_die"):
            stat_lines.append(f"Hit Die: {h4_fields['hit_die']}")
        if h4_fields.get("skill_points"):
            stat_lines.append(f"Skill Points: {h4_fields['skill_points']}")
        description_text = "\n".join(filter(None, [desc_text, *stat_lines]))

    return {
        "title": title,
        "class_type": class_type,
        "description_html": description_html,
        "description_text": description_text,
        "notes_html": notes_html,
        "notes_text": notes_text,
        "requirements": requirements.get("text", ""),
        "requirements_structured": requirements,
        "alignment": requirements.get("alignment", ""),
        "hit_die": h4_fields.get("hit_die", ""),
        "bab": bab,
        "fort": progression.get("fort", ""),
        "ref": progression.get("ref", ""),
        "will": progression.get("will", ""),
        "saves": h4_fields.get("saves", ""),
        "class_skills": class_skills_fg or h4_fields.get("class_skills", ""),
        "class_skills_list": skills_list,
        "skill_points": h4_fields.get("skill_points", ""),
        "skill_ranks": _parse_skill_ranks_number(h4_fields.get("skill_points", "")),
        "class_features": class_features,
        "advancement": advancement,
        "advancement_html": advancement_html,
        "spell_progression": spell_tables,
        "raw_sections": [],
    }
