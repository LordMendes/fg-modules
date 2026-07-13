"""Spell records → FG spell section."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any

from ..html_utils import first_sentence, prepare_spell_description_html, strip_html_to_text
from ..loader import BuildReport
from ..spell_actions import build_spell_actions
from ..xml_builder import (
    IdAllocator,
    components_string,
    emit_spell_actions,
    make_category,
    set_formatted_inner,
    typed_formattedtext,
    typed_string,
)


def convert_spells(
    records: list[dict[str, Any]],
    book_title: str,
    report: BuildReport,
    ids: IdAllocator,
    *,
    spell_actions: bool = True,
) -> ET.Element | None:
    if not records:
        return None

    section = ET.Element("spell")
    category = make_category(section, book_title)

    for rec in records:
        detail = rec.get("detail") or {}
        index = rec.get("index") or {}
        rec_id = ids.next_id("spell", book_title)
        node = ET.SubElement(category, rec_id)

        typed_string(node, "name", rec.get("name"))
        typed_string(node, "school", detail.get("school") or index.get("school"))

        level = detail.get("level", "")
        if level and not level.endswith(","):
            level = level + ","
        typed_string(node, "level", level)

        typed_string(node, "castingtime", detail.get("casting_time"))
        typed_string(node, "range", detail.get("range"))

        effect = (
            detail.get("effect")
            or detail.get("area")
            or detail.get("target")
            or ""
        )
        typed_string(node, "effect", effect)
        typed_string(node, "duration", detail.get("duration"))
        typed_string(node, "save", detail.get("saving_throw"))
        typed_string(node, "sr", detail.get("spell_resistance"))

        comp = components_string(
            detail.get("components") or index.get("components"),
            detail.get("components_raw", ""),
        )
        typed_string(node, "components", comp)

        desc_html = detail.get("description_html", "")
        desc_el = typed_formattedtext(node, "description", desc_html)
        if desc_html:
            set_formatted_inner(desc_el, prepare_spell_description_html(desc_html))

        desc_text = detail.get("description_text") or strip_html_to_text(desc_html)
        short = first_sentence(desc_text)
        if short:
            typed_string(node, "shortdescription", short)

        if spell_actions:
            actions = build_spell_actions({**detail, "name": rec.get("name")})
            emit_spell_actions(node, actions, ids)

        report.add_written("spells")

    return section
