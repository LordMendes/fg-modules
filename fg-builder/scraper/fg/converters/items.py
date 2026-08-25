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


_WEAPON_ARMOR_TYPE_RE = re.compile(
    r"(?i)(?:this\s+)?(?:\*\*)?(?:\+[\d\w]+\s+)?"
    r"(heavy|light|medium)\s+(?:steel\s+)?(shield|armor|breastplate|chain\s?shirt|"
    r"full\s?plate|scale\s?mail|splint\s?mail|banded\s?mail|half-plate|"
    r"studded\s?leather|leather|padded|hide|ring\s?mail|buckler|tower\s?shield)"
)
_WEAPON_NAME_RE = re.compile(
    r"(?i)(?:this\s+)?(?:\*\*)?(?:\+[\d\w]+\s+)?"
    r"(longsword|shortsword|greatsword|rapier|scimitar|kukri|warhammer|"
    r"mace|dagger|spear|bow|crossbow|axe|club|staff|whip|flail|morningstar)"
)


def _infer_item_type(detail: dict[str, Any], index: dict[str, Any]) -> str:
    slot = detail.get("slot") or index.get("slot_or_property") or detail.get("properties") or ""
    if slot and slot.lower() not in ("magic item", "wondrous", ""):
        return slot
    text = " ".join(
        str(detail.get(key) or "")
        for key in ("description_html", "description_text", "name")
    )
    armor = _WEAPON_ARMOR_TYPE_RE.search(text)
    if armor:
        kind = armor.group(2).lower()
        if "shield" in kind or "buckler" in kind:
            return "Shield"
        return "Armor"
    if _WEAPON_NAME_RE.search(text):
        return "Weapon"
    index_type = (index.get("type") or "").strip()
    if index_type and index_type.lower() not in ("magic item", "enhancement"):
        return index_type
    return slot or "Wondrous"


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

        typed_string(node, "type", _infer_item_type(detail, index))

        typed_formattedtext(node, "description", detail.get("description_html", ""))
        ET.SubElement(node, "effectlist")

        report.add_written("items")

    return section
