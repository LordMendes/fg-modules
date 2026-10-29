"""Tests for class spell-class automation validation and conversion."""

from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

from scraper.fg.builder import build_module
from scraper.fg.converters.classes import (
    _prepare_feature_for_output,
    convert_classes,
)
from scraper.fg.loader import BuildReport
from scraper.fg.xml_builder import IdAllocator
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


class TestAdvancementProgression:
    def test_use_increase_updates_table_feature_text(self):
        from scraper.parsers.classes import _merge_advancement_features

        merged = _merge_advancement_features(
            [],
            [
                {"level": 1, "special": "Rage 1/day"},
                {"level": 4, "special": "Rage 2/day"},
                {"level": 11, "special": "Greater rage"},
            ],
        )
        names = [feat["name"] for feat in merged]
        assert names.count("Rage") == 1
        assert "Rage 2/day" not in names
        rage = next(feat for feat in merged if feat["name"] == "Rage")
        assert rage["level"] == 1
        assert "1/day at 1st level" in rage["text"]
        assert "2/day at 4th level" in rage["text"]
        assert any(feat["name"] == "Greater rage" and feat["level"] == 11 for feat in merged)

    def test_prose_feature_keeps_its_text_and_level(self):
        from scraper.parsers.classes import _merge_advancement_features

        prose = {
            "level": 3,
            "name": "Negative Energy Burst",
            "type": "Su",
            "text": "Once per day at 3rd level, and 2/day at 8th level.",
            "text_html": "<p>Once per day at 3rd level, and 2/day at 8th level.</p>",
        }
        learning = {
            "level": 4,
            "name": "Advanced Learning",
            "type": "Ex",
            "text": "At 4th level, and again at 8th, 12th, 16th, and 20th level.",
            "text_html": "<p>At 4th level.</p>",
        }
        merged = _merge_advancement_features(
            [prose, learning],
            [
                {"level": 3, "special": "Negative energy burst 1/day"},
                {"level": 4, "special": "Advanced learning, mental bastion +2"},
                {"level": 8, "special": "Advanced learning, negative energy burst 2/day"},
                {"level": 20, "special": "Advanced learning"},
            ],
        )
        names = [feat["name"] for feat in merged]
        assert names.count("Negative Energy Burst") == 1
        assert not any("1/day" in name or "2/day" in name for name in names)
        burst = next(feat for feat in merged if feat["name"] == "Negative Energy Burst")
        assert burst["level"] == 3
        assert burst["text"].startswith("Once per day")
        learned = next(feat for feat in merged if feat["name"] == "Advanced Learning")
        assert learned["level"] == 4
        bastion = next(feat for feat in merged if feat["name"] == "Mental Bastion")
        assert bastion["level"] == 4
        assert "2/day" not in bastion["text"]

    def test_base_class_progressions_fold_into_one_feature(self):
        from scraper.parsers.classes import _merge_advancement_features

        features = [
            {"level": 1, "name": "Bonus Feats", "text": "At 1st level.", "text_html": "<p>At 1st level.</p>"},
            {"level": 1, "name": "Sneak Attack", "text": "1d6, plus 1d6 every two levels.", "text_html": "<p>1d6.</p>"},
            {"level": 1, "name": "Favored Enemy", "text": "At 1st level.", "text_html": "<p>At 1st level.</p>"},
            {"level": 2, "name": "Uncanny Dodge", "text": "Cannot be flanked.", "text_html": "<p>Cannot be flanked.</p>"},
            {"level": 4, "name": "Ki Strike", "text": "Magic, then lawful, then adamantine.", "text_html": "<p>Magic.</p>"},
            {"level": 4, "name": "Slow Fall", "text": "20 feet, later any distance.", "text_html": "<p>20 feet.</p>"},
            {"level": 5, "name": "Wild Shape", "text": "1/day, then more.", "text_html": "<p>1/day.</p>"},
        ]
        merged = _merge_advancement_features(
            features,
            [
                {"level": 1, "special": "Sneak attack +1d6"},
                {"level": 1, "special": "1st favored enemy"},
                {"level": 2, "special": "Bonus feat"},
                {"level": 3, "special": "Sneak attack +2d6, trap sense +1"},
                {"level": 4, "special": "Ki strike (magic), slow fall 20 ft."},
                {"level": 5, "special": "2nd favored enemy, wild shape (2/day)"},
                {"level": 6, "special": "Improved uncanny dodge"},
                {"level": 17, "special": "Tongue of the sun and moon, slow fall any distance"},
                {"level": 20, "special": "Bonus feat"},
            ],
        )
        names = [feat["name"] for feat in merged]
        assert names.count("Bonus Feats") == 1
        assert names.count("Sneak Attack") == 1
        assert names.count("Favored Enemy") == 1
        assert names.count("Wild Shape") == 1
        assert names.count("Ki Strike") == 1
        assert names.count("Slow Fall") == 1
        assert "Bonus feat" not in names
        assert not any("1d6" in name or "+1" in name for name in names)
        assert any(feat["name"] == "Improved uncanny dodge" for feat in merged)
        assert any(feat["name"] == "Tongue of the sun and moon" for feat in merged)
        assert next(feat for feat in merged if feat["name"] == "Bonus Feats")["level"] == 1
        trap = next(feat for feat in merged if feat["name"] == "Trap Sense")
        assert trap["level"] == 3
        assert "+1 at 3rd level" in trap["text"]

    def test_comma_inside_parentheses_stays_one_feature(self):
        from scraper.parsers.classes import _merge_advancement_features

        merged = _merge_advancement_features(
            [
                {
                    "level": 5,
                    "name": "Wild Shape",
                    "text": "Once per day, later Large and elemental.",
                    "text_html": "<p>Once per day.</p>",
                }
            ],
            [
                {"level": 5, "special": "Wild shape (1/day)"},
                {"level": 18, "special": "Wild shape (6/day, elemental 2/day)"},
            ],
        )
        assert [feat["name"] for feat in merged] == ["Wild Shape"]
        assert merged[0]["level"] == 5

    def test_plural_name_matches_singular_table_entry(self):
        from scraper.parsers.classes import _merge_advancement_features

        merged = _merge_advancement_features(
            [
                {
                    "level": 10,
                    "name": "Special Abilities",
                    "text": "On attaining 10th level, and again at 13th, 16th, and 19th.",
                    "text_html": "<p>On attaining 10th level.</p>",
                }
            ],
            [
                {"level": 10, "special": "Special ability"},
                {"level": 19, "special": "Special ability"},
            ],
        )
        assert len(merged) == 1
        assert merged[0]["name"] == "Special Abilities"
        assert merged[0]["level"] == 10


def test_class_record_stores_spell_slots_for_the_actions_tab():
    section = convert_classes(
        [
            {
                "name": "Dread Necromancer",
                "index": {},
                "detail": {
                    "hit_die": "d6",
                    "bab": "Slow",
                    "advancement": [
                        {
                            "level": 1,
                            "spells_per_day": ["3", "—", "—"],
                            "spell_levels": [1, 2, 3],
                        },
                        {
                            "level": 4,
                            "spells_per_day": ["6", "3", "—"],
                            "spell_levels": [1, 2, 3],
                        },
                    ],
                    "class_features": [],
                },
            }
        ],
        "Heroes of Horror",
        BuildReport(),
        IdAllocator(),
    )
    xml = ET.tostring(section, encoding="unicode")
    assert '<level type="number">1</level>' in xml
    assert '<slot1 type="number">3</slot1>' in xml
    assert '<slot2 type="number">0</slot2>' in xml
    level4 = xml.split('<level type="number">4</level>', 1)[1]
    assert '<slot1 type="number">6</slot1>' in level4
    assert '<slot2 type="number">3</slot2>' in level4


def test_dread_necromancer_spell_columns_are_a_second_table():
    from scraper.fg.converters.classes import _build_notes_html

    detail = {
        "advancement_html": "<table><tr><td>combined spell columns</td></tr></table>",
        "advancement": [
            {
                "level": 1,
                "bab": "+0",
                "fort": "+0",
                "ref": "+0",
                "will": "+2",
                "special": "Charnel touch",
                "spell_levels": [1, 2],
                "spells_per_day": ["3", "\u2014"],
            },
            {
                "level": 4,
                "bab": "+2",
                "fort": "+1",
                "ref": "+1",
                "will": "+4",
                "special": "Advanced learning",
                "spell_levels": [1, 2],
                "spells_per_day": ["6", "3"],
            },
        ],
    }
    html = _build_notes_html(detail, "Dread Necromancer")
    assert "combined spell columns" not in html
    assert html.lower().count("<table") == 2
    advancement, spells = html.split("Spells per Day", 1)
    assert "Charnel touch" in advancement
    assert "1st" not in advancement
    assert ">1st<" in spells
    assert ">2nd<" in spells
    assert ">3<" in spells
    assert ">-</td>" in spells
    assert "\u2014" not in html

    wizard = _build_notes_html(detail, "Wizard")
    assert "combined spell columns" in wizard


def test_dread_necromancer_spell_list_links_each_source_module():
    from scraper.fg.converters.spell_lists import add_dread_necromancer_spell_list

    lists_el, library_el, links = add_dread_necromancer_spell_list(
        None,
        None,
        current_paths={"bestow wound": "spell.id-00003@Heroes of Horror"},
        module_name="Heroes of Horror",
        ph_spells_json=Path("missing-players-handbook-spells.json"),
        report=BuildReport(),
        entries=[
            {"name": "Bane", "level": 1},
            {"name": "Bestow Wound", "level": 1},
            {"name": "Command Undead", "level": 2},
        ],
    )
    # Player's Handbook ids are not available in this fixture, so only the
    # spell that lives in the current module is listed.
    xml = ET.tostring(lists_el, encoding="unicode")
    assert "<dreadnecromancer>" in xml
    assert "spell.id-00003@Heroes of Horror" in xml
    assert "Bane" not in xml
    assert "Level 1" in xml
    assert "Dread Necromancer" in links
    assert 'class="reference_classspelllist"' in links["Dread Necromancer"]
    assert "spelllists.dreadnecromancer@Heroes of Horror" in links["Dread Necromancer"]
    library_xml = ET.tostring(library_el, encoding="unicode")
    assert "reference_classspelllist" in library_xml


def test_dread_necromancer_catalog_spells_resolve_to_built_modules():
    from scraper.fg.converters.spell_lists import (
        catalog_class_spell_entries,
        indexed_module_spell_paths,
    )

    root = Path(__file__).resolve().parents[2]
    ph_file = root / "scraped" / "dndtools" / "players-handbook" / "spells.json"
    hh_file = root / "scraped" / "dndtools" / "heroes-of-horror" / "spells.json"
    if not ph_file.is_file() or not hh_file.is_file():
        pytest.skip("staged spell modules are not present")

    paths = indexed_module_spell_paths(ph_file, "Player's Handbook")
    paths.update(indexed_module_spell_paths(hh_file, "Heroes of Horror"))
    entries = catalog_class_spell_entries("Dread Necromancer")
    missing = sorted({entry["name"] for entry in entries if entry["name"].lower() not in paths})
    assert not missing
    assert len(entries) >= 80
    assert paths["bane"] == "spell.id-00031@Player's Handbook"
