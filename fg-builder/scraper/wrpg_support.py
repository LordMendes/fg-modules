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
    r"([+\-\u2212\u2013]\d+)\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|"
    r"Str|Dex|Con|Int|Wis|Cha)\b",
    re.I,
)
_ABILITY_KEY = {
    "strength": "str",
    "str": "str",
    "dexterity": "dex",
    "dex": "dex",
    "constitution": "con",
    "con": "con",
    "intelligence": "int",
    "int": "int",
    "wisdom": "wis",
    "wis": "wis",
    "charisma": "cha",
    "cha": "cha",
}
_SPEED_RE = re.compile(r"(?:base land speed|land speed|speed)\s*(?:of\s*)?(\d+)\s*ft", re.I)
_DARKVISION_RE = re.compile(r"darkvision\s*(\d+)\s*ft", re.I)
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
        if len(cells) >= 6:
            row["bab"] = cells[1]
            row["fort"] = cells[2]
            row["ref"] = cells[3]
            row["will"] = cells[4]
            row["special"] = cells[special_idx] if special_idx < len(cells) else cells[5]
            extra = cells[special_idx + 1 :] if special_idx + 1 < len(cells) else []
            if extra:
                row["spells_per_day"] = extra
                if len(extra) == 1:
                    cell = (extra[0] or "").strip()
                    bump = _WRPG_CASTER_BUMP_RE.match(cell)
                    if bump:
                        # Normalize WRPG "+1 divine/+1 arcane" to FG prestige phrasing.
                        kind = bump.group(1).lower()
                        row["spellcasting"] = (
                            f"+1 level of existing {kind} spellcasting class"
                        )
                    elif "level" in cell.lower():
                        row["spellcasting"] = cell
        else:
            row["special"] = cells[-1]
        rows.append(row)
    return rows


def prefer_rich_advancement_html(detail: dict[str, Any]) -> bool:
    original = detail.get("advancement_html") or ""
    if advancement_table_column_count(original) > 7:
        return True
    return any(
        isinstance(r, dict) and r.get("spells_per_day") for r in (detail.get("advancement") or [])
    )


def parse_ability_scores(text: str) -> dict[str, int]:
    scores: dict[str, int] = {}
    for match in _ABILITY_RE.finditer(text or ""):
        key = _ABILITY_KEY.get(match.group(2).lower())
        if key:
            raw = match.group(1).replace("\u2212", "-").replace("\u2013", "-")
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
