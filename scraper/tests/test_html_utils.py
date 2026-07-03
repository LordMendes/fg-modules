"""Tests for FG HTML helpers."""

from scraper.fg.html_utils import (
    normalize_class_body_html,
    normalize_fg_table_html,
    requirements_text_to_html,
    sanitize_xml_text,
)


def test_normalize_fg_table_html_converts_th_to_bold_td():
    html = "<table><tr><th>Level</th><th>BAB</th></tr><tr><td>1</td><td>+0</td></tr></table>"
    out = normalize_fg_table_html(html)
    assert "<th>" not in out
    assert "<td><b>Level</b></td>" in out
    assert "<td><b>BAB</b></td>" in out
    assert "<td>1</td>" in out


def test_normalize_class_body_html_splits_legacy_inline_features():
    html = (
        "<strong>Weapon and Armor Proficiency:</strong> No proficiencies."
        "<strong>Shock Blade (Su):</strong> Twice per day."
    )
    out = normalize_class_body_html(html)
    assert out.count("<p>") == 2
    assert "<b>Weapon and Armor Proficiency:</b>" in out
    assert "<b>Shock Blade (Su):</b>" in out
    assert "<strong>" not in out


def test_normalize_class_body_html_preserves_existing_paragraphs():
    html = "<p><strong>Alignment:</strong> Lawful good</p><p><strong>Skills:</strong> Hide 5 ranks</p>"
    out = normalize_class_body_html(html)
    assert out.count("<p>") == 2
    assert "<b>Alignment:</b>" in out
    assert "<strong>" not in out


def test_requirements_text_to_html_uses_separate_paragraphs():
    text = "Base Attack Bonus: +7\nAlignment: Lawful good\nSkills: Hide 5 ranks"
    out = requirements_text_to_html(text)
    assert out.count("<p>") == 3
    assert "Base Attack Bonus: +7" in out
    assert "Alignment: Lawful good" in out


def test_sanitize_xml_text_strips_control_characters():
    dirty = "before\u0001after\u0002end"
    assert sanitize_xml_text(dirty) == "beforeafterend"
    assert "\x01" not in sanitize_xml_text(dirty)
    assert sanitize_xml_text("normal text") == "normal text"
