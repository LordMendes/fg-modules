"""Shared helpers for Fantasy Grounds table modules."""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

FG_ROOT_ATTRS = {
    "version": "4.4",
    "dataversion": "20230911",
    "release": "17.1|CoreRPG:6",
}

MAGIC_ITEMS_MODULE = "3.5E Magic Items"
BASIC_RULES_MODULE = "3.5E Basic Rules"


def spell_to_scroll_slug(spell: str) -> str:
    """Convert spell name to 3.5E Magic Items scroll record key."""
    normalized = spell.lower()
    normalized = normalized.replace(",", "")
    normalized = re.sub(r"[^a-z0-9]+", "", normalized)
    return f"scroll{normalized}"


def item_link(record_key: str, module: str = MAGIC_ITEMS_MODULE) -> str:
    if "@" in record_key:
        return record_key
    if record_key.startswith("reference."):
        return f"{record_key}@{module}"
    return f"reference.magicitems.{record_key}@{module}"


def equipment_link(record_key: str) -> str:
    if "@" in record_key:
        return record_key
    return f"reference.equipment.{record_key}@{BASIC_RULES_MODULE}"


def table_link(table_key: str, module: str | None = None) -> str:
    ref = f"tables.{table_key}"
    return f"{ref}@{module}" if module else ref


def local_item_link(item_key: str) -> str:
    return f"item.{item_key}"


def make_root() -> ET.Element:
    return ET.Element("root", FG_ROOT_ATTRS)


def _typed(parent: ET.Element, tag: str, type_name: str, value: Any) -> ET.Element:
    el = ET.SubElement(parent, tag)
    el.set("type", type_name)
    if value is not None and value != "":
        el.text = str(value)
    return el


def typed_string(parent: ET.Element, tag: str, value: Any) -> ET.Element:
    return _typed(parent, tag, "string", value)


def typed_number(parent: ET.Element, tag: str, value: int) -> ET.Element:
    return _typed(parent, tag, "number", value)


def typed_dice(parent: ET.Element, tag: str, value: str = "") -> ET.Element:
    return _typed(parent, tag, "dice", value)


def add_resultlink(
    parent: ET.Element,
    *,
    link_class: str,
    recordname: str,
) -> None:
    link = ET.SubElement(parent, "resultlink")
    link.set("type", "windowreference")
    typed_string(link, "class", link_class)
    typed_string(link, "recordname", recordname)


def add_table_row(
    tablerows: ET.Element,
    row_id: str,
    from_range: int,
    to_range: int,
    columns: list[dict[str, Any]],
) -> None:
    row = ET.SubElement(tablerows, row_id)
    typed_number(row, "fromrange", from_range)
    typed_number(row, "torange", to_range)
    results = ET.SubElement(row, "results")
    for col_idx, col in enumerate(columns, start=1):
        result_el = ET.SubElement(results, f"id-{col_idx:05d}")
        typed_string(result_el, "result", col["result"])
        if col.get("link_class") and col.get("recordname"):
            add_resultlink(
                result_el,
                link_class=col["link_class"],
                recordname=col["recordname"],
            )
        elif col.get("empty_link"):
            add_resultlink(result_el, link_class="", recordname="")


def build_table(
    tables: ET.Element,
    key: str,
    name: str,
    rows: list[dict[str, Any]],
    *,
    dice: str = "d100",
    result_cols: int = 1,
    labels: list[str] | None = None,
    description: str = "",
) -> None:
    table = ET.SubElement(tables, key)
    typed_string(table, "name", name)
    if description:
        typed_string(table, "description", description)
    typed_dice(table, "dice", dice)
    typed_number(table, "hiderollresults", 0)
    typed_number(table, "resultscols", result_cols)
    if labels:
        for idx, label in enumerate(labels, start=1):
            typed_string(table, f"labelcol{idx}", label)
    tablerows = ET.SubElement(table, "tablerows")
    for i, row in enumerate(rows, start=1):
        add_table_row(
            tablerows,
            f"id-{i:05d}",
            row["from"],
            row["to"],
            row["columns"],
        )


def add_library_entry(
    root: ET.Element,
    *,
    lib_key: str,
    lib_name: str,
    category: str,
    display_name: str,
) -> None:
    library = root.find("library")
    if library is None:
        library = ET.SubElement(root, "library")
    node = ET.SubElement(library, lib_key)
    node.set("static", "true")
    typed_string(node, "categoryname", category)
    typed_string(node, "name", lib_name)
    entries = ET.SubElement(node, "entries")
    entry = ET.SubElement(entries, "tables")
    link = ET.SubElement(entry, "librarylink")
    link.set("type", "windowreference")
    typed_string(link, "class", "reference_list")
    typed_string(link, "recordname", "..")
    typed_string(entry, "name", display_name)
    typed_string(entry, "recordtype", "table")


def write_xml(root: ET.Element, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tree = ET.ElementTree(root)
    if hasattr(ET, "indent"):
        ET.indent(tree, space="\t")
    tree.write(
        path,
        encoding="utf-8",
        xml_declaration=True,
    )


def package_mod(folder: Path, out_path: Path) -> Path:
    import zipfile

    folder = Path(folder)
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in folder.rglob("*"):
            if file_path.is_file() and file_path.suffix != ".mod":
                zf.write(file_path, file_path.relative_to(folder).as_posix())
    return out_path
