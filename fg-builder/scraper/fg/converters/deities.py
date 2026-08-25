"""Deity records → FG reference section."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any

from ..html_utils import prepare_formatted_html
from ..loader import BuildReport
from ..xml_builder import (
    IdAllocator,
    make_category,
    set_formatted_inner,
    typed_formattedtext,
    typed_string,
)


def convert_deities(
    records: list[dict[str, Any]],
    book_title: str,
    report: BuildReport,
    ids: IdAllocator,
) -> ET.Element | None:
    if not records:
        return None

    section = ET.Element("reference")
    category = make_category(section, f"{book_title} Deities")

    for rec in records:
        detail = rec.get("detail") or {}
        rec_id = ids.next_id("deity", book_title)
        node = ET.SubElement(category, rec_id)

        typed_string(node, "name", rec.get("name"))
        if detail.get("alignment"):
            typed_string(node, "alignment", detail["alignment"])
        if detail.get("pantheon"):
            typed_string(node, "pantheon", detail["pantheon"])

        body = detail.get("description_html") or ""
        if body:
            text_el = typed_formattedtext(node, "text", body)
            set_formatted_inner(text_el, prepare_formatted_html(body))

        report.add_written("deities")

    return section
