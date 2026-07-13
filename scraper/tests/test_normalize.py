"""Schema merge and source parsing tests."""

from __future__ import annotations

from scraper.normalize import (
    DEFAULT_SOURCE,
    PLACEHOLDER_TEXT,
    clean_field_value,
    is_placeholder_text,
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


def test_clean_field_value_strips_placeholder() -> None:
    assert is_placeholder_text(PLACEHOLDER_TEXT)
    assert clean_field_value(PLACEHOLDER_TEXT) is None
    assert clean_field_value(f"<p>{PLACEHOLDER_TEXT}</p>") is None
    assert clean_field_value("Dex 13") == "Dex 13"


def test_normalize_records_strips_placeholder_fields() -> None:
    records = [
        {
            "prerequisite_text": PLACEHOLDER_TEXT,
            "benefit_text": "You gain a bonus.",
        }
    ]
    normalized = normalize_records(records)
    assert normalized[0]["prerequisite_text"] is None
    assert normalized[0]["benefit_text"] == "You gain a bonus."
