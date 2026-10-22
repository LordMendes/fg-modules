"""DMG class conversion: NPC tables, epic progression, and feature labels."""

from __future__ import annotations

import json
from pathlib import Path

from scraper.dndtools_adapter import convert_class
from scraper.wrpg_support import parse_advancement_html

CLASSES = (
    Path(__file__).resolve().parents[2].parent
    / "dndtools-reference"
    / "data"
    / "dndtools"
    / "classes.json"
)


def _dmg_records() -> list[dict]:
    data = json.loads(CLASSES.read_text(encoding="utf-8"))
    return [
        record
        for record in data
        if ((record.get("index") or {}).get("source_abbrev") or "") == "DMG"
    ]


def _by_name(records: list[dict]) -> dict[str, dict]:
    return {record["name"]: convert_class(record, "dungeon-masters-guide") for record in records}


def test_header_parser_reads_npc_and_ac_columns():
    npc = (
        "<table><tr><th>Level</th><th>BAB</th><th>Fort</th><th>Ref</th><th>Will</th></tr>"
        "<tr><td>1st</td><td>+0</td><td>+0</td><td>+0</td><td>+2</td></tr></table>"
    )
    row = parse_advancement_html(npc)[0]
    assert row["bab"] == "+0"
    assert row["will"] == "+2"
    assert "special" not in row

    defender = (
        "<table><tr><th>Level</th><th>BAB</th><th>Fort</th><th>Ref</th><th>Will</th>"
        "<th>AC Bonus</th><th>Special</th></tr>"
        "<tr><td>1st</td><td>+1</td><td>+2</td><td>+0</td><td>+2</td>"
        "<td>+1</td><td>Defensive stance 1/day</td></tr></table>"
    )
    parsed = parse_advancement_html(defender)[0]
    assert parsed["ac_bonus"] == "+1"
    assert parsed["special"] == "Defensive stance 1/day"
    assert "spellcasting" not in parsed


def test_dmg_class_progressions_and_features():
    converted = _by_name(_dmg_records())
    assert len(converted) == 32

    warrior = converted["Warrior"]["detail"]
    assert warrior["bab"] == "Fast"
    assert warrior["fort"] == "Good"
    assert warrior["ref"] == "Bad"
    assert warrior["will"] == "Bad"
    assert warrior["class_type"] == "base"
    assert warrior["advancement"][0]["bab"] == "+1"
    assert any(feat["name"] == "Weapon and Armor Proficiency" for feat in warrior["class_features"])

    aristocrat = converted["Aristocrat"]["detail"]
    assert aristocrat["bab"] == "Medium"
    assert aristocrat["fort"] == "Bad"
    assert aristocrat["will"] == "Good"
    assert aristocrat["advancement"][0]["bab"] == "+0"
    assert aristocrat["advancement"][0]["will"] == "+2"

    commoner = converted["Commoner"]["detail"]
    assert commoner["bab"] == "Slow"
    assert commoner["fort"] == "Bad"
    assert commoner["ref"] == "Bad"
    assert commoner["will"] == "Bad"

    expert = converted["Expert"]["detail"]
    assert expert["bab"] == "Medium"
    assert expert["will"] == "Good"
    assert "(Non)" not in expert["class_skills"]
    assert "Truespeak" not in expert["class_skills"]
    adept = converted["Adept"]["detail"]
    spells = next(feat for feat in adept["class_features"] if feat["name"] == "Spells")
    assert "score equal to" in spells["text"].lower()
    assert "20th level fighter" in converted["Epic Fighter"]["detail"]["requirements"]

    defender = converted["Dwarven Defender"]["detail"]
    assert defender["class_type"] == "prestige"
    assert defender["advancement"][0]["special"] == "Defensive stance 1/day"
    assert defender["fort"] == "Good"
    assert defender["bab"] == "Fast"
    assert "AC Bonus" in defender["advancement_html"]

    archer = converted["Arcane Archer"]["detail"]
    assert any(feat["name"].startswith("Imbue Arrow") and feat["level"] == 2 for feat in archer["class_features"])
    assert any(feat["name"].startswith("Seeker Arrow") for feat in archer["class_features"])
    assert any(feat["name"].startswith("Arrow of Death") for feat in archer["class_features"])
    assert "Race:" in archer["requirements"]

    duelist = converted["Duelist"]["detail"]
    assert duelist["class_type"] == "prestige"
    assert "Tumble 5 ranks" in duelist["requirements"]
    assert "Weapon Finesse" in duelist["requirements"]
    assert ": :" not in duelist["requirements"]
    assert any(feat["name"].startswith("Canny Defense") for feat in duelist["class_features"])

    fighter = converted["Epic Fighter"]["detail"]
    assert fighter["class_type"] == "prestige"
    assert fighter["bab"] == "Fast"
    assert fighter["fort"] == "Good"
    assert fighter["ref"] == "Bad"
    assert fighter["will"] == "Bad"
    assert fighter["advancement"][0]["level"] == 21
    assert fighter["advancement"][0]["bab"] == "+21"
    assert fighter["advancement"][-1]["bab"] == "+30"
    assert fighter["advancement"][0]["ref"] == "+7"

    paladin = converted["Epic Paladin"]["detail"]
    assert paladin["bab"] == "Fast"
    assert paladin["fort"] == "Good"
    assert paladin["ref"] == "Bad"
    assert paladin["will"] == "Good"
    assert paladin["advancement"][0]["will"] == "+12"

    wizard = converted["Epic Wizard"]["detail"]
    assert wizard["bab"] == "Slow"
    assert wizard["will"] == "Good"
    assert wizard["fort"] == "Bad"
    assert wizard["advancement"][-1]["bab"] == "+15"
    assert wizard["advancement"][0]["will"] == "+12"

    blackguard = converted["Blackguard"]["detail"]
    assert any(feat["name"].startswith("Aura of Evil") for feat in blackguard["class_features"])
    assert any(feat["name"].startswith("Empathic Link") for feat in blackguard["class_features"])
    assert any(feat["name"].startswith("Corrupt Weapon") for feat in blackguard["class_features"])
