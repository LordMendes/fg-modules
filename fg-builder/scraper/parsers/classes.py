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
    r"\b(?:at|starting at|reaches|who is at least|of at least)\s+"
    r"(\d+)(?:st|nd|rd|th)\s+level\b",
    re.I,
)
FEATURE_STRONG_RE = re.compile(
    r"^(.+?)(?:\(([^)]+)\))?\s*:?\s*$",
)
ORDINAL_LEVEL_RE = re.compile(r"^(\d+)(?:st|nd|rd|th)?$", re.I)
_SPELLCASTING_ADVANCEMENT_RE = re.compile(
    r"(?:"
    r"\+?\s*1\s+level of existing\b|"
    r"\+?\s*1\s+(?:divine|arcane)\b|"
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
    for dt in content.find_all("dt"):
        label = dt.get_text(" ", strip=True).lower()
        dd = dt.find_next_sibling("dd")
        if not dd:
            continue
        value = dd.get_text(" ", strip=True)
        value = re.sub(r"\bd\s+(\d+)\b", r"d\1", value, flags=re.I)
        if "hit die" in label:
            fields["hit_die"] = value
        elif "skill point" in label:
            fields["skill_points"] = value
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
        "spells": "",
        "special": "",
        "base_attack_bonus": "",
        "base_save_bonus": "",
    }
    headings = content.find_all(["h3", "h4", "h2"])
    for heading in headings:
        if "requirement" not in heading.get_text(strip=True).lower():
            continue
        block_parts: list[str] = []
        html_parts: list[str] = []
        for sibling in heading.next_siblings:
            if isinstance(sibling, Tag) and sibling.name in ("h2", "h3", "h4"):
                break
            if isinstance(sibling, Tag):
                for p in sibling.find_all("p") if sibling.name != "p" else [sibling]:
                    text = p.get_text(" ", strip=True)
                    block_parts.append(text)
                    html_parts.append(_paragraph_html(p))
                    strongs = p.find_all("strong")
                    for index, strong in enumerate(strongs):
                        label = strong.get_text(strip=True).rstrip(":")
                        start = p.contents.index(strong) + 1
                        end = (
                            p.contents.index(strongs[index + 1])
                            if index + 1 < len(strongs)
                            else len(p.contents)
                        )
                        value_html = "".join(str(node) for node in p.contents[start:end])
                        value = BeautifulSoup(value_html, "lxml").get_text(
                            " ", strip=True
                        )
                        ll = label.lower()
                        if ll == "alignment":
                            result["alignment"] = value
                        elif ll == "skills":
                            result["skills"].append(value)
                        elif ll == "feats":
                            result["feats"].append(value)
                        elif ll == "spells":
                            result["spells"] = value
                        elif ll == "special":
                            result["special"] = value
                        elif "base attack" in ll:
                            result["base_attack_bonus"] = value
                        elif "base save" in ll:
                            result["base_save_bonus"] = value
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

    headings = content.find_all(["h3", "h4", "h2"])
    for heading in headings:
        if "class feature" not in heading.get_text(strip=True).lower():
            continue
        section_parts: list[str] = []
        for sibling in heading.next_siblings:
            if isinstance(sibling, Tag) and sibling.name in ("h2", "h3", "h4"):
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
    for heading in content.find_all(["h2", "h3", "h4"]):
        if "advancement" not in heading.get_text(strip=True).lower():
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
                if len(texts) >= 7:
                    row["spellcasting"] = texts[6]
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
        heading = next(
            (
                h
                for h in content.find_all(["h2", "h3", "h4"])
                if "class skill" in h.get_text(" ", strip=True).lower()
            ),
            None,
        )
        if heading:
            section = heading.find_next_sibling()
            if section:
                for link in section.find_all("a"):
                    name = link.get_text(" ", strip=True)
                    if name:
                        skills.append({"name": name, "ability": ""})

    if not skills:
        return [], ""

    formatted_parts = [
        (
            f"{s['name']} ({s['ability']})"
            if s.get("ability")
            else s["name"]
        )
        for s in skills
        if s["name"]
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


_PAREN_TAIL = re.compile(r"\s*(\((?!ex\)|su\)|sp\))[^)]*\))\s*$", re.I)
_NUMERIC_TAILS = (
    re.compile(r"\s*[+\-]?\d+d\d+\s*$", re.I),
    re.compile(r"\s+\d+\s*/\s*[^\s,)]+\s*$", re.I),
    re.compile(r"\s+dr\s+\d+\s*$", re.I),
    re.compile(r"\s*[+\-]\d+\s*$"),
    re.compile(r"\s+\d+\s*%\s*$"),
    re.compile(r"\s+\d+\s*ft\.?\s*$", re.I),
    re.compile(r"\s+any\s+distance\s*$", re.I),
)
_LEADING_ORDINAL = re.compile(r"^(\d+(?:st|nd|rd|th))\s+(.+)$", re.I)


def _clean_suffix(suffix: str) -> str:
    suffix = suffix.strip()
    if len(suffix) >= 2 and suffix[0] == "(" and suffix[-1] == ")":
        return suffix[1:-1].strip()
    return suffix


def _progression_parts(name: str) -> tuple[str, str]:
    """Split 'Rage 2/day' into ('Rage', '2/day'). A bare name has an empty suffix."""
    stem = re.sub(r"\s+", " ", name or "").strip(" ,.;")
    end_pieces: list[str] = []
    paren = _PAREN_TAIL.search(stem)
    if paren and len(stem[: paren.start()].strip()) >= 3:
        end_pieces.append(paren.group(1).strip())
        stem = stem[: paren.start()].strip()
    changed = True
    while changed and stem:
        changed = False
        for pattern in _NUMERIC_TAILS:
            match = pattern.search(stem)
            if not match:
                continue
            remain = stem[: match.start()].strip(" ,.;")
            if len(remain) < 3:
                continue
            end_pieces.append(stem[match.start() :].strip())
            stem = remain
            changed = True
            break
    lead = ""
    ordinal = _LEADING_ORDINAL.match(stem)
    if ordinal and len(ordinal.group(2).split()) >= 2:
        lead = ordinal.group(1)
        stem = ordinal.group(2).strip()
    if not lead and not end_pieces:
        return stem, ""
    suffix = " ".join(piece for piece in [lead, *reversed(end_pieces)] if piece)
    return stem, _clean_suffix(suffix)


def _last_word_variants(key: str) -> set[str]:
    """Match 'Special Abilities' with 'Special ability', and 'Bonus Feats' with 'Bonus feat'."""
    words = key.split()
    if not words:
        return set()
    last = words[-1]
    variants = {last}
    if last.endswith("ies") and len(last) > 4:
        variants.add(last[:-3] + "y")
    elif last.endswith("s") and not last.endswith("ss") and len(last) > 3:
        variants.add(last[:-1])
    if last.endswith("y") and len(last) > 2 and last[-2] not in "aeiou":
        variants.add(last[:-1] + "ies")
    elif not last.endswith("s"):
        variants.add(last + "s")
    prefix = words[:-1]
    return {" ".join([*prefix, word]) for word in variants}


def _stem_keys(name: str) -> set[str]:
    stem, _suffix = _progression_parts(name)
    stem = re.sub(r"\s+\((?:ex|su|sp)\)\s*$", "", stem, flags=re.I).strip()
    key = re.sub(r"\s+", " ", stem).strip().lower()
    if not key:
        return set()
    return _last_word_variants(key)


def _feature_by_stem(features: list[dict[str, Any]], name: str) -> dict[str, Any] | None:
    keys = _stem_keys(name)
    if not keys:
        return None
    for feature in features:
        if _stem_keys(feature.get("name") or "") & keys:
            return feature
    return None


def _ordinal_level(level: int) -> str:
    value = int(level or 0)
    if 10 <= value % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(value % 10, "th")
    return f"{value}{suffix}"


def _display_stem(stem: str) -> str:
    small = {"of", "the", "and", "a", "an"}
    words = stem.split()
    titled: list[str] = []
    for index, word in enumerate(words):
        if index and word.lower() in small:
            titled.append(word.lower())
        elif word.isupper() and len(word) > 1:
            titled.append(word)
        else:
            titled.append(word[:1].upper() + word[1:])
    return " ".join(titled)


def _record_progression(feature: dict[str, Any], level: int, suffix: str) -> None:
    """Rewrite the count on a table-only feature instead of adding another entry.

    Book prose already states its own schedule, so those features are left as written.
    """
    if feature.get("source") != "advancement":
        return
    steps: list[tuple[int, str]] = feature.setdefault("_steps", [])
    item = (int(level or 0), suffix)
    if item not in steps:
        steps.append(item)
    sentence = "; ".join(
        f"{step_suffix} at {_ordinal_level(step_level)} level" for step_level, step_suffix in steps
    )
    sentence = sentence[0].upper() + sentence[1:] + "."
    feature["text"] = sentence
    feature["text_html"] = f"<p>{sentence}</p>"


def _split_commas_outside_parens(text: str) -> list[str]:
    parts: list[str] = []
    buf: list[str] = []
    depth = 0
    for char in text:
        if char == "(":
            depth += 1
            buf.append(char)
        elif char == ")":
            depth = max(0, depth - 1)
            buf.append(char)
        elif char == "," and depth == 0:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(char)
    parts.append("".join(buf))
    return parts


def _special_parts(special: str) -> list[str]:
    """Split a Special cell on commas, and on 'and' only when both sides are features."""
    parts: list[str] = []
    for chunk in _split_commas_outside_parens(special):
        pieces = re.split(r"\s+and\s+(?!the\b)", chunk, flags=re.I)
        if len(pieces) == 2 and len(pieces[1].split()) < 2:
            parts.append(chunk.strip(" ,.;"))
            continue
        parts.extend(piece.strip(" ,.;") for piece in pieces)
    return [part for part in parts if part]


def _merge_advancement_features(
    features: list[dict[str, Any]],
    advancement: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    merged = list(features)
    existing = {(f.get("level"), f.get("name", "").lower()) for f in merged}
    for row in advancement:
        special = (row.get("special") or "").strip()
        spellcasting = (row.get("spellcasting") or "").strip()
        if not spellcasting and _is_spellcasting_advancement(special):
            spellcasting = special
            special = ""
        if not special and not spellcasting:
            continue
        level = row.get("level", 0)
        if _is_spellcasting_advancement(spellcasting):
            key = (level, "spells per day")
            for feature in merged:
                feature_name = (feature.get("name") or "").lower()
                if level == feature.get("level") and (
                    feature_name in {"spells", "spells per day", "spells per day/spells known"}
                    or feature_name.startswith("spells per day/")
                ):
                    feature["name"] = "Spells per Day"
                    existing.discard((level, feature_name))
                    existing.add(key)
                    break
            if key not in existing:
                merged.append(
                    {
                        "level": level,
                        "name": "Spells per Day",
                        "type": "",
                        "text_html": f"<p>{spellcasting}</p>",
                        "text": spellcasting,
                        "source": "advancement",
                    }
                )
                existing.add(key)
            continue
        for name in _special_parts(special):
            if len(name) < 3 or re.fullmatch(r"[\u2014\u2013\-]+", name):
                continue
            if name.lower() in {"or", "and", "the", "see", "text"}:
                continue
            _stem, suffix = _progression_parts(name)
            matching = _feature_by_stem(merged, name)
            if matching:
                # A later daily use, DR, or bonus updates the existing feature.
                # It does not add a row, and it does not move the feature's level.
                if suffix:
                    _record_progression(matching, level, suffix)
                continue
            if suffix:
                display = _display_stem(_stem)
                feature = {
                    "level": level,
                    "name": display,
                    "type": "",
                    "text_html": f"<p>{name}</p>",
                    "text": name,
                    "source": "advancement",
                }
                _record_progression(feature, level, suffix)
                merged.append(feature)
                existing.add((level, display.lower()))
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
    for feature in merged:
        feature.pop("_steps", None)
    merged.sort(key=lambda f: (f.get("level", 0), f.get("name", "")))
    return merged


def _parse_skill_ranks_number(skill_points: str) -> int | None:
    if not skill_points:
        return None
    match = re.search(r"(\d+)", skill_points)
    return int(match.group(1)) if match else None


def parse_class_detail(html: str, source_url: str) -> dict[str, Any]:
    soup = make_soup(html)
    content = soup.select_one("#content") or soup.find("main")
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
