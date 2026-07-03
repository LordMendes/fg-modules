"""Class records → FG class section with classfeatures."""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from typing import Any

from ..html_utils import (
    class_requirements_html,
    normalize_class_body_html,
    normalize_fg_table_html,
    prepare_formatted_html,
    strip_loose_table_fragments,
    wrap_paragraph,
)
from ..loader import BuildReport
from ..validators import validate_class_skill_automation
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


def _prepare_feature_content(
    feat: dict[str, Any], notes_text: str
) -> tuple[str, str]:
    text = feat.get("text", "")
    html = feat.get("text_html") or ""
    name = (feat.get("name") or "").strip().lower()

    if name in ("spells", "spells per day"):
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
    req_html = class_requirements_html(detail, indent=True)
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
    if has_saves:
        headers = ["Level", "BAB", "Fort", "Ref", "Will", "Special"]
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
        parts.append(f"<h4>Advancement</h4>{advancement_html}")
    return "".join(parts)


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
        detail = rec.get("detail") or {}
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

        notes_text = detail.get("notes_text", "")
        features = detail.get("class_features") or []
        if features:
            cf_el = ET.SubElement(node, "classfeatures")
            for feat in features:
                fid = ids.next_id("classfeature", rec.get("name", ""))
                fnode = ET.SubElement(cf_el, fid)
                typed_number(fnode, "level", feat.get("level", 1))
                typed_string(fnode, "name", feat.get("name", ""))
                if feat.get("type"):
                    typed_string(fnode, "type", feat["type"])
                html, _ = _prepare_feature_content(feat, notes_text)
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
