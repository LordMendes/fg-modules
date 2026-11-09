"""Fantasy Grounds spell automation for World of Warcraft core (Chapter 17) spells.

The generic parser in scraper/fg/spell_actions.py reads the description text.
For most spells that is enough (save type and SR come from the stat block).
It misreads a few WoW spells, for example Mirror Image gets an Invisible
effect and Geas/Quest gets "d6d6d6" damage from "3d6 points of damage each
day". The entries here replace the generic actions for those spells.

Each entry returns the full action list. The cast action always comes from
the stat block (build_cast_action), with small adjustments where the book's
wording differs from the save or attack the parser sees.

Cast-only entries are deliberate. The emitter can only express "damage on a
failed save" (and half on save), so these spells keep their cast action and
the remaining effect is applied by hand:

- Dimension Door: arrival damage (1d6/2d6/4d6) depends on the landing space.
- Geas/Quest: 3d6 damage and Sickened happen each day, not on cast.
- Insanity: permanent confusion has no duration to automate.
- Phantasmal Killer: 3d6 applies even on a successful Fortitude save, and a
  failed save kills, so neither a fail-only damage nor a save-only effect
  matches the book.
- Shadow Meld: invisibility only applies in darkness after a motionless round.
- Mirror Image, Arcane Mark, Solid Fog, Detect Thoughts: the generic parser
  matched condition words that the book does not apply on cast.

Storm Hammer's daze is applied without a save, because its Fortitude save
only negates the daze while the damage always applies.
"""

from __future__ import annotations

from typing import Any, Callable

from .fg.spell_actions import build_cast_action

ActionBuilder = Callable[[dict[str, Any]], list[dict[str, Any]]]


def _cast(detail: dict[str, Any], **changes: Any) -> dict[str, Any]:
    action = build_cast_action(detail)
    action.update(changes)
    return action


def _damage(dice_count: int, sides: int, damage_type: str = "") -> dict[str, Any]:
    entry: dict[str, Any] = {"dice_list": [f"d{sides}"] * dice_count, "bonus": 0}
    if damage_type:
        entry["damage_type"] = damage_type
    return {"type": "damage", "entries": [entry]}


def _effect(
    label: str,
    *,
    durmod: int = 0,
    durmult: int = 0,
    durunit: str = "",
) -> dict[str, Any]:
    action: dict[str, Any] = {"type": "effect", "label": label}
    if durmod:
        action["durmod"] = durmod
    if durmult:
        action["durmult"] = durmult
    if durunit:
        action["durunit"] = durunit
    return action


def _cast_only(detail: dict[str, Any]) -> list[dict[str, Any]]:
    return [_cast(detail)]


def _hold(detail: dict[str, Any]) -> list[dict[str, Any]]:
    # "1 round/level": one round per caster level, same as hold person.
    return [_cast(detail), _effect("Paralyzed", durmult=1)]


def _storm_hammer(detail: dict[str, Any]) -> list[dict[str, Any]]:
    # 2d6 force on a ranged touch hit. The book adds 2d6 per three caster
    # levels beyond 3rd (max 8d6); that scaling is not expressible here, so the
    # base 2d6 is automated. The daze lasts 1 round.
    return [
        _cast(detail),
        _damage(2, 6, "force"),
        _effect("Dazed", durmod=1),
    ]


def _phantasmal_killer(detail: dict[str, Any]) -> list[dict[str, Any]]:
    return [_cast(detail, savetype="fortitude")]


def _moonglaive(detail: dict[str, Any]) -> list[dict[str, Any]]:
    # Damage as a normal medium weapon: 1d6 slashing.
    return [_cast(detail, atktype="ranged"), _damage(1, 6, "slashing")]


def _invisibility_greater(detail: dict[str, Any]) -> list[dict[str, Any]]:
    return [_cast(detail), _effect("Invisible", durmult=1)]


def _invisibility_mass(detail: dict[str, Any]) -> list[dict[str, Any]]:
    return [_cast(detail), _effect("Invisible", durmult=1, durunit="minute")]


WOW_CORE_SPELL_ACTIONS: dict[str, ActionBuilder] = {
    # Cast-only: the generic parser's extra actions are wrong or conditional.
    "mirror-image-wow": _cast_only,
    "arcane-mark-wow": _cast_only,
    "solid-fog-wow": _cast_only,
    "shadow-meld-wow": _cast_only,
    "detect-thoughts-wow": _cast_only,
    "geas-quest-wow": _cast_only,
    "dimension-door-wow": _cast_only,
    "insanity-wow": _cast_only,
    "phantasmal-killer-wow": _phantasmal_killer,
    # Effects and damage the generic parser misses or misreads.
    "storm-hammer-wow": _storm_hammer,
    "moonglaive-wow": _moonglaive,
    "hold-monster-wow": _hold,
    "hold-monster-mass-wow": _hold,
    "hold-person-mass-wow": _hold,
    "invisibility-greater-wow": _invisibility_greater,
    "invisibility-mass-wow": _invisibility_mass,
}


def spell_actions_for_wow_core(slug: str, detail: dict[str, Any]) -> list[dict[str, Any]] | None:
    builder = WOW_CORE_SPELL_ACTIONS.get(slug)
    if builder is None:
        return None
    return builder(detail)
