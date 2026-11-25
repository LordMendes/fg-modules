"""Parse and format monster speed lines so every movement mode is kept."""

from __future__ import annotations

import re
from dataclasses import dataclass

MANEUVERS = ("perfect", "good", "average", "poor", "clumsy")
MODES = ("land", "fly", "swim", "climb", "burrow")

_MANEUVER = "|".join(MANEUVERS)
_MODE = r"base(?:\s+land)?(?:\s+speed)?|land|fly|swim|climb|burrow"

# A speed token is a mode word (optional), an optional maneuverability in
# parentheses, then a distance in feet. Squares notes are ignored.
_TOKEN_RE = re.compile(
    rf"""
    (?<![A-Za-z0-9])
    (?:
        (?P<mode>{_MODE})
        \s+
    )?
    (?:\(\s*(?P<maneuver_before>{_MANEUVER})\s*\)\s*)?
    (?P<feet>\d+)\s*(?:ft\.?|feet)\b
    (?:\s*\.?\s*\(\s*\d+\s+squares?\s*\))?
    (?:\s*\.?\s*\(?\s*(?P<maneuver_after>{_MANEUVER})\s*\)?)?
    """,
    re.IGNORECASE | re.VERBOSE,
)

_NOTE_JUNK_RE = re.compile(r"^(?:ft\.?|feet|squares?|\d+\s+squares?)$", re.IGNORECASE)
_WS_RE = re.compile(r"\s+")


@dataclass
class SpeedMode:
    mode: str
    feet: int
    maneuver: str | None = None
    note: str | None = None


def _clean_note(note: str) -> str:
    text = note.strip(" \t,;:.()[]")
    text = _WS_RE.sub(" ", text).strip()
    if not text or _NOTE_JUNK_RE.match(text):
        return ""
    return text


def _mode_name(raw: str | None) -> tuple[str, bool]:
    if not raw:
        return "land", False
    lowered = raw.lower()
    if lowered.startswith("base"):
        return "land", True
    if lowered in MODES:
        return lowered, False
    return "land", False


def parse_monster_speed(raw: str | None) -> list[SpeedMode]:
    """Return each distinct movement mode in the order it appears."""
    if not raw:
        return []
    text = _WS_RE.sub(" ", raw.replace("\xa0", " ")).strip()
    if not text:
        return []

    matches = list(_TOKEN_RE.finditer(text))
    parsed: list[SpeedMode] = []
    for index, match in enumerate(matches):
        mode, is_base = _mode_name(match.group("mode"))
        maneuver_raw = match.group("maneuver_before") or match.group("maneuver_after")
        maneuver = maneuver_raw.lower() if maneuver_raw else None
        end = match.end()
        next_start = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        note = _clean_note(text[end:next_start])
        if is_base:
            note = "base" if not note else f"base; {note}"
        parsed.append(
            SpeedMode(
                mode=mode,
                feet=int(match.group("feet")),
                maneuver=maneuver,
                note=note or None,
            )
        )

    return _dedupe(parsed)


def _dedupe(modes: list[SpeedMode]) -> list[SpeedMode]:
    merged: list[SpeedMode] = []
    index_by_key: dict[tuple[str, int, str | None], int] = {}
    for mode in modes:
        key = (mode.mode, mode.feet, mode.maneuver)
        existing_index = index_by_key.get(key)
        if existing_index is None:
            index_by_key[key] = len(merged)
            merged.append(mode)
            continue
        existing = merged[existing_index]
        if mode.note and (not existing.note or len(mode.note) > len(existing.note)):
            existing.note = mode.note

    land = [mode for mode in merged if mode.mode == "land"]
    if len(land) == 1 and land[0].note == "base":
        land[0].note = None
    return merged


def format_speed_mode(mode: SpeedMode) -> str:
    text = f"{mode.mode.capitalize()} {mode.feet} ft."
    extras = [part for part in (mode.maneuver, mode.note) if part]
    if extras:
        text += f" ({'; '.join(extras)})"
    return text


def format_monster_speed(raw: str | None) -> str:
    """Format every movement mode. Unparsed text is returned unchanged."""
    if not raw:
        return ""
    modes = parse_monster_speed(raw)
    if not modes:
        return _WS_RE.sub(" ", raw.replace("\xa0", " ")).strip()
    return ", ".join(format_speed_mode(mode) for mode in modes)


def speed_mode_names(raw: str | None) -> set[str]:
    return {mode.mode for mode in parse_monster_speed(raw)}


def speed_adds_modes(current: str | None, candidate: str | None) -> bool:
    """True when the candidate lists a movement mode the current string lacks."""
    if not candidate:
        return False
    return bool(speed_mode_names(candidate) - speed_mode_names(current))
