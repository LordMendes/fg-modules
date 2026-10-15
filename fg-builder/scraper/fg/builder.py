"""Build FG module from scraped JSON."""

from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from .converters import CONVERTERS
from .converters.spell_lists import (
    arcanist_path_spell_links,
    build_spell_lists,
    index_spell_paths,
)
from .loader import (
    ALL_CATEGORIES,
    CATEGORY_ORDER,
    BuildReport,
    LoadedBook,
    filter_records,
    load_book,
)
from .xml_builder import IdAllocator, make_db_root, write_definition, write_xml

MMM_MODULE_NAME = "WOWRPG - More Magic and Mayhem"


class EmptyModuleError(Exception):
    """Raised when a book has no records to write into a module."""


def build_module(
    scraped_dir: Path,
    output_dir: Path,
    categories: list[str],
    author: str,
    skip_no_detail: bool = True,
    *,
    spell_actions: bool = True,
    module_name: str | None = None,
) -> BuildReport:
    book = load_book(scraped_dir)
    report = BuildReport(book_title=book.title, book_slug=book.slug)
    display_name = module_name or book.title

    root = make_db_root()
    ids = IdAllocator()
    class_spell_links: dict[str, str] = {}

    for cat in CATEGORY_ORDER:
        if cat not in categories:
            continue
        records = filter_records(
            book.categories.get(cat, []),
            cat,
            skip_no_detail,
            report,
        )
        converter = CONVERTERS.get(cat)
        if not converter:
            continue
        if cat == "spells" or cat == "psionics":
            section = converter(
                records, book.title, report, ids, spell_actions=spell_actions
            )
            if section is not None:
                root.append(section)
            if cat == "spells" and section is not None:
                # Link targets must use the Fantasy Grounds module name (definition.xml).
                paths = index_spell_paths(section, display_name)
                lists_el, library_el, class_spell_links = build_spell_lists(
                    records, paths, display_name, report
                )
                if lists_el is not None:
                    root.append(lists_el)
                if library_el is not None:
                    root.append(library_el)
        else:
            section = converter(records, book.title, report, ids)
            if section is not None:
                root.append(section)

    if class_spell_links:
        _inject_class_spell_links(root, class_spell_links)

    # Core Arcanist path links point at the MMM module spell lists.
    if book.slug == "world-of-warcraft-the-roleplaying-game":
        _inject_arcanist_links(root)

    if sum(report.written.values()) == 0:
        raise EmptyModuleError(
            f"no records written for {book.title!r} ({book.slug}); module not created"
        )

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    write_definition(output_dir, display_name, author)
    write_xml(root, output_dir / "db.xml")

    report_path = output_dir / "build_report.json"
    report_path.write_text(
        json.dumps(report.to_dict(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return report


def _append_formatted_html(text_el: ET.Element, html: str) -> None:
    from .xml_builder import _FORMATTED_INNER

    if not html:
        return
    existing = _FORMATTED_INNER.get(id(text_el), "")
    if html in existing:
        return
    _FORMATTED_INNER[id(text_el)] = (existing or "") + html


def _inject_class_spell_links(root: ET.Element, links: dict[str, str]) -> None:
    """Append spell-list linklist fragments onto matching class text nodes."""
    for category in root.findall("./class/category"):
        for node in category:
            name_el = node.find("name")
            if name_el is None:
                continue
            name = (name_el.text or "").strip()
            html = links.get(name)
            if not html:
                continue
            text_el = node.find("text")
            if text_el is None:
                continue
            _append_formatted_html(text_el, html)


def _inject_arcanist_links(root: ET.Element) -> None:
    """Append Mage/Necromancer/Warlock spell list links onto Arcanist and High Elf."""
    link_html = arcanist_path_spell_links(MMM_MODULE_NAME)
    for category in root.findall("./class/category"):
        for node in category:
            name_el = node.find("name")
            if name_el is None:
                continue
            name = (name_el.text or "").strip()
            if name not in {"Arcanist", "High Elf"}:
                continue
            text_el = node.find("text")
            if text_el is None:
                continue
            _append_formatted_html(text_el, link_html)

