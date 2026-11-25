"""Class flavor sidecars: book sections around the mechanical notes."""

from __future__ import annotations

import json

from scraper.class_flavor import (
    MANIFEST_PATH,
    SCHEMAS,
    build_manifest,
    flavor_coverage_summary,
    flavor_coverage_warnings,
    flavor_gap_warning,
    load_class_flavor,
    render_flavor_html,
)
from scraper.dndtools_adapter import convert_class
from scraper.fg.converters.classes import _build_notes_html, convert_classes
from scraper.fg.loader import BuildReport
from scraper.fg.xml_builder import IdAllocator


def test_tracked_books_have_sidecars_and_a_matching_manifest():
    summary = {row["abbrev"]: row for row in flavor_coverage_summary()}
    assert summary["PH"]["classes"] == 11
    assert summary["PH"]["done"] == 0
    assert summary["PH"]["missing"] == 11 * len(SCHEMAS["phb-base"]["sections"])
    assert summary["PH2"]["classes"] == 5
    assert summary["DMG"]["classes"] == 21
    assert summary["DMG"]["deferred"] == 11

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    assert manifest == build_manifest()

    bard = load_class_flavor("players-handbook", "bard")
    assert bard is not None
    assert bard["page"] == 26
    assert [section["key"] for section in bard["sections"]] == [
        spec["key"] for spec in SCHEMAS["phb-base"]["sections"]
    ]
    assert render_flavor_html(bard, "before") == ""
    assert render_flavor_html(bard, "after") == ""

    knight = load_class_flavor("players-handbook-ii", "knight-103")
    assert knight is not None
    assert knight["schema"] == "phb2-standard"
    assert any(section["placement"] == "after" for section in knight["sections"])

    epic = load_class_flavor("dungeon-masters-guide", "epic-bard-1012")
    assert epic is None


def test_render_skips_empty_sections_and_opens_group_headings():
    doc = {
        "name": "Bard",
        "schema": "phb-base",
        "sections": [
            {"key": "intro", "title": None, "placement": "before", "html": "Music has a special magic."},
            {"key": "adventures", "title": "Adventures", "placement": "before", "html": ""},
            {"key": "abilities", "title": "Abilities", "placement": "before", "html": "<p>Charisma.</p>"},
        ],
    }
    html = render_flavor_html(doc, "before")
    assert html.startswith("<p>Music has a special magic.</p>")
    assert "Adventures" not in html
    assert "<p><b>Game Rule Information</b></p><p><b>Abilities</b></p><p>Charisma.</p>" in html
    assert render_flavor_html(doc, "after") == ""


def test_phb2_after_sections_use_the_class_name():
    doc = {
        "name": "Knight",
        "schema": "phb2-standard",
        "sections": [
            {"key": "religion", "title": "Religion", "placement": "after", "html": "<p>Heironeous.</p>"},
            {"key": "lore", "title": "Knight Lore", "placement": "after", "html": "<p>DC 15.</p>"},
        ],
    }
    html = render_flavor_html(doc, "after")
    assert html.index("Playing a Knight") < html.index("Religion") < html.index("Knight Lore")
    assert "Knights in the World" not in html


def test_notes_place_flavor_around_the_mechanical_body():
    html = _build_notes_html(
        {
            "description_html": "<p>Features.</p>",
            "advancement": [{"level": 1, "bab": "+0", "fort": "+0", "ref": "+0", "will": "+2", "special": ""}],
            "flavor_html_before": "<p>Before.</p>",
            "flavor_html_after": "<p>After.</p>",
        },
        "Bard",
    )
    assert html.index("Before.") < html.index("Features.") < html.index("Advancement") < html.index("After.")


def test_convert_class_attaches_empty_flavor_without_changing_notes():
    detail = convert_class(
        {
            "name": "Bard",
            "slug": "bard",
            "description_html": "<p><strong>Spells:</strong> Cast.</p>",
            "index": {},
        },
        "players-handbook",
    )["detail"]
    assert detail["flavor_schema"] == "phb-base"
    assert detail["flavor_html_before"] == ""
    assert detail["flavor_html_after"] == ""
    notes = _build_notes_html(detail, "Bard")
    assert "Spells" in notes
    assert "Adventures" not in notes


def test_gap_warning_names_the_tracked_books_only():
    warning = flavor_gap_warning("Player's Handbook")
    assert warning is not None
    assert warning.startswith("classes: flavor text 0/")
    assert flavor_gap_warning("Complete Warrior") is None
    assert any(line.startswith("PH/Bard:") for line in flavor_coverage_warnings())
    assert not any(line.startswith("DMG/Epic Bard:") for line in flavor_coverage_warnings())


def test_module_build_records_the_flavor_gap_once():
    report = BuildReport()
    convert_classes(
        [
            {
                "name": "Bard",
                "index": {},
                "detail": {"hit_die": "d6", "bab": "Medium", "class_features": []},
            }
        ],
        "Player's Handbook",
        report,
        IdAllocator(),
    )
    gaps = [warning for warning in report.warnings if warning.startswith("classes: flavor text")]
    assert len(gaps) == 1
