"""Tests for class skill automation validation."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from scraper.fg.builder import build_module
from scraper.fg.validators.class_skills import (
    FG_SKILL_NAMES,
    parse_classskill_names,
    validate_class_skill_automation,
)


class TestParseClassskillNames:
    def test_simple_list(self):
        text = "Bluff (Cha), Climb (Str), and Swim (Str)"
        assert parse_classskill_names(text) == ["Bluff", "Climb", "Swim"]

    def test_knowledge_specialty(self):
        text = "Knowledge (religion) (Int), Spellcraft (Int)"
        assert parse_classskill_names(text) == ["Knowledge", "Spellcraft"]

    def test_speak_language(self):
        text = "Perform (Cha), and Speak Language (None)"
        assert parse_classskill_names(text) == ["Perform", "Speak Language"]

    def test_any_ten_skipped(self):
        assert parse_classskill_names("Any 10") == []


class TestValidateClassSkillAutomation:
    def test_complete_class_no_warnings(self):
        detail = {
            "skill_ranks": 6,
            "skill_points": "6 + Int",
            "class_skills": "Bluff (Cha), and Diplomacy (Cha)",
        }
        assert validate_class_skill_automation("Evangelist", detail) == []

    def test_missing_skillranks(self):
        warnings = validate_class_skill_automation("Variant", {"class_skills": "Bluff (Cha)"})
        assert any("missing skillranks" in w for w in warnings)

    def test_notes_only_skill_points(self):
        detail = {
            "description_html": "<p><b>Skill Points:</b> 4 + Int</p>",
            "class_skills": "Bluff (Cha)",
        }
        warnings = validate_class_skill_automation("Prestige", detail)
        assert any("notes but skillranks" in w for w in warnings)

    def test_missing_classskills(self):
        detail = {"skill_ranks": 4, "skill_points": "4 + Int"}
        warnings = validate_class_skill_automation("Prestige", detail)
        assert any("missing classskills" in w for w in warnings)

    def test_unknown_skill_name(self):
        detail = {
            "skill_ranks": 4,
            "class_skills": "Bluff (Cha), Scry (Int)",
        }
        warnings = validate_class_skill_automation("Geomancer", detail)
        assert any("unknown class skill" in w and "Scry" in w for w in warnings)

    def test_zero_skillranks(self):
        detail = {"skill_ranks": 0, "class_skills": "Bluff (Cha)"}
        warnings = validate_class_skill_automation("Broken", detail)
        assert any("skillranks is 0" in w for w in warnings)


class TestBuildWarningsIntegration:
    @pytest.fixture
    def scraped_dir(self, tmp_path: Path) -> Path:
        book = {
            "title": "Skill Check Book",
            "book_slug": "skill-check--1",
            "categories": {
                "classes": [
                    {
                        "name": "Good Class",
                        "category": "classes",
                        "detail": {
                            "class_type": "prestige",
                            "skill_ranks": 4,
                            "class_skills": "Bluff (Cha), and Hide (Dex)",
                        },
                    },
                    {
                        "name": "Bad Class",
                        "category": "classes",
                        "detail": {
                            "class_type": "prestige",
                            "description_html": "<p><b>Skill Points:</b> 2 + Int</p>",
                        },
                    },
                ],
            },
        }
        d = tmp_path / "skill-check--1"
        d.mkdir()
        (d / "book.json").write_text(json.dumps(book), encoding="utf-8")
        return d

    def test_build_emits_skill_automation_warnings(
        self, scraped_dir: Path, tmp_path: Path
    ):
        report = build_module(scraped_dir, tmp_path / "out", ["classes"], "Author")
        assert report.written["classes"] == 2
        assert not any("Good Class" in w for w in report.warnings)
        assert any("Bad Class" in w and "notes but skillranks" in w for w in report.warnings)
        assert any("Bad Class" in w and "missing classskills" in w for w in report.warnings)

    def test_good_class_writes_skillranks_xml(
        self, scraped_dir: Path, tmp_path: Path
    ):
        out = tmp_path / "out"
        build_module(scraped_dir, out, ["classes"], "Author")
        text = (out / "db.xml").read_text(encoding="utf-8")
        assert '<skillranks type="number">4</skillranks>' in text
        assert "<classskills" in text
        assert "Bluff (Cha)" in text


def test_fg_skill_names_count():
    assert len(FG_SKILL_NAMES) == 36
