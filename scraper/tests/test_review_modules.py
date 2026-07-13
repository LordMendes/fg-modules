"""Tests for FG module compatibility reviewer."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from scraper.fg.builder import build_module
from scraper.fg.packager import package_module
from scraper.fg.reviewer import review_module_path
from scraper.review_modules import run_review

from .test_json_to_fg import MINIMAL_BOOK

MODULES_ROOT = Path(__file__).resolve().parents[2] / "modules"
TARGET_MODS = [
    "Complete Adventurer.mod",
    "Complete Arcane.mod",
    "Complete Champion.mod",
    "Complete Divine.mod",
    "Complete Mage.mod",
    "Complete Warrior.mod",
    "Player's Handbook II.mod",
]


@pytest.fixture
def minimal_module(tmp_path: Path) -> Path:
    scraped = tmp_path / "test-book--1"
    scraped.mkdir()
    (scraped / "summary.json").write_text(
        json.dumps({"title": "Test Book", "book_slug": "test-book--1"}),
        encoding="utf-8",
    )
    (scraped / "book.json").write_text(
        json.dumps(MINIMAL_BOOK, ensure_ascii=False),
        encoding="utf-8",
    )

    out = tmp_path / "module"
    build_module(
        scraped,
        out,
        list(MINIMAL_BOOK["categories"].keys()),
        "Test Author",
    )
    return out


@pytest.fixture
def bad_module(tmp_path: Path) -> Path:
    out = tmp_path / "bad-module"
    out.mkdir()
    (out / "definition.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<root version="4.4" dataversion="20230911" release="17.1|CoreRPG:6">\n'
        '  <name type="string">Bad Module</name>\n'
        '  <ruleset type="string">PFRPG</ruleset>\n'
        "</root>\n",
        encoding="utf-8",
    )
    (out / "db.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<root version="4.4" dataversion="20230911" release="17.1|CoreRPG:6">\n'
        "  <spell>\n"
        '    <id-00001><name type="string">Broken Spell</name></id-00001>\n'
        "  </spell>\n"
        "</root>\n",
        encoding="utf-8",
    )
    return out


class TestReviewModulePath:
    def test_minimal_module_load_ready(self, minimal_module: Path):
        report = review_module_path(minimal_module)
        assert report.load_ready is True
        assert len(report.errors) == 0
        assert report.record_counts["spell"] == 1
        assert report.record_counts["feat"] == 1
        assert report.record_counts["class"] == 1
        assert report.record_counts["item"] == 1

    def test_packaged_mod_review(self, minimal_module: Path, tmp_path: Path):
        mod_path = tmp_path / "Test Book.mod"
        package_module(minimal_module, mod_path)
        report = review_module_path(mod_path)
        assert report.load_ready is True
        assert len(report.errors) == 0

    def test_bad_ruleset_blocks_load(self, bad_module: Path):
        report = review_module_path(bad_module)
        assert report.load_ready is False
        codes = {issue.code for issue in report.errors}
        assert "definition_wrong_ruleset" in codes

    def test_missing_spell_fields_are_warnings(self, bad_module: Path):
        report = review_module_path(bad_module)
        codes = {issue.code for issue in report.warnings}
        assert "spell_missing_field" in codes

    def test_report_serializes(self, minimal_module: Path):
        report = review_module_path(minimal_module)
        data = report.to_dict()
        assert data["module_name"] == "Test Book"
        assert "issues" in data
        assert data["totals"]["errors"] == 0


class TestReviewCli:
    def test_run_review_writes_outputs(self, minimal_module: Path, tmp_path: Path):
        mod_path = tmp_path / "modules"
        mod_path.mkdir()
        packaged = mod_path / "Test Book.mod"
        package_module(minimal_module, packaged)

        out_dir = tmp_path / "reviews" / "v1"
        reports = run_review(mod_path, out_dir, books=["Test Book"])

        assert len(reports) == 1
        assert (out_dir / "Test Book.mod").exists()
        assert (out_dir / "README.md").exists()
        assert (out_dir / "rollup.json").exists()
        assert (out_dir / "test-book.json").exists()
        assert (out_dir / "test-book.md").exists()


@pytest.mark.parametrize("mod_name", TARGET_MODS)
def test_real_module_integration(mod_name: str):
    mod_path = MODULES_ROOT / mod_name
    if not mod_path.exists():
        pytest.skip(f"module not on disk: {mod_path}")

    report = review_module_path(mod_path)
    assert report.load_ready is True, report.errors
    assert sum(report.record_counts.values()) > 0
