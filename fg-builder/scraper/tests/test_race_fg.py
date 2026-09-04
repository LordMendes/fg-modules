"""Tests for FG race trait builder."""

from __future__ import annotations

import xml.etree.ElementTree as ET

from scraper.fg.race_fg import append_racial_traits, build_ability_effect
from scraper.fg.xml_builder import IdAllocator, write_xml


def test_build_ability_effect():
    assert build_ability_effect({"wis": 2, "cha": 2}) == "WIS: 2; CHA: 2"


def test_lesser_aasimar_racial_traits_structure(tmp_path):
    root = ET.Element("root")
    race = ET.SubElement(root, "id-00001")
    fg = {
        "ability_scores": {"wis": 2, "cha": 2},
        "identity": {
            "size": "Medium",
            "type": "Humanoid (planetouched)",
            "favored_class": "Paladin",
            "level_adjustment": "+0",
            "starting_languages": "Common and Celestial",
            "bonus_languages": "Draconic, Dwarven, Elven, Gnome, Halfling, and Sylvan",
        },
        "movement": {"land": 30},
        "senses": {"darkvision": "60 ft."},
        "traits": [
            {
                "slug": "keensenses",
                "name": "Keen Senses",
                "text": "<h>Keen Senses</h><p>+2 Listen and Spot.</p>",
                "effect": "SKILL: 2, listen; SKILL: 2, spot",
            }
        ],
    }
    append_racial_traits(race, fg, "Lesser Aasimar", IdAllocator())

    traits = race.find("racialtraits")
    assert traits is not None

    attrs = traits.find("attributes")
    assert attrs is not None
    assert attrs.find("locked").text == "1"
    assert attrs.find("name").text == "Attribute Adjustments"
    effect = attrs.find("effectlist/id-00001/text")
    assert effect is not None
    assert "WIS: 2" in effect.text

    assert traits.find("size/name").text == "Medium"
    assert traits.find("speed/name").text == "Normal Speed"
    assert traits.find("vision/name").text == "Darkvision"
    assert traits.find("favoredclass/name").text == "Favored Class: Paladin"
    assert traits.find("keensenses/effectlist/id-00001/text").text.startswith("SKILL:")

    xml_path = tmp_path / "race.xml"
    write_xml(root, xml_path)
    xml = xml_path.read_text(encoding="utf-8")
    assert "<attributes>" in xml
    assert "Attribute Adjustments" in xml
    assert "Keen Senses" in xml
