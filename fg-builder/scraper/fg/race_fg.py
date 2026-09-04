"""Build Fantasy Grounds 3.5E racial trait nodes with automation hooks."""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from typing import Any

from .xml_builder import IdAllocator, typed_formattedtext, typed_number, typed_string

_ABILITY_LABELS = {
    "str": "Strength",
    "dex": "Dexterity",
    "con": "Constitution",
    "int": "Intelligence",
    "wis": "Wisdom",
    "cha": "Charisma",
}

_ABILITY_EFFECT_KEYS = {
    "str": "STR",
    "dex": "DEX",
    "con": "CON",
    "int": "INT",
    "wis": "WIS",
    "cha": "CHA",
}


def _trait_body(header: str, paragraph: str) -> str:
    return f"<h>{header}</h><p>{paragraph}</p>"


def _format_ability_adjustments(scores: dict[str, int]) -> str:
    positives: list[str] = []
    negatives: list[str] = []
    for key in ("str", "dex", "con", "int", "wis", "cha"):
        val = scores.get(key)
        if not val:
            continue
        label = _ABILITY_LABELS[key]
        text = f"+{val} {label}" if val > 0 else f"{val} {label}"
        (positives if val > 0 else negatives).append(text)
    return ", ".join(positives + negatives)


def build_ability_effect(scores: dict[str, int]) -> str:
    parts: list[str] = []
    for key in ("str", "dex", "con", "int", "wis", "cha"):
        val = scores.get(key)
        if val:
            parts.append(f"{_ABILITY_EFFECT_KEYS[key]}: {val}")
    return "; ".join(parts)


def _speed_name(land: int | None) -> tuple[str, str]:
    if land == 30:
        return "Normal Speed", "Normal Speed"
    if land == 20:
        return "Slow Speed", "Slow Speed"
    if land:
        label = f"Base Speed: {land} ft."
        return label, label
    return "Normal Speed", "Normal Speed"


def _append_trait(
    parent: ET.Element,
    slug: str,
    name: str,
    header: str,
    paragraph: str,
    ids: IdAllocator,
    *,
    locked: bool = True,
    effect: str = "",
) -> ET.Element:
    tnode = ET.SubElement(parent, slug)
    if locked:
        typed_number(tnode, "locked", 1)
    typed_string(tnode, "name", name)
    typed_formattedtext(tnode, "text", _trait_body(header, paragraph))
    if effect:
        effectlist = ET.SubElement(tnode, "effectlist")
        eid = ids.next_id("race_effect", slug)
        enode = ET.SubElement(effectlist, eid)
        typed_string(enode, "label", name)
        typed_string(enode, "apply", "roll")
        typed_string(enode, "target", "all")
        typed_string(enode, "duration", "instant")
        typed_string(enode, "init", "")
        typed_string(enode, "source", "race")
        typed_string(enode, "text", effect)
    return tnode


def append_racial_traits(
    parent: ET.Element,
    fg: dict[str, Any],
    race_name: str,
    ids: IdAllocator,
) -> None:
    traits_el = ET.SubElement(parent, "racialtraits")

    ability_scores = fg.get("ability_scores") or {}
    if ability_scores:
        adj = _format_ability_adjustments(ability_scores)
        _append_trait(
            traits_el,
            "attributes",
            "Attribute Adjustments",
            "Ability Scores",
            adj,
            ids,
            effect=build_ability_effect(ability_scores),
        )

    identity = fg.get("identity") or {}
    size = (identity.get("size") or "Medium").strip()
    race_lower = race_name.lower()
    _append_trait(
        traits_el,
        "size",
        size,
        "Size",
        (
            f"{race_name} are {size} creatures and have no bonuses or penalties "
            f"due to their size."
            if size.lower() == "medium"
            else f"{race_name} are {size} creatures."
        ),
        ids,
    )

    movement = fg.get("movement") or {}
    land = movement.get("land")
    land_int = int(land) if land not in (None, "") else 30
    speed_name, speed_header = _speed_name(land_int)
    _append_trait(
        traits_el,
        "speed",
        speed_name,
        speed_header,
        f"{race_name} have a base speed of {land_int} feet.",
        ids,
    )

    senses = fg.get("senses") or {}
    darkvision = (senses.get("darkvision") or "").strip()
    if darkvision:
        range_text = darkvision if "ft" in darkvision.lower() else f"{darkvision} ft."
        range_text = range_text.rstrip(".")
        _append_trait(
            traits_el,
            "vision",
            "Darkvision",
            "Darkvision",
            (
                f"{race_name} can see in the dark up to {range_text} feet. "
                "Darkvision is black and white only, but it is otherwise like normal sight, "
                f"and {race_lower} can function just fine with no light at all."
            ),
            ids,
        )
    elif senses.get("low_light_vision"):
        _append_trait(
            traits_el,
            "vision",
            "Low-Light Vision",
            "Low-Light Vision",
            (
                f"A {race_lower} can see twice as far as a human in starlight, moonlight, "
                "torchlight, and similar conditions of poor illumination."
            ),
            ids,
        )

    starting = (identity.get("starting_languages") or "").strip()
    bonus = (identity.get("bonus_languages") or "").strip()
    if starting:
        lang_text = f"{race_name} begin play speaking {starting}."
        if bonus:
            lang_text += (
                f" {race_name} with high Intelligence scores can choose from the following: "
                f"{bonus}."
            )
        _append_trait(
            traits_el,
            "languages",
            "Languages",
            "Languages",
            lang_text,
            ids,
        )

    favored = (identity.get("favored_class") or "").strip()
    if favored:
        fc_name = f"Favored Class: {favored}"
        _append_trait(
            traits_el,
            "favoredclass",
            fc_name,
            fc_name,
            (
                f"A multiclass {race_lower}'s {favored.lower()} class does not count when "
                "determining whether they take an experience point penalty."
            ),
            ids,
        )

    for trait in fg.get("traits") or []:
        slug = re.sub(r"[^a-z0-9]", "", (trait.get("slug") or trait.get("name") or "trait").lower())
        if not slug:
            slug = "trait"
        name = trait.get("name") or slug.title()
        text = trait.get("text") or ""
        if text and "<h>" not in text:
            text = _trait_body(name, text)
        tnode = ET.SubElement(traits_el, slug)
        typed_number(tnode, "locked", 1)
        typed_string(tnode, "name", name)
        typed_formattedtext(tnode, "text", text)
        effect = (trait.get("effect") or "").strip()
        if effect:
            effectlist = ET.SubElement(tnode, "effectlist")
            eid = ids.next_id("race_effect", slug)
            enode = ET.SubElement(effectlist, eid)
            typed_string(enode, "label", name)
            typed_string(enode, "apply", "roll")
            typed_string(enode, "target", "all")
            typed_string(enode, "duration", "instant")
            typed_string(enode, "init", "")
            typed_string(enode, "source", "race")
            typed_string(enode, "text", effect)
