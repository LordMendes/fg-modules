"""Tests for class spell-class automation validation and conversion."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from scraper.fg.builder import build_module
from scraper.fg.converters.classes import (
    _prepare_feature_for_output,
)
from scraper.fg.validators.class_spellcasting import (
    classify_spell_feature,
    normalize_spell_feature_name,
    validate_class_spellcasting_automation,
)
from scraper.parsers.classes import parse_class_detail

FIXTURES = Path(__file__).parent / "fixtures"


def load_fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


class TestClassifySpellFeature:
    def test_spells_is_primary_caster(self):
        feat = {"name": "Spells", "text": "To cast a spell..."}
        assert classify_spell_feature(feat, {}) == "primary_caster"

    def test_spellcasting_with_progression_is_primary(self):
        feat = {"name": "Spellcasting", "text": "A warmage casts arcane spells."}
        detail = {"spell_progression": [{"title": "Spells per Day"}]}
        assert classify_spell_feature(feat, detail) == "primary_caster"

    def test_variant_spellcasting_stays_variant(self):
        feat = {
            "name": "Spellcasting",
            "text": "A bardic sage learns and casts spells as a normal bard.",
        }
        assert classify_spell_feature(feat, {}) == "variant_modifier"

    def test_prestige_advancement_name(self):
        feat = {
            "name": "+1 level of existing divine spellcasting class",
            "text": "+1 level of existing divine spellcasting class",
            "source": "advancement",
        }
        assert classify_spell_feature(feat, {}) == "prestige_advancement"

    def test_normalize_primary_to_spells(self):
        feat = {"name": "Spellcasting", "text": "To cast a spell, a beguiler..."}
        detail = {"spell_progression": [{}]}
        assert normalize_spell_feature_name(feat, detail) == "Spells"

    def test_normalize_prestige_to_spells_per_day(self):
        feat = {"name": "Spells per Day/Spells Known", "text": "At each level..."}
        assert normalize_spell_feature_name(feat, {}) == "Spells per Day"


class TestValidateClassSpellcastingAutomation:
    def test_primary_caster_missing_spells(self):
        detail = {
            "spell_progression": [{}],
            "notes_text": "To cast a spell, a warmage must have Int 10+level.",
        }
        issues = validate_class_spellcasting_automation("Warmage", detail)
        assert any(code == "class_missing_spells_feature" for code, _, _ in issues)

    def test_spells_missing_score_equal_to(self):
        detail = {}
        features = [{"level": 1, "name": "Spells", "text": "Casts arcane spells."}]
        issues = validate_class_spellcasting_automation("Warmage", detail, features=features)
        assert any(code == "class_spell_ability_text" for code, _, _ in issues)

    def test_variant_emits_info_only(self):
        detail = {"notes_text": "casts spells as a normal bard"}
        features = [
            {
                "level": 1,
                "name": "Spellcasting",
                "text": "learns and casts spells as a normal bard",
            }
        ]
        issues = validate_class_spellcasting_automation("Bardic Sage", detail, features=features)
        assert any(code == "class_spell_variant_reference_only" for code, _, _ in issues)
        assert not any(code == "class_missing_spells_feature" for code, _, _ in issues)


class TestPrepareFeatureForOutput:
    def test_injects_score_equal_to_for_spellcasting_caster(self):
        feat = {
            "level": 1,
            "name": "Spellcasting",
            "text": (
                "To cast a spell, a favored soul must have a Charisma score of "
                "10 + the spell's level."
            ),
            "text_html": "<p>Spellcasting body</p>",
        }
        detail = {
            "spell_progression": [{}],
            "notes_text": feat["text"],
        }
        prepared = _prepare_feature_for_output(feat, detail)
        assert prepared["name"] == "Spells"
        assert "score equal to" in prepared["text"]
        assert "10 + the spell's level" in prepared["text"]


class TestFavoredSoulBuild:
    def test_favored_soul_emits_fg_spells_hook(self, tmp_path: Path):
        html = load_fixture("class_favored-soul.html")
        detail = parse_class_detail(html, "http://example.com/classes/favored-soul/")
        book = {
            "title": "Complete Divine",
            "book_slug": "complete-divine--56",
            "categories": {
                "classes": [
                    {
                        "name": "Favored Soul",
                        "category": "classes",
                        "index": {"is_prestige": False},
                        "detail": detail,
                    }
                ],
            },
        }
        scraped = tmp_path / "favored-soul"
        scraped.mkdir()
        (scraped / "book.json").write_text(json.dumps(book), encoding="utf-8")
        (scraped / "classes.json").write_text(
            json.dumps(book["categories"]["classes"]), encoding="utf-8"
        )
        (scraped / "summary.json").write_text(
            json.dumps({"title": book["title"], "book_slug": book["book_slug"]}),
            encoding="utf-8",
        )

        out = tmp_path / "module"
        build_module(scraped, out, ["classes"], "Author")
        text = (out / "db.xml").read_text(encoding="utf-8")
        assert re.search(
            r'<name type="string">Spells</name>.*?score equal to',
            text,
            re.S | re.I,
        )
        assert "without preparing" in text.lower()


class TestParserPrestigeSpellcasting:
    def test_advancement_spellcasting_becomes_spells_per_day(self):
        from scraper.parsers.classes import _merge_advancement_features

        advancement = [
            {
                "level": 2,
                "special": "+1 level of existing divine spellcasting class",
            }
        ]
        merged = _merge_advancement_features([], advancement)
        assert len(merged) == 1
        assert merged[0]["name"] == "Spells per Day"
        assert merged[0]["level"] == 2
