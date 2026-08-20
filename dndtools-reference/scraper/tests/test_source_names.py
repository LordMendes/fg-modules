"""Tests for canonical source name resolution."""

from __future__ import annotations

from scraper.source_names import (
    PLACEHOLDER_SOURCE_NAME,
    build_abbrev_name_map,
    match_book_name,
    parse_deity_source_lines,
    resolve_canonical_name,
)


def test_pick_canonical_name_prefers_real_title() -> None:
    records = [
        {"source": {"name": PLACEHOLDER_SOURCE_NAME, "abbrev": "CAd"}},
        {"source": {"name": "Complete Adventurer", "abbrev": "CAd"}},
    ]
    name_map = build_abbrev_name_map(records)
    assert name_map["CAd"] == "Complete Adventurer"


def test_resolve_canonical_name_replaces_core() -> None:
    name_map = {"PH": "Player's Handbook v.3.5"}
    assert (
        resolve_canonical_name(PLACEHOLDER_SOURCE_NAME, "PH", name_map)
        == "Player's Handbook v.3.5"
    )


def test_parse_deity_source_lines_matches_book_title() -> None:
    name_map = {
        "Dr": "Draconomicon",
        "FRCS": "Forgotten Realms Campaign Setting",
    }
    parsed = parse_deity_source_lines(
        ["Draconomicon , Living Greyhawk Official Listing of Deities , Dragons of Eberron"],
        name_map,
    )
    assert parsed is not None
    assert parsed["abbrev"] == "Dr"
    assert parsed["name"] == "Draconomicon"


def test_parse_deity_source_lines_uses_pantheon_fallback() -> None:
    name_map = {"FP": "Faiths & Pantheons"}
    parsed = parse_deity_source_lines([], name_map, "Faerunian")
    assert parsed is not None
    assert parsed["abbrev"] == "FP"


def test_match_book_name_fuzzy() -> None:
    name_map = {"RH": "Red Hand of Doom"}
    matched = match_book_name("Red Hand of Doom", name_map)
    assert matched == ("RH", "Red Hand of Doom")
