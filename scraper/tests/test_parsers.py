"""Fixture-based parser tests (no network)."""

from __future__ import annotations

from pathlib import Path

import pytest

from scraper.pagination import parse_pagination_total
from scraper.parsers.base import (
    make_soup,
    merge_index_detail,
    parse_detail_page,
    parse_index_page,
    parse_slug_and_id,
)
from scraper.parsers.classes import parse_detail as parse_class_detail

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.mark.parametrize(
    ("href", "slug", "record_id"),
    [
        ("/spells/acid-breath-3801", "acid-breath-3801", 3801),
        ("/feats/aberrant-dragonmark-2", "aberrant-dragonmark-2", 2),
        ("/skills/alchemy", "alchemy", None),
    ],
)
def test_parse_slug_and_id(href: str, slug: str, record_id: int | None) -> None:
    parsed_slug, parsed_id = parse_slug_and_id(href)
    assert parsed_slug == slug
    assert parsed_id == record_id


def test_spells_index_parser() -> None:
    html = (FIXTURES / "spells_index.html").read_text(encoding="utf-8")
    soup = make_soup(html)
    rows = parse_index_page(soup, "spells", "https://new.dndtools.org/spells?page=1")
    assert len(rows) == 50
    first = rows[0]
    assert first["name"] == "Abate Dracorage"
    assert first["slug"] == "abate-dracorage-1094"
    assert first["id"] == 1094
    assert first["index"]["school"] == "Abjuration"
    assert first["index"]["source_abbrev"] == "DrF"
    assert first["index"]["components"]["V"] is True


def test_spells_detail_parser() -> None:
    html = (FIXTURES / "spells_detail.html").read_text(encoding="utf-8")
    detail = parse_detail_page(
        html,
        "https://new.dndtools.org/spells/acid-breath-3801",
        "spells",
    )
    assert detail["name"] == "Acid Breath"
    assert detail["school"] == "Conjuration (Creation)"
    assert detail["casting_time"] == "1 standard action"
    assert detail["source"]["name"] == "Spell Compendium"
    assert detail["source"]["abbrev"] == "Sc"
    assert detail["source"]["page"] == 7
    assert detail["classes"]
    assert detail["descriptors"] == ["Acid"]
    assert "fire ants" in detail["description_text"]


def test_feats_detail_parser() -> None:
    html = (FIXTURES / "feats_detail.html").read_text(encoding="utf-8")
    detail = parse_detail_page(
        html,
        "https://new.dndtools.org/feats/aberrant-dragonmark-2",
        "feats",
    )
    assert detail["name"] == "Aberrant Dragonmark"
    assert detail["type"] == "General"
    assert detail["source"]["abbrev"] == "ECS"
    assert detail["source"]["page"] == 47


def test_monsters_detail_parser() -> None:
    html = (FIXTURES / "monsters_detail.html").read_text(encoding="utf-8")
    detail = parse_detail_page(
        html,
        "https://new.dndtools.org/monsters/aasimar-1st-level-warrior-431",
        "monsters",
    )
    assert "Aasimar" in detail["name"]
    assert detail["hit_dice"]
    assert detail["armor_class"]
    assert detail["source"]["abbrev"] == "MM"


def test_classes_detail_parser() -> None:
    html = (FIXTURES / "classes_detail.html").read_text(encoding="utf-8")
    detail = parse_class_detail(
        html,
        "https://new.dndtools.org/classes/abjurant-champion-264",
    )
    assert detail["name"] == "Abjurant Champion"
    assert detail["hit_die"] == "d10"
    assert detail["advancement"]
    assert detail["advancement_html"]
    assert "<table" in detail["advancement_html"]
    assert detail["advancement"][0]["level"] == 1
    assert detail["class_skills"]
    assert any(skill["name"] == "Concentration" for skill in detail["class_skills"])


def test_pagination_total_from_fixture() -> None:
    html = (FIXTURES / "spells_index.html").read_text(encoding="utf-8")
    soup = make_soup(html)
    assert parse_pagination_total(soup, html) == 5035


def test_merge_index_detail() -> None:
    index_row = {
        "name": "Acid Breath",
        "url": "https://new.dndtools.org/spells/acid-breath-3801",
        "slug": "acid-breath-3801",
        "id": 3801,
        "index": {
            "source_abbrev": "Sc",
            "edition": "Supplementals (3.5)",
        },
    }
    detail = {
        "name": "Acid Breath",
        "school": "Conjuration (Creation)",
        "target": None,
        "source": {
            "name": "Spell Compendium",
            "abbrev": "Sc",
            "edition": None,
            "page": 7,
            "url": None,
        },
        "scraped_at": "2026-07-13T14:00:00Z",
    }
    merged = merge_index_detail(index_row, detail)
    assert merged["school"] == "Conjuration (Creation)"
    assert merged["source"]["page"] == 7
    assert merged["source"]["edition"] == "Supplementals (3.5)"
    assert merged["index"]["source_abbrev"] == "Sc"
