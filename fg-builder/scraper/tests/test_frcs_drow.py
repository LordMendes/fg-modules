"""Forgotten Realms Campaign Setting drow, revised over the scraped race."""

from __future__ import annotations

import json
import xml.etree.ElementTree as ET

from scraper.dndtools_adapter import convert_race, filter_by_abbrev, load_category
from scraper.fg.race_fg import append_racial_traits
from scraper.fg.xml_builder import IdAllocator, write_xml


def _frcs_drow() -> dict:
    matches = [
        rec
        for rec in filter_by_abbrev(load_category("races"), "FRCS")
        if rec.get("name") == "Drow"
    ]
    assert len(matches) == 1
    return matches[0]


def test_frcs_drow_replaces_the_scraped_race():
    rec = _frcs_drow()
    assert rec["slug"] == "drow-68"
    assert rec["type"] == "Humanoid (elf)"
    assert rec["level_adjustment"] == "+2"
    assert "bonus penalty" not in (rec.get("description_html") or "")

    converted = convert_race(rec, "forgotten-realms-campaign-setting")
    fg = converted["detail"]["fg"]
    assert fg["ability_scores"] == {"dex": 2, "con": -2, "int": 2, "cha": 2}
    assert fg["identity"]["type"] == "Humanoid (elf)"
    assert fg["identity"]["level_adjustment"] == "+2"
    assert fg["identity"]["favored_class"] == "Wizard (male) or Cleric (female)"
    assert fg["senses"]["darkvision"] == "120 ft."
    assert not fg["senses"].get("low_light_vision")
    blob = json.dumps(fg)
    assert "SR: 11 + level" in blob
    assert "dancing lights" in blob
    assert "shortsword" in blob
    assert "SKILL: 2, listen" in blob


def test_frcs_drow_traits_include_darkvision_and_not_low_light(tmp_path):
    rec = _frcs_drow()
    fg = convert_race(rec, "forgotten-realms-campaign-setting")["detail"]["fg"]
    race = ET.Element("drow")
    append_racial_traits(race, fg, "Drow", IdAllocator())
    traits = race.find("racialtraits")
    assert traits is not None
    assert traits.find("vision/name").text == "Darkvision"
    assert traits.find("lowlight") is None
    effect = traits.find("spellresistance/effectlist")
    assert effect is not None
    assert "SR: 11 + level" in effect.find(".//text").text
    abilities = traits.find("attributes/effectlist").find(".//text").text
    assert "DEX: 2" in abilities
    assert "CON: -2" in abilities

    xml_path = tmp_path / "drow.xml"
    write_xml(race, xml_path)
    xml = xml_path.read_text(encoding="utf-8")
    assert "up to 120 ft." in xml
    assert "Low-Light Vision" not in xml
    assert "120 ft feet" not in xml
