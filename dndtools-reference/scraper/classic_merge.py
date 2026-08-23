"""Shared helpers for classic supplemental scrapers."""

from __future__ import annotations

import re
from typing import Any


def normalize_name(name: str) -> str:
    text = name.casefold()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def name_keys(name: str) -> set[str]:
    keys = {normalize_name(name)}
    if "," in name:
        parts = [part.strip() for part in name.split(",", 1)]
        if len(parts) == 2 and parts[0] and parts[1]:
            keys.add(normalize_name(f"{parts[1]} {parts[0]}"))
    devil_prefix = re.match(r"^devil,\s*(.+)$", name, re.I)
    if devil_prefix:
        keys.add(normalize_name(devil_prefix.group(1)))
    return keys


def build_name_index(records: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    for record in records:
        record_name = record.get("name")
        if not record_name:
            continue
        for key in name_keys(record_name):
            index.setdefault(key, record)
    return index


def merge_classic_records(
    existing: list[dict[str, Any]],
    classic_records: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], int]:
    by_name = build_name_index(existing)
    merged = list(existing)
    added = 0
    for record in classic_records:
        record_name = record.get("name")
        if not record_name:
            continue
        if any(key in by_name for key in name_keys(record_name)):
            continue
        merged.append(record)
        for key in name_keys(record_name):
            by_name[key] = record
        added += 1
    merged.sort(key=lambda r: (r.get("name") or "").casefold())
    return merged, added
