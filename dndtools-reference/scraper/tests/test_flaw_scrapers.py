"""Fixture-based tests for supplemental flaw parsers."""

from __future__ import annotations

from pathlib import Path

from scraper.parsers.dandwiki import parse_flaw_detail, parse_flaw_index
from scraper.parsers.realmshelps import parse_flaw_detail as parse_rh_detail
from scraper.parsers.realmshelps import parse_flaw_index as parse_rh_index

FIXTURES = Path(__file__).parent / "fixtures"


def test_realmshelps_index_parser() -> None:
    html = (FIXTURES / "realmshelps_index.html").read_text(encoding="utf-8")
    rows = parse_rh_index(html)
    assert len(rows) == 92
    assert rows[0]["name"] == "Aligned Devotion"
    assert rows[0]["url"].endswith("/charbuild/feat/Aligned_Devotion")
    assert "Arcane Conundrum" in {row["name"] for row in rows}


def test_realmshelps_feeble_detail() -> None:
    html = (FIXTURES / "realmshelps_feeble.html").read_text(encoding="utf-8")
    record = parse_rh_detail(html, "https://realmshelps.net/charbuild/feat/Feeble")
    assert record["name"] == "Feeble"
    assert record["slug"] == "feeble-rh"
    assert record["type"] == "Flaw"
    assert record["source"]["abbrev"] == "UA"
    assert record["source"]["name"] == "Unearthed Arcana"
    assert "unathletic" in (record.get("description_text") or "").lower()
    assert record.get("benefit_html")
    assert "-2 penalty" in record["benefit_html"]


def test_realmshelps_arcane_conundrum_detail() -> None:
    html = (FIXTURES / "realmshelps_arcane_conundrum.html").read_text(encoding="utf-8")
    record = parse_rh_detail(
        html,
        "https://realmshelps.net/charbuild/feat/Arcane_Conundrum",
    )
    assert record["name"] == "Arcane Conundrum"
    assert record["slug"] == "arcane-conundrum-rh"
    assert record["source"]["abbrev"] == "Dr328"
    assert "Gnome" in (record.get("prerequisite_html") or "")
    assert "spell-like abilities" in (record.get("benefit_html") or "")


def test_realmshelps_frail_flaw_detail() -> None:
    html = (FIXTURES / "realmshelps_frail_flaw.html").read_text(encoding="utf-8")
    record = parse_rh_detail(
        html,
        "https://realmshelps.net/charbuild/feat/Frail_%28Flaw%29",
    )
    assert record["name"] == "Frail (Flaw)"
    assert record["slug"] == "frail-flaw-rh"
    assert record["source"]["abbrev"] == "Dr328"


def test_dandwiki_index_parser() -> None:
    html = (FIXTURES / "dandwiki_index.html").read_text(encoding="utf-8")
    rows = parse_flaw_index(html)
    assert len(rows) >= 80
    assert rows[0]["name"] == "Abandonment Issues"
    assert rows[0]["url"].endswith("Abandonment_Issues_(3.5e_Flaw)")
    assert all("April" not in row["name"] for row in rows)


def test_dandwiki_coward_detail() -> None:
    html = (FIXTURES / "dandwiki_coward.html").read_text(encoding="utf-8")
    record = parse_flaw_detail(html, "https://www.dandwiki.com/wiki/Coward_(3.5e_Flaw)")
    assert record["name"] == "Coward"
    assert record["slug"] == "coward-dww"
    assert record["source"]["abbrev"] == "DWW"
    assert record["source"]["name"] == "D&D Wiki Homebrew"
    assert "immune to fear" in (record.get("prerequisite_html") or "").lower()
    assert "-6 penalty" in (record.get("benefit_html") or "")
    assert "panicked" in (record.get("special_html") or "").lower()


def test_dandwiki_abandonment_detail() -> None:
    html = (FIXTURES / "dandwiki_abandonment.html").read_text(encoding="utf-8")
    record = parse_flaw_detail(
        html,
        "https://www.dandwiki.com/wiki/Abandonment_Issues_(3.5e_Flaw)",
    )
    assert record["name"] == "Abandonment Issues"
    assert record["slug"] == "abandonment-issues-dww"
    assert "Distrust others" in (record.get("benefit_html") or "")
