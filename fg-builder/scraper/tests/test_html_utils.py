"""Tests for FG HTML helpers."""

from scraper.fg.html_utils import (
    class_requirements_html,
    normalize_class_body_html,
    normalize_fg_table_html,
    normalize_fg_tables_in_html,
    prepare_formatted_html,
    prepare_spell_description_html,
    requirements_text_to_html,
    sanitize_xml_text,
    structured_requirements_to_html,
)


def test_separate_fg_tables_inserts_a_gap_and_stays_idempotent():
    from scraper.fg.html_utils import prepare_formatted_html, separate_fg_tables

    html = (
        "<table><tr><td>1</td></tr></table>"
        "<h4>Spells per Day</h4>"
        "<table><tr><td>2</td></tr></table>"
        "<table><tr><td>3</td></tr></table>"
    )
    out = separate_fg_tables(html)
    assert "<h4>" not in out
    assert "</table><table" not in out.lower()
    assert "</table><p /><p><b>Spells per Day</b></p><table>" in out
    assert "</table><p /><table>" in out
    again = separate_fg_tables(prepare_formatted_html(out))
    assert again.lower().count("</table><table") == 0
    assert "<h4>" not in again

    trailing = "<table><tr><td>1</td></tr></table><h4>Leadership Score</h4><p>Base score.</p>"
    spaced = separate_fg_tables(trailing)
    assert "<h4>" not in spaced
    assert "</table><p /><p><b>Leadership Score</b></p><p>Base score.</p>" in spaced


def test_prepare_formatted_html_does_not_resurrect_escaped_anchors():
    raw = '<p>See &lt;a href=”/armor-darkness-3844/”&gt;<em>armor</em></a>.</p>'
    once = prepare_formatted_html(raw)
    twice = prepare_formatted_html(once)
    assert "<a " not in once
    assert "<a " not in twice
    assert "<em>armor</em>" in twice


def test_normalize_fg_table_flattens_spellcasting_header():
    html = (
        "<table>"
        "<tr><th rowspan=\"2\">Class Level</th><th rowspan=\"2\">Base Attack Bonus</th>"
        "<th rowspan=\"2\">Fort Save</th><th rowspan=\"2\">Ref Save</th>"
        "<th rowspan=\"2\">Will Save</th><th rowspan=\"2\">Special</th>"
        "<th colspan=\"9\">———Spellcasting———</th></tr>"
        "<tr><th>1st</th><th>2nd</th><th>3rd</th><th>4th</th><th>5th</th>"
        "<th>6th</th><th>7th</th><th>8th</th><th>9th</th></tr>"
        "<tr><td>1st</td><td>+0</td><td>+0</td><td>+0</td><td>+2</td>"
        "<td>Charnel touch, rebuke undead</td><td>3</td><td>—</td><td>—</td>"
        "<td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>"
        "</table>"
    )
    out = normalize_fg_table_html(html)
    assert "<th>" not in out
    assert "rowspan" not in out
    assert "colspan" not in out
    assert "Spellcasting" not in out
    header, data = out.split("</tr>", 1)
    assert header.index("<b>Class Level</b>") < header.index("<b>Special</b>")
    assert header.index("<b>Special</b>") < header.index("<b>1st</b>")
    assert header.index("<b>1st</b>") < header.index("<b>9th</b>")
    assert "<td>Charnel touch, rebuke undead</td>" in data
    assert data.index("<td>Charnel touch, rebuke undead</td>") < data.index("<td>3</td>")


def test_normalize_fg_table_uses_spell_level_labels_under_group_banner():
    html = (
        "<table><tr><th colspan=\"6\"></th><th colspan=\"2\">Spells per Day</th></tr>"
        "<tr><th>Level</th><th>BAB</th><th>Fort</th><th>Ref</th><th>Will</th>"
        "<th>Special</th><th>0th</th><th>1st</th></tr>"
        "<tr><td>1st</td><td>+0</td><td>+0</td><td>+2</td><td>+2</td>"
        "<td>Bardic music</td><td>2</td><td>—</td></tr></table>"
    )
    out = normalize_fg_table_html(html)
    assert "Spells per Day" not in out
    assert "<td><b>0th</b></td><td><b>1st</b></td>" in out
    assert out.count("<tr>") == 2


def test_normalize_fg_table_html_converts_th_to_bold_td():
    html = "<table><tr><th>Level</th><th>BAB</th></tr><tr><td>1</td><td>+0</td></tr></table>"
    out = normalize_fg_table_html(html)
    assert "<th>" not in out
    assert "<td><b>Level</b></td>" in out
    assert "<td><b>BAB</b></td>" in out
    assert "<td>1</td>" in out


def test_normalize_fg_tables_in_html_preserves_surrounding_paragraphs():
    html = (
        "<p>Intro paragraph.</p>"
        "<table><tr><th><strong>Level</strong></th><th><strong>Size</strong></th></tr>"
        "<tr><td>Up to 15</td><td>Huge</td></tr></table>"
        "<p>Closing paragraph.</p>"
    )
    out = normalize_fg_tables_in_html(html)
    assert out.index("<p>Intro paragraph.</p>") < out.index("<table>")
    assert out.index("</table>") < out.index("<p>Closing paragraph.</p>")
    assert "<th>" not in out
    assert "<td><b>Level</b></td>" in out
    assert "<td><b>Size</b></td>" in out
    assert "<td>Up to 15</td>" in out


def test_prepare_spell_description_html_converts_crumble_table():
    html = (
        "<p>The erosion inflicts 1d6 points of damage per caster level.</p>"
        "<table><tr><th><strong>Level</strong></th>"
        "<th><strong>Size of Object Affected</strong></th></tr>"
        "<tr><td>Up to 15</td><td>Huge</td></tr>"
        "<tr><td>16–18</td><td>Gargantuan</td></tr></table>"
    )
    out = prepare_spell_description_html(html)
    assert "<th>" not in out
    assert "<strong>" not in out
    assert "<p>The erosion inflicts 1d6 points of damage per caster level.</p>" in out
    assert "<td><b>Level</b></td>" in out
    assert "<td><b>Size of Object Affected</b></td>" in out
    assert "<td>Gargantuan</td>" in out


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


def test_structured_requirements_to_html_indents_when_requested():
    req = {"alignment": "Lawful good"}
    out = structured_requirements_to_html(req, indent=True)
    assert "<table><tr><td>\xa0\xa0\xa0\xa0<b>Alignment:</b> Lawful good</td></tr></table>" in out


def test_structured_requirements_to_html_uses_clean_paragraphs():
    req = {
        "alignment": "As a cleric of the chosen deity",
        "skills": [
            "Bluff 8 ranks\n                        , Gather Information 5 ranks"
        ],
        "feats": ["Negotiator (or)\n                        , Persuasive"],
    }
    out = structured_requirements_to_html(req)
    assert "<a " not in out
    assert out.count("<p>") == 3
    assert "<b>Alignment:</b> As a cleric of the chosen deity" in out
    assert "Bluff 8 ranks , Gather Information 5 ranks" in out
    assert "Negotiator (or) , Persuasive" in out


def test_normalize_class_body_html_wraps_loose_tr_and_converts_th():
    html = (
        "<p>See the table below.</p>"
        "<tr> <th>Level </th> <th>Ability Gained </th> </tr>"
        "<tr> <td>1st</td> <td>Bravery</td> </tr>"
    )
    out = normalize_class_body_html(html)
    assert "<th>" not in out
    assert "<table>" in out
    assert "<td><b>Level</b></td>" in out
    assert "<td><b>Ability Gained</b></td>" in out
    assert "<td>1st</td>" in out


def test_wrap_loose_table_rows_preserves_existing_tables():
    from scraper.fg.html_utils import wrap_loose_table_rows

    html = (
        "<tr><th>A</th></tr><tr><td>1</td></tr>"
        "<table><tr><th>B</th></tr></table>"
        "<tr><th>C</th></tr>"
    )
    out = wrap_loose_table_rows(html)
    assert out.count("<table>") == 3
    assert out.index("<table><tr><th>A</th>") < out.index("<table><tr><th>B</th>")


def test_class_requirements_html_prefers_structured_over_linked_html():
    detail = {
        "requirements_structured": {
            "alignment": "Lawful good",
            "html": (
                '<p><strong>Alignment:</strong> Lawful good</p>'
                '<p><strong>Skills:</strong> <a href="../../skills/hide/index.html">Hide</a> 5 ranks</p>'
            ),
        }
    }
    out = class_requirements_html(detail)
    assert "<a " not in out
    assert "<b>Alignment:</b> Lawful good" in out
