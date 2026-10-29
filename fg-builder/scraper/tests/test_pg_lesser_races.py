"""Lesser planetouched races from Player's Guide to Faerun."""

from __future__ import annotations

import json
from pathlib import Path

from scraper.dndtools_adapter import convert_race

SUPPLEMENTAL = (
    Path(__file__).resolve().parents[3]
    / "dndtools-reference"
    / "data"
    / "dndtools"
    / "supplemental"
    / "pg_lesser_planetouched.json"
)

EXPECTED = {
    "Lesser Gray Dwarf": ("Humanoid (dwarf)", "Fighter", "move silently"),
    "Lesser Drow": ("Humanoid (elf)", "Wizard (male) or Cleric (female)", "dancing lights"),
    "Lesser Deep Gnome": ("Humanoid (gnome)", "Rogue", "AC: 1, dodge"),
    "Lesser Aasimar": ("Humanoid (planetouched)", "Paladin", "RESIST: 5, acid"),
    "Lesser Tiefling": ("Humanoid (planetouched)", "Rogue", "RESIST: 5, fire"),
    "Lesser Air Genasi": ("Humanoid (planetouched)", "Fighter", "Levitate"),
    "Lesser Earth Genasi": ("Humanoid (planetouched)", "Fighter", "pass without trace"),
    "Lesser Fire Genasi": ("Humanoid (planetouched)", "Fighter", "Control Flame"),
    "Lesser Water Genasi": ("Humanoid (planetouched)", "Fighter", "Create Water"),
}


def test_pg_lesser_races_have_no_level_adjustment():
    records = json.loads(SUPPLEMENTAL.read_text(encoding="utf-8"))
    assert [rec["name"] for rec in records] == list(EXPECTED)

    for rec in records:
        converted = convert_race(rec, "players-guide-to-faerun")
        fg = converted["detail"]["fg"]
        identity = fg["identity"]
        creature_type, favored, marker = EXPECTED[rec["name"]]
        assert identity["type"] == creature_type
        assert identity["level_adjustment"] == "+0"
        assert identity["favored_class"] == favored
        assert fg["senses"]["darkvision"] == "60 ft."
        blob = json.dumps(fg)
        assert marker in blob
        if rec["name"] == "Lesser Water Genasi":
            assert fg["movement"]["swim"] == 30
        if rec["name"] == "Lesser Gray Dwarf":
            assert fg["movement"]["unencumbered"] is True
            assert fg["ability_scores"] == {"con": 2, "cha": -4}
        if rec["name"] == "Lesser Deep Gnome":
            assert fg["senses"]["low_light_vision"] is True
            assert identity["size"] == "Small"
