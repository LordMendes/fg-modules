"""Races of the Wild champion of Corellon, revised over the scraped class."""

from __future__ import annotations

from scraper.dndtools_adapter import convert_class, filter_by_abbrev, load_category


def test_champion_of_corellon_requirements_skills_and_features():
    matches = [
        rec
        for rec in filter_by_abbrev(load_category("classes"), "RW")
        if rec.get("slug") == "champion-of-corellon-larethian-742"
    ]
    assert len(matches) == 1
    detail = convert_class(matches[0], "races-of-the-wild")["detail"]

    req = detail["requirements"]
    assert "half-elf" in req.lower()
    assert "martial weapons" in req.lower()
    assert "Weapon Focus (longsword)" in req
    assert "elven courtblade" in req
    assert "Armor Proficiency" not in req
    assert "Corellon Larethian" in req

    skills = detail["class_skills"]
    assert "Knowledge (psionics)" not in skills
    assert "Intimidate (Cha)" in skills
    assert "Knowledge (religion) (Int)" in skills
    assert "Spellcraft (Int)" in skills
    assert "Handle Animal (Cha)" in skills

    features = detail["class_features"]
    by_name = {feat["name"].lower(): feat for feat in features}
    assert all(not name.startswith("ex-champion") for name in by_name)
    assert by_name["elegant strike"]["level"] == 2
    assert by_name["superior defense"]["level"] == 3
    assert by_name["unimpeded movement"]["level"] == 5
    wrath = next(feat for feat in features if "wrath" in feat["name"].lower())
    blessing = next(feat for feat in features if "blessing" in feat["name"].lower())
    assert wrath["level"] == 8
    assert blessing["level"] == 1
    assert by_name["bonus feat"]["level"] == 1

    assert detail["bab"] == "Fast"
    assert detail["fort"] == "Good"
    assert detail["ref"] == "Bad"
    assert detail["will"] == "Good"
    assert detail["hit_die"] == "d10"
    assert detail["skill_ranks"] == 2
    assert detail["class_type"] == "prestige"
    assert "noble elf fighter" in detail["description_html"]
    notes = (detail.get("notes_html") or "").lower()
    assert "expelled" in notes
    assert "supernatural" in notes
