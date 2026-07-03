"""Tests for JSON to FG module converter."""

from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

from scraper.fg.builder import EmptyModuleError, build_module
from scraper.fg.loader import load_book
from scraper.fg.packager import package_module

FIXTURES = Path(__file__).parent / "fixtures"
SCRAPED_ROOT = Path(__file__).resolve().parents[2] / "scraped"
SCRAPED_CD = SCRAPED_ROOT / "complete-divine--56"


def _scraped_complete_divine_dir() -> Path | None:
    for name in ("complete-divine--56", "complete-divine"):
        path = SCRAPED_ROOT / name
        if (path / "book.json").exists():
            return path
    return None


MINIMAL_BOOK = {
    "title": "Test Book",
    "book_slug": "test-book--1",
    "source_url": "https://example.com/rulebooks/test-book--1/index.html",
    "categories": {
        "spells": [
            {
                "name": "Test Spell",
                "source_url": "https://example.com/spells/test-spell--1/index.html",
                "book_slug": "test-book--1",
                "category": "spells",
                "index": {"school": "Evocation", "components": {"V": True, "S": True}},
                "detail": {
                    "school": "Evocation",
                    "level": "Cleric 1",
                    "casting_time": "1 standard action",
                    "range": "Close",
                    "duration": "Instantaneous",
                    "saving_throw": "Will negates",
                    "spell_resistance": "Yes",
                    "components": {"V": True, "S": True},
                    "description_html": "<p>A test spell.</p>",
                    "description_text": "A test spell.",
                },
            }
        ],
        "feats": [
            {
                "name": "Test Feat",
                "source_url": "https://example.com/feats/test-feat--1/index.html",
                "book_slug": "test-book--1",
                "category": "feats",
                "index": {"summary": "A helpful feat."},
                "detail": {
                    "type": "General",
                    "prerequisites": "BAB +1",
                    "benefit": "You gain a +1 bonus.",
                    "normal": "",
                    "special": "",
                },
            }
        ],
        "classes": [
            {
                "name": "Test Class",
                "source_url": "https://example.com/classes/test-class/index.html",
                "book_slug": "test-book--1",
                "category": "classes",
                "index": {"is_prestige": True},
                "detail": {
                    "class_type": "prestige",
                    "hit_die": "d8",
                    "bab": "Medium",
                    "fort": "Bad",
                    "ref": "Bad",
                    "will": "Good",
                    "requirements": "BAB +5",
                    "description_html": "<p>A test prestige class.</p>",
                    "skill_points": "4 + Int",
                    "skill_ranks": 4,
                    "class_skills": "Hide (Dex), Move Silently (Dex), and Tumble (Dex)",
                    "hit_die": "d8",
                    "advancement": [
                        {
                            "level": 1,
                            "bab": "+0",
                            "fort": "+0",
                            "ref": "+0",
                            "will": "+2",
                            "special": "Sneak attack",
                        },
                        {
                            "level": 2,
                            "bab": "+1",
                            "fort": "+0",
                            "ref": "+0",
                            "will": "+3",
                            "special": "Evasion",
                        },
                    ],
                    "class_features": [
                        {
                            "level": 1,
                            "name": "Sneak attack",
                            "type": "Ex",
                            "text_html": "<p>Gain sneak attack +1d6.</p>",
                            "text": "Gain sneak attack +1d6.",
                        },
                        {
                            "level": 2,
                            "name": "Evasion",
                            "type": "Ex",
                            "text_html": "<p>Gain evasion.</p>",
                            "text": "Gain evasion.",
                        },
                    ],
                },
            }
        ],
        "items": [
            {
                "name": "Test Item",
                "source_url": "https://example.com/items/test-item--1/index.html",
                "book_slug": "test-book--1",
                "category": "items",
                "index": {"cost": "100 gp"},
                "detail": {
                    "description_html": "<p>A magic item.</p>",
                    "aura": "Faint transmutation",
                    "cl": "5",
                    "price": "100 gp",
                },
            }
        ],
        "skills": [],
        "races": [],
    },
}


@pytest.fixture
def minimal_scraped(tmp_path: Path) -> Path:
    d = tmp_path / "test-book--1"
    d.mkdir()
    (d / "summary.json").write_text(
        json.dumps({"title": "Test Book", "book_slug": "test-book--1"}),
        encoding="utf-8",
    )
    (d / "book.json").write_text(
        json.dumps(MINIMAL_BOOK, ensure_ascii=False),
        encoding="utf-8",
    )
    return d


class TestMinimalBuild:
    def test_build_creates_xml(self, minimal_scraped: Path, tmp_path: Path):
        out = tmp_path / "module"
        report = build_module(
            minimal_scraped, out, list(MINIMAL_BOOK["categories"].keys()), "Test Author"
        )
        assert (out / "definition.xml").exists()
        assert (out / "db.xml").exists()
        assert (out / "build_report.json").exists()
        assert report.written["spells"] == 1
        assert report.written["feats"] == 1
        assert report.written["classes"] == 1
        assert report.written["items"] == 1

    def test_definition_ruleset(self, minimal_scraped: Path, tmp_path: Path):
        out = tmp_path / "module"
        build_module(minimal_scraped, out, ["spells"], "Author")
        root = ET.parse(out / "definition.xml").getroot()
        ruleset = root.find("ruleset")
        assert ruleset is not None
        assert ruleset.text == "3.5E"

    def test_spell_has_school(self, minimal_scraped: Path, tmp_path: Path):
        out = tmp_path / "module"
        build_module(minimal_scraped, out, ["spells"], "Author")
        db = ET.parse(out / "db.xml").getroot()
        school = db.find(".//school")
        assert school is not None
        assert school.text == "Evocation"

    def test_feat_has_benefit(self, minimal_scraped: Path, tmp_path: Path):
        out = tmp_path / "module"
        build_module(minimal_scraped, out, ["feats"], "Author")
        text = (out / "db.xml").read_text(encoding="utf-8")
        assert "<benefit" in text
        assert "bonus" in text.lower()

    def test_class_has_classfeatures(self, minimal_scraped: Path, tmp_path: Path):
        out = tmp_path / "module"
        build_module(minimal_scraped, out, ["classes"], "Author")
        db = ET.parse(out / "db.xml").getroot()
        features = db.findall(".//classfeatures/*")
        assert len(features) >= 2
        level = db.find(".//classfeatures/*/level")
        assert level is not None
        assert level.text == "1"

    def test_class_notes_include_stats_and_advancement(
        self, minimal_scraped: Path, tmp_path: Path
    ):
        out = tmp_path / "module"
        build_module(minimal_scraped, out, ["classes"], "Author")
        text = (out / "db.xml").read_text(encoding="utf-8")
        assert "Skill Points:" in text
        assert "4 + Int" in text
        assert "Advancement" in text
        assert "Sneak attack" in text
        assert "<th>" not in text
        assert "<td><b>Level</b></td>" in text
        skill_pts = text.index("Skill Points:")
        req = text.index("<p><b>Prerequisites:</b></p>")
        assert skill_pts < req

    def test_class_notes_use_paragraph_blocks_for_legacy_inline_html(
        self, tmp_path: Path
    ):
        book = json.loads(json.dumps(MINIMAL_BOOK))
        detail = book["categories"]["classes"][0]["detail"]
        detail["requirements_structured"] = {
            "text": "Base Attack Bonus: +5\nAlignment: Lawful good",
        }
        detail["notes_html"] = (
            "<strong>Weapon and Armor Proficiency:</strong> None."
            "<strong>Sneak Attack (Ex):</strong> +1d6 damage."
        )
        scraped = tmp_path / "legacy-class"
        scraped.mkdir()
        (scraped / "summary.json").write_text(
            json.dumps({"title": "Test Book", "book_slug": "test-book--1"}),
            encoding="utf-8",
        )
        for cat in ("spells", "feats", "classes", "items", "skills", "races"):
            payload = book["categories"].get(cat, [])
            (scraped / f"{cat}.json").write_text(json.dumps(payload), encoding="utf-8")
        (scraped / "book.json").write_text(json.dumps(book), encoding="utf-8")

        out = tmp_path / "module"
        build_module(scraped, out, ["classes"], "Author")
        text = (out / "db.xml").read_text(encoding="utf-8")
        assert '<requirements type="formattedtext">' in text
        assert "<p><b>Prerequisites:</b></p>" in text
        assert "<table><tr><td>\xa0\xa0\xa0\xa0Base Attack Bonus: +5</td></tr>" in text
        assert "<tr><td>\xa0\xa0\xa0\xa0Alignment: Lawful good</td></tr></table>" in text
        assert "<p><b>Weapon and Armor Proficiency:</b>" in text
        assert "<p><b>Sneak Attack (Ex):</b>" in text
        skill_pts = text.index("Skill Points:")
        req = text.index("<p><b>Prerequisites:</b></p>")
        weapon = text.index("Weapon and Armor Proficiency")
        assert skill_pts < req < weapon

    def test_class_has_requirements_field_for_prestige_class(
        self, minimal_scraped: Path, tmp_path: Path
    ):
        out = tmp_path / "module"
        build_module(minimal_scraped, out, ["classes"], "Author")
        text = (out / "db.xml").read_text(encoding="utf-8")
        assert '<requirements type="formattedtext">' in text
        assert "BAB +5" in text

    def test_class_has_skill_automation_fields(
        self, minimal_scraped: Path, tmp_path: Path
    ):
        out = tmp_path / "module"
        report = build_module(minimal_scraped, out, ["classes"], "Author")
        text = (out / "db.xml").read_text(encoding="utf-8")
        assert '<skillranks type="number">4</skillranks>' in text
        assert not any("Test Class" in w and "skillranks" in w for w in report.warnings)

    def test_package_mod(self, minimal_scraped: Path, tmp_path: Path):
        out = tmp_path / "module"
        build_module(minimal_scraped, out, ["spells", "feats"], "Author")
        mod = package_module(out, tmp_path / "Test Book.mod")
        assert mod is not None
        assert mod.exists()
        assert mod.stat().st_size > 100

    def test_skip_no_detail(self, minimal_scraped: Path, tmp_path: Path):
        book = MINIMAL_BOOK.copy()
        book["categories"] = {
            "spells": [{"name": "No Detail", "category": "spells", "detail": None}]
        }
        d = minimal_scraped
        (d / "book.json").write_text(json.dumps(book), encoding="utf-8")
        out = tmp_path / "module2"
        with pytest.raises(EmptyModuleError):
            build_module(d, out, ["spells"], "Author", skip_no_detail=True)

    def test_empty_book_raises(self, tmp_path: Path):
        d = tmp_path / "empty-book"
        d.mkdir()
        (d / "summary.json").write_text(
            json.dumps({"title": "Empty Book", "book_slug": "empty-book--1"}),
            encoding="utf-8",
        )
        for cat in ("spells", "feats", "classes", "skills", "items", "races"):
            (d / f"{cat}.json").write_text("[]", encoding="utf-8")
        with pytest.raises(EmptyModuleError, match="no records written"):
            build_module(d, tmp_path / "out", list(MINIMAL_BOOK["categories"].keys()), "Author")
        assert not (tmp_path / "out" / "definition.xml").exists()


@pytest.mark.slow
class TestCompleteDivineIntegration:
    EXPECTED = {"spells": 128, "feats": 56, "classes": 31, "items": 1}

    @pytest.fixture
    def scraped_dir(self) -> Path:
        path = _scraped_complete_divine_dir()
        if path is None:
            pytest.skip("scraped complete-divine book.json not present")
        return path

    def test_complete_divine_counts(self, scraped_dir: Path, tmp_path: Path):
        out = tmp_path / "complete-divine"
        report = build_module(
            scraped_dir,
            out,
            list(self.EXPECTED.keys()) + ["skills", "races"],
            "Test Author",
        )
        for cat, expected in self.EXPECTED.items():
            assert report.written.get(cat, 0) == expected, cat

        db = ET.parse(out / "db.xml").getroot()
        assert db.find("spell") is not None
        assert db.find("feat") is not None
        assert db.find("class") is not None
        assert db.find("item") is not None

    def test_evangelist_prerequisites_in_class_text(
        self, scraped_dir: Path, tmp_path: Path
    ):
        out = tmp_path / "complete-divine"
        build_module(scraped_dir, out, ["classes"], "Test Author")
        text = (out / "db.xml").read_text(encoding="utf-8")
        record = re.search(
            r"<id-\d+>\s*<name type=\"string\">Evangelist</name>"
            r".*?<classfeatures>.*?</classfeatures>\s*"
            r"<text type=\"formattedtext\">(.*?)</text>",
            text,
            re.S,
        )
        assert record is not None, "Evangelist class text not found"
        inner = record.group(1).strip()
        assert "\n" not in inner, "formattedtext inner HTML must be a single line"
        assert "<a href=" not in inner
        assert "Prerequisites:" in inner
        assert "<table><tr><td>\xa0\xa0\xa0\xa0<b>Alignment:</b> As a cleric of the chosen deity</td></tr>" in inner
        assert "<b>Alignment:</b> As a cleric of the chosen deity" in inner
        assert "Bluff 8 ranks" in inner
        assert "Negotiator" in inner
        pre = inner.index("Prerequisites")
        align = inner.index("<b>Alignment:</b> As a cleric of the chosen deity")
        bluff = inner.index("Bluff 8 ranks")
        negotiator = inner.index("Negotiator")
        weapon = inner.index("Weapon and Armor Proficiency")
        assert pre < align < bluff < negotiator < weapon

    def test_load_book(self, scraped_dir: Path):
        book = load_book(scraped_dir)
        assert book.title
        assert len(book.categories["spells"]) == 128
