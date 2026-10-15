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
    if detail.get("item_type"):
        return str(detail["item_type"])
    slot = detail.get("slot") or index.get("slot_or_property") or detail.get("properties") or ""
    if slot and slot.lower() not in ("magic item", "wondrous", "goods", ""):
        if slot.lower() == "weapon":
            return "Weapon"
        if slot.lower() == "armor":
            return "Armor"
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
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    match = re.search(r"-?\d+", str(value))
    return int(match.group()) if match else None


def _string_node(parent: ET.Element, tag: str, value: Any, *, allow_empty: bool = False) -> None:
    text = "" if value is None else str(value).strip()
    if not text and not allow_empty:
        typed_string(parent, tag, value)
        return
    if not text:
        el = ET.SubElement(parent, tag)
        el.set("type", "string")
        return
    typed_string(parent, tag, text)


def _write_malfunction(node: ET.Element, detail: dict[str, Any]) -> None:
    if _parse_number(detail.get("mr")) not in (None, 0):
        _number_node(node, "mr", detail.get("mr"))
    typed_string(node, "malfunction", detail.get("malfunction"))
    typed_string(node, "mrtable", detail.get("mrtable"))


def _number_node(parent: ET.Element, tag: str, value: Any, *, default: int | None = None) -> None:
    number = _parse_number(value)
    if number is None:
        number = default
    if number is None:
        return
    typed_number(parent, tag, number)


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

        item_type = _infer_item_type(detail, index)
        if item_type == "Shield":
            item_type = "Armor"
            detail.setdefault("subtype", "Shield")
        cost = detail.get("price") or index.get("cost") or ""
        is_weapon = item_type == "Weapon" or bool(detail.get("damage"))
        is_armor = item_type == "Armor"
        is_goods = item_type == "Goods and Services"

        typed_string(node, "name", rec.get("name"))
        if is_weapon or is_armor or is_goods:
            _string_node(node, "cost", cost or "-")
            _number_node(node, "weight", detail.get("weight"), default=0)
        else:
            typed_string(node, "aura", detail.get("aura"))
            cl = detail.get("cl")
            cl_num = _parse_number(cl)
            if cl_num is not None:
                typed_number(node, "cl", cl_num)
            else:
                typed_string(node, "cl", cl)
            typed_string(node, "cost", cost)
            weight_num = _parse_number(detail.get("weight"))
            if weight_num is not None:
                typed_number(node, "weight", weight_num)

        if is_weapon and detail.get("damage"):
            typed_string(node, "damage", detail.get("damage"))
            typed_string(node, "critical", detail.get("critical") or "x2")
            _number_node(node, "range", detail.get("range"), default=0)
            _write_malfunction(node, detail)
            typed_string(node, "damagetype", detail.get("damagetype"))
            _string_node(node, "properties", detail.get("properties"), allow_empty=True)
            typed_string(node, "type", "Weapon")
            typed_string(node, "subtype", detail.get("subtype"))
            _number_node(node, "bonus", detail.get("bonus"))
        elif is_weapon:
            # Weapon enchantments have no damage dice. Group them apart from real weapons.
            _number_node(node, "range", 0)
            _write_malfunction(node, detail)
            _string_node(node, "properties", detail.get("properties"), allow_empty=True)
            typed_string(node, "type", "Weapon")
            typed_string(node, "subtype", detail.get("subtype") or "Enchantment")
        elif is_armor:
            if "ac" not in detail:
                detail.setdefault("subtype", "Extras")
            _number_node(node, "ac", detail.get("ac"), default=0)
            _number_node(node, "maxstatbonus", detail.get("maxstatbonus"), default=0)
            _number_node(node, "checkpenalty", detail.get("checkpenalty"), default=0)
            _number_node(node, "spellfailure", detail.get("spellfailure"), default=0)
            _number_node(node, "speed30", detail.get("speed30"), default=0)
            _number_node(node, "speed20", detail.get("speed20"), default=0)
            _string_node(node, "properties", detail.get("properties"), allow_empty=True)
            typed_string(node, "type", "Armor")
            typed_string(node, "subtype", detail.get("subtype") or "Extras")
        elif is_goods:
            typed_string(node, "type", "Goods and Services")
            typed_string(node, "subtype", detail.get("subtype") or "Adventuring Gear")
            _write_malfunction(node, detail)
        else:
            typed_string(node, "type", item_type)
            typed_string(node, "subtype", detail.get("subtype"))
            _write_malfunction(node, detail)

        if (is_weapon or is_armor) and (detail.get("aura") or detail.get("cl")):
            typed_string(node, "aura", detail.get("aura"))
            cl = detail.get("cl")
            cl_num = _parse_number(cl)
            if cl_num is not None:
                typed_number(node, "cl", cl_num)
            else:
                typed_string(node, "cl", cl)

        typed_formattedtext(node, "description", detail.get("description_html", ""))
        ET.SubElement(node, "effectlist")

        report.add_written("items")

    return section
