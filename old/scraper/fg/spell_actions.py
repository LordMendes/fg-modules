"""Parse spell details into Fantasy Grounds spell action dicts."""

from __future__ import annotations

import math
import re
from typing import Any

from .html_utils import strip_html_to_text

SPELL_EFFECTS = frozenset(
    {
        "blinded",
        "confused",
        "cowering",
        "dazed",
        "dazzled",
        "deafened",
        "entangled",
        "exhausted",
        "fascinated",
        "frightened",
        "helpless",
        "invisible",
        "panicked",
        "paralyzed",
        "shaken",
        "sickened",
        "slowed",
        "stunned",
        "unconscious",
    }
)

DAMAGE_TYPES = frozenset(
    {
        "acid",
        "bludgeoning",
        "cold",
        "electricity",
        "fire",
        "force",
        "negative",
        "nonlethal",
        "piercing",
        "positive",
        "slashing",
        "sonic",
        "untyped",
    }
)

_WORD_RE = re.compile(
    r"\+\d+|"
    r"\d+d\d+|"
    r"d\d+|"
    r"[a-z]+(?:'[a-z]+)?|"
    r"\d+|"
    r"\+"
)


def _normalize_desc(text: str) -> str:
    text = text.lower()
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    return text


def parse_words(text: str) -> list[str]:
    return _WORD_RE.findall(_normalize_desc(text))


def _is_word(word: str | None, targets: str | list[str]) -> bool:
    if word is None:
        return False
    if isinstance(targets, str):
        targets = [targets]
    w = word.strip(".,;:!?()[]\"")
    return w in targets


def _is_dice_string(word: str | None) -> bool:
    if not word:
        return False
    return bool(re.fullmatch(r"\d*d\d+|\d+", word))


def _convert_string_to_dice(dice_str: str) -> tuple[list[str], int]:
    dice_str = dice_str.strip().lower()
    m = re.fullmatch(r"(\d*)d(\d+)", dice_str)
    if m:
        count = int(m.group(1) or "1")
        sides = m.group(2)
        return [f"d{sides}"] * count, 0
    if re.fullmatch(r"\d+", dice_str):
        return [], int(dice_str)
    return [], 0


def _word_at(words: list[str], index: int) -> str | None:
    if 0 <= index < len(words):
        return words[index]
    return None


def _is_damage_type(word: str | None) -> bool:
    if not word:
        return False
    return word.strip(".,;:!?()[]\"") in DAMAGE_TYPES


def _capitalize(word: str) -> str:
    return word[:1].upper() + word[1:]


def _add_cast_action(detail: dict[str, Any]) -> dict[str, Any]:
    action: dict[str, Any] = {"type": "cast"}

    save = str(detail.get("saving_throw") or "").lower()
    if "harmless" not in save:
        if save.startswith("fortitude "):
            action["savetype"] = "fortitude"
        elif save.startswith("reflex "):
            action["savetype"] = "reflex"
        elif save.startswith("will "):
            action["savetype"] = "will"
        if "half" in save:
            action["onmissdamage"] = "half"

    sr = str(detail.get("spell_resistance") or "").lower()
    if "harmless" in sr or sr.startswith("no"):
        action["srnotallowed"] = True

    desc = _spell_description(detail).lower()
    if "ranged touch attack" in desc:
        action["atktype"] = "rtouch"
    elif "melee touch attack" in desc:
        action["atktype"] = "mtouch"
    elif "normal ranged attack" in desc:
        action["atktype"] = "ranged"

    name = str(detail.get("name") or detail.get("title") or "").lower()
    dc_match = re.search(r"\(dc (\d+)\)", name)
    if dc_match:
        n_custom_dc = int(dc_match.group(1))
        if n_custom_dc > 0:
            action["savedctype"] = "fixed"
            action["savedcmod"] = n_custom_dc

    return action


def _spell_description(detail: dict[str, Any]) -> str:
    text = detail.get("description_text")
    if text:
        return str(text)
    return strip_html_to_text(str(detail.get("description_html") or ""))


def _parse_damage_and_heal(words: list[str]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    damages: list[dict[str, Any]] = []
    heals: list[dict[str, Any]] = []

    i = 0
    while i < len(words):
        if not _is_word(words[i], "damage"):
            i += 1
            continue

        j = i - 1
        damage_type = ""
        if j >= 0 and _is_damage_type(words[j]):
            damage_type = words[j].strip(".,;:!?()[]\"")
            j -= 1

        if _is_word(words[j], "of"):
            j -= 1

        roll_type: str | None = None
        roll_dice: str | None = None
        if _is_word(words[j], ("points", "point")):
            j -= 1
            if _is_word(words[j], "hit"):
                j -= 1
            if _is_dice_string(words[j]):
                roll_dice = words[j]
                j -= 1
                if _is_word(
                    words[j],
                    ("deal", "deals", "take", "takes", "dealt", "dealing", "taking", "causes"),
                ):
                    roll_type = "damage"
                elif _is_word(words[j], ("cure", "cures")):
                    roll_type = "heal"
                elif _is_word(words[j], ("damage", "and", "or")):
                    roll_type = "damage"
                elif _is_word(words[j], ("yellow", "orange", "red")):
                    roll_type = "damage"

        if roll_type and roll_dice:
            k = i + 1
            point_mode = False
            half_level = False
            max_roll_dice: str | None = None

            if _is_word(words[k], "+1") and _is_word(words[k + 1], "point"):
                point_mode = True
                k += 2
            elif (
                _is_word(words[k], "+")
                and _is_word(words[k + 1], "1")
                and _is_word(words[k + 2], "point")
            ):
                point_mode = True
                k += 3

            if _is_word(words[k], "per"):
                k += 1
                if _is_word(words[k], "two"):
                    k += 1
                    half_level = True
                if _is_word(words[k], "caster"):
                    k += 1
                if _is_word(words[k], ("level", "levels")):
                    k += 1
                    scaling = True
                    if (
                        _is_word(words[k], "of")
                        and _is_word(words[k + 1], "the")
                        and _is_word(words[k + 2], "caster")
                    ):
                        k += 3
                    if _is_word(words[k], "maximum"):
                        max_roll_dice = words[k + 1]
                    elif (
                        _is_word(words[k], "to")
                        and _is_word(words[k + 1], "a")
                        and _is_word(words[k + 2], "maximum")
                        and _is_word(words[k + 3], "of")
                    ):
                        max_roll_dice = words[k + 4]
                else:
                    scaling = False
            else:
                scaling = False

            dice_list, n_mod = _convert_string_to_dice(roll_dice)
            entry: dict[str, Any] = {"dice_list": dice_list, "bonus": n_mod}
            if damage_type:
                entry["damage_type"] = damage_type

            if scaling:
                mult = "halfcl" if half_level else "cl"
                if point_mode or not dice_list:
                    entry["stat"] = mult
                else:
                    entry["dicestat"] = mult
                if max_roll_dice:
                    max_dice, max_mod = _convert_string_to_dice(max_roll_dice)
                    if point_mode:
                        entry["max_stat"] = max_mod
                    elif dice_list:
                        entry["max_stat"] = math.floor(len(max_dice) / len(dice_list))
                    elif n_mod:
                        entry["max_stat"] = math.floor(max_mod / n_mod)

            if roll_type == "heal":
                heals.append(entry)
            else:
                damages.append(entry)

        i += 1

    return damages, heals


def _parse_effects(words: list[str], duration: str) -> list[dict[str, Any]]:
    effects: list[dict[str, Any]] = []

    i = 0
    while i < len(words):
        if _is_word(words[i], SPELL_EFFECTS):
            k = i
            while k + 1 < len(words) and (
                _is_word(words[k + 1], SPELL_EFFECTS) or _is_word(words[k + 1], "and")
            ):
                k += 1

            valid = False
            j = i - 1
            if j >= 0 and _is_word(words[j], ("immediately", "only")):
                j -= 1
            if j >= 0 and _is_word(words[j], ("is", "are")):
                if not _is_word(_word_at(words, j - 1), ("beams", "power", "that")):
                    valid = True
            elif j >= 0 and _is_word(words[j], ("become", "becomes")):
                if not _is_word(_word_at(words, j - 1), ("not", "never")):
                    valid = True
            elif j >= 0 and _is_word(words[j], "being"):
                if not _is_word(_word_at(words, j - 1), "as"):
                    valid = True
            elif j >= 0 and _is_word(
                words[j], ("be", "and", "or", "then", "remains", "subject")
            ):
                valid = True

            if valid:
                effect_words = [
                    _capitalize(words[z])
                    for z in range(i, k + 1)
                    if words[z] != "and"
                ]
                effect: dict[str, Any] = {"label": "; ".join(effect_words)}

                m = k + 1
                if (
                    _is_word(_word_at(words, m), "as")
                    and _is_word(_word_at(words, m + 1), "by")
                    and _is_word(_word_at(words, m + 2), "the")
                    and _is_word(_word_at(words, m + 4), "spell")
                ):
                    m += 5
                if _is_word(_word_at(words, m), "for"):
                    m += 1
                    if _is_dice_string(_word_at(words, m)):
                        dice_mod = words[m]
                        m += 1
                        units: str | None = None
                        if _is_word(_word_at(words, m), ("round", "rounds")):
                            units = ""
                        elif _is_word(_word_at(words, m), ("minute", "minutes")):
                            units = "minute"
                        elif _is_word(_word_at(words, m), ("hour", "hours")):
                            units = "hour"
                        elif _is_word(_word_at(words, m), ("day", "days")):
                            units = "day"
                        m += 1
                        if units is not None:
                            dice_list, n_mod = _convert_string_to_dice(dice_mod)
                            effect["durdice_list"] = dice_list
                            effect["durmod"] = n_mod
                            effect["durunit"] = units
                            if (
                                _is_word(_word_at(words, m), "per")
                                and _is_word(_word_at(words, m + 1), "caster")
                                and _is_word(_word_at(words, m + 2), "level")
                            ):
                                effect["durmult"] = n_mod
                                effect.pop("durmod", None)

                effects.append(effect)
            i = k

        elif (
            _is_word(words[i], ("daze", "dazes"))
            and _is_word(_word_at(words, i + 1), "one")
            and _is_word(_word_at(words, i + 2), "living")
            and _is_word(_word_at(words, i + 3), "creature")
        ):
            effects.append({"label": "Dazed"})
            i += 3

        i += 1

    final: list[dict[str, Any]] = []
    seen: set[str] = set()
    for effect in effects:
        label = effect["label"]
        if label not in seen:
            seen.add(label)
            final.append(effect)
    return final


def _apply_spell_duration(effect: dict[str, Any], duration: str) -> None:
    words = parse_words(duration)
    i = 0
    if not words or not re.fullmatch(r"\d+", words[0]):
        return

    n_spell_dur = int(words[0])
    i = 1
    units: str | None = None
    if _is_word(_word_at(words, i), ("round", "rounds")):
        units = ""
    elif _is_word(_word_at(words, i), ("min", "minute", "minutes")):
        units = "minute"
    elif _is_word(_word_at(words, i), ("hour", "hours")):
        units = "hour"
    elif _is_word(_word_at(words, i), ("day", "days")):
        units = "day"

    if units is None:
        return

    i += 1
    mult = 1.0
    if _is_word(_word_at(words, i), "per"):
        i += 1
        if _is_word(_word_at(words, i), "two"):
            mult = 0.5
            i += 1
        elif _is_word(_word_at(words, i), "three"):
            mult = 0.34
            i += 1

    use_cl = _is_word(_word_at(words, i), ("level", "levels"))
    effect["durunit"] = units
    if use_cl:
        effect["durmult"] = max(math.floor(n_spell_dur * mult), int(mult))
    else:
        effect["durmod"] = n_spell_dur


def _finalize_effects(effects: list[dict[str, Any]], duration: str) -> list[dict[str, Any]]:
    for effect in effects:
        if "durunit" not in effect and duration:
            _apply_spell_duration(effect, duration)
    return effects


def build_spell_actions(detail: dict[str, Any]) -> list[dict[str, Any]]:
    """Build FG spell action dicts from scraped spell detail."""
    actions: list[dict[str, Any]] = [_add_cast_action(detail)]

    desc = _spell_description(detail)
    words = parse_words(desc)
    duration = str(detail.get("duration") or "")

    damages, heals = _parse_damage_and_heal(words)
    for entry in damages:
        actions.append({"type": "damage", "entries": [entry]})
    for entry in heals:
        actions.append({"type": "heal", "entries": [entry]})

    effects = _finalize_effects(_parse_effects(words, duration), duration)
    for effect in effects:
        actions.append({"type": "effect", **effect})

    return actions
