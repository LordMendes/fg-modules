"""Fixture-based parser tests (no network)."""

from __future__ import annotations

from pathlib import Path

import pytest

from scraper.classic_prerequisites import (
    apply_class_requirements_overlay,
    apply_feat_prerequisite_overlay,
    parse_classic_class_requirements,
    parse_classic_feat_prerequisite,
)
from scraper.pagination import category_index_url, parse_pagination_total
from scraper.parsers.base import (
    make_soup,
    merge_index_detail,
    parse_detail_page,
    parse_index_page,
    parse_slug_and_id,
)
from scraper.parsers.classes import parse_detail as parse_class_detail
from scraper.parsers.classic import parse_classic_class_slug, parse_classic_feat_slug

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


def test_parse_classic_feat_slug() -> None:
    slug, record_id, book = parse_classic_feat_slug(
        "/feats/eberron-campaign-setting--12/aberrant-dragonmark--2/"
    )
    assert slug == "aberrant-dragonmark-2"
    assert record_id == 2
    assert book == "eberron-campaign-setting"


def test_parse_classic_class_slug() -> None:
    slug, book_id, book = parse_classic_class_slug(
        "/classes/complete-mage--58/abjurant-champion/"
    )
    assert slug == "abjurant-champion-58"
    assert book_id == 58
    assert book == "complete-mage"


def test_category_index_urls_use_new_site() -> None:
    assert category_index_url("feats").startswith("https://new.dndtools.org/feats")
    assert "rows=50" in category_index_url("feats")
    assert category_index_url("spells").startswith("https://new.dndtools.org/spells")


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
    assert [d["name"] for d in detail["descriptors"]] == ["Acid"]
    assert "fire ants" in detail["description_text"]


def test_feats_detail_parser_new_site() -> None:
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
    # New site has placeholder prerequisites — cleaned to None.
    assert detail.get("prerequisite_html") is None
    assert detail.get("prerequisite_text") is None
    assert detail.get("benefit_text")


def test_classic_feat_prerequisite_parser() -> None:
    html = (FIXTURES / "feats_detail_classic.html").read_text(encoding="utf-8")
    fields = parse_classic_feat_prerequisite(html)
    assert fields["prerequisite_text"]
    assert "dragonmarked race" in fields["prerequisite_text"].lower()


def test_feat_prerequisite_overlay() -> None:
    new_html = (FIXTURES / "feats_detail.html").read_text(encoding="utf-8")
    classic_html = (FIXTURES / "feats_detail_classic.html").read_text(encoding="utf-8")
    detail = parse_detail_page(
        new_html,
        "https://new.dndtools.org/feats/aberrant-dragonmark-2",
        "feats",
    )
    apply_feat_prerequisite_overlay(detail, classic_html)
    assert detail["prerequisite_text"]
    assert "dragonmarked race" in detail["prerequisite_text"].lower()
    assert "dragonmark" in (detail.get("benefit_text") or "").lower()


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
    assert detail["flavor_html"]
    assert "inner radiance" in detail["flavor_text"]
    assert detail["description_html"]
    assert "Planetouched" in detail["description_text"]
    assert detail["combat_html"]
    assert "Daylight" in detail["combat_text"]
    ability_names = {a["name"] for a in detail["special_abilities"]}
    assert "Darkvision" in ability_names
    assert "Resistance to Acid" in ability_names


def test_classes_detail_parser_new_site() -> None:
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
    # Description should be class features, not requirements.
    assert detail.get("description_text")
    assert "Abjurant Armor" in detail["description_text"]
    assert "martial weapon" not in (detail.get("description_text") or "").lower()


def test_classic_class_requirements_parser() -> None:
    html = (FIXTURES / "classes_detail_classic.html").read_text(encoding="utf-8")
    fields = parse_classic_class_requirements(html)
    assert fields["requirements_text"]
    assert "+5" in (fields["min_bab_req"] or "")
    assert "combat casting" in fields["requirements_text"].lower()


def test_class_requirements_overlay() -> None:
    new_html = (FIXTURES / "classes_detail.html").read_text(encoding="utf-8")
    classic_html = (FIXTURES / "classes_detail_classic.html").read_text(encoding="utf-8")
    detail = parse_class_detail(
        new_html,
        "https://new.dndtools.org/classes/abjurant-champion-264",
    )
    apply_class_requirements_overlay(detail, classic_html)
    assert detail["requirements_text"]
    assert "combat casting" in detail["requirements_text"].lower()
    assert "+5" in (detail.get("min_bab_req") or "")
    # Primary description remains class features from new site.
    assert "Abjurant Armor" in (detail.get("description_text") or "")


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
