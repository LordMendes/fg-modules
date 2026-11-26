"""Core Rules Chapter 16 healer, path, and domain lists."""

from __future__ import annotations

import json
from pathlib import Path

from scraper.fg.converters.spell_lists import DRUID_VARIANT_LISTS, healer_spell_links

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


def test_healer_path_and_domain_lists_cover_the_class_table():
    lists = _by_class()
    assert "Cure Minor Wounds" in lists["Healer"][0]
    assert "Cure Light Wounds" in lists["Healer"][1]
    assert "Cure Light Wounds" in lists["Healing Domain"][1]
    assert "True Resurrection" in lists["Healer"][9]
    assert "Know Direction" in lists["Druid"][0]
    assert "Charm Animal" in lists["Druid"][1]
    assert "Charm Animal" in lists["Animal Domain"][1]
    assert "Roar" in lists["Druid"][1]
    assert "Roar" in lists["Shaman"][1]
    assert "Roar" in lists["Wild Domain"][1]
    assert "Shambler" in lists["Wild Domain"][9]
    assert "Detect Magic" in lists["Healer"][0]
    assert "Detect Magic" in lists["Arcanist"][0]
    for name in ("Healer", "Druid", "Priest", "Shaman"):
        assert set(lists[name]) == set(range(10))
    for name in (
        "Animal Domain",
        "Death Domain",
        "Elements Domain",
        "Healing Domain",
        "Protection Domain",
        "Spirits Domain",
        "War Domain",
        "Wild Domain",
    ):
        assert set(lists[name]) == set(range(1, 10))
    # The spell entry says Destruction 5. The summary list calls the same spell 4th.
    assert "Rain of Fire" in lists["Destruction Domain"][5]
    assert "Withering Blight" in lists["Destruction Domain"][5]
    assert 4 not in lists["Destruction Domain"]


def test_healer_class_dialog_links_paths_and_domains():
    html = healer_spell_links(module_name=CORE_MODULE)
    assert f"spelllists.healer@{CORE_MODULE}" in html
    assert f"spelllists.druid@{CORE_MODULE}" in html
    assert f"spelllists.wilddomain@{CORE_MODULE}" in html
    assert "spelllists.druid@WOWRPG - More Magic and Mayhem" in html
    assert html.count("<linklist>") == 1
    claw = healer_spell_links(
        DRUID_VARIANT_LISTS,
        module_name=CORE_MODULE,
        extra_lists=(("druid", "Druid spell list"),),
    )
    assert "Priest spell list" not in claw
    assert f"spelllists.druid@{CORE_MODULE}" in claw
