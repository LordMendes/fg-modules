"""Warcraft RPG (WRPG) helpers for Fantasy Grounds module generation."""

from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup

PHB_CLONE_SLUGS: dict[str, str] = {
    "barbarian-wrpg": "Barbarian",
    "fighter-wrpg": "Fighter",
    "rogue-wrpg": "Rogue",
    "sorcerer-wrpg": "Sorcerer",
    "wizard-wrpg": "Wizard",
}

# Prestige clones that reuse a core book class table/features.
CORE_CLONE_SLUGS: dict[str, tuple[str, str]] = {
    # slug -> (core class name, source abbrev)
    "horde-assassin-wrpg": ("Assassin", "DMG"),
}

COSMOLOGY_SPELL_SLUG = "warcraft-cosmology-wrpg"

_ABILITY_RE = re.compile(
    r"([+\-\u2212\u2013]\s*\d+)\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|"
    r"Agility|Stamina|Intellect|Spirit|"
    r"Str|Dex|Con|Int|Wis|Cha|Agy|Sta|Spt)\b",
    re.I,
)
_ABILITY_KEY = {
    "strength": "str",
    "str": "str",
    "dexterity": "dex",
    "dex": "dex",
    "agility": "dex",
    "agy": "dex",
    "constitution": "con",
    "con": "con",
    "stamina": "con",
    "sta": "con",
    "intelligence": "int",
    "int": "int",
    "intellect": "int",
    "wisdom": "wis",
    "wis": "wis",
    "spirit": "wis",
    "spt": "wis",
    "charisma": "cha",
    "cha": "cha",
}
_SPEED_RE = re.compile(r"(?:base land speed|land speed|speed)\s*(?:of\s*|is\s*)?(\d+)\s*ft", re.I)
_DARKVISION_RE = re.compile(r"darkvision\b(?:[^.]{0,80}?)(\d+)\s*(?:ft\.?|feet)", re.I)
_FAVORED_RE = re.compile(r"Favored Class:\s*([^.<]+)", re.I)
_AUTO_LANG_RE = re.compile(r"Automatic Languages?:\s*([^.]+?)(?:\.|$)", re.I)
_BONUS_LANG_RE = re.compile(r"Bonus(?: Languages?)?:\s*([^.]+?)(?:\.|$)", re.I)
_ORDINAL_LEVEL_RE = re.compile(r"^(\d+)(?:st|nd|rd|th)?$", re.I)
_WRPG_CASTER_BUMP_RE = re.compile(r"^\+?\s*1\s+(divine|arcane)\b", re.I)


def advancement_table_column_count(html: str) -> int:
    if not html or "<table" not in html.lower():
        return 0
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if not table:
        return 0
    header_row = table.find("tr")
    if not header_row:
        return 0
    return len(header_row.find_all(["th", "td"]))


def parse_advancement_html(html: str) -> list[dict[str, Any]]:
    """Parse WRPG advancement HTML into automation rows.

    Extra spell-slot columns after Special become spells_per_day (list).
    """
    if not html or "<table" not in html.lower():
        return []
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if not table:
        return []
    rows_el = table.find_all("tr")
    if not rows_el:
        return []

    headers = [c.get_text(" ", strip=True).lower() for c in rows_el[0].find_all(["th", "td"])]
    column_keys = [_advancement_header_key(header) for header in headers]
    named = any(key in {"bab", "fort", "ref", "will"} for key in column_keys)
    special_idx = next((i for i, h in enumerate(headers) if "special" in h), 5)
    rows: list[dict[str, Any]] = []
    for tr in rows_el[1:]:
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
        if len(cells) < 2:
            continue
        level_raw = cells[0].replace(" ", "")
        match = _ORDINAL_LEVEL_RE.match(level_raw)
        if not match:
            continue
        row: dict[str, Any] = {"level": int(match.group(1))}
        if named:
            slots: list[str] = []
            unlabeled: list[str] = []
            special_at = next(
                (i for i, key in enumerate(column_keys) if key == "special"),
                None,
            )
            for index, key in enumerate(column_keys):
                if index >= len(cells) or key == "level":
                    continue
                value = cells[index]
                if key == "slot":
                    slots.append(value)
                elif key == "":
                    if special_at is not None and index > special_at:
                        unlabeled.append(value)
                elif key == "spellcasting":
                    row["spellcasting"] = value
                else:
                    row[key] = value
            if slots:
                row["spells_per_day"] = slots
            elif len(unlabeled) == 1:
                _apply_spellcasting_cell(row, unlabeled[0])
                if "spellcasting" not in row and unlabeled[0]:
                    row["spells_per_day"] = unlabeled
            elif unlabeled:
                row["spells_per_day"] = unlabeled
            _apply_spellcasting_cell(row, row.get("spellcasting") or "")
        elif len(cells) >= 6:
            row["bab"] = cells[1]
            row["fort"] = cells[2]
            row["ref"] = cells[3]
            row["will"] = cells[4]
            row["special"] = cells[special_idx] if special_idx < len(cells) else cells[5]
            extra = cells[special_idx + 1 :] if special_idx + 1 < len(cells) else []
            if extra:
                row["spells_per_day"] = extra
                if len(extra) == 1:
                    _apply_spellcasting_cell(row, extra[0])
        else:
            row["special"] = cells[-1]
        rows.append(row)
    return rows


def _advancement_header_key(header: str) -> str:
    """Map a table header to an advancement field."""
    h = re.sub(r"\s+", " ", header or "").strip().lower()
    if h in {"level", "lvl", "class level"}:
        return "level"
    if h == "bab" or "attack" in h or h.startswith("base attack"):
        return "bab"
    if h.startswith("fort"):
        return "fort"
    if h.startswith("ref"):
        return "ref"
    if h.startswith("will"):
        return "will"
    if "special" in h:
        return "special"
    if "ac" in h and "bonus" in h:
        return "ac_bonus"
    if re.fullmatch(r"\d+(?:st|nd|rd|th)?", h):
        return "slot"
    if "spell" in h:
        return "spellcasting"
    return ""


def _apply_spellcasting_cell(row: dict[str, Any], cell: str) -> None:
    cell = (cell or "").strip()
    if not cell:
        return
    bump = _WRPG_CASTER_BUMP_RE.match(cell)
    if bump:
        kind = bump.group(1).lower()
        row["spellcasting"] = f"+1 level of existing {kind} spellcasting class"
    elif "level" in cell.lower():
        row["spellcasting"] = cell


_STANDARD_ADVANCEMENT_HEADER = re.compile(
    r"^(?:level|lvl|class level|bab|fort(?:itude)?(?: save)?|"
    r"ref(?:lex)?(?: save)?|will(?: save)?|special)$",
    re.I,
)


def advancement_html_has_extra_columns(html: str) -> bool:
    """True when the table has columns a rebuilt Level/BAB/saves/Special table would drop."""
    if not html or "<table" not in html.lower():
        return False
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    header_row = table.find("tr") if table else None
    if not header_row:
        return False
    for cell in header_row.find_all(["th", "td"]):
        header = cell.get_text(" ", strip=True)
        if not header:
            continue
        if _STANDARD_ADVANCEMENT_HEADER.match(header):
            continue
        if _advancement_header_key(header) == "bab":
            continue
        return True
    return False


def prefer_rich_advancement_html(detail: dict[str, Any]) -> bool:
    original = detail.get("advancement_html") or ""
    if advancement_table_column_count(original) > 7:
        return True
    if advancement_html_has_extra_columns(original):
        return True
    return any(
        isinstance(r, dict) and (r.get("spells_per_day") or r.get("ac_bonus"))
        for r in (detail.get("advancement") or [])
    )


def parse_ability_scores(text: str) -> dict[str, int]:
    scores: dict[str, int] = {}
    for match in _ABILITY_RE.finditer(text or ""):
        key = _ABILITY_KEY.get(match.group(2).lower())
        if key:
            raw = match.group(1).replace("\u2212", "-").replace("\u2013", "-").replace(" ", "")
            scores[key] = scores.get(key, 0) + int(raw)
    return scores


def _land_speed(speed_field: str, bullet_text: str) -> int:
    for source in (speed_field, bullet_text):
        match = _SPEED_RE.search(source or "")
        if match:
            return int(match.group(1))
        match2 = re.search(r"Land\s+(\d+)\s*ft", source or "", re.I)
        if match2:
            return int(match2.group(1))
    return 30


def _trait_effect_for_bullet(text: str) -> tuple[str, str] | None:
    lower = text.lower()
    if "extra feat" in lower:
        return ("Bonus Feat", "")
    if "extra skill points" in lower or "extra skill point" in lower:
        return ("Bonus Skill Points", "")
    m = re.search(r"\+(\d+)\s+racial bonus on saves vs\.?\s*fear", text, re.I)
    if m:
        return ("Fear Resistance", f"SAVE: {m.group(1)} vs fear")
    m = re.search(r"\+(\d+)\s+racial bonus on attack rolls against orcs", text, re.I)
    if m:
        return ("Orc Foe", f"ATK: {m.group(1)} vs orc")
    m = re.search(r"\+(\d+)\s+racial bonus on attack rolls against humans", text, re.I)
    if m:
        return ("Human Foe", f"ATK: {m.group(1)} vs human")
    m = re.search(r"\+(\d+)\s+racial bonus on saves vs\.?\s*poison", text, re.I)
    if m:
        return ("Poison Resistance", f"SAVE: {m.group(1)} vs poison")
    m = re.search(r"\+(\d+)\s+attack vs\.?\s*giants", text, re.I)
    if m:
        return ("Giant Killer", f"ATK: {m.group(1)} vs giant")
    if "stone flesh" in lower:
        return ("Stone Flesh", "AC: 2 natural")
    if "shadowmeld" in lower or "shadow meld" in lower:
        return ("Shadowmeld", "SKILL: 10 hide")
    m = re.search(r"spell resistance\s*(\d+)\s*\+\s*character level", text, re.I)
    if m:
        return ("Spell Resistance", f"SR: {m.group(1)} + level")
    m = re.search(r"\+(\d+)\s+racial bonus on\s+(.+?)(?:\s*\(|;|$)", text, re.I)
    if m and "saves" not in m.group(2).lower() and "attack" not in m.group(2).lower():
        skills = m.group(2).strip().rstrip(".")
        first = re.split(r",| and ", skills)[0].strip()
        slug = re.sub(r"[^a-z0-9]+", " ", first.lower()).strip()
        if slug and len(slug) < 40:
            return (f"Skill Bonus ({first})", f"SKILL: {m.group(1)} {slug}")
    named = (
        ("battle rage", "Battle Rage"),
        ("tauren charge", "Tauren Charge"),
        ("stability", "Stability"),
        ("stonecunning", "Stonecunning"),
        ("arcane ability", "Arcane Ability"),
        ("magic addiction", "Magic Addiction"),
        ("empowered magic", "Empowered Magic"),
        ("elven blood", "Elven Blood"),
        ("orc blood", "Orc Blood"),
        ("weapon familiarity", "Weapon Familiarity"),
        ("martial weapon proficiency", "Weapon Familiarity"),
        ("arcane prohibition", "Arcane Prohibition"),
        ("cold resistance", "Energy Resistance"),
        ("fire resistance", "Energy Resistance"),
        ("gore", "Tauren Charge"),
    )
    for needle, name in named:
        if needle in lower:
            return (name, "")
    return None


def build_race_fg(record: dict[str, Any]) -> dict[str, Any]:
    html = record.get("description_html") or ""
    soup = BeautifulSoup(html, "lxml")
    bullets = [li.get_text(" ", strip=True) for li in soup.find_all("li")]
    joined = " ".join(bullets)
    text_blob = joined or (record.get("description_text") or "")

    ability_scores = parse_ability_scores(text_blob)
    size = (record.get("size") or "Medium").strip()
    land = _land_speed(record.get("speed") or "", text_blob)

    darkvision = ""
    dv = _DARKVISION_RE.search(text_blob)
    if dv:
        darkvision = f"{dv.group(1)} ft."
    low_light = bool(re.search(r"low-?light vision", text_blob, re.I))
    superior_ll = bool(re.search(r"superior low-?light", text_blob, re.I))

    auto_lang = ""
    bonus_lang = ""
    for bullet in bullets:
        am = _AUTO_LANG_RE.search(bullet)
        if am:
            auto_lang = am.group(1).strip()
        bm = _BONUS_LANG_RE.search(bullet)
        if bm:
            bonus_lang = bm.group(1).strip()
    if not auto_lang:
        raw = (record.get("languages_text") or record.get("languages_html") or "").strip()
        auto_lang = BeautifulSoup(raw, "lxml").get_text(" ", strip=True) if raw else ""

    favored = "Any"
    for bullet in bullets:
        fm = _FAVORED_RE.search(bullet)
        if fm:
            favored = fm.group(1).strip()
            favored = re.sub(r"\s*\(.*?\)\s*", " ", favored).strip()
            favored = re.sub(r"\s+Level Adjustment.*$", "", favored, flags=re.I).strip()
            break

    traits: list[dict[str, Any]] = []
    skip_prefixes = (
        "medium",
        "small",
        "large",
        "base land speed",
        "automatic language",
        "favored class",
        "level adjustment",
    )
    for bullet in bullets:
        lower = bullet.lower().strip()
        if not lower:
            continue
        if any(lower.startswith(p) for p in skip_prefixes):
            continue
        if _ABILITY_RE.match(bullet) and len(bullet) < 60:
            continue
        if "darkvision" in lower and len(bullet) < 80:
            continue
        if re.fullmatch(r".*low-?light vision\.?", lower):
            continue
        mapped = _trait_effect_for_bullet(bullet)
        if mapped:
            name, effect = mapped
            traits.append({"name": name, "text": bullet, "effect": effect, "slug": name})
        else:
            name = bullet.split(":")[0].strip()
            if len(name) > 48:
                name = name[:45] + "..."
            traits.append({"name": name, "text": bullet, "effect": "", "slug": name})

    if superior_ll:
        traits.insert(
            0,
            {
                "name": "Superior Low-Light Vision",
                "text": (
                    "Superior low-light vision: see three times as far as a human "
                    "in poor light."
                ),
                "effect": "",
                "slug": "superiorlowlightvision",
            },
        )

    return {
        "ability_scores": ability_scores,
        "identity": {
            "size": size,
            "type": record.get("type") or "",
            "level_adjustment": record.get("level_adjustment")
            or (record.get("index") or {}).get("level_adjustment")
            or "",
            "starting_languages": auto_lang,
            "bonus_languages": bonus_lang,
            "favored_class": favored,
        },
        "movement": {"land": land},
        "senses": {
            "darkvision": darkvision,
            "low_light_vision": low_light or superior_ll,
        },
        "traits": traits,
        "summary_text": html,
    }


def expand_wrpg_spell_hook_text(text: str) -> str:
    if not text:
        return text

    def _full(token: str) -> str:
        return {
            "wis": "Wisdom",
            "wisdom": "Wisdom",
            "int": "Intelligence",
            "intelligence": "Intelligence",
            "cha": "Charisma",
            "charisma": "Charisma",
        }.get(token.lower(), token)

    text = re.sub(
        r"Needs?\s+(Wisdom|Intelligence|Charisma|Wis|Int|Cha)\s*10\s*\+\s*spell level",
        lambda m: f"must have a {_full(m.group(1))} score equal to 10 + the spell's level",
        text,
        flags=re.I,
    )
    text = re.sub(
        r"Requires?\s+(Wisdom|Intelligence|Charisma)\s+10\s*\+\s*spell level",
        lambda m: f"must have a {m.group(1)} score equal to 10 + the spell's level",
        text,
        flags=re.I,
    )
    return text


# Alias used by dndtools_adapter.convert_class.
expand_wrpg_spell_hook_text = expand_wrpg_spell_hook_text


def _cast(
    *,
    save: str = "",
    atk: str = "",
    onmiss: str = "",
    school: str = "",
    tags: str = "",
) -> dict[str, Any]:
    action: dict[str, Any] = {"type": "cast", "stype": "spell"}
    if save:
        action["savetype"] = save
    if atk:
        action["atktype"] = atk
    if onmiss:
        action["onmissdamage"] = onmiss
    if school:
        action["school"] = school
    if tags:
        action["othertags"] = tags
    return action


def _damage(
    dice: str,
    dtype: str,
    *,
    bonus: int = 0,
    stat: str = "",
    statmax: int = 0,
) -> dict[str, Any]:
    entry: dict[str, Any] = {"dice": dice, "bonus": bonus, "type": dtype}
    if stat:
        entry["dicestat"] = stat
        if statmax:
            entry["dicestatmax"] = statmax
    return {"type": "damage", "entries": [entry]}


def _heal(dice: str, *, stat: str = "cl", statmax: int = 0, bonus: int = 0) -> dict[str, Any]:
    entry: dict[str, Any] = {"dice": dice, "bonus": bonus}
    if stat:
        entry["stat"] = stat
        if statmax:
            entry["statmax"] = statmax
        entry["statmult"] = 1
    return {"type": "heal", "entries": [entry]}


def _effect(label: str, *, durmod: int = 0, durunit: str = "round") -> dict[str, Any]:
    return {
        "type": "effect",
        "label": label,
        "durmod": durmod,
        "durunit": durunit,
        "durdice": "",
    }


# Keys must match supplemental warcraft_rpg_spells.json slugs exactly.
WRPG_SPELL_ACTION_OVERRIDES: dict[str, list[dict[str, Any]]] = {
    "cripple-wrpg": [
        _cast(save="will", school="transmutation"),
        _effect("Crippled", durmod=1, durunit="round"),
    ],
    "stasis-trap-wrpg": [
        _cast(save="will", school="conjuration"),
        _effect("Paralyzed", durmod=1, durunit="round"),
    ],
    "ice-armor-wrpg": [
        _cast(save="will", school="abjuration", tags="cold; "),
        _effect("AC: 4 armor", durmod=10, durunit="minute"),
    ],
    "banish-wrpg": [_cast(save="will", school="abjuration")],
    "healing-rain-wrpg": [
        _cast(save="fortitude", school="conjuration", tags="healing; "),
        _heal("d8", stat="cl", statmax=10),
    ],
    "fire-rain-wrpg": [
        _cast(school="evocation", tags="fire; "),
        _damage("d6", "fire", stat="cl", statmax=10),
    ],
    "bloodlust-wrpg": [
        _cast(save="fortitude", school="transmutation"),
        _effect("Haste", durmod=1, durunit="round"),
    ],
    "mana-burn-wrpg": [_cast(save="will", school="abjuration")],
    "carrion-swarm-wrpg": [
        _cast(save="reflex", onmiss="half", school="conjuration"),
        _damage("d4", "slashing", stat="cl", statmax=10),
    ],
    "thorns-shield-wrpg": [
        _cast(school="transmutation"),
        _damage("d6", "piercing"),
    ],
    "lightning-shield-wrpg": [
        _cast(school="evocation", tags="electricity; "),
        _damage("d6", "electricity"),
    ],
    "death-coil-wrpg": [
        _cast(save="will", onmiss="half", school="necromancy", tags="negative; "),
        _damage("d8", "negative", stat="cl", statmax=10),
        _heal("d8", stat="cl", statmax=10),
    ],
    "lesser-death-coil-wrpg": [
        _cast(save="will", onmiss="half", school="necromancy", tags="negative; "),
        _damage("d6", "negative", stat="cl", statmax=5),
        _heal("d6", stat="cl", statmax=5),
    ],
    "greater-death-coil-wrpg": [
        _cast(save="will", onmiss="half", school="necromancy", tags="negative; "),
        _damage("d10", "negative", stat="cl", statmax=15),
        _heal("d10", stat="cl", statmax=15),
    ],
    "falling-star-wrpg": [
        _cast(save="reflex", onmiss="half", school="evocation"),
        _damage("d6", "untyped", stat="cl", statmax=15),
    ],
    "force-of-nature-wrpg": [_cast(school="conjuration")],
    "greater-force-of-nature-wrpg": [_cast(school="conjuration")],
    "moon-glaive-spell-wrpg": [
        _cast(atk="ranged", school="evocation"),
        _damage("d6", "slashing", stat="cl", statmax=5),
    ],
    "immolation-wrpg": [
        _cast(school="evocation", tags="fire; "),
        _damage("d6", "fire", stat="cl", statmax=10),
    ],
    "glacial-burst-wrpg": [
        _cast(save="reflex", onmiss="half", school="evocation", tags="cold; "),
        _damage("d6", "cold", stat="cl", statmax=10),
        _effect("Slowed", durmod=1, durunit="round"),
    ],
    "stormhammer-spell-wrpg": [
        _cast(save="fortitude", atk="ranged", school="evocation", tags="electricity; "),
        _damage("d6", "electricity", stat="cl", statmax=10),
        _effect("Dazed", durmod=1, durunit="round"),
    ],
    "blend-with-shadows-wrpg": [
        _cast(school="illusion"),
        _effect("Invisible", durmod=1, durunit="minute"),
    ],
    "razor-blizzard-wrpg": [
        _cast(school="evocation", tags="cold; "),
        _damage("d6", "cold", stat="cl", statmax=10),
    ],
    "shockwave-wrpg": [
        _cast(save="reflex", school="evocation"),
        _damage("d8", "bludgeoning", stat="cl", statmax=10),
        _effect("Prone"),
    ],
    "entangling-roots-wrpg": [
        _cast(save="reflex", school="transmutation"),
        _effect("Entangled", durmod=1, durunit="round"),
    ],
    "rejuvenation-wrpg": [
        _cast(save="fortitude", school="conjuration", tags="healing; "),
        _heal("d6", stat="cl", statmax=5),
    ],
    "roar-wrpg": [
        _cast(school="enchantment"),
        _effect("ATK: 2", durmod=1, durunit="round"),
    ],
    "second-soul-wrpg": [_cast(school="necromancy")],
    "sentinel-wrpg": [_cast(school="divination")],
    "blade-storm-wrpg": [
        _cast(school="transmutation"),
        _damage("d6", "slashing", stat="cl", statmax=10),
    ],
    "touch-of-life-wrpg": [
        _cast(school="conjuration", tags="healing; "),
        _heal("d8", stat="cl", statmax=20),
    ],
    "healing-totem-wrpg": [
        _cast(save="fortitude", school="conjuration", tags="healing; "),
        _heal("d6", stat="cl", statmax=10),
    ],
    "serpent-totem-wrpg": [
        _cast(save="reflex", onmiss="half", school="conjuration"),
        _damage("d6", "piercing", stat="cl", statmax=10),
    ],
}


def spell_actions_for_wrpg(slug: str) -> list[dict[str, Any]] | None:
    if slug == COSMOLOGY_SPELL_SLUG:
        return None
    return WRPG_SPELL_ACTION_OVERRIDES.get(slug)


# Fantasy Grounds 3.5E item weapons. Subtype must contain "melee", "ranged",
# or "firearm". "two-handed" in the subtype applies 1.5x Strength. "double"
# in properties splits the slash-separated damage dice into two weapon heads.
_WEAPON_PROFICIENCY: dict[str, tuple[str, str]] = {
    "gauntlet": ("Simple", "light"),
    "dagger": ("Simple", "light"),
    "gauntlet spiked": ("Simple", "light"),
    "mace light": ("Simple", "light"),
    "sickle": ("Simple", "light"),
    "club": ("Simple", "light"),
    "mace heavy": ("Simple", "one-handed"),
    "morningstar": ("Simple", "one-handed"),
    "shortspear": ("Simple", "one-handed"),
    "longspear": ("Simple", "two-handed"),
    "quarterstaff": ("Simple", "two-handed"),
    "spear": ("Simple", "two-handed"),
    "crossbow heavy": ("Simple", "ranged"),
    "crossbow light": ("Simple", "ranged"),
    "dart": ("Simple", "ranged"),
    "javelin": ("Simple", "ranged"),
    "sling": ("Simple", "ranged"),
    "axe throwing": ("Martial", "light"),
    "handaxe": ("Martial", "light"),
    "kukri": ("Martial", "light"),
    "pick light": ("Martial", "light"),
    "battleaxe": ("Martial", "one-handed"),
    "bayonet miniature": ("Martial", "one-handed"),
    "flail": ("Martial", "one-handed"),
    "longsword": ("Martial", "one-handed"),
    "pick heavy": ("Martial", "one-handed"),
    "scimitar": ("Martial", "one-handed"),
    "shield heavy": ("Martial", "one-handed"),
    "trident": ("Martial", "one-handed"),
    "warblade": ("Martial", "one-handed"),
    "warhammer": ("Martial", "one-handed"),
    "bayonet": ("Martial", "two-handed"),
    "falchion": ("Martial", "two-handed"),
    "flail heavy": ("Martial", "two-handed"),
    "glaive": ("Martial", "two-handed"),
    "greataxe": ("Martial", "two-handed"),
    "greatclub": ("Martial", "two-handed"),
    "greathammer": ("Martial", "two-handed"),
    "greatsword": ("Martial", "two-handed"),
    "halberd": ("Martial", "two-handed"),
    "lance": ("Martial", "two-handed"),
    "scythe": ("Martial", "two-handed"),
    "longbow": ("Martial", "ranged"),
    "longbow composite": ("Martial", "ranged"),
    "shortbow": ("Martial", "ranged"),
    "shortbow composite": ("Martial", "ranged"),
    "claws of attack orc": ("Exotic", "one-handed"),
    "moonglaive": ("Exotic", "one-handed"),
    "hammer dwarven battle": ("Exotic", "one-handed"),
    "hammer dwarven tossing": ("Exotic", "one-handed"),
    "moon sword": ("Exotic", "one-handed"),
    "waraxe dwarven": ("Exotic", "one-handed"),
    "warglaive": ("Exotic", "one-handed"),
    "chain spiked": ("Exotic", "two-handed"),
    "halberd tauren": ("Exotic", "two-handed"),
    "sword two-bladed": ("Exotic", "two-handed"),
    "totem tauren": ("Exotic", "two-handed"),
    "crossbow hand": ("Exotic", "ranged"),
    "flintlock pistol": ("Exotic", "firearm"),
    "long rifle": ("Exotic", "firearm"),
    "blunderbuss": ("Exotic", "firearm"),
    "mortar": ("Exotic", "firearm"),
}
_DAMAGE_WORDS = {
    "p": "piercing",
    "s": "slashing",
    "b": "bludgeoning",
    "piercing": "piercing",
    "slashing": "slashing",
    "bludgeoning": "bludgeoning",
}
# Properties column in 3.5E Basic Rules: empty, Double, Reach, or Special.
_REACH_KEYS = {
    "longspear",
    "glaive",
    "guisarme",
    "lance",
    "ranseur",
    "whip",
    "chain spiked",
}
_GOODS_SUBTYPE = {
    "adventuring gear": "Adventuring Gear",
    "ammunition": "Ammunition",
    "special material": "Special Substances And Items",
    "alchemy": "Special Substances And Items",
    "technological device": "Tools And Skill Kits",
    "rune pattern": "Spellcasting And Services",
}
_BASE_WEAPON_STATS = {
    "longsword": {
        "damage": "1d8",
        "critical": "19-20/x2",
        "damagetype": "Slashing",
        "subtype": "Martial One-Handed Melee",
        "range": 0,
        "properties": "",
    },
    "warhammer": {
        "damage": "1d8",
        "critical": "x3",
        "damagetype": "Bludgeoning",
        "subtype": "Martial One-Handed Melee",
        "range": 0,
        "properties": "",
    },
}
_TRAILING_COST_RE = re.compile(r"^(?P<name>.+?)\s+(?P<cost>\d[\d,]*)\s*gp$", re.I)
_SUBTYPE_BY_GRIP = {
    "light": "{prof} Light Melee",
    "one-handed": "{prof} One-Handed Melee",
    "two-handed": "{prof} Two-Handed Melee",
    "ranged": "{prof} Ranged",
    "firearm": "{prof} Firearm",
}


def weapon_lookup_key(name: str) -> str:
    """Normalize a weapon name so table order and glued prices still match."""
    cleaned = _TRAILING_COST_RE.sub(r"\g<name>", (name or "").strip())
    cleaned = cleaned.lower().replace(",", " ")
    return re.sub(r"\s+", " ", cleaned).strip()


def clean_weapon_name_and_cost(name: str, cost: str) -> tuple[str, str]:
    match = _TRAILING_COST_RE.match((name or "").strip())
    if not match:
        return (name or "").strip(), (cost or "").strip()
    cleaned = match.group("name").strip(" ,")
    parsed = f"{match.group('cost')} gp"
    if (cost or "").strip() in {"", "-"}:
        return cleaned, parsed
    return cleaned, cost.strip()


def _weapon_grip(record: dict[str, Any], key: str) -> tuple[str, str]:
    known = _WEAPON_PROFICIENCY.get(key)
    if known:
        return known
    category = str(record.get("category") or "martial").strip().lower()
    prof = category.title() if category in {"simple", "martial", "exotic"} else "Martial"
    handed = str(record.get("handed") or "").lower()
    if any(word in key for word in ("pistol", "rifle", "firearm", "gun")):
        grip = "firearm"
    elif handed == "ranged":
        grip = "ranged"
    elif handed in {"2h", "two-handed"}:
        grip = "two-handed"
    else:
        grip = "one-handed"
    return prof, grip


def fg_damage_type(raw: str) -> str:
    """Title-case the first word, matching 3.5E Basic Rules (Piercing or slashing)."""
    text = (raw or "").strip().lower()
    if not text:
        return ""
    words: list[str] = []
    for token in re.split(r"(\s+and\s+|\s+or\s+|[,/])", text):
        piece = token.strip()
        if not piece:
            continue
        if piece in {"and", "or", ",", "/"}:
            conj = "or" if piece == "or" else "and"
            if words and words[-1] not in {"and", "or"}:
                words.append(conj)
            continue
        word = _DAMAGE_WORDS.get(piece, "")
        if word and (not words or words[-1] != word):
            words.append(word)
    if not words:
        return ""
    words[0] = words[0][:1].upper() + words[0][1:]
    return " ".join(words)


def _signed_int(value: Any) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    match = re.search(r"-?\d+", str(value or ""))
    return int(match.group()) if match else 0


def fg_critical(raw: str) -> str:
    text = (raw or "").replace("\u00d7", "x").replace("\u2013", "-").replace("\u2014", "-")
    return re.sub(r"[xX]", "x", text).strip()


def fg_range_feet(raw: str) -> int:
    text = (raw or "").strip()
    if not text or text == "-":
        return 0
    match = re.search(r"\d+", text)
    return int(match.group()) if match else 0


# Core Rules Table 9-2 printed MR for firearms without description text.
_FIREARM_MR: dict[str, int] = {
    "flintlock pistol": 1,
    "long rifle": 1,
    "blunderbuss": 1,
    "mortar": 1,
}

_MR_RE = re.compile(r"\bMR\s*(\d+)\b", re.I)
_MALFUNCTION_TEXT_RE = re.compile(
    r"\bMalfunction:\s*(.+?)(?=\s+(?:Hardness|HR)\b|\s+W\s*eight\b|\s+MR\s+\d|\s+TS\b|\s+Price\b|$)",
    re.I,
)
# Chosen effects from Table 11-3. A matching name is stored as the chat message.
# Devices with MR and no chosen effect roll the table instead.
_MALFUNCTION_EFFECTS: dict[str, str] = {
    "function lock": "Function lock: For 2d6 rounds, the device repeats the action taken when it malfunctioned. Weapons keep firing and their direction cannot be altered; vehicles keep moving in the same direction at the same speed. Loaded ammunition or fuel is consumed or destroyed.",
    "mangled": "Mangled: The device can be repaired, but its market value is halved. If it suffers this effect twice, it must be replaced.",
    "leaky": "Leaky: The device needs a daily application of some substance (lubricant, phlogiston, or the like) or it ceases to function.",
    "total failure": "Total failure: The device fails, and so do all its add-ons. They must be repaired individually.",
    "inhibited function": "Inhibited function: Once the device is repaired, its Time Factor is doubled.",
    "degradation": "Degradation: After repair, one feature (randomly determined) is decreased as if its Technology Score were 1 lower (minimum 0).",
    "balky": "Balky: The device's Maneuverability Rating decreases by 1.",
    "pieces everywhere": "Pieces everywhere: The device falls apart. Craft (technological device) checks to repair it have their DCs increased by +4.",
    "awkward operation": "Awkward operation: After repair, skill checks and attack rolls made with the device take a -2 circumstance penalty.",
    "backfire": "Backfire: All weapons on the device backfire, dealing their damage to the operator.",
    "frangible": "Frangible: The device can be repaired, but its Malfunction Rating increases by +1.",
    "kickback": "Kickback: The device deals 3d6 points of damage to its operator.",
    "bulky": "Bulky: Repair costs increase as if the market price were 25% higher. After repair, the device is one size larger, its weight doubles, and its speed decreases by 20 mph (if applicable).",
    "critical component": "Critical component: A critical component is destroyed. The device cannot be repaired until a component worth at least 10% of its market value is replaced.",
    "self-destructive": "Self-destructive: After repair, the device takes 1 point of damage each time it is successfully operated. Hardness does not protect against this damage.",
    "noisemaker": "Noisemaker: The device emits a loud noise audible within 60 feet, and keeps doing so while operating after it is repaired.",
    "fused function": "Fused function: The device cannot be upgraded, and repair checks have their DCs increased by +3.",
    "fragile": "Fragile: The device's maximum hit points are halved.",
    "pain machine": "Pain machine: The device deals 1d6 points of damage to its operator each time it is used.",
    "phlogiston explosion": "Phlogiston explosion: The boiler explodes, dealing (Technology Score)d6 slashing and fire damage to all creatures within 15 feet. Repair checks have their DCs increased by +6.",
}
MR_TABLE_NAME = "Malfunction Effects"


def _record_plain_text(record: dict[str, Any]) -> str:
    text = " ".join(
        str(record.get(key) or "")
        for key in ("description_text", "description_html", "description")
    )
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def fg_malfunction_fields(record: dict[str, Any], *, name: str = "") -> dict[str, Any]:
    """MR number, chosen malfunction message, and table name to roll."""
    text = _record_plain_text(record)
    match = _MR_RE.search(text)
    if match:
        mr = int(match.group(1))
    else:
        key = weapon_lookup_key(name or record.get("name") or "")
        mr = int(_FIREARM_MR.get(key, 0) or 0)

    effect = ""
    found = _MALFUNCTION_TEXT_RE.search(text)
    if found:
        raw = re.sub(r"\s+", " ", found.group(1)).strip(" .;")
        effect = _MALFUNCTION_EFFECTS.get(raw.lower(), raw)

    mrtable = ""
    if mr > 0 and not effect:
        mrtable = MR_TABLE_NAME
    return {"mr": mr, "malfunction": effect, "mrtable": mrtable}


def fg_malfunction_rate(record: dict[str, Any], *, name: str = "") -> int:
    """Return printed or table MR for a weapon or technological device."""
    return int(fg_malfunction_fields(record, name=name)["mr"])


def fg_weapon_fields(record: dict[str, Any]) -> dict[str, Any]:
    """Map a mundane weapon record onto the 3.5E item weapon fields."""
    name, cost = clean_weapon_name_and_cost(
        record.get("name") or "",
        record.get("cost") or record.get("price") or "",
    )
    key = weapon_lookup_key(name)
    prof, grip = _weapon_grip(record, key)
    damage = str(record.get("damage_m") or "").strip()
    properties: list[str] = []
    if "/" in damage and grip not in {"ranged", "firearm"}:
        properties.append("Double")
    if key in _REACH_KEYS:
        properties.append("Reach")
    malfunction = fg_malfunction_fields(record, name=name)
    return {
        "name": name,
        "cost": cost,
        "subtype": _SUBTYPE_BY_GRIP[grip].format(prof=prof),
        "damage": damage,
        "damagetype": fg_damage_type(str(record.get("damage_type") or "")),
        "critical": fg_critical(str(record.get("critical") or "")),
        "range": fg_range_feet(str(record.get("range_increment") or "")),
        "properties": ", ".join(properties),
        "mr": malfunction["mr"],
        "malfunction": malfunction["malfunction"],
        "mrtable": malfunction["mrtable"],
    }


def fg_armor_fields(record: dict[str, Any]) -> dict[str, Any]:
    """Map a mundane armor or shield onto the 3.5E Basic Rules armor fields."""
    kind = str(record.get("kind") or "").lower()
    category = str(record.get("category") or "").strip().lower()
    if kind == "shield" or "shield" in category:
        subtype = "Shield"
    elif category in {"light", "medium", "heavy"}:
        subtype = category.title()
    else:
        subtype = "Extras"
    return {
        "subtype": subtype,
        "ac": _signed_int(record.get("ac_bonus")),
        "maxstatbonus": _signed_int(record.get("max_dex")),
        "checkpenalty": _signed_int(record.get("armor_check_penalty")),
        "spellfailure": _signed_int(record.get("arcane_spell_failure")),
        "speed30": _signed_int(record.get("speed_30")),
        "speed20": _signed_int(record.get("speed_20")),
        "properties": "",
    }


def fg_goods_subtype(category: str) -> str:
    key = (category or "").strip().lower()
    if key in _GOODS_SUBTYPE:
        return _GOODS_SUBTYPE[key]
    if not key:
        return "Adventuring Gear"
    return key.title()


def fg_magic_weapon_fields(html: str) -> dict[str, Any] | None:
    """Fill combat fields when a magic item is a named weapon, such as +1 longsword."""
    text = re.sub(r"<[^>]+>", " ", html or "")
    text = re.sub(r"\s+", " ", text)
    names = "|".join(sorted(_BASE_WEAPON_STATS, key=len, reverse=True))
    match = re.search(rf"\+(\d+)\s+(?:[A-Za-z]+\s+){{0,3}}({names})\b", text, re.I)
    if not match:
        return None
    stats = dict(_BASE_WEAPON_STATS[match.group(2).lower()])
    stats["bonus"] = int(match.group(1))
    return stats
