"""Validate and recover monster Challenge Rating from stat blocks."""

from __future__ import annotations

import re
from typing import Any

# Case-sensitive: only match literal "CR", not "Cr" inside "Crocodile".
CR_IN_PARENS_RE = re.compile(r"\(\s*CR\s+([\d./]+(?:\s*[-–]\s*[\d./]+)?)\s*\)")
STAT_LINE_CR_RE = re.compile(r"(?:—|-)\s*CR\s+([\d./]+(?:\s*[-–]\s*[\d./]+)?)\s*$")
VALID_CR_RE = re.compile(
    r"^(\d+\s*/\s*\d+|\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+\s*/\s*\d+|\d+(?:\.\d+)?))?$"
)

_HTML_CR_FIELDS = (
    "combat_html",
    "flavor_html",
    "description_html",
    "combat_text",
    "flavor_text",
    "description_text",
)


def is_valid_cr(cr: str | None) -> bool:
    if not cr:
        return False
    trimmed = cr.strip()
    if not trimmed or trimmed in ("—", "-"):
        return False
    return bool(VALID_CR_RE.match(trimmed))


def extract_cr_from_text(text: str | None) -> str | None:
    if not text:
        return None
    match = CR_IN_PARENS_RE.search(text)
    if match:
        return match.group(1).strip()
    match = STAT_LINE_CR_RE.search(text.strip())
    if match:
        return match.group(1).strip()
    return None


def extract_cr_from_record(record: dict[str, Any]) -> str | None:
    for key in _HTML_CR_FIELDS:
        value = record.get(key)
        if isinstance(value, str):
            found = extract_cr_from_text(value)
            if found:
                return found
    stat_line = record.get("stat_line")
    if isinstance(stat_line, str):
        return extract_cr_from_text(stat_line)
    return None


def sanitize_monster_record(record: dict[str, Any]) -> dict[str, Any]:
    """Fix CR corrupted by case-insensitive (CR…) matching inside names like Crocodile."""
    index = record.get("index")
    index_dict = dict(index) if isinstance(index, dict) else {}

    current = record.get("challenge_rating") or index_dict.get("cr")
    current_str = current.strip() if isinstance(current, str) else None

    if not is_valid_cr(current_str):
        recovered = extract_cr_from_record(record)
        if recovered:
            record["challenge_rating"] = recovered
            index_dict["cr"] = recovered
            record["index"] = index_dict
            current_str = recovered

    if current_str and is_valid_cr(current_str):
        stat_line = record.get("stat_line")
        if isinstance(stat_line, str) and not STAT_LINE_CR_RE.search(stat_line.strip()):
            bad = re.search(r"(?:—|-)\s*CR\s+.+\s*$", stat_line)
            if bad:
                record["stat_line"] = f"{stat_line[: bad.start()]} — CR {current_str}"

    return record
