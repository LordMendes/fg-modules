"""Monster records → FG npc section."""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from typing import Any

from ..html_utils import prepare_formatted_html, wrap_paragraph
from ..loader import BuildReport
from ..xml_builder import (
    IdAllocator,
    make_category,
    set_formatted_inner,
    typed_formattedtext,
    typed_number,
    typed_string,
)


def _number(parent: ET.Element, tag: str, value: Any) -> None:
    if value is None or value == "":
        return
    text = str(value).strip()
    if re.fullmatch(r"[+-]?\d+", text):
        typed_number(parent, tag, int(text))
        return
    if re.fullmatch(r"\d+\s*/\s*\d+", text):
        numerator, denominator = text.split("/")
        if int(denominator) == 0:
            return
        rendered = f"{int(numerator) / int(denominator):.2f}".rstrip("0").rstrip(".")
        el = ET.SubElement(parent, tag)
        el.set("type", "number")
        el.text = rendered
        return
    if re.fullmatch(r"[+-]?\d+\.\d+", text):
        el = ET.SubElement(parent, tag)
        el.set("type", "number")
        el.text = text
        return
    typed_string(parent, tag, text)


def convert_monsters(
    records: list[dict[str, Any]],
    book_title: str,
    report: BuildReport,
    ids: IdAllocator,
) -> ET.Element | None:
    if not records:
        return None

    section = ET.Element("npc")
    category = make_category(section, book_title)

    for rec in records:
        detail = rec.get("detail") or {}
        rec_id = ids.next_id("npc", book_title)
        node = ET.SubElement(category, rec_id)

        typed_string(node, "name", rec.get("name"))
        typed_string(node, "type", detail.get("creature_type") or detail.get("type"))
        typed_string(node, "alignment", detail.get("alignment"))
        _number(node, "init", detail.get("init"))
        _number(node, "cr", detail.get("cr"))
        typed_string(node, "senses", detail.get("senses"))
        typed_string(node, "ac", str(detail.get("ac") or ""))
        typed_string(node, "hd", str(detail.get("hd") or ""))
        _number(node, "hp", detail.get("hp"))
        _number(node, "fortitudesave", detail.get("fort"))
        _number(node, "reflexsave", detail.get("ref"))
        _number(node, "willsave", detail.get("will"))
        typed_string(node, "specialqualities", detail.get("special_qualities"))
        typed_string(node, "speed", detail.get("speed"))
        typed_string(node, "atk", detail.get("attack"))
        typed_string(node, "fullatk", detail.get("full_attack"))
        typed_string(node, "spacereach", detail.get("space_reach"))
        typed_string(node, "specialattacks", detail.get("special_attacks"))
        for tag, key in (
            ("strength", "str"),
            ("dexterity", "dex"),
            ("constitution", "con"),
            ("intelligence", "int"),
            ("wisdom", "wis"),
            ("charisma", "cha"),
        ):
            _number(node, tag, detail.get(key))
        typed_string(node, "babgrp", detail.get("babgrp"))
        typed_string(node, "feats", detail.get("feats"))
        typed_string(node, "skills", detail.get("skills"))
        typed_string(node, "languages", detail.get("languages"))
        typed_string(node, "advancement", detail.get("advancement"))
        typed_string(node, "leveladjustment", detail.get("level_adjustment"))
        typed_string(node, "environment", detail.get("environment"))
        typed_string(node, "organization", detail.get("organization"))
        typed_string(node, "treasure", detail.get("treasure"))

        desc = detail.get("description_html") or ""
        if detail.get("stat_line") and detail["stat_line"] not in desc:
            desc = f"<p>{detail['stat_line']}</p>{desc}"
        if desc:
            text_el = typed_formattedtext(node, "text", desc)
            set_formatted_inner(text_el, prepare_formatted_html(desc))
        elif detail.get("stat_line"):
            text_el = typed_formattedtext(node, "text", wrap_paragraph(detail["stat_line"]))
            set_formatted_inner(text_el, prepare_formatted_html(wrap_paragraph(detail["stat_line"])))

        locked = ET.SubElement(node, "locked")
        locked.set("type", "number")
        locked.text = "1"

        report.add_written("monsters")

    return section
