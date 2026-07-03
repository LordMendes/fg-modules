"""Item records → FG item section."""

from __future__ import annotations

import re
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


def _parse_number(value: Any) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return int(value)
    match = re.search(r"\d+", str(value))
    return int(match.group()) if match else None


def convert_items(
    records: list[dict[str, Any]],
    book_title: str,
    report: BuildReport,
    ids: IdAllocator,
) -> ET.Element | None:
    if not records:
        return None

    section = ET.Element("item")
    use_category = len(records) > 1
    container = make_category(section, book_title) if use_category else section

    for rec in records:
        detail = rec.get("detail") or {}
        index = rec.get("index") or {}
        rec_id = ids.next_id("item", book_title if use_category else "")
        node = ET.SubElement(container, rec_id)

        typed_string(node, "name", rec.get("name"))
        typed_string(node, "aura", detail.get("aura"))

        cl = detail.get("cl")
        cl_num = _parse_number(cl)
        if cl_num is not None:
            typed_number(node, "cl", cl_num)
        else:
            typed_string(node, "cl", cl)

        cost = detail.get("price") or index.get("cost") or ""
        typed_string(node, "cost", cost)

        weight_num = _parse_number(detail.get("weight"))
        if weight_num is not None:
            typed_number(node, "weight", weight_num)

        slot = detail.get("slot") or index.get("slot_or_property") or detail.get("properties")
        typed_string(node, "type", slot)

        typed_formattedtext(node, "description", detail.get("description_html", ""))
        ET.SubElement(node, "effectlist")

        report.add_written("items")

    return section
