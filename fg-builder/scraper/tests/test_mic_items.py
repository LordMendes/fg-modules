"""Magic Item Compendium records use FG property and specific-item shapes."""

import json
from pathlib import Path

from scraper.dndtools_adapter import convert_item
from scraper.fg.converters.items import convert_items
from scraper.fg.loader import BuildReport
from scraper.fg.xml_builder import IdAllocator

MIC = (
    Path(__file__).resolve().parents[3]
    / "dndtools-reference"
    / "data"
    / "dndtools"
    / "supplemental"
    / "mic_items.json"
)


def _by_name() -> dict[str, dict]:
    records = json.loads(MIC.read_text(encoding="utf-8"))
    return {record["name"]: record for record in records}


def _node(record: dict):
    item = convert_item(record, "magic-item-compendium")
    section = convert_items([item], "Magic Item Compendium", BuildReport(), IdAllocator())
    node = section.find(".//id-00001")
    assert node is not None
    return item, node


def test_acidic_is_an_armor_property_without_fake_ac():
    record = _by_name()["Acidic"]
    item, node = _node(record)
    assert "2d4" in item["detail"]["description_html"]
    assert node.find("type").text == "Armor"
    assert node.find("subtype").text == "Enchantment"
    assert node.find("ac") is None
    assert node.find("aura") is not None
    assert node.find("cl").text == "6"


def test_dwarf_crusher_is_a_greatclub():
    record = _by_name()["Dwarf Crusher"]
    _item, node = _node(record)
    assert node.find("type").text == "Weapon"
    assert node.find("subtype").text == "Martial Two-Handed Melee"
    assert node.find("damage").text == "1d10"
    assert node.find("bonus").text == "1"


def test_fallen_leaves_is_a_breastplate():
    record = _by_name()["Armor of the Fallen Leaves [Relic]"]
    _item, node = _node(record)
    assert node.find("type").text == "Armor"
    assert node.find("subtype").text == "Medium"
    assert node.find("ac").text == "5"
    assert node.find("bonus").text == "1"
    assert node.find("speed30").text == "20"


def test_acrobat_boots_stay_wondrous():
    record = _by_name()["Acrobat Boots"]
    item, node = _node(record)
    assert node.find("type").text == "Wondrous"
    assert node.find("subtype").text == "Feet"
    assert "900 gp" in (node.find("cost").text or "")
    assert "Tumble" in item["detail"]["description_html"]
