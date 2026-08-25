"""Class records → FG class section with classfeatures."""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from typing import Any

from ..html_utils import (
    class_requirements_html,
    normalize_all_tables_in_html,
    normalize_class_body_html,
    normalize_fg_table_html,
    prepare_formatted_html,
    strip_loose_table_fragments,
    wrap_paragraph,
)
from ..loader import BuildReport
from ..validators import (
    classify_spell_feature,
    normalize_spell_feature_name,
    validate_class_skill_automation,
    validate_class_spellcasting_automation,
)
from ..xml_builder import (
    IdAllocator,
    make_category,
    set_formatted_inner,
    typed_formattedtext,
    typed_number,
    typed_string,
)


def _parse_skill_ranks(text: str) -> int | None:
    if not text:
        return None
    match = re.search(r"(\d+)", text)
    return int(match.group(1)) if match else None


def _format_classskills(skills: str) -> str:
    """Keep comma-separated Skill (Abl) list — FG applyClassStats splits on commas."""
    return (skills or "").strip()


_UA_BASE_SKILLS = {
    "wizard": "Concentration (Con), Craft (Int), Knowledge (all) (Int), Profession (Wis), and Spellcraft (Int)",
    "sorcerer": "Concentration (Con), Craft (Int), Knowledge (arcana) (Int), Profession (Wis), and Spellcraft (Int)",
    "barbarian": "Climb (Str), Craft (Int), Handle Animal (Cha), Intimidate (Cha), Jump (Str), Listen (Wis), Ride (Dex), Survival (Wis), and Swim (Str)",
    "bard": "Appraise (Int), Balance (Dex), Bluff (Cha), Climb (Str), Concentration (Con), Craft (Int), Decipher Script (Int), Diplomacy (Cha), Disguise (Cha), Escape Artist (Dex), Gather Information (Cha), Hide (Dex), Jump (Str), Knowledge (all) (Int), Listen (Wis), Move Silently (Dex), Perform (Cha), Profession (Wis), Sense Motive (Wis), Sleight of Hand (Dex), Speak Language (None), Spellcraft (Int), Swim (Str), Tumble (Dex), and Use Magic Device (Cha)",
    "cleric": "Concentration (Con), Craft (Int), Diplomacy (Cha), Heal (Wis), Knowledge (arcana) (Int), Knowledge (religion) (Int), Profession (Wis), and Spellcraft (Int)",
    "druid": "Concentration (Con), Craft (Int), Diplomacy (Cha), Handle Animal (Cha), Heal (Wis), Knowledge (nature) (Int), Listen (Wis), Profession (Wis), Ride (Dex), Spellcraft (Int), Spot (Wis), Survival (Wis), and Swim (Str)",
    "fighter": "Climb (Str), Craft (Int), Handle Animal (Cha), Intimidate (Cha), Jump (Str), Ride (Dex), and Swim (Str)",
    "monk": "Balance (Dex), Climb (Str), Concentration (Con), Craft (Int), Diplomacy (Cha), Escape Artist (Dex), Hide (Dex), Jump (Str), Knowledge (arcana) (Int), Knowledge (religion) (Int), Listen (Wis), Move Silently (Dex), Perform (Cha), Profession (Wis), Sense Motive (Wis), Spot (Wis), Swim (Str), and Tumble (Dex)",
    "paladin": "Concentration (Con), Craft (Int), Diplomacy (Cha), Handle Animal (Cha), Heal (Wis), Knowledge (nobility and royalty) (Int), Knowledge (religion) (Int), Profession (Wis), Ride (Dex), and Sense Motive (Wis)",
    "ranger": "Climb (Str), Craft (Int), Handle Animal (Cha), Heal (Wis), Hide (Dex), Jump (Str), Knowledge (dungeoneering) (Int), Knowledge (geography) (Int), Knowledge (nature) (Int), Listen (Wis), Move Silently (Dex), Profession (Wis), Ride (Dex), Search (Int), Spot (Wis), Survival (Wis), Swim (Str), and Use Rope (Dex)",
    "rogue": "Appraise (Int), Balance (Dex), Bluff (Cha), Climb (Str), Craft (Int), Decipher Script (Int), Diplomacy (Cha), Disable Device (Int), Disguise (Cha), Escape Artist (Dex), Forgery (Int), Gather Information (Cha), Hide (Dex), Intimidate (Cha), Jump (Str), Knowledge (local) (Int), Listen (Wis), Move Silently (Dex), Open Lock (Dex), Perform (Cha), Profession (Wis), Search (Int), Sense Motive (Wis), Sleight of Hand (Dex), Spot (Wis), Swim (Str), Tumble (Dex), Use Magic Device (Cha), and Use Rope (Dex)",
}

_UA_VARIANT_BASES = {
    "Abjurer Variant": "wizard",
    "Barbarian Variant": "barbarian",
    "Bard Variant": "bard",
    "Cleric Variant": "cleric",
    "Conjurer Variant": "wizard",
    "Divine Bard": "bard",
    "Diviner Variant": "wizard",
    "Druid Variant": "druid",
    "Druidic Avenger": "druid",
    "Domain Wizard": "wizard",
    "Enchanter Variant": "wizard",
    "Evoker Variant": "wizard",
    "Fighter Variant": "fighter",
    "Illusionist Variant": "wizard",
    "Monk Variant": "monk",
    "Monk Variant: Fighting Styles": "monk",
    "Necromancer Variant": "wizard",
    "Paladin Variant": "paladin",
    "Paladin of Freedom": "paladin",
    "Paladin of Slaughter": "paladin",
    "Paladin of Tyranny": "paladin",
    "Planar Ranger": "ranger",
    "Ranger Variant": "ranger",
    "Rogue Variant": "rogue",
    "Savage Bard": "bard",
    "Totem Barbarian": "barbarian",
    "Transmuter Variant": "wizard",
    "Urban Ranger": "ranger",
    "Wilderness Rogue": "rogue",
    "Wizard Variant": "wizard",
    "Warrior": "fighter",
}

_UA_SKILL_RANKS = {
    "Abjurer Variant": 2,
    "Barbarian Variant": 4,
    "Bard Variant": 6,
    "Battle Sorcerer": 2,
    "Cleric Variant": 2,
    "Conjurer Variant": 2,
    "Divine Bard": 6,
    "Diviner Variant": 2,
    "Druid Variant": 4,
    "Druidic Avenger": 4,
    "Domain Wizard": 2,
    "Enchanter Variant": 2,
    "Evoker Variant": 2,
    "Fighter Variant": 2,
    "Illusionist Variant": 2,
    "Monk Variant": 4,
    "Monk Variant: Fighting Styles": 4,
    "Necromancer Variant": 2,
    "Paladin Variant": 2,
    "Paladin of Freedom": 2,
    "Paladin of Slaughter": 2,
    "Paladin of Tyranny": 2,
    "Planar Ranger": 6,
    "Ranger Variant": 6,
    "Rogue Variant": 8,
    "Savage Bard": 6,
    "Sorcerer/Wizard Variant": 2,
    "Totem Barbarian": 4,
    "Transmuter Variant": 2,
    "Urban Ranger": 6,
    "Wilderness Rogue": 8,
    "Wizard Variant": 2,
    "Warrior": 2,
}

_UA_SKILL_OVERRIDES = {
    "Battle Sorcerer": (
        2,
        "Concentration (Con), Craft (Int), Intimidate (Cha), Knowledge (arcana) (Int), Profession (Wis), and Spellcraft (Int)",
    ),
    "Cloistered Cleric": (
        6,
        "Concentration (Con), Craft (Int), Decipher Script (Int), Diplomacy (Cha), Heal (Wis), Knowledge (all) (Int), Profession (Wis), and Spellcraft (Int)",
    ),
    "Expert": (6, "All skills"),
}


def _apply_ua_skill_metadata(book_title: str, name: str, detail: dict[str, Any]) -> dict[str, Any]:
    """Fill variant skill automation from UA's stated base-class rules."""
    if book_title.lower() != "unearthed arcana":
        return detail
    result = dict(detail)
    override = _UA_SKILL_OVERRIDES.get(name)
    ranks = override[0] if override else _UA_SKILL_RANKS.get(name)
    base = _UA_VARIANT_BASES.get(name)
    if ranks is not None and not result.get("skill_ranks"):
        result["skill_ranks"] = ranks
        result["skill_points"] = f"{ranks} + Int"
    if override and override[1] and not result.get("class_skills"):
        result["class_skills"] = override[1]
    elif base and not result.get("class_skills"):
        result["class_skills"] = _UA_BASE_SKILLS[base]
    return result


_SPELL_ABILITY_RE = re.compile(
    r"must have an? (\w+) score (?:equal to|of (?:at least )?10)",
    re.I,
)


def _extract_spell_requirement(notes_text: str) -> str:
    match = re.search(
        r"To cast .+? must have an? (\w+) score of (?:at least )?(10(?:\s*\+\s*the spell'?s level)?[^.\n]*)",
        notes_text,
        re.I | re.DOTALL,
    )
    if not match:
        match = re.search(
            r"must have an? (\w+) score of (?:at least )?(10(?:\s*\+\s*the spell'?s level)?[^.\n]*)",
            notes_text,
            re.I,
        )
    if not match:
        return ""
    ability = match.group(1)
    rest = match.group(2).strip().rstrip(".")
    return f"To cast a spell, a character must have a {ability} score equal to {rest}."


def _normalize_spell_text(text: str) -> str:
    """FG handleClassFeatureSpells matches 'score equal to', not 'score of at least' or 'score of 10'."""
    text = re.sub(
        r"must have an? (\w+) score of at least",
        r"must have a \1 score equal to",
        text,
        count=1,
        flags=re.I,
    )
    text = re.sub(
        r"must have an? (\w+) score of (10(?:\s*\+\s*the spell'?s level)?[^.\n]*)",
        r"must have a \1 score equal to \2",
        text,
        count=1,
        flags=re.I,
    )
    return re.sub(
        r"(To cast .+? must have an? \w+ score) of (10(?:\s*\+\s*the spell'?s level)?)",
        r"\1 equal to \2",
        text,
        count=1,
        flags=re.I,
    )


def _missing_spellcasting_body(feat_text: str, notes_text: str) -> str:
    if _SPELL_ABILITY_RE.search(feat_text):
        return ""
    return _extract_spell_requirement(notes_text)


def _prepare_feature_for_output(
    feat: dict[str, Any], detail: dict[str, Any]
) -> dict[str, Any]:
    """Return feat copy with FG spell-class hook name and normalized casting text."""
    prepared = dict(feat)
    notes_text = detail.get("notes_text", "")
    kind = classify_spell_feature(feat, detail)
    prepared["name"] = normalize_spell_feature_name(feat, detail)

    if kind in ("primary_caster", "prestige_advancement"):
        text = feat.get("text", "")
        html = feat.get("text_html") or ""
        extra = _missing_spellcasting_body(text, notes_text)
        if extra:
            text = f"{text}\n{extra}".strip() if text else extra
            if html and extra not in html:
                html = html + wrap_paragraph(extra)
            elif not html:
                html = wrap_paragraph(text)
        text = _normalize_spell_text(text)
        html = _normalize_spell_text(html)
        prepared["text"] = text
        prepared["text_html"] = html or wrap_paragraph(text)

    return prepared


def _prepare_feature_content(
    feat: dict[str, Any], notes_text: str
) -> tuple[str, str]:
    text = feat.get("text", "")
    html = feat.get("text_html") or ""
    name = (feat.get("name") or "").strip().lower()

    if name in ("spells", "spells per day", "alchemy") or name == "spellcasting":
        extra = _missing_spellcasting_body(text, notes_text)
        if extra:
            text = f"{text}\n{extra}".strip() if text else extra
            if html and extra not in html:
                html = html + wrap_paragraph(extra)
            elif not html:
                html = wrap_paragraph(text)
        text = _normalize_spell_text(text)
        html = _normalize_spell_text(html)

    if not html:
        html = wrap_paragraph(text)
    return normalize_class_body_html(html), text


def _description_html(detail: dict[str, Any]) -> str:
    html = detail.get("description_html") or ""
    if not html and detail.get("description_text"):
        html = wrap_paragraph(detail["description_text"])
    if detail.get("skill_points") and "Skill Points:" not in html:
        if detail.get("hit_die") and "Hit Die:" not in html:
            html += f"<p><b>Hit Die:</b> {detail['hit_die']}</p>"
        html += f"<p><b>Skill Points:</b> {detail['skill_points']}</p>"
    req_html = class_requirements_html(detail, indent=False)
    if req_html and not _has_prerequisites_heading(html):
        html += f"<p><b>Prerequisites:</b></p>{req_html}"
    return html


def _has_prerequisites_heading(html: str) -> bool:
    return (
        "<p><b>Prerequisites:</b></p>" in html
        or "<p><b>Prerequisites</b></p>" in html
        or "<p><b>Requirements</b></p>" in html
        or "<h4>Requirements</h4>" in html
    )


def _advancement_table_html(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return ""
    has_saves = any(r.get("bab") for r in rows)
    has_spellcasting = any(r.get("spellcasting") for r in rows)
    if has_saves:
        headers = ["Level", "BAB", "Fort", "Ref", "Will", "Special"]
        if has_spellcasting:
            headers.append("Spellcasting")
    else:
        headers = ["Level", "Special"]

    parts = ["<table><tr>"]
    for header in headers:
        parts.append(f"<td><b>{header}</b></td>")
    parts.append("</tr>")

    for row in rows:
        parts.append("<tr>")
        if has_saves:
            parts.extend(
                [
                    f"<td>{row.get('level', '')}</td>",
                    f"<td>{row.get('bab', '')}</td>",
                    f"<td>{row.get('fort', '')}</td>",
                    f"<td>{row.get('ref', '')}</td>",
                    f"<td>{row.get('will', '')}</td>",
                    f"<td>{row.get('special', '')}</td>",
                ]
            )
            if has_spellcasting:
                parts.append(f"<td>{row.get('spellcasting', '')}</td>")
        else:
            parts.extend(
                [
                    f"<td>{row.get('level', '')}</td>",
                    f"<td>{row.get('special', '')}</td>",
                ]
            )
        parts.append("</tr>")
    parts.append("</table>")
    return "".join(parts)


def _build_notes_html(detail: dict[str, Any]) -> str:
    parts: list[str] = []
    desc = _description_html(detail)
    if desc:
        parts.append(desc)
    if detail.get("notes_html"):
        notes = detail["notes_html"]
        if detail.get("spell_progression"):
            notes = strip_loose_table_fragments(notes)
        parts.append(normalize_class_body_html(notes))
    for table in detail.get("spell_progression") or []:
        if table.get("html"):
            title = table.get("title", "Spells")
            table_html = normalize_fg_table_html(table["html"])
            parts.append(f"<h4>{title}</h4>{table_html}")
    if detail.get("advancement"):
        advancement_html = normalize_fg_table_html(
            _advancement_table_html(detail["advancement"])
        )
    elif detail.get("advancement_html"):
        advancement_html = normalize_fg_table_html(detail["advancement_html"])
    else:
        advancement_html = ""
    if advancement_html:
        # Use <p><b>…</b></p> instead of <h4> — FG can swallow h4 into the
        # previous table cell when prerequisites/advancement are adjacent.
        parts.append(f"<p><b>Advancement</b></p>{advancement_html}")
    if not parts:
        return ""
    return normalize_all_tables_in_html("".join(parts))


def convert_classes(
    records: list[dict[str, Any]],
    book_title: str,
    report: BuildReport,
    ids: IdAllocator,
) -> ET.Element | None:
    if not records:
        return None

    section = ET.Element("class")
    category = make_category(section, book_title)

    for rec in records:
        detail = _apply_ua_skill_metadata(
            book_title, rec.get("name", ""), rec.get("detail") or {}
        )
        index = rec.get("index") or {}
        rec_id = ids.next_id("class", book_title)
        node = ET.SubElement(category, rec_id)

        typed_string(node, "name", rec.get("name"))

        is_prestige = index.get("is_prestige")
        class_type = detail.get("class_type", "")
        if is_prestige is True or class_type == "prestige":
            typed_string(node, "classtype", "prestige")
        else:
            typed_string(node, "classtype", "base")

        typed_string(node, "hitdie", detail.get("hit_die", ""))
        typed_string(node, "bab", detail.get("bab", ""))

        for tag, key in (("fort", "fort"), ("ref", "ref"), ("will", "will")):
            val = detail.get(key, "")
            if val:
                typed_string(node, tag, val)

        skills = _format_classskills(detail.get("class_skills", ""))
        if skills:
            typed_string(node, "classskills", skills)

        ranks = detail.get("skill_ranks")
        if ranks is None:
            ranks = _parse_skill_ranks(detail.get("skill_points", ""))
        if ranks is not None:
            typed_number(node, "skillranks", ranks)

        req_html = class_requirements_html(detail)
        if req_html:
            req_el = typed_formattedtext(node, "requirements", req_html)
            set_formatted_inner(req_el, prepare_formatted_html(req_html))

        for warning in validate_class_skill_automation(
            rec.get("name", ""),
            detail,
            classskills=skills,
            skill_ranks=ranks,
        ):
            report.warnings.append(warning)

        features = detail.get("class_features") or []
        prepared_features = [_prepare_feature_for_output(f, detail) for f in features]
        for code, _severity, message in validate_class_spellcasting_automation(
            rec.get("name", ""),
            detail,
            features=prepared_features,
        ):
            if code != "class_spell_variant_reference_only":
                report.warnings.append(f"classes/{rec.get('name', '?')}: {message}")

        notes_text = detail.get("notes_text", "")
        if prepared_features:
            cf_el = ET.SubElement(node, "classfeatures")
            for prepared in prepared_features:
                fid = ids.next_id("classfeature", rec.get("name", ""))
                fnode = ET.SubElement(cf_el, fid)
                typed_number(fnode, "level", prepared.get("level", 1))
                typed_string(fnode, "name", prepared.get("name", ""))
                if prepared.get("type"):
                    typed_string(fnode, "type", prepared["type"])
                html, _ = _prepare_feature_content(prepared, notes_text)
                text_el = typed_formattedtext(fnode, "text", html)
                set_formatted_inner(text_el, prepare_formatted_html(html))

        notes = _build_notes_html(detail)
        if notes:
            text_el = typed_formattedtext(node, "text", notes)
            set_formatted_inner(text_el, prepare_formatted_html(notes))
        else:
            typed_formattedtext(node, "text", detail.get("description_html", ""))

        if not features and (detail.get("class_features") is not None):
            report.warnings.append(
                f"classes: no classfeatures parsed for {rec.get('name', '?')}"
            )

        report.add_written("classes")

    return section
