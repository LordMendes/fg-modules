"""Validate class records for Fantasy Grounds skill automation."""

from __future__ import annotations

import re
from typing import Any

# 3.5E ruleset skill names (DataCommon.skilldata keys).
FG_SKILL_NAMES = frozenset(
    {
        "Appraise",
        "Balance",
        "Bluff",
        "Climb",
        "Concentration",
        "Craft",
        "Decipher Script",
        "Diplomacy",
        "Disable Device",
        "Disguise",
        "Escape Artist",
        "Forgery",
        "Gather Information",
        "Handle Animal",
        "Heal",
        "Hide",
        "Intimidate",
        "Jump",
        "Knowledge",
        "Listen",
        "Move Silently",
        "Open Lock",
        "Perform",
        "Profession",
        "Ride",
        "Search",
        "Sense Motive",
        "Sleight of Hand",
        "Speak Language",
        "Spellcraft",
        "Spot",
        "Survival",
        "Swim",
        "Tumble",
        "Use Magic Device",
        "Use Rope",
    }
)

_ABILITY_SUFFIXES = frozenset({"Str", "Dex", "Con", "Int", "Wis", "Cha", "None"})
_SKILL_POINTS_IN_TEXT = re.compile(r"skill\s+points\s*:", re.I)
_SKIP_SKILL_LISTS = frozenset({"any 10", "any ten"})


def parse_classskill_names(classskills: str) -> list[str]:
    """Extract base skill names from an FG classskills string."""
    text = (classskills or "").strip()
    if not text:
        return []
    lowered = text.lower()
    if lowered in _SKIP_SKILL_LISTS:
        return []

    text = text.replace(" and ", ",")
    names: list[str] = []
    for part in (p.strip() for p in text.split(",") if p.strip()):
        entry = part
        while True:
            match = re.search(r"\((\w+)\)\s*$", entry)
            if not match or match.group(1) not in _ABILITY_SUFFIXES:
                break
            entry = entry[: match.start()].strip()
        if "(" in entry:
            entry = entry.split("(", 1)[0].strip()
        if entry:
            names.append(entry)
    return names


def _skill_points_mentioned(detail: dict[str, Any]) -> bool:
    """True when skill points appear only in prose/HTML, not in structured fields."""
    if detail.get("skill_points", "").strip():
        return False
    for key in ("description_html", "description_text", "notes_html", "notes_text"):
        if _SKILL_POINTS_IN_TEXT.search(detail.get(key) or ""):
            return True
    return False


def _resolve_skill_ranks(detail: dict[str, Any]) -> int | None:
    ranks = detail.get("skill_ranks")
    if ranks is not None:
        try:
            return int(ranks)
        except (TypeError, ValueError):
            return None
    skill_points = detail.get("skill_points", "")
    if not skill_points:
        return None
    match = re.search(r"(\d+)", skill_points)
    return int(match.group(1)) if match else None


def validate_class_skill_automation(
    class_name: str,
    detail: dict[str, Any],
    *,
    classskills: str = "",
    skill_ranks: int | None = None,
) -> list[str]:
    """Return build warnings for FG skill rank / class skill automation gaps."""
    name = class_name or detail.get("title") or "?"
    warnings: list[str] = []
    prefix = f"classes/{name}"

    ranks = skill_ranks if skill_ranks is not None else _resolve_skill_ranks(detail)
    skills = (classskills or detail.get("class_skills") or "").strip()
    mentioned = _skill_points_mentioned(detail)

    if ranks is None:
        if mentioned:
            warnings.append(
                f"{prefix}: skill points appear in notes but skillranks field "
                "will be missing (FG automation needs typed number, not text only)"
            )
        else:
            warnings.append(
                f"{prefix}: missing skillranks (no skill_ranks or skill_points parsed)"
            )
    elif ranks <= 0:
        warnings.append(f"{prefix}: skillranks is {ranks} (FG skips skill point grants when <= 0)")

    if not skills:
        warnings.append(
            f"{prefix}: missing classskills (FG will not auto-mark class skills at level 1)"
        )
    else:
        unknown = [
            skill
            for skill in parse_classskill_names(skills)
            if skill not in FG_SKILL_NAMES
        ]
        if unknown:
            joined = ", ".join(unknown)
            warnings.append(
                f"{prefix}: unknown class skill name(s) for FG ruleset: {joined}"
            )

    return warnings
