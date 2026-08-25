"""Monster records → FG npc section."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any

from ..html_utils import prepare_formatted_html, wrap_paragraph
from ..loader import BuildReport
from ..xml_builder import (
    IdAllocator,
    make_category,
    set_formatted_inner,
    typed_formattedtext,
    typed_string,
)


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
        typed_string(node, "cr", str(detail.get("cr") or ""))
        typed_string(node, "ac", str(detail.get("ac") or ""))
        typed_string(node, "hd", str(detail.get("hd") or ""))

        hp = detail.get("hp")
        if hp not in (None, ""):
            try:
                from ..xml_builder import typed_number

                typed_number(node, "hp", int(hp))
            except (TypeError, ValueError):
                typed_string(node, "hp", str(hp))

        for tag, key in (
            ("fort", "fort"),
            ("ref", "ref"),
            ("will", "will"),
            ("atk", "attack"),
            ("fullatk", "full_attack"),
        ):
            val = detail.get(key)
            if val:
                typed_string(node, tag, str(val))

        for ability, key in (
            ("strength", "str"),
            ("dexterity", "dex"),
            ("constitution", "con"),
            ("intelligence", "int"),
            ("wisdom", "wis"),
            ("charisma", "cha"),
        ):
            val = detail.get(key)
            if val not in (None, ""):
                typed_string(node, ability, str(val))

        desc = detail.get("description_html") or ""
        if detail.get("stat_line") and detail["stat_line"] not in desc:
            desc = f"<p>{detail['stat_line']}</p>{desc}"
        if desc:
            text_el = typed_formattedtext(node, "text", desc)
            set_formatted_inner(text_el, prepare_formatted_html(desc))
        elif detail.get("stat_line"):
            text_el = typed_formattedtext(node, "text", wrap_paragraph(detail["stat_line"]))
            set_formatted_inner(text_el, prepare_formatted_html(wrap_paragraph(detail["stat_line"])))

        report.add_written("monsters")

    return section
