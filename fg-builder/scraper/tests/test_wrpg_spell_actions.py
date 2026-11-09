"""WRPG spell automation: override shapes, saves, and the XML the emitter writes."""

from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from pathlib import Path

from scraper.fg.xml_builder import IdAllocator, emit_spell_actions
from scraper.wrpg_support import WRPG_SPELL_ACTION_OVERRIDES, spell_actions_for_wrpg

SPELLS = (
    Path(__file__).resolve().parents[3]
    / "dndtools-reference"
    / "data"
    / "dndtools"
    / "supplemental"
    / "warcraft_rpg_spells.json"
)

CAST_KEYS = {"type", "savetype", "atktype", "onmissdamage"}
ENTRY_KEYS = {"dice_list", "bonus", "damage_type", "dicestat", "stat", "max_stat"}
EFFECT_KEYS = {"type", "label", "durmod", "durunit", "durmult"}


def _records() -> dict[str, dict]:
    data = json.loads(SPELLS.read_text(encoding="utf-8"))
    return {rec["slug"]: rec for rec in data if isinstance(rec, dict)}


def _emit(actions: list[dict]) -> ET.Element:
    root = ET.Element("root")
    emit_spell_actions(root, actions, IdAllocator())
    return root


def _entries(root: ET.Element, block: str) -> list[ET.Element]:
    found = root.find(f".//{block}")
    return [] if found is None else list(found)


def _actions(root: ET.Element) -> list[ET.Element]:
    return list(root.find(".//actions"))


def _text(el: ET.Element, tag: str) -> str | None:
    child = el.find(tag)
    return None if child is None else child.text


def test_override_slugs_exist_in_source_data():
    records = _records()
    missing = [slug for slug in WRPG_SPELL_ACTION_OVERRIDES if slug not in records]
    assert missing == []


def test_override_actions_use_only_emitter_keys():
    for slug, actions in WRPG_SPELL_ACTION_OVERRIDES.items():
        for action in actions:
            kind = action["type"]
            if kind == "cast":
                assert set(action) <= CAST_KEYS, slug
            elif kind == "effect":
                assert set(action) <= EFFECT_KEYS, slug
            else:
                assert kind in {"damage", "heal"}, slug
                for entry in action["entries"]:
                    assert set(entry) <= ENTRY_KEYS, slug
                    assert "dice" not in entry and "type" not in entry, slug


def test_harmless_and_damage_always_saves_have_no_save_type():
    records = _records()
    for slug, actions in WRPG_SPELL_ACTION_OVERRIDES.items():
        cast = actions[0]
        save_text = records[slug].get("saving_throw") or ""
        if "harmless" in save_text.lower() or slug == "stormhammer-spell-wrpg":
            assert "savetype" not in cast, slug


def test_rain_of_fire_writes_impact_and_fire_dice():
    root = _emit(spell_actions_for_wrpg("fire-rain-wrpg"))
    entries = _entries(root, "damagelist")
    assert [_text(e, "dice") for e in entries] == ["3d6", "2d6"]
    assert [_text(e, "type") for e in entries] == ["impact", "fire"]


def test_death_coil_adds_one_bonus_per_level_capped_at_ten():
    root = _emit(spell_actions_for_wrpg("death-coil-wrpg"))
    (entry,) = _entries(root, "damagelist")
    assert _text(entry, "dice") == "2d8"
    assert _text(entry, "type") == "negative"
    assert _text(entry, "stat") == "cl"
    assert _text(entry, "statmult") == "1"
    assert _text(entry, "statmax") == "10"
    assert _text(entry, "dicestat") is None


def test_carrion_swarm_adds_one_die_per_level_capped_at_fifteen():
    root = _emit(spell_actions_for_wrpg("carrion-swarm-wrpg"))
    (entry,) = _entries(root, "damagelist")
    assert _text(entry, "dice") == "d6"
    assert _text(entry, "dicestat") == "cl"
    assert _text(entry, "dicestatmax") == "15"


def test_frost_armor_lasts_one_hour_per_level():
    root = _emit(spell_actions_for_wrpg("ice-armor-wrpg"))
    effect = _actions(root)[1]
    assert _text(effect, "label") == "AC: 4 armor"
    assert _text(effect, "durunit") == "hour"
    assert _text(effect, "durmult") == "1"
    assert _text(effect, "durstat") == "cl"


def test_storm_hammer_daze_is_fixed_one_round_without_caster_level_stat():
    root = _emit(spell_actions_for_wrpg("stormhammer-spell-wrpg"))
    effect = _actions(root)[2]
    assert _text(effect, "label") == "Dazed"
    assert _text(effect, "durmod") == "1"
    assert _text(effect, "durstat") is None


def test_per_level_effect_emits_caster_level_duration_stat():
    root = _emit([{"type": "effect", "label": "Slowed", "durmult": 1}])
    effect = root.find(".//actions/*")
    assert _text(effect, "durmult") == "1"
    assert _text(effect, "durstat") == "cl"


def test_fixed_effect_emits_no_caster_level_duration_stat():
    root = _emit([{"type": "effect", "label": "Dazed", "durmod": 1}])
    effect = root.find(".//actions/*")
    assert _text(effect, "durmod") == "1"
    assert _text(effect, "durstat") is None


def test_healing_totem_heals_one_flat_hit_point_per_round():
    root = _emit(spell_actions_for_wrpg("healing-totem-wrpg"))
    (entry,) = _entries(root, "heallist")
    assert _text(entry, "bonus") == "1"
    assert _text(entry, "stat") is None
