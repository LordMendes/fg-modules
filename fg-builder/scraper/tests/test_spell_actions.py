"""Tests for spell action generation."""

from __future__ import annotations

from pathlib import Path

import pytest

from scraper.fg.spell_actions import build_spell_actions
from scraper.parsers.spells import parse_spell_detail

FIXTURES = Path(__file__).parent / "fixtures"


def _load_fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def _cast(actions: list[dict]) -> dict:
    return next(a for a in actions if a["type"] == "cast")


def _damages(actions: list[dict]) -> list[dict]:
    return [a for a in actions if a["type"] == "damage"]


def _effects(actions: list[dict]) -> list[dict]:
    return [a for a in actions if a["type"] == "effect"]


class TestCastAction:
    def test_will_negates(self):
        actions = build_spell_actions(
            {
                "saving_throw": "Will negates",
                "spell_resistance": "Yes",
                "description_text": "A test spell.",
            }
        )
        cast = _cast(actions)
        assert cast["savetype"] == "will"
        assert "onmissdamage" not in cast

    def test_harmless_save_has_no_savetype(self):
        actions = build_spell_actions(
            {
                "saving_throw": "Will negates (harmless)",
                "spell_resistance": "Yes",
                "description_text": "A harmless buff.",
            }
        )
        cast = _cast(actions)
        assert "savetype" not in cast

    def test_sr_no_sets_srnotallowed(self):
        actions = build_spell_actions(
            {
                "saving_throw": "None",
                "spell_resistance": "No",
                "description_text": "No save spell.",
            }
        )
        cast = _cast(actions)
        assert cast.get("srnotallowed") is True


class TestDamageAndHeal:
    def test_burning_hands_like(self):
        actions = build_spell_actions(
            {
                "saving_throw": "Reflex half",
                "spell_resistance": "Yes",
                "description_text": (
                    "Any creature in the area of the flames takes 1d4 points of "
                    "fire damage per caster level (maximum 5d4)."
                ),
            }
        )
        cast = _cast(actions)
        assert cast["savetype"] == "reflex"
        assert cast["onmissdamage"] == "half"

        damages = _damages(actions)
        assert len(damages) == 1
        entry = damages[0]["entries"][0]
        assert entry["dice_list"] == ["d4"]
        assert entry["dicestat"] == "cl"
        assert entry["max_stat"] == 5
        assert entry["damage_type"] == "fire"

    def test_produce_flame_like_rtouch(self):
        actions = build_spell_actions(
            {
                "saving_throw": "None",
                "spell_resistance": "Yes",
                "description_text": (
                    "You can strike an opponent with a melee touch attack, dealing "
                    "fire damage equal to 1d6 +1 point per caster level (maximum +5). "
                    "Alternatively, you can hurl the flames up to 120 feet as a thrown "
                    "weapon. When doing so, you attack with a ranged touch attack "
                    "and deal the same damage."
                ),
            }
        )
        cast = _cast(actions)
        assert cast.get("atktype") == "rtouch"


class TestEffects:
    def test_entangle_like(self):
        actions = build_spell_actions(
            {
                "saving_throw": "Reflex partial; see text",
                "spell_resistance": "No",
                "duration": "1 min./level (D)",
                "description_text": (
                    "Grasses, weeds, bushes, and even trees wrap, twist, and entwine "
                    "about creatures in the area or those that enter the area, holding "
                    "them fast and causing them to become entangled."
                ),
            }
        )
        cast = _cast(actions)
        assert cast["savetype"] == "reflex"
        assert cast.get("srnotallowed") is True

        effects = _effects(actions)
        assert len(effects) == 1
        assert effects[0]["label"] == "Entangled"
        assert effects[0]["durunit"] == "minute"
        assert effects[0]["durmult"] == 1


class TestAngerOfTheNoondaySun:
    @pytest.fixture
    def detail(self) -> dict:
        html = _load_fixture("spell_detail.html")
        parsed = parse_spell_detail(html, "http://example.com")
        return {
            "name": parsed["title"],
            "saving_throw": parsed["saving_throw"],
            "spell_resistance": parsed["spell_resistance"],
            "duration": parsed["duration"],
            "description_text": parsed["description_text"],
        }

    def test_anger_of_the_noonday_sun(self, detail: dict):
        actions = build_spell_actions(detail)
        cast = _cast(actions)
        assert cast["savetype"] == "reflex"

        damages = _damages(actions)
        assert len(damages) >= 1
        entry = damages[0]["entries"][0]
        assert entry["dice_list"] == ["d6"]
        assert entry["dicestat"] == "halfcl"
        assert entry["max_stat"] == 10
