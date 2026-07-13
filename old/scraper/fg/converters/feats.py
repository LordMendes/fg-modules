"""Feat records → FG feat section."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any

from ..html_utils import prepare_formatted_html, strip_html_to_text, wrap_paragraph
from ..loader import BuildReport
from ..xml_builder import IdAllocator, set_formatted_inner, typed_formattedtext, typed_string


def _feat_formatted(field_html: str) -> str:
    if not field_html or not field_html.strip():
        return "<p />"
    if "<" in field_html:
        return prepare_formatted_html(field_html)
    return wrap_paragraph(field_html)


def convert_feats(
    records: list[dict[str, Any]],
    book_title: str,
    report: BuildReport,
    ids: IdAllocator,
) -> ET.Element | None:
    if not records:
        return None

    section = ET.Element("feat")

    for rec in records:
        detail = rec.get("detail") or {}
        index = rec.get("index") or {}
        rec_id = ids.next_id("feat")
        node = ET.SubElement(section, rec_id)

        typed_string(node, "name", rec.get("name"))
        summary = index.get("summary") or index.get("summary_short") or ""
        typed_string(node, "summary", summary)
        typed_string(node, "type", detail.get("type", ""))

        prereq = detail.get("prerequisites", "")
        if prereq and "<" in prereq:
            prereq = strip_html_to_text(prereq)
        typed_string(node, "prerequisites", prereq)

        typed_formattedtext(node, "benefit", _feat_formatted(detail.get("benefit", "")))
        typed_formattedtext(node, "normal", _feat_formatted(detail.get("normal", "")))
        typed_formattedtext(node, "special", _feat_formatted(detail.get("special", "")))

        typed_string(node, "flavor", f"( {book_title} )")

        desc_html = detail.get("description_html", "")
        if desc_html and not detail.get("benefit"):
            # Replace last benefit element's inner content
            benefit_nodes = [c for c in node if c.tag == "benefit"]
            if benefit_nodes:
                set_formatted_inner(benefit_nodes[-1], prepare_formatted_html(desc_html))

        report.add_written("feats")

    return section
