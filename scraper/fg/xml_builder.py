"""FG XML building helpers."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any

from .html_utils import prepare_formatted_html, sanitize_xml_text

FG_ROOT_ATTRS = {
    "version": "4.4",
    "dataversion": "20230911",
    "release": "17.1|CoreRPG:6",
}

# ElementTree elements cannot hold arbitrary attrs; map id(elem) -> inner HTML
_FORMATTED_INNER: dict[int, str] = {}


class IdAllocator:
    def __init__(self) -> None:
        self._counters: dict[tuple[str, str], int] = {}

    def next_id(self, section: str, category: str = "") -> str:
        key = (section, category)
        n = self._counters.get(key, 0) + 1
        self._counters[key] = n
        return f"id-{n:05d}"


def make_db_root() -> ET.Element:
    return ET.Element("root", FG_ROOT_ATTRS)


def make_definition_root() -> ET.Element:
    return ET.Element("root", FG_ROOT_ATTRS)


def typed_string(parent: ET.Element, tag: str, value: Any) -> ET.Element | None:
    if value is None:
        return None
    text = sanitize_xml_text(str(value).strip())
    if not text:
        return None
    el = ET.SubElement(parent, tag)
    el.set("type", "string")
    el.text = text
    return el


def typed_number(parent: ET.Element, tag: str, value: Any) -> ET.Element | None:
    if value is None or value == "":
        return None
    try:
        num = int(value)
    except (TypeError, ValueError):
        return None
    el = ET.SubElement(parent, tag)
    el.set("type", "number")
    el.text = str(num)
    return el


def typed_dice(parent: ET.Element, tag: str, value: Any) -> ET.Element | None:
    if value is None or value == "":
        el = ET.SubElement(parent, tag)
        el.set("type", "dice")
        return el
    if isinstance(value, list):
        if not value:
            el = ET.SubElement(parent, tag)
            el.set("type", "dice")
            return el
        if len(value) == 1:
            text = value[0]
        else:
            sides = value[0][1:] if value[0].startswith("d") else value[0]
            text = f"{len(value)}d{sides}"
    else:
        text = str(value).strip()
    if not text:
        el = ET.SubElement(parent, tag)
        el.set("type", "dice")
        return el
    el = ET.SubElement(parent, tag)
    el.set("type", "dice")
    el.text = text
    return el


def _emit_damage_or_heal_entry(
    parent: ET.Element,
    entry: dict[str, Any],
    ids: IdAllocator,
) -> None:
    entry_el = ET.SubElement(parent, ids.next_id("spell_action_entry", ""))
    typed_dice(entry_el, "dice", entry.get("dice_list"))
    typed_string(entry_el, "dicestat", entry.get("dicestat"))
    if entry.get("max_stat") is not None and entry.get("dicestat"):
        typed_number(entry_el, "dicestatmax", entry["max_stat"])
    typed_string(entry_el, "stat", entry.get("stat"))
    if entry.get("stat"):
        typed_number(entry_el, "statmult", 1)
        if entry.get("max_stat") is not None:
            typed_number(entry_el, "statmax", entry["max_stat"])
    elif entry.get("bonus") is not None:
        typed_number(entry_el, "bonus", entry["bonus"])
    typed_string(entry_el, "type", entry.get("damage_type"))


def emit_spell_actions(
    parent: ET.Element,
    actions: list[dict[str, Any]],
    ids: IdAllocator,
) -> ET.Element:
    """Append an <actions> block with typed FG spell power actions."""
    actions_el = ET.SubElement(parent, "actions")
    for order, action in enumerate(actions, start=1):
        action_el = ET.SubElement(actions_el, ids.next_id("spell_action", ""))
        typed_string(action_el, "type", action.get("type"))
        typed_number(action_el, "order", action.get("order", order))

        if action.get("type") == "cast":
            typed_string(action_el, "savetype", action.get("savetype"))
            typed_string(action_el, "onmissdamage", action.get("onmissdamage"))
            typed_string(action_el, "atktype", action.get("atktype"))
            typed_string(action_el, "savedctype", action.get("savedctype"))
            typed_number(action_el, "savedcmod", action.get("savedcmod"))
            if action.get("srnotallowed"):
                typed_number(action_el, "srnotallowed", 1)

        elif action.get("type") == "damage":
            dmg_list = ET.SubElement(action_el, "damagelist")
            for entry in action.get("entries") or []:
                _emit_damage_or_heal_entry(dmg_list, entry, ids)

        elif action.get("type") == "heal":
            heal_list = ET.SubElement(action_el, "heallist")
            for entry in action.get("entries") or []:
                _emit_damage_or_heal_entry(heal_list, entry, ids)

        elif action.get("type") == "effect":
            typed_string(action_el, "label", action.get("label"))
            if action.get("durdice_list"):
                typed_dice(action_el, "durdice", action.get("durdice_list"))
            typed_string(action_el, "durunit", action.get("durunit"))
            typed_number(action_el, "durmod", action.get("durmod"))
            typed_number(action_el, "durmult", action.get("durmult"))

    return actions_el


def typed_formattedtext(
    parent: ET.Element,
    tag: str,
    html: str,
    *,
    allow_empty: bool = False,
) -> ET.Element:
    el = ET.SubElement(parent, tag)
    el.set("type", "formattedtext")
    content = prepare_formatted_html(html) if html else ""
    if not content and allow_empty:
        content = "<p />"
    elif not content:
        content = "<p />"
    _FORMATTED_INNER[id(el)] = content
    return el


def set_formatted_inner(el: ET.Element, html: str) -> None:
    """Set inner HTML for an existing formattedtext element."""
    content = prepare_formatted_html(html) if html else "<p />"
    _FORMATTED_INNER[id(el)] = content


def make_category(parent: ET.Element, name: str) -> ET.Element:
    cat = ET.SubElement(parent, "category")
    cat.set("name", name)
    cat.set("baseicon", "0")
    cat.set("decalicon", "0")
    return cat


def components_string(flags: dict[str, bool] | None, raw: str = "") -> str:
    if raw and raw.strip():
        parts = [p.strip() for p in raw.replace(",", " ").split()]
        if parts:
            return " " + ", ".join(parts) + ","
    if not flags:
        return ""
    order = ("V", "S", "M", "AF", "DF", "XP")
    labels = {"V": "V", "S": "S", "M": "M", "AF": "AF", "DF": "DF", "XP": "XP"}
    present = [labels[k] for k in order if flags.get(k)]
    if not present:
        return ""
    return " " + ", ".join(present) + ","


def _serialize_element(elem: ET.Element, indent: int = 0) -> str:
    """Serialize with support for formattedtext inner HTML."""
    tab = "\t"
    parts: list[str] = []

    attrs = "".join(f' {k}="{v}"' for k, v in sorted(elem.attrib.items()))
    inner_html = _FORMATTED_INNER.get(id(elem))

    children = list(elem)
    if inner_html is not None:
        parts.append(f"{tab * indent}<{elem.tag}{attrs}>")
        parts.append(f"{tab * (indent + 1)}{inner_html.replace(chr(10), ' ').strip()}")
        parts.append(f"{tab * indent}</{elem.tag}>")
    elif children:
        parts.append(f"{tab * indent}<{elem.tag}{attrs}>")
        if elem.text and elem.text.strip():
            parts.append(f"{tab * (indent + 1)}{elem.text.strip()}")
        for child in children:
            parts.append(_serialize_element(child, indent + 1))
        parts.append(f"{tab * indent}</{elem.tag}>")
    else:
        text = elem.text if elem.text is not None else ""
        if text:
            parts.append(f"{tab * indent}<{elem.tag}{attrs}>{_escape_xml_text(text)}</{elem.tag}>")
        else:
            parts.append(f"{tab * indent}<{elem.tag}{attrs} />")

    return "\n".join(parts)


def _escape_xml_text(text: str) -> str:
    return sanitize_xml_text(
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def write_xml(root: ET.Element, path: str | Any, *, clear_after: bool = True) -> None:
    """Write XML with FG-style formatting."""
    from pathlib import Path

    path = Path(path)
    lines = ['<?xml version="1.0" encoding="utf-8"?>', _serialize_element(root, 0)]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    if clear_after:
        _FORMATTED_INNER.clear()


def write_definition(path: Any, title: str, author: str) -> None:
    from pathlib import Path

    root = make_definition_root()
    typed_string(root, "name", title)
    typed_string(root, "category", "Rules")
    typed_string(root, "author", author)
    typed_string(root, "ruleset", "3.5E")
    write_xml(root, Path(path) / "definition.xml", clear_after=False)
