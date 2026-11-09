"""WoW core (Chapter 17) spell text and Fantasy Grounds automation for Arcanist spells."""

from __future__ import annotations

import json
import re
from pathlib import Path

from scraper.dndtools_adapter import convert_spell
from scraper.fg.spell_actions import build_spell_actions
from scraper.wow_core_spells import WOW_CORE_SPELL_ACTIONS

SPELLS = (
    Path(__file__).resolve().parents[3]
    / "dndtools-reference"
    / "data"
    / "dndtools"
    / "supplemental"
    / "wowrpg_core_spells.json"
)
BOOK = "world-of-warcraft-the-roleplaying-game"
STAT_LABEL = re.compile(r"^(Level|Components|Casting Time|Range|Target|Targets|Area|Effect|Duration|Saving Throw|Spell Resistance):", re.M)


def _records() -> list[dict]:
    return json.loads(SPELLS.read_text(encoding="utf-8"))


def _by_name(name: str) -> dict:
    return next(rec for rec in _records() if rec["name"] == name)


def _actions(name: str) -> list[dict]:
    # Mirror the emitter: explicit overrides first, generic parser otherwise.
    rec = _by_name(name)
    detail = convert_spell(rec, BOOK)["detail"]
    return detail.get("actions") or build_spell_actions({**detail, "name": rec["name"]})


def _arcanist_names() -> list[str]:
    return [
        rec["name"]
        for rec in _records()
        if any(entry["name"] == "Arcanist" for entry in rec.get("classes") or [])
    ]


def test_every_record_has_a_full_or_summary_description():
    for rec in _records():
        assert rec["description_text"], rec["name"]
        if rec["name"] != "Unseen Servant":
            assert rec["casting_time"], rec["name"]
            assert rec["range"], rec["name"]
            assert rec["duration"], rec["name"]
            assert rec["school"], rec["name"]


def test_descriptions_do_not_carry_stat_block_lines():
    for rec in _records():
        assert not STAT_LABEL.search(rec["description_text"]), rec["name"]


def test_chapter_17_page_numbers_are_printed_pages():
    assert _by_name("Acid Fog")["source"]["page"] == 275
    assert _by_name("Demon Skin")["source"]["page"] == 292


def test_variant_spells_inherit_their_parent_stats():
    greater = _by_name("Demon Skin, Greater")
    assert greater["school"] == "Conjuration (Creation)"
    assert greater["casting_time"] == "1 standard action"
    assert greater["range"] == "Personal"


def test_disrupt_undead_stops_before_the_next_spell():
    text = _by_name("Disrupt Undead")["description_text"]
    assert "Similar to augury" not in text
    assert "Divination" not in text


def test_summon_undead_vi_uses_a_plain_description():
    text = _by_name("Summon Undead VI")["description_text"]
    assert "Base Creature" not in text
    assert "6th-level list" in text


def test_every_arcanist_spell_starts_with_a_cast_action():
    for name in _arcanist_names():
        actions = _actions(name)
        assert actions[0]["type"] == "cast", name


def test_hold_person_is_a_will_save_that_paralyzes_per_caster_level():
    actions = _actions("Hold Person")
    cast = next(a for a in actions if a["type"] == "cast")
    effect = next(a for a in actions if a["type"] == "effect")
    assert cast["savetype"] == "will"
    assert "srnotallowed" not in cast  # SR: Yes, so spell resistance applies
    assert effect["label"] == "Paralyzed"
    assert effect["durmult"] == 1


def test_hold_monster_and_mass_variants_paralyze_too():
    for name in ("Hold Monster", "Hold Monster, Mass", "Hold Person, Mass"):
        effects = [a for a in _actions(name) if a["type"] == "effect"]
        assert [e["label"] for e in effects] == ["Paralyzed"], name


def test_storm_hammer_is_a_ranged_touch_with_force_damage_and_daze():
    actions = _actions("Storm Hammer")
    cast = actions[0]
    assert cast["atktype"] == "rtouch"
    assert "savetype" not in cast
    damage = next(a for a in actions if a["type"] == "damage")
    entry = damage["entries"][0]
    assert entry["dice_list"] == ["d6", "d6"]
    assert entry["damage_type"] == "force"
    effect = next(a for a in actions if a["type"] == "effect")
    assert effect == {"type": "effect", "label": "Dazed", "durmod": 1}


def test_moonglaive_is_a_ranged_attack_for_1d6_slashing():
    actions = _actions("Moonglaive")
    assert actions[0]["atktype"] == "ranged"
    damage = next(a for a in actions if a["type"] == "damage")
    assert damage["entries"][0]["dice_list"] == ["d6"]
    assert damage["entries"][0]["damage_type"] == "slashing"


def test_invisibility_variants_apply_invisible_for_their_duration():
    greater = next(a for a in _actions("Invisibility, Greater") if a["type"] == "effect")
    assert greater == {"type": "effect", "label": "Invisible", "durmult": 1}
    mass = next(a for a in _actions("Invisibility, Mass") if a["type"] == "effect")
    assert mass == {"type": "effect", "label": "Invisible", "durmult": 1, "durunit": "minute"}


def test_cast_only_spells_do_not_keep_wrong_effects():
    for name in ("Mirror Image", "Arcane Mark", "Solid Fog", "Detect Thoughts", "Geas/Quest", "Dimension Door"):
        types = {a["type"] for a in _actions(name)}
        assert types == {"cast"}, name


def test_phantasmal_killer_uses_fortitude_and_no_fail_only_damage():
    actions = _actions("Phantasmal Killer")
    assert actions[0]["savetype"] == "fortitude"
    assert [a["type"] for a in actions] == ["cast"]


def test_override_table_only_lists_core_slugs():
    records = {rec["slug"] for rec in _records()}
    assert set(WOW_CORE_SPELL_ACTIONS) <= records
