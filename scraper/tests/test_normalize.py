"""Schema merge and source parsing tests."""

from __future__ import annotations

from scraper.normalize import (
    DEFAULT_SOURCE,
    merge_source,
    normalize_records,
    parse_source_line,
)


def test_normalize_records_unifies_schema() -> None:
    records = [
        {"id": 1, "name": "A", "school": "Evocation"},
        {"id": 2, "name": "B", "casting_time": "1 action"},
    ]
    normalized = normalize_records(records)
    assert normalized[0]["casting_time"] is None
    assert normalized[1]["school"] is None
    assert normalized[0]["id"] == 1
    assert normalized[1]["name"] == "B"


def test_parse_source_line_with_page() -> None:
    source = parse_source_line("Spell Compendium (Sc), p. 7")
    assert source["name"] == "Spell Compendium"
    assert source["abbrev"] == "Sc"
    assert source["page"] == 7


def test_parse_source_line_without_page() -> None:
    source = parse_source_line("Player's Handbook (PH)")
    assert source["name"] == "Player's Handbook"
    assert source["abbrev"] == "PH"
    assert source["page"] is None


def test_merge_source_defaults() -> None:
    source = merge_source(None)
    assert source["name"] == DEFAULT_SOURCE["name"]
    assert source["edition"] == "3.5"


def test_merge_source_index_fallback() -> None:
    source = merge_source(None, index_source_abbrev="MM", index_edition="Core (3.5)")
    assert source["abbrev"] == "MM"
    assert source["edition"] == "Core (3.5)"
