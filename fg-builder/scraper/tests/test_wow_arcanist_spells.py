"""Core Rules Chapter 16 lists must appear on the Arcanist class dialog."""

from __future__ import annotations

import json
from pathlib import Path

from scraper.fg.converters.spell_lists import arcanist_path_spell_links

SPELLS = (
    Path(__file__).resolve().parents[3]
    / "dndtools-reference"
    / "data"
    / "dndtools"
    / "supplemental"
    / "wowrpg_core_spells.json"
)

CORE_MODULE = "WOWRPG - World of Warcraft The Roleplaying Game"


def _by_class() -> dict[str, dict[int, set[str]]]:
    records = json.loads(SPELLS.read_text(encoding="utf-8"))
    grouped: dict[str, dict[int, set[str]]] = {}
    for record in records:
        for entry in record["classes"]:
            grouped.setdefault(entry["name"], {}).setdefault(entry["level"], set()).add(
                record["name"]
            )
    return grouped


def test_chapter_16_arcanist_lists_include_each_path():
    lists = _by_class()
    assert "Arcane Mark" in lists["Arcanist"][0]
    assert "Wish" in lists["Arcanist"][9]
    assert "Light" in lists["Mage"][0]
    assert "Starfall" in lists["Mage"][9]
    assert "Disrupt Undead" in lists["Necromancer"][0]
    assert "Death and Decay" in lists["Necromancer"][9]
    assert "Acid Splash" in lists["Warlock"][0]
    assert "Gate" in lists["Warlock"][9]
    assert "Summon Monster IX" in lists["Warlock"][9]
    # Every path list runs from 0 through 9.
    for name in ("Arcanist", "Mage", "Necromancer", "Warlock"):
        assert set(lists[name]) == set(range(10))


def test_arcanist_advancement_matches_the_class_tables():
    from scraper.dndtools_adapter import convert_class

    classes = json.loads(
        (
            Path(__file__).resolve().parents[3]
            / "dndtools-reference"
            / "data"
            / "dndtools"
            / "supplemental"
            / "wowrpg_core_classes.json"
        ).read_text(encoding="utf-8")
    )
    record = next(row for row in classes if row["slug"] == "arcanist-wow")
    detail = convert_class(record, "world-of-warcraft-the-roleplaying-game")["detail"]
    features = [(feat["level"], feat["name"]) for feat in detail["class_features"]]
    assert features == [
        (1, "Weapon and Armor Proficiency"),
        (1, "Spells"),
        (1, "Scribe Scroll"),
        (1, "Arcana, 1st"),
        (4, "Arcana, 4th"),
        (5, "Bonus feat"),
        (8, "Arcana, 8th"),
        (10, "Bonus feat"),
        (12, "Arcana, 12th"),
        (15, "Bonus feat"),
        (16, "Arcana, 16th"),
        (20, "Bonus feat"),
    ]
    assert "Alertness" not in {name for _, name in features}
    assert "Intellect score equal to" in detail["class_features"][1]["text"]
    by_level = {row["level"]: row["spells_per_day"] for row in detail["advancement"]}
    assert by_level[1][:2] == ["3", "1"]
    assert by_level[9][:6] == ["4", "4", "4", "3", "2", "1"]
    assert by_level[20] == ["4"] * 10


def test_arcanist_class_dialog_links_the_general_list():
    html = arcanist_path_spell_links(CORE_MODULE)
    assert f'spelllists.arcanist@{CORE_MODULE}' in html
    assert "Arcanist spell list" in html
    assert f"spelllists.mage@{CORE_MODULE}" in html
    assert "spelllists.mage@WOWRPG - More Magic and Mayhem" in html
    assert html.count("<linklist>") == 1
