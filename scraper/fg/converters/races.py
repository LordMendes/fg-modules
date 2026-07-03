"""Race records → FG race section."""

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


def convert_races(
    records: list[dict[str, Any]],
    book_title: str,
    report: BuildReport,
    ids: IdAllocator,
) -> ET.Element | None:
    if not records:
        return None

    section = ET.Element("race")
    use_category = len(records) > 1
    container = make_category(section, book_title) if use_category else section

    for rec in records:
        detail = rec.get("detail") or {}
        rec_id = ids.next_id("race", book_title if use_category else "")
        node = ET.SubElement(container, rec_id)

        typed_string(node, "name", rec.get("name"))

        traits = detail.get("traits") or []
        raw_sections = detail.get("raw_sections") or []
        if traits or raw_sections:
            traits_el = ET.SubElement(node, "racialtraits")
            trait_sources = traits if traits else raw_sections
            for trait in trait_sources:
                tid = ids.next_id("race_trait", rec.get("name", ""))
                tnode = ET.SubElement(traits_el, tid)
                heading = trait.get("heading") or trait.get("name") or "Trait"
                typed_string(tnode, "name", heading)
                html = trait.get("html") or trait.get("text", "")
                if html and "<" not in html:
                    html = wrap_paragraph(html)
                typed_formattedtext(tnode, "text", html)

        # Main description with metadata preamble
        preamble_parts: list[str] = []
        for label, key in (
            ("Ability Adjustments", "ability_adjustments"),
            ("Size", "size"),
            ("Speed", "speed"),
        ):
            val = detail.get(key, "")
            if val:
                preamble_parts.append(f"<p><b>{label}:</b> {val}</p>")

        main_html = detail.get("description_html", "")
        combined = "".join(preamble_parts) + (main_html or "")
        if combined:
            text_el = typed_formattedtext(node, "text", combined)
            set_formatted_inner(text_el, prepare_formatted_html(combined))
        else:
            typed_formattedtext(node, "text", "")

        report.add_written("races")

    return section
