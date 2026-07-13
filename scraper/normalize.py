"""Schema merge, source normalization, and null-fill."""

from __future__ import annotations

import re
from typing import Any

SOURCE_LINE_RE = re.compile(
    r"^(.+?)\s*\(([^)]+)\)(?:,\s*p\.\s*(\d+))?\s*$"
)
SOURCE_PAGE_RE = re.compile(r",\s*p\.\s*\d+")

DEFAULT_SOURCE: dict[str, Any] = {
    "name": "Core",
    "abbrev": None,
    "edition": "3.5",
    "page": None,
    "url": None,
}

ARRAY_KEYS = frozenset(
    {
        "classes",
        "descriptors",
        "sections",
        "class_levels",
        "features",
        "skills",
        "feats",
        "special_abilities",
        "also_appears_in",
        "tables",
    }
)


def label_to_snake(label: str) -> str:
    text = label.strip().rstrip(":")
    text = text.replace("/", " ")
    text = re.sub(r"[^A-Za-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_").lower()
    return text or "field"


def parse_source_line(text: str) -> dict[str, Any]:
    cleaned = " ".join(text.split())
    match = SOURCE_LINE_RE.match(cleaned)
    if not match:
        return {
            "name": cleaned or "Core",
            "abbrev": None,
            "edition": None,
            "page": None,
            "url": None,
        }
    page = int(match.group(3)) if match.group(3) else None
    return {
        "name": match.group(1).strip(),
        "abbrev": match.group(2).strip(),
        "edition": None,
        "page": page,
        "url": None,
    }


def is_source_line(text: str) -> bool:
    if SOURCE_PAGE_RE.search(text):
        return True
    return bool(re.search(r"\([A-Za-z0-9.]+\)\s*$", text.strip()))


def merge_source(
    detail_source: dict[str, Any] | None,
    index_source_abbrev: str | None = None,
    index_edition: str | None = None,
) -> dict[str, Any]:
    source = dict(DEFAULT_SOURCE)
    if detail_source:
        source.update({k: v for k, v in detail_source.items() if v is not None})
    if index_source_abbrev and not source.get("abbrev"):
        source["abbrev"] = index_source_abbrev
    if index_edition:
        source["edition"] = index_edition
    elif source.get("edition") is None:
        source["edition"] = "3.5"
    return source


def flatten_keys(record: dict[str, Any], prefix: str = "") -> set[str]:
    keys: set[str] = set()
    for key, value in record.items():
        full_key = f"{prefix}{key}" if prefix else key
        if isinstance(value, dict):
            keys.add(full_key)
            keys.update(flatten_keys(value, f"{full_key}."))
        else:
            keys.add(full_key)
    return keys


def _default_for_key(key: str) -> Any:
    base = key.split(".")[-1]
    if base in ARRAY_KEYS:
        return []
    return None


def fill_nulls(record: dict[str, Any], all_keys: set[str]) -> dict[str, Any]:
    result = dict(record)
    for key in all_keys:
        if "." in key:
            continue
        if key not in result:
            result[key] = _default_for_key(key)
        elif result[key] is None and _default_for_key(key) == []:
            result[key] = []
    for key in sorted(k for k in all_keys if "." in k):
        parts = key.split(".")
        if len(parts) != 2:
            continue
        parent, child = parts
        if parent not in result or not isinstance(result[parent], dict):
            result[parent] = {}
        if child not in result[parent]:
            result[parent][child] = None
    return result


def normalize_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    all_keys: set[str] = set()
    for record in records:
        all_keys.update(flatten_keys(record))
    return [fill_nulls(record, all_keys) for record in records]
