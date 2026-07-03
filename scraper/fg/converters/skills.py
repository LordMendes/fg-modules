"""Skill records → FG skill section."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any

from ..loader import BuildReport
from ..xml_builder import (
    IdAllocator,
    make_category,
    typed_formattedtext,
    typed_number,
    typed_string,
)


def convert_skills(
    records: list[dict[str, Any]],
    book_title: str,
    report: BuildReport,
    ids: IdAllocator,
) -> ET.Element | None:
    if not records:
        return None

    section = ET.Element("skill")
    use_category = len(records) > 1
    container = make_category(section, book_title) if use_category else section

    for rec in records:
        detail = rec.get("detail") or {}
        index = rec.get("index") or {}
        rec_id = ids.next_id("skill", book_title if use_category else "")
        node = ET.SubElement(container, rec_id)

        typed_string(node, "name", rec.get("name"))
        typed_string(node, "ability", index.get("key_ability", ""))
        typed_number(node, "trained", 1 if index.get("trained_only") else 0)
        typed_number(
            node,
            "armorcheckpenalty",
            1 if index.get("armor_check_penalty") else 0,
        )
        typed_formattedtext(node, "text", detail.get("description_html", ""))

        report.add_written("skills")

    return section
