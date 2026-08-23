"""Fixture-based tests for Realms Helps goods parser."""

from __future__ import annotations

from pathlib import Path

from scraper.parsers.realmshelps_goods import parse_goods_index

FIXTURES = Path(__file__).parent / "fixtures"


def test_goods_prose_item_extraction() -> None:
    html = (FIXTURES / "realmshelps_goods.html").read_text(encoding="utf-8")
    items, _tables = parse_goods_index(html)
    by_name = {record["name"]: record for record in items}
    caltrops = by_name["Caltrops"]
    assert caltrops["kind"] == "gear"
    assert caltrops["source"]["abbrev"] == "PH"
    assert caltrops["description_html"]
    assert "caltrop" in caltrops["description_text"].casefold()


def test_goods_table_merge_and_reference_tables() -> None:
    html = (FIXTURES / "realmshelps_goods.html").read_text(encoding="utf-8")
    items, tables = parse_goods_index(html)
    by_name = {record["name"]: record for record in items}
    candle = by_name["Candle"]
    assert candle["description_html"]
    assert candle["index"].get("table_stats", {}).get("light") == "5 ft."
    light_tables = [table for table in tables if table["title"] == "Light Sources"]
    assert light_tables
    assert any(row[0] == "Candle" for row in light_tables[0]["rows"])


def test_goods_section_source_defaults() -> None:
    html = (FIXTURES / "realmshelps_goods.html").read_text(encoding="utf-8")
    items, _tables = parse_goods_index(html)
    by_name = {record["name"]: record for record in items}
    assert by_name["Crampons"]["source"]["abbrev"] == "Fr"
    assert by_name["Distillation Kit"]["source"]["abbrev"] == "Sa"


def test_goods_dragon_greeners_source() -> None:
    html = (FIXTURES / "realmshelps_goods.html").read_text(encoding="utf-8")
    items, _tables = parse_goods_index(html)
    by_name = {record["name"]: record for record in items}
    clothes = by_name["Camouflage Clothes"]
    assert clothes["source"]["abbrev"] == "Dr323"
    assert clothes["cost"] == "150 gp"


def test_goods_vehicle_and_siege_records() -> None:
    html = (FIXTURES / "realmshelps_goods.html").read_text(encoding="utf-8")
    items, _tables = parse_goods_index(html)
    by_name = {record["name"]: record for record in items}
    cloudskate = by_name["Cloudskate"]
    assert cloudskate["kind"] == "vehicle"
    assert cloudskate["index"].get("vehicle_stats")
    catapult = by_name["Catapult, Heavy"]
    assert catapult["kind"] == "siege"
    assert catapult["cost"] == "800 gp"
    assert catapult["index"]["table_stats"]["damage"] == "5d6"


def test_goods_buildings_table_items() -> None:
    html = (FIXTURES / "realmshelps_goods.html").read_text(encoding="utf-8")
    items, tables = parse_goods_index(html)
    by_name = {record["name"]: record for record in items}
    assert by_name["Simple House"]["kind"] == "building"
    assert by_name["Simple House"]["cost"] == "1,000 gp"
    building_tables = [table for table in tables if table["title"] == "Buildings"]
    assert building_tables
    assert building_tables[0]["source"]["abbrev"] == "DMG"


def test_goods_price_list_merge() -> None:
    html = (FIXTURES / "realmshelps_goods.html").read_text(encoding="utf-8")
    price_list_html = (FIXTURES / "realmshelps_goods_list.html").read_text(encoding="utf-8")
    items, _tables = parse_goods_index(html, price_list_html=price_list_html)
    by_name = {record["name"]: record for record in items}
    assert by_name["Caltrops"]["cost"] == "1 gp"
    assert by_name["Caltrops"]["weight"] == "2 lb."
    assert by_name["Bedroll"]["cost"] == "1 sp"
    assert by_name["Alchemist's Lab"]["cost"] == "500 gp"


def test_goods_frostfell_table_merge() -> None:
    html = (FIXTURES / "realmshelps_goods.html").read_text(encoding="utf-8")
    items, _tables = parse_goods_index(html)
    by_name = {record["name"]: record for record in items}
    assert by_name["Crampons"]["cost"] == "5 gp"
    assert by_name["Crystal Caltrops"]["cost"] == "150 gp"


def test_goods_grouped_table_rows() -> None:
    html = (FIXTURES / "realmshelps_goods.html").read_text(encoding="utf-8")
    items, _tables = parse_goods_index(html)
    by_name = {record["name"]: record for record in items}
    assert by_name["Grappling Ladder, Silk and Mithral"]["cost"] == "650 gp"
    assert by_name["Hacksaw"]["cost"] == "5 gp"
    assert by_name["Wagon Shields"]["cost"] == "75 gp"
