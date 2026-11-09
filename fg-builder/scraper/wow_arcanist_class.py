"""Arcanist advancement from Core Rules Tables 3-3 and 3-4.

The scraped class prose folds the familiar sidebar and the three path
chapters into one feature list, so every heading lands at 1st level.
These rows are the class table: Scribe Scroll and arcana at 1st, arcana
again at 4th, 8th, 12th, and 16th, and a bonus feat at 5th, 10th, 15th,
and 20th. Spell slots are Table 3-4.
"""

from __future__ import annotations

from typing import Any

# Level, then slots for spell levels 0 through 9. A dash is an empty column.
_SPELL_SLOTS: dict[int, list[str]] = {
    1: ["3", "1", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014"],
    2: ["4", "2", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014"],
    3: ["4", "2", "1", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014"],
    4: ["4", "3", "2", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014"],
    5: ["4", "3", "2", "1", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014"],
    6: ["4", "3", "3", "2", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014"],
    7: ["4", "4", "3", "2", "1", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014"],
    8: ["4", "4", "3", "3", "2", "\u2014", "\u2014", "\u2014", "\u2014", "\u2014"],
    9: ["4", "4", "4", "3", "2", "1", "\u2014", "\u2014", "\u2014", "\u2014"],
    10: ["4", "4", "4", "3", "3", "2", "\u2014", "\u2014", "\u2014", "\u2014"],
    11: ["4", "4", "4", "4", "3", "2", "1", "\u2014", "\u2014", "\u2014"],
    12: ["4", "4", "4", "4", "3", "3", "2", "\u2014", "\u2014", "\u2014"],
    13: ["4", "4", "4", "4", "4", "3", "2", "1", "\u2014", "\u2014"],
    14: ["4", "4", "4", "4", "4", "3", "3", "2", "\u2014", "\u2014"],
    15: ["4", "4", "4", "4", "4", "4", "3", "2", "1", "\u2014"],
    16: ["4", "4", "4", "4", "4", "4", "3", "3", "2", "\u2014"],
    17: ["4", "4", "4", "4", "4", "4", "4", "3", "2", "1"],
    18: ["4", "4", "4", "4", "4", "4", "4", "3", "3", "2"],
    19: ["4", "4", "4", "4", "4", "4", "4", "4", "3", "3"],
    20: ["4", "4", "4", "4", "4", "4", "4", "4", "4", "4"],
}
_SPELL_LEVELS = list(range(10))


def _feature(level: int, name: str, text: str, ability_type: str = "") -> dict[str, Any]:
    label = f"{name} ({ability_type})" if ability_type else name
    return {
        "level": level,
        "name": name,
        "type": ability_type,
        "text": text,
        "text_html": f"<p><b>{label}:</b> {text}</p>",
    }


def arcanist_features() -> list[dict[str, Any]]:
    """Class features in Table 3-3 order, with each path's arcana in the text."""
    spells = (
        "An arcanist casts arcane spells drawn from the arcanist spell list and "
        "the spell list of her path (mage, necromancer, or warlock). She must rest "
        "8 hours, then prepare spells from a spellbook. To learn, prepare, or cast "
        "a spell, the arcanist must have an Intellect score equal to 10 + the spell "
        "level. The save DC is 10 + the spell level + her Intellect modifier. She "
        "begins with all 0-level arcanist spells, all 0-level spells of her path, "
        "and three 1st-level spells, plus one extra 1st-level spell per Intellect "
        "bonus. Her path grants one extra spell slot of each level from that path's "
        "list, +1 to the save DCs of path spells, and +2 on Spellcraft checks to "
        "learn path spells. Spells from another path's list are cast at -2 caster "
        "level (minimum 1st), with -2 to the save DC and a 2% chance of spell "
        "failure per spell level. She cannot learn another path's spells unless she "
        "has at least one level in that path."
    )
    return [
        _feature(
            1,
            "Weapon and Armor Proficiency",
            "Arcanists are proficient with clubs, daggers, and quarterstaffs, but not "
            "with any armor or shield. Armor interferes with somatic components and "
            "can cause those spells to fail.",
        ),
        _feature(1, "Spells", spells),
        _feature(
            1,
            "Scribe Scroll",
            "At 1st level, an arcanist gains Scribe Scroll as a bonus feat.",
        ),
        _feature(
            1,
            "Arcana, 1st",
            "Choose the 1st-level arcana of your path. Mage, Summon Familiar (Su): "
            "gain a familiar. Familiar abilities follow the master's combined level "
            "in classes that grant familiars. Necromancer, Death Touch (Su): melee "
            "touch, 1d6 per necromancer level; if the total equals the target's "
            "current hit points, it dies (no save). Usable 1/day at 1st level, "
            "2/day at 9th, and 3/day at 18th. Warlock, Fel Companion (Ex): an evil "
            "outsider of HD up to the warlock's path level (maximum 10). If it dies, "
            "the warlock makes a Fortitude save (DC 15 + 1 per companion HD) or loses "
            "400 XP per warlock level (half on a success), and a DC 15 Will save or "
            "takes 1d6 Stamina damage.",
        ),
        _feature(
            4,
            "Arcana, 4th",
            "Mage, Call Elemental (Sp): once per day, summon an air, earth, fire, or "
            "water elemental as a standard action. Duration is 5 minutes per point of "
            "Intellect modifier. Size is Small at 4th-5th, Medium at 6th-9th, Large "
            "at 10th-13th, Huge at 14th-17th, Greater at 18th-20th, and Elder at 21st "
            "or higher. Twice per day at 12th level, three times per day at 20th. "
            "Necromancer, Death Resistance (Ex): immunity to death spells and magical "
            "death effects. Warlock, Summoner (Ex): Augment Summoning as a bonus feat. "
            "At 6th level, conjuration (summoning) spells have double duration without "
            "changing spell level.",
        ),
        _feature(
            5,
            "Bonus feat",
            "At 5th, 10th, 15th, and 20th level, the arcanist gains a bonus feat. "
            "Each one must be a metamagic feat or an item creation feat, and she "
            "must meet its prerequisites.",
        ),
        _feature(
            8,
            "Arcana, 8th",
            "Mage, Enhanced Counterspell (Ex): add arcanist path level to counterspell "
            "checks, and counter a spell with any prepared spell of the same level and "
            "school. Necromancy and conjuration (summoning) still require dispel magic. "
            "Necromancer, Animate Dead (Su): as the spell, usable a number of times per "
            "day equal to necromancer level divided by 2, controlling up to 2 HD of "
            "undead per level. Warlock, Enslave Outsider (Su): when casting a planar "
            "binding spell, add ranks in a relevant Knowledge skill or Spellcraft, "
            "whichever is higher, to the check to keep the outsider trapped.",
        ),
        _feature(
            10,
            "Bonus feat",
            "At 5th, 10th, 15th, and 20th level, the arcanist gains a bonus feat. "
            "Each one must be a metamagic feat or an item creation feat, and she "
            "must meet its prerequisites.",
        ),
        _feature(
            12,
            "Arcana, 12th",
            "Mage, Arcane Adept (Ex): choose evocation or transmutation. Spells of "
            "that school are cast at +1 caster level and +2 to the save DC. "
            "Necromancer, Dark Arts (Ex): necromancy spells are cast at +1 caster "
            "level and +2 to the save DC. Warlock, Demonologist (Ex): conjuration "
            "(summoning) spells are cast at +1 caster level and +2 to the save DC.",
        ),
        _feature(
            15,
            "Bonus feat",
            "At 5th, 10th, 15th, and 20th level, the arcanist gains a bonus feat. "
            "Each one must be a metamagic feat or an item creation feat, and she "
            "must meet its prerequisites.",
        ),
        _feature(
            16,
            "Arcana, 16th",
            "Mage, Fire and Frost (Ex): prepare one extra spell of each level with "
            "the cold or fire descriptor. That spell is cast as if under Maximize "
            "Spell, without changing its level. Necromancer, Create Undead (Su): "
            "use create undead twice per day or create greater undead once per day, "
            "at the necromancer's path level. Warlock, Demon Mastery (Su): rebuke "
            "or command outsiders as an evil priest rebukes undead, using arcanist "
            "path level. Usable 3 + Charisma modifier times per day.",
        ),
        _feature(
            20,
            "Bonus feat",
            "At 5th, 10th, 15th, and 20th level, the arcanist gains a bonus feat. "
            "Each one must be a metamagic feat or an item creation feat, and she "
            "must meet its prerequisites.",
        ),
    ]


def apply_arcanist_advancement(
    advancement: list[dict[str, Any]],
    _features: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Attach Table 3-4 slots and replace the parsed feature list."""
    rows = [dict(row) for row in advancement]
    for row in rows:
        try:
            level = int(row.get("level") or 0)
        except (TypeError, ValueError):
            continue
        slots = _SPELL_SLOTS.get(level)
        if not slots:
            continue
        row["spell_levels"] = list(_SPELL_LEVELS)
        row["spells_per_day"] = list(slots)
    return rows, arcanist_features()
