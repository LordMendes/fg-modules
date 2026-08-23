"""Fixture-based tests for Realms Helps equipment parsers."""

from __future__ import annotations

from pathlib import Path

from scraper.parsers.realmshelps_equipment import parse_armor_index, parse_weapons_index

FIXTURES = Path(__file__).parent / "fixtures"


def test_weapons_index_parser() -> None:
    html = (FIXTURES / "realmshelps_weapons_index.html").read_text(encoding="utf-8")
    records = parse_weapons_index(html)
    assert len(records) == 304
    by_name = {record["name"]: record for record in records}
    assert by_name["Club"]["source"]["abbrev"] == "PH"
    assert by_name["Club"]["category"] == "simple"
    assert by_name["Fauchard"]["source"]["abbrev"] == "Dr331"
    assert by_name["Cutlass"]["source"]["abbrev"] == "FRCS"
    assert "Sto:Stormwrack" in by_name["Cutlass"]["index"]["realmshelps_sources"]
    assert by_name["Maul"]["source"]["name"] == "Complete Warrior"
    assert by_name["Maul"]["source"]["abbrev"] == "CW"


def test_armor_index_parser() -> None:
    html = (FIXTURES / "realmshelps_armor_index.html").read_text(encoding="utf-8")
    records = parse_armor_index(html)
    assert len(records) == 116
    by_name = {record["name"]: record for record in records}
    assert by_name["Chain Shirt"]["source"]["abbrev"] == "PH"
    assert by_name["Brigandine"]["source"]["abbrev"] == "AE"
    assert by_name["Cord"]["source"]["abbrev"] == "Sto"
    assert "AE:Arms and Equipment Guide" in by_name["Cord"]["index"]["realmshelps_sources"]
    assert by_name["Buckler"]["kind"] == "shield"


def test_source_mapping_helpers() -> None:
    from scraper.equipment_utils import map_realmshelps_equipment_source

    assert map_realmshelps_equipment_source("Dragon #331")["abbrev"] == "Dr331"
    assert map_realmshelps_equipment_source("Player's Handbook")["abbrev"] == "PH"
    assert map_realmshelps_equipment_source("Compete Warrior")["name"] == "Complete Warrior"
