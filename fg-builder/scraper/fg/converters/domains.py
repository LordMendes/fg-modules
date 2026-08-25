"""Domain records → FG reference section."""

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


def _domain_body(detail: dict[str, Any]) -> str:
    html = detail.get("description_html") or ""
    spells = detail.get("domain_spells") or []
    if spells:
        rows = []
        for entry in spells:
            level = entry.get("level", "?")
            name = entry.get("name") or entry.get("spell", "")
            rows.append(f"<li>{level}: {name}</li>")
        if rows:
            html += f"<p><b>Domain Spells</b></p><list>{''.join(rows)}</list>"
    return html


def convert_domains(
    records: list[dict[str, Any]],
    book_title: str,
    report: BuildReport,
    ids: IdAllocator,
) -> ET.Element | None:
    if not records:
        return None

    section = ET.Element("reference")
    category = make_category(section, f"{book_title} Domains")

    for rec in records:
        detail = rec.get("detail") or {}
        rec_id = ids.next_id("domain", book_title)
        node = ET.SubElement(category, rec_id)

        typed_string(node, "name", rec.get("name"))
        body = _domain_body(detail)
        if body:
            text_el = typed_formattedtext(node, "text", body)
            set_formatted_inner(text_el, prepare_formatted_html(body))

        report.add_written("domains")

    return section
