"""Build FG module from scraped JSON."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .converters import CONVERTERS
from .loader import (
    ALL_CATEGORIES,
    CATEGORY_ORDER,
    BuildReport,
    LoadedBook,
    filter_records,
    load_book,
)
from .xml_builder import IdAllocator, make_db_root, write_definition, write_xml


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
) -> BuildReport:
    book = load_book(scraped_dir)
    report = BuildReport(book_title=book.title, book_slug=book.slug)

    root = make_db_root()
    ids = IdAllocator()

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
        if cat == "spells":
            section = converter(
                records, book.title, report, ids, spell_actions=spell_actions
            )
        else:
            section = converter(records, book.title, report, ids)
        if section is not None:
            root.append(section)

    if sum(report.written.values()) == 0:
        raise EmptyModuleError(
            f"no records written for {book.title!r} ({book.slug}); module not created"
        )

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    write_definition(output_dir, book.title, author)
    write_xml(root, output_dir / "db.xml")

    report_path = output_dir / "build_report.json"
    report_path.write_text(
        json.dumps(report.to_dict(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return report
