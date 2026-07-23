"""Shared helpers for supplemental flaw scraping and deduplication."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REALMSHELPS_BASE = "https://realmshelps.net"
DANDWIKI_BASE = "https://www.dandwiki.com"

DANDWIKI_SOURCE: dict[str, str] = {
    "name": "D&D Wiki Homebrew",
    "abbrev": "DWW",
    "edition": "Homebrew (3.5)",
}

REALMSHELPS_SOURCE_MAP: dict[str, tuple[str, str, str]] = {
    "unearthed arcana": ("Unearthed Arcana", "UA", "Supplementals (3.5)"),
}

REALMSHELPS_SKIP_ALIASES: dict[str, str] = {
    "meager fortitude": "meagre fortitude",
    "inattentive (flaw)": "inattentive",
}


def slugify_name(name: str, suffix: str) -> str:
    text = name.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return f"{text}-{suffix}" if text else suffix


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def map_realmshelps_source(raw: str) -> dict[str, str]:
    cleaned = " ".join(raw.split()).strip()
    if not cleaned:
        return {"name": "Unknown", "abbrev": "RH", "edition": "Supplementals (3.5)"}

    dragon_match = re.match(r"Dragon\s*#(\d+)", cleaned, flags=re.I)
    if dragon_match:
        number = dragon_match.group(1)
        return {
            "name": "Dragon Magazine",
            "abbrev": f"Dr{number}",
            "edition": "Supplementals (3.5)",
        }

    mapped = REALMSHELPS_SOURCE_MAP.get(cleaned.lower())
    if mapped:
        name, abbrev, edition = mapped
        return {"name": name, "abbrev": abbrev, "edition": edition}

    words = re.findall(r"[A-Za-z0-9]+", cleaned)
    abbrev = "".join(word[0].upper() for word in words[:4]) or "RH"
    return {"name": cleaned, "abbrev": abbrev, "edition": "Supplementals (3.5)"}


def load_existing_flaw_names(feats_path: Path) -> set[str]:
    if not feats_path.exists():
        return set()
    records = json.loads(feats_path.read_text(encoding="utf-8"))
    names: set[str] = set()
    for record in records:
        record_type = record.get("type") or (record.get("index") or {}).get("type")
        if record_type != "Flaw":
            continue
        name = record.get("name")
        if isinstance(name, str):
            names.add(name.lower())
    return names


def should_skip_realmshelps(name: str, existing_flaw_names: set[str]) -> bool:
    lower = name.lower()
    if lower in existing_flaw_names:
        return True
    alias = REALMSHELPS_SKIP_ALIASES.get(lower)
    return bool(alias and alias in existing_flaw_names)


def paragraph_html(text: str | None) -> str | None:
    if not text:
        return None
    stripped = text.strip()
    if not stripped:
        return None
    if stripped.startswith("<"):
        return stripped
    return f"<p>{stripped}</p>"


def build_flaw_record(
    *,
    name: str,
    slug_suffix: str,
    source_url: str,
    source: dict[str, str],
    description: str | None = None,
    description_html: str | None = None,
    prerequisite_html: str | None = None,
    benefit_html: str | None = None,
    special_html: str | None = None,
    index_extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    desc_html = description_html or paragraph_html(description)
    desc_text = None
    if description:
        desc_text = description.strip()
    elif description_html:
        desc_text = re.sub(r"<[^>]+>", " ", description_html)
        desc_text = " ".join(desc_text.split())

    index: dict[str, Any] = {
        "type": "Flaw",
        "description_snippet": desc_text,
        "source_abbrev": source["abbrev"],
        "edition": source["edition"],
    }
    if index_extra:
        index.update(index_extra)

    record: dict[str, Any] = {
        "slug": slugify_name(name, slug_suffix),
        "name": name,
        "type": "Flaw",
        "source_url": source_url,
        "scraped_at": utc_now_iso(),
        "index": index,
        "source": {
            "name": source["name"],
            "abbrev": source["abbrev"],
            "edition": source["edition"],
            "page": None,
            "url": source_url,
        },
    }

    if desc_html:
        record["description_html"] = desc_html
    if desc_text:
        record["description_text"] = desc_text
    if prerequisite_html:
        record["prerequisite_html"] = prerequisite_html
        record["prerequisite_text"] = re.sub(r"<[^>]+>", " ", prerequisite_html).strip()
    if benefit_html:
        record["benefit_html"] = benefit_html
        record["benefit_text"] = re.sub(r"<[^>]+>", " ", benefit_html).strip()
    if special_html:
        record["special_html"] = special_html
        record["special_text"] = re.sub(r"<[^>]+>", " ", special_html).strip()

    return record
