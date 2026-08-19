"""Tests for monster CR validation and recovery."""

from scraper.monster_cr import (
    extract_cr_from_text,
    is_valid_cr,
    sanitize_monster_record,
)


def test_is_valid_cr_rejects_crocodile_fragment() -> None:
    assert not is_valid_cr("ocodile Form")
    assert is_valid_cr("3")
    assert is_valid_cr("1/3")


def test_extract_cr_from_combat_h1() -> None:
    html = "<h1>Werecrocodile (Crocodile Form)  (CR 3)</h1>"
    assert extract_cr_from_text(html) == "3"


def test_sanitize_monster_record_recovers_cr() -> None:
    record = {
        "name": "Werecrocodile (Crocodile Form)",
        "challenge_rating": "ocodile Form",
        "stat_line": "Medium Humanoid (Human, Shapechanger) — CR ocodile Form",
        "index": {"cr": "ocodile Form", "type": "Humanoid"},
        "combat_html": "<h1>Werecrocodile (Crocodile Form)  (CR 3)</h1>",
    }
    fixed = sanitize_monster_record(record)
    assert fixed["challenge_rating"] == "3"
    assert fixed["index"]["cr"] == "3"
    assert fixed["stat_line"].endswith("— CR 3")
