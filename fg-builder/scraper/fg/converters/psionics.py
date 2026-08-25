"""Psionic power records → FG spell section (psionic category)."""

from __future__ import annotations

from typing import Any

import xml.etree.ElementTree as ET

from ..loader import BuildReport
from ..xml_builder import IdAllocator
from .spells import convert_spells


def convert_psionics(
    records: list[dict[str, Any]],
    book_title: str,
    report: BuildReport,
    ids: IdAllocator,
    *,
    spell_actions: bool = True,
) -> ET.Element | None:
    if not records:
        return None
    section = convert_spells(
        records,
        f"{book_title} Psionics",
        report,
        ids,
        spell_actions=spell_actions,
    )
    if section is not None:
        section.tag = "spell"
    return section
