"""Convert dndtools-reference JSON into fg-builder scraped record shape."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from scraper.fg.html_utils import strip_html_to_text, truncate_feat_prerequisites

DNDTOOLS_ROOT = Path(__file__).resolve().parent.parent.parent / "dndtools-reference" / "data" / "dndtools"

BOOKS: dict[str, tuple[str, str]] = {
    "Complete Divine": ("CD", "complete-divine"),
    "Complete Warrior": ("CW", "complete-warrior"),
    "Complete Mage": ("CM", "complete-mage"),
    "Complete Arcane": ("CAr", "complete-arcane"),
    "Complete Adventurer": ("CAd", "complete-adventurer"),
    "Unearthed Arcana": ("UA", "unearthed-arcana"),
    "Book of Vile Darkness": ("BV", "book-of-vile-darkness"),
    "Complete Champion": ("CC", "complete-champion"),
    "Player's Handbook II": ("PH2", "players-handbook-ii"),
    "Red Hand of Doom": ("RH", "red-hand-of-doom"),
    "Races of Faerûn": ("Rac", "races-of-faerun"),
    "Forgotten Realms Campaign Setting": ("FRCS", "forgotten-realms-campaign-setting"),
    "Warcraft The Roleplaying Game": ("WRPG", "warcraft-the-roleplaying-game"),
}

CATEGORY_FILES: dict[str, str] = {
    "classes": "classes.json",
    "feats": "feats.json",
    "spells": "spells.json",
    "items": "items.json",
    "equipment": "equipment.json",
    "races": "races.json",
    "monsters": "monsters.json",
    "deities": "deities.json",
    "domains": "domains.json",
    "psionics": "psionics.json",
}

# Supplemental WRPG JSON files live under data/dndtools/supplemental/.
SUPPLEMENTAL_FILES: dict[str, str] = {
    "classes": "warcraft_rpg_classes.json",
    "feats": "warcraft_rpg_feats.json",
    "spells": "warcraft_rpg_spells.json",
    "items": "warcraft_rpg_items.json",
    "equipment": "warcraft_rpg_equipment.json",
    "races": "warcraft_rpg_races.json",
}

FG_CATEGORY_MAP: dict[str, str] = {
    "classes": "classes",
    "feats": "feats",
    "spells": "spells",
    "items": "items",
    "equipment": "items",
    "races": "races",
    "monsters": "monsters",
    "deities": "deities",
    "domains": "domains",
    "psionics": "psionics",
}


def _source_abbrev(record: dict[str, Any]) -> str:
    return (record.get("index") or {}).get("source_abbrev") or (record.get("source") or {}).get("abbrev") or ""


def filter_by_abbrev(records: list[dict[str, Any]], abbrev: str) -> list[dict[str, Any]]:
    return [r for r in records if _source_abbrev(r) == abbrev]


def load_category(category: str) -> list[dict[str, Any]]:
    filename = CATEGORY_FILES.get(category)
    if not filename:
        return []
    path = DNDTOOLS_ROOT / filename
    records: list[dict[str, Any]] = []
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        records = data if isinstance(data, list) else data.get("records", [])

    # Merge WRPG supplemental files (and any future supplemental sources).
    supp_name = SUPPLEMENTAL_FILES.get(category)
    if supp_name:
        supp_path = DNDTOOLS_ROOT / "supplemental" / supp_name
        if supp_path.exists():
            supp_data = json.loads(supp_path.read_text(encoding="utf-8"))
            supp_records = (
                supp_data if isinstance(supp_data, list) else supp_data.get("records", [])
            )
            seen = {(r.get("slug") or r.get("name") or id(r)) for r in records}
            for rec in supp_records:
                key = rec.get("slug") or rec.get("name") or id(rec)
                if key not in seen:
                    records.append(rec)
                    seen.add(key)
    return records


# FG only accepts Good/Bad for class save progression.
_SKILL_ABILITY: dict[str, str] = {
    "Appraise": "Int",
    "Balance": "Dex",
    "Bluff": "Cha",
    "Climb": "Str",
    "Concentration": "Con",
    "Craft": "Int",
    "Decipher Script": "Int",
    "Diplomacy": "Cha",
    "Disable Device": "Int",
    "Disguise": "Cha",
    "Escape Artist": "Dex",
    "Forgery": "Int",
    "Gather Information": "Cha",
    "Handle Animal": "Cha",
    "Heal": "Wis",
    "Hide": "Dex",
    "Intimidate": "Cha",
    "Jump": "Str",
    "Knowledge": "Int",
    "Listen": "Wis",
    "Move Silently": "Dex",
    "Open Lock": "Dex",
    "Perform": "Cha",
    "Profession": "Wis",
    "Ride": "Dex",
    "Search": "Int",
    "Sense Motive": "Wis",
    "Sleight of Hand": "Dex",
    "Speak Language": "None",
    "Spellcraft": "Int",
    "Spot": "Wis",
    "Survival": "Wis",
    "Swim": "Str",
    "Tumble": "Dex",
    "Use Magic Device": "Cha",
    "Use Rope": "Dex",
    "Use Technological Device": "Int",
    # 3.0 leftovers mapped for display
    "Alchemy": "Int",
    "Innuendo": "Wis",
    "Intuit Direction": "Wis",
    "Pick Pocket": "Dex",
    "Scry": "Int",
    "Wilderness Lore": "Wis",
    "Control Shape": "Wis",
}

_FEATURE_STRONG_RE = re.compile(r"^(.+?)(?:\(([^)]+)\))?\s*:?\s*$")
_LEVEL_IN_TEXT_RE = re.compile(
    r"\b(?:at|starting at|reaches|who is at least|of at least)\s+"
    r"(\d+)(?:st|nd|rd|th)\s+level\b",
    re.I,
)
_REQ_LABEL_RE = re.compile(
    r"^(Alignment|Skills|Feats|Spells|Special|Base Attack Bonus|Base Save Bonus)\s*:?\s*(.*)$",
    re.I | re.S,
)


def _infer_save_progression(advancement: list[dict[str, Any]], key: str) -> str:
    """Return FG-valid Good or Bad from advancement save columns."""
    if not advancement:
        return ""
    values = [row.get(key, "") for row in advancement if row.get(key)]
    if not values:
        return ""
    # Good progression starts at +2 on level 1.
    first = str(values[0]).replace("+", "").strip()
    try:
        return "Good" if int(first) >= 2 else "Bad"
    except ValueError:
        return "Bad"


def _infer_bab(advancement: list[dict[str, Any]]) -> str:
    if not advancement:
        return ""
    try:
        last = advancement[-1]
        bab_raw = str(last.get("bab", "")).replace("+", "")
        # Iterative BAB looks like "15/10/5" — use the primary bonus.
        primary = bab_raw.split("/")[0].strip()
        level = int(last.get("level", len(advancement)))
        bab_num = int(primary) if primary.isdigit() else 0
        ratio = bab_num / max(level, 1)
        if ratio >= 0.95:
            return "Fast"
        if ratio >= 0.65:
            return "Medium"
        return "Slow"
    except (TypeError, ValueError):
        return ""


def _skill_ability(name: str) -> str:
    if name in _SKILL_ABILITY:
        return _SKILL_ABILITY[name]
    base = name.split("(", 1)[0].strip()
    return _SKILL_ABILITY.get(base, "None")


def _class_skills_string(record: dict[str, Any]) -> str:
    skills = record.get("class_skills") or []
    if isinstance(skills, str):
        return skills
    parts: list[str] = []
    for skill in skills:
        name = (skill.get("name") or "").strip()
        if not name:
            continue
        ability = (skill.get("ability") or "").strip() or _skill_ability(name)
        parts.append(f"{name} ({ability})")
    return ", ".join(parts)


def _parse_requirements_structured(record: dict[str, Any]) -> dict[str, Any]:
    """Build clean structured requirements from dndtools HTML/text."""
    from bs4 import BeautifulSoup

    html = record.get("requirements_html") or ""
    structured: dict[str, Any] = {
        "alignment": "",
        "skills": [],
        "feats": [],
        "spells": "",
        "special": "",
        "base_attack_bonus": "",
        "base_save_bonus": "",
        "text": "",
        "html": "",
    }
    if html.strip():
        soup = BeautifulSoup(html, "lxml")
        # Flatten every <p> into ordered label/value tokens.
        tokens: list[str] = []
        for p in soup.find_all("p"):
            for br in p.find_all("br"):
                br.replace_with("\n")
            raw = p.get_text("\n", strip=True)
            for segment in raw.split("\n"):
                text = re.sub(r"\s+", " ", segment).strip(" ,")
                if text:
                    tokens.append(text)

        current_label = ""
        current_value: list[str] = []

        def _flush() -> None:
            nonlocal current_label, current_value
            if not current_label:
                current_value = []
                return
            value = re.sub(r"\s+,", ",", " ".join(current_value)).strip(" ,")
            value = re.sub(r"\s{2,}", " ", value)
            value = re.sub(r"(ranks)\s+([A-Z])", r"\1, \2", value)
            chunks.append(f"{current_label}: {value}" if value else current_label)
            key = current_label.lower()
            if key == "alignment":
                structured["alignment"] = value
            elif key == "skills":
                structured["skills"] = [
                    part.strip()
                    for part in re.split(r",\s*(?=[A-Za-z])", value)
                    if part.strip()
                ]
            elif key == "feats":
                structured["feats"] = [
                    part.strip()
                    for part in re.split(r",\s*(?=[A-Za-z])", value)
                    if part.strip()
                ]
            elif key == "spells":
                structured["spells"] = value
            elif key == "special":
                structured["special"] = value
            elif key == "base attack bonus":
                structured["base_attack_bonus"] = value
            elif key == "base save bonus":
                structured["base_save_bonus"] = value
            current_label = ""
            current_value = []

        chunks: list[str] = []
        for token in tokens:
            # Mid-token labels: "Will +5. Spells: Able to..."
            parts = re.split(
                r"(?=(?:Alignment|Skills|Feats|Spells|Special|Base Attack Bonus|Base Save Bonus)\s*:)",
                token,
                flags=re.I,
            )
            for part in parts:
                part = part.strip(" ,")
                if not part:
                    continue
                match = _REQ_LABEL_RE.match(part)
                if match:
                    _flush()
                    current_label = match.group(1)
                    if match.group(2).strip():
                        current_value.append(match.group(2).strip())
                elif current_label:
                    current_value.append(part)
                else:
                    chunks.append(part)
        _flush()
        structured["text"] = "\n".join(chunks)
        return structured

    text = record.get("requirements_text") or ""
    if text.strip():
        structured["text"] = re.sub(r"[ \t]+", " ", text).strip()
    return structured


def _feature_level(name: str, text: str, advancement: list[dict[str, Any]]) -> int:
    level_match = _LEVEL_IN_TEXT_RE.search(text)
    if level_match:
        return int(level_match.group(1))
    name_l = name.lower()
    for row in advancement:
        special = str(row.get("special") or "").lower()
        if name_l and name_l in special:
            try:
                return int(row.get("level") or 1)
            except (TypeError, ValueError):
                return 1
    return 1


def _split_class_description(
    description_html: str,
    advancement: list[dict[str, Any]],
) -> tuple[str, str, list[dict[str, Any]]]:
    """Split overview vs feature content; build class_features list.

    Supports two common dndtools shapes:
    1. ``<p><strong>Feature Name (Ex):</strong> …</p>`` (Complete books)
    2. ``<h4>Feature Section</h4><p>…</p><ul>…</ul>`` (UA variants / totems)
    """
    from bs4 import BeautifulSoup

    if not description_html or not description_html.strip():
        return "", "", []

    soup = BeautifulSoup(description_html, "lxml")
    body = soup.body or soup
    children = [c for c in body.children if getattr(c, "name", None)]

    intro_parts: list[str] = []
    feature_parts: list[str] = []
    features: list[dict[str, Any]] = []
    seen_feature = False
    pending_h4: dict[str, Any] | None = None
    pending_bits: list[str] = []

    def _flush_h4() -> None:
        nonlocal pending_h4, pending_bits
        if not pending_h4:
            pending_bits = []
            return
        body_html = "".join(pending_bits)
        body_text = BeautifulSoup(body_html, "lxml").get_text(" ", strip=True)
        pending_h4["text_html"] = f"<p><b>{pending_h4['name']}:</b></p>{body_html}"
        pending_h4["text"] = f"{pending_h4['name']}: {body_text}".strip()
        pending_h4["level"] = _feature_level(
            pending_h4["name"], pending_h4["text"], advancement
        )
        features.append(pending_h4)
        feature_parts.append(pending_h4["text_html"])
        pending_h4 = None
        pending_bits = []

    for child in children:
        html = str(child)
        text = child.get_text(" ", strip=True) if hasattr(child, "get_text") else ""
        if not text:
            continue

        # UA / totem style: h4 section headings become class features.
        if child.name in ("h2", "h3", "h4"):
            _flush_h4()
            seen_feature = True
            title = text.strip()
            # Strip trailing "Class Features" noise for the FG feature name.
            name = re.sub(r"\s+class features?\s*$", "", title, flags=re.I).strip() or title
            pending_h4 = {
                "level": 1,
                "name": name,
                "type": "",
                "text_html": "",
                "text": "",
            }
            continue

        if pending_h4 is not None:
            pending_bits.append(html)
            continue

        strong = child.find("strong") if hasattr(child, "find") else None
        if strong and child.name == "p":
            label = strong.get_text(strip=True)
            match = _FEATURE_STRONG_RE.match(label)
            if match and not label.lower().startswith(("hit die", "skill points")):
                seen_feature = True
                name = match.group(1).strip().rstrip(":")
                feat_type = (match.group(2) or "").strip()
                features.append(
                    {
                        "level": _feature_level(name, text, advancement),
                        "name": name,
                        "type": feat_type,
                        "text_html": html,
                        "text": text,
                    }
                )
                feature_parts.append(html)
                continue

        if seen_feature:
            feature_parts.append(html)
        else:
            if re.match(r"(?i)^hit die:|^skill points:", text):
                continue
            intro_parts.append(html)

    _flush_h4()
    intro = "".join(intro_parts).strip()
    notes = "".join(feature_parts).strip()
    # If we never split features but have substantial HTML, keep it as notes so
    # FG text is not empty when classfeatures were synthesized from h4s only.
    if not notes and features:
        notes = "".join(f["text_html"] for f in features)
    return intro, notes, features


def _load_core_class(name: str, source_abbrev: str) -> dict[str, Any] | None:
    """Load a core-book class record by exact name and source abbrev."""
    for record in load_category("classes"):
        abbrev = _source_abbrev(record)
        if abbrev == source_abbrev and (record.get("name") or "") == name:
            return record
    return None


def _load_ph_class(name: str) -> dict[str, Any] | None:
    """Load a Player's Handbook class record by exact name."""
    return _load_core_class(name, "PH")


def _overlay_phb_clone(
    record: dict[str, Any],
    advancement: list[dict[str, Any]],
    class_features: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    """Overlay core-book advancement/features onto WRPG delta-only clone cores."""
    from scraper.wrpg_support import CORE_CLONE_SLUGS, PHB_CLONE_SLUGS

    slug = record.get("slug") or ""
    extras: dict[str, Any] = {}
    if slug in PHB_CLONE_SLUGS:
        core = _load_core_class(PHB_CLONE_SLUGS[slug], "PH")
    elif slug in CORE_CLONE_SLUGS:
        core_name, core_abbrev = CORE_CLONE_SLUGS[slug]
        core = _load_core_class(core_name, core_abbrev)
    else:
        return advancement, class_features, extras

    if not core:
        return advancement, class_features, extras

    if not advancement:
        advancement = list(core.get("advancement") or [])
        if not advancement and core.get("advancement_html"):
            from scraper.wrpg_support import parse_advancement_html

            advancement = parse_advancement_html(core.get("advancement_html") or "")
        # Keep a display table if WRPG only has a pointer paragraph.
        if not (record.get("advancement_html") or "").strip() or "<table" not in (
            record.get("advancement_html") or ""
        ).lower():
            extras["advancement_html"] = core.get("advancement_html") or ""

    # Always merge core class features for clones; WRPG deltas are usually incomplete.
    _, _, core_features = _split_class_description(
        core.get("description_html") or "",
        advancement,
    )
    _, _, wrpg_features = _split_class_description(
        record.get("description_html") or "",
        advancement,
    )
    seen = {f.get("name", "").lower() for f in wrpg_features}
    merged = list(wrpg_features)
    for feat in core_features:
        if (feat.get("name") or "").lower() not in seen:
            merged.append(feat)
    if merged:
        class_features = merged
    elif core_features:
        class_features = core_features

    # Prefer core hit die / skill points when WRPG delta omitted them.
    if not record.get("hit_die") and core.get("hit_die"):
        extras["hit_die"] = core.get("hit_die")
    if not record.get("skill_points") and core.get("skill_points"):
        extras["skill_points"] = core.get("skill_points")
    if not (record.get("class_skills") or []) and core.get("class_skills"):
        extras["class_skills_record"] = core

    return advancement, class_features, extras


def convert_class(record: dict[str, Any], book_slug: str) -> dict[str, Any]:
    from scraper.wrpg_support import (
        expand_wrpg_spell_hook_text,
        parse_advancement_html,
    )

    advancement = list(record.get("advancement") or [])
    advancement_html = record.get("advancement_html") or ""
    if not advancement and advancement_html and "<table" in advancement_html.lower():
        advancement = parse_advancement_html(advancement_html)

    index = record.get("index") or {}
    prestige = bool(str(index.get("prestige_level") or "").strip()) or bool(
        record.get("requirements_html") or record.get("requirements_text")
    )
    intro, notes, class_features = _split_class_description(
        record.get("description_html") or "",
        advancement,
    )

    advancement, class_features, overlay = _overlay_phb_clone(
        record, advancement, class_features
    )
    if overlay.get("advancement_html"):
        advancement_html = overlay["advancement_html"]

    # Emit Spells per Day rows for prestige +1 caster advancement columns.
    from scraper.parsers.classes import _merge_advancement_features

    class_features = _merge_advancement_features(class_features, advancement)

    # Expand WRPG spell-hook shorthand in feature text.
    for feat in class_features:
        if feat.get("text"):
            feat["text"] = expand_wrpg_spell_hook_text(feat["text"])
        if feat.get("text_html"):
            feat["text_html"] = expand_wrpg_spell_hook_text(feat["text_html"])
    if notes:
        notes = expand_wrpg_spell_hook_text(notes)
    if intro:
        intro = expand_wrpg_spell_hook_text(intro)

    # PHB-clone / WRPG caster ability text for FG Spells hook.
    slug = record.get("slug") or ""
    ability_by_slug = {
        "sorcerer-wrpg": "Charisma",
        "wizard-wrpg": "Intelligence",
        "healer-wrpg": "Wisdom",
        "elven-ranger-wrpg": "Wisdom",
        "hunter-wrpg": "Wisdom",
        "paladin-warrior-wrpg": "Wisdom",
        "horde-assassin-wrpg": "Intelligence",
        "priest-wrpg": "Wisdom",
        "shaman-wrpg": "Wisdom",
        "druid-of-the-wild-wrpg": "Wisdom",
        "warlock-wrpg": "Charisma",
    }
    ability = ability_by_slug.get(slug)
    if ability:
        hook = (
            f"To cast a spell, a character must have a {ability} score equal to "
            f"10 + the spell's level."
        )
        # Own-slot casters need a Spells feature; +1 prestige use Spells per Day.
        has_spells = any(
            (f.get("name") or "").lower() in ("spells", "spells per day")
            for f in class_features
        )
        has_own_slots = any(
            isinstance(r, dict)
            and isinstance(r.get("spells_per_day"), list)
            and len(r.get("spells_per_day") or []) > 1
            for r in advancement
        )
        if not has_spells and has_own_slots:
            class_features.insert(
                0,
                {
                    "level": 1,
                    "name": "Spells",
                    "type": "",
                    "text": hook,
                    "text_html": f"<p><b>Spells:</b> {hook}</p>",
                },
            )
        for feat in class_features:
            name = (feat.get("name") or "").lower()
            if name in ("spells", "spells per day") and "score equal to" not in (
                feat.get("text") or ""
            ).lower():
                feat["text"] = f"{(feat.get('text') or '').rstrip()} {hook}".strip()
                html = feat.get("text_html") or ""
                if html:
                    feat["text_html"] = f"{html}<p>{hook}</p>"
                else:
                    feat["text_html"] = f"<p><b>{feat.get('name')}:</b> {feat['text']}</p>"
        if "score equal to" not in (notes or "").lower():
            notes = f"{notes}<p>{hook}</p>" if notes else f"<p>{hook}</p>"

    # Only invent an intro from plain text when HTML split found nothing usable.
    if not intro and not notes and record.get("description_text"):
        first = record["description_text"].split("\n")[0].strip()
        if first and not first.endswith(":"):
            intro = f"<p>{first}</p>"

    req = _parse_requirements_structured(record)
    skills_record = overlay.get("class_skills_record") or record
    detail: dict[str, Any] = {
        "title": record.get("name", ""),
        "class_type": "prestige" if prestige else "base",
        "description_html": intro,
        "description_text": strip_html_to_text(intro),
        "notes_html": notes,
        "notes_text": strip_html_to_text(notes),
        "requirements": req.get("text") or "",
        "requirements_html": req.get("html") or "",
        "requirements_structured": req,
        "hit_die": overlay.get("hit_die")
        or record.get("hit_die")
        or index.get("hit_die")
        or "",
        "skill_points": overlay.get("skill_points")
        or record.get("skill_points")
        or index.get("skill_points")
        or "",
        "advancement": advancement,
        "advancement_html": advancement_html,
        "class_skills": _class_skills_string(skills_record),
        "class_features": class_features,
        "bab": _infer_bab(advancement),
        "fort": _infer_save_progression(advancement, "fort"),
        "ref": _infer_save_progression(advancement, "ref"),
        "will": _infer_save_progression(advancement, "will"),
    }
    if detail["hit_die"] and not str(detail["hit_die"]).startswith("d"):
        detail["hit_die"] = f"d{detail['hit_die']}"
    ranks = re.search(r"(\d+)", str(detail.get("skill_points") or ""))
    if ranks:
        detail["skill_ranks"] = int(ranks.group(1))
    return {
        "id": record.get("id"),
        "slug": record.get("slug", ""),
        "name": record.get("name", ""),
        "source_url": record.get("source_url", ""),
        "book_slug": book_slug,
        "category": "classes",
        "index": {"is_prestige": prestige},
        "detail": detail,
    }


def _spell_level_string(classes: list[dict[str, Any]] | None) -> str:
    if not classes:
        return ""
    parts = [f"{c.get('name', '?')} {c.get('level', '?')}" for c in classes]
    text = " , ".join(parts)
    return text + "," if text and not text.endswith(",") else text


def _normalize_apostrophes(text: str) -> str:
    return text.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')


def _feat_prerequisites(record: dict[str, Any]) -> str:
    benefit = strip_html_to_text(record.get("benefit_html") or record.get("benefit_text") or "")
    html = truncate_feat_prerequisites(record.get("prerequisite_html") or "")
    if html:
        text = strip_html_to_text(html)
    else:
        text = truncate_feat_prerequisites(record.get("prerequisite_text") or "")
    text = _normalize_apostrophes(text)
    benefit = _normalize_apostrophes(benefit)
    if benefit:
        anchor = benefit[:48].strip()
        if len(anchor) >= 12 and anchor in text:
            text = text.split(anchor, 1)[0]
    # Common merged pattern: "... alignment, Add the chosen..."
    text = re.split(r",\s*(?:Add|On your action|You (?:can|gain|get)|When you)\b", text, maxsplit=1)[0]
    return text.strip(" ,")


def convert_feat(record: dict[str, Any], book_slug: str) -> dict[str, Any]:
    benefit = record.get("benefit_html") or record.get("benefit_text") or record.get("description_html") or ""
    detail = {
        "title": record.get("name", ""),
        "type": record.get("type") or (record.get("index") or {}).get("type") or "General",
        "prerequisites": _feat_prerequisites(record),
        "benefit": benefit if "<" in str(benefit) else benefit,
        "normal": record.get("normal_html") or record.get("normal_text") or "",
        "special": record.get("special_html") or record.get("special_text") or "",
        "description_html": record.get("description_html") or "",
        "description_text": record.get("description_text") or "",
    }
    summary = strip_html_to_text(record.get("description_html") or "")[:120]
    if not summary:
        summary = strip_html_to_text(benefit)[:120]
    return {
        "id": record.get("id"),
        "slug": record.get("slug", ""),
        "name": record.get("name", ""),
        "source_url": record.get("source_url", ""),
        "book_slug": book_slug,
        "category": "feats",
        "index": {
            "summary": summary,
            "summary_short": summary[:60] + ("..." if len(summary) > 60 else ""),
        },
        "detail": detail,
    }


def convert_spell(record: dict[str, Any], book_slug: str) -> dict[str, Any]:
    from scraper.wrpg_support import COSMOLOGY_SPELL_SLUG, spell_actions_for_wrpg

    slug = record.get("slug") or ""
    if slug == COSMOLOGY_SPELL_SLUG:
        # Rules stub, not a castable spell — omit from module spell section.
        return {
            "id": record.get("id"),
            "slug": slug,
            "name": record.get("name", ""),
            "source_url": record.get("source_url", ""),
            "book_slug": book_slug,
            "category": "spells",
            "index": {"school": record.get("school") or "", "skip": True},
            "detail": {"skip": True},
        }

    school = record.get("school") or ""
    descriptors = record.get("descriptors") or []
    if descriptors and "[" not in school:
        school = f"{school} [{', '.join(descriptors)}]" if school else ", ".join(descriptors)
    components = record.get("components") or ""
    detail = {
        "title": record.get("name", ""),
        "school": school,
        "level": _spell_level_string(record.get("classes")),
        "casting_time": record.get("casting_time") or "",
        "range": record.get("range") or "",
        "target": record.get("target") or "",
        "area": record.get("area") or "",
        "effect": record.get("effect") or record.get("area") or record.get("target") or "",
        "duration": record.get("duration") or "",
        "saving_throw": record.get("saving_throw") or "None",
        "spell_resistance": record.get("spell_resistance") or "No",
        "components": components if isinstance(components, dict) else None,
        "components_raw": components if isinstance(components, str) else "",
        "description_html": record.get("description_html") or "",
        "description_text": record.get("description_text") or record.get("description") or "",
    }
    override = spell_actions_for_wrpg(slug)
    if override is not None:
        detail["actions"] = override
    return {
        "id": record.get("id"),
        "slug": slug,
        "name": record.get("name", ""),
        "source_url": record.get("source_url", ""),
        "book_slug": book_slug,
        "category": "spells",
        "index": {"school": school},
        "detail": detail,
    }


def convert_item(record: dict[str, Any], book_slug: str, *, mundane: bool = False) -> dict[str, Any]:
    index = record.get("index") or {}
    detail = {
        "aura": record.get("aura") or index.get("aura") or "",
        "cl": record.get("caster_level") or index.get("caster_level") or "",
        "price": record.get("price")
        or record.get("cost")
        or index.get("price")
        or index.get("cost")
        or "",
        "weight": record.get("weight") or index.get("weight") or "",
        "slot": record.get("slot") or index.get("slot_or_property") or "",
        "description_html": record.get("description_html") or "",
        "name": record.get("name", ""),
    }
    if mundane:
        kind = record.get("kind") or index.get("kind") or "goods"
        detail["slot"] = kind.title()
        # Help FG type inference for WRPG weapons/armor.
        if kind == "weapon" or record.get("damage_m"):
            detail["item_type"] = "Weapon"
        elif kind == "armor":
            detail["item_type"] = "Armor"
        if record.get("damage_m"):
            detail["description_html"] = (
                (detail.get("description_html") or "")
                + f"<p><b>Damage:</b> {record['damage_m']}; "
                f"<b>Critical:</b> {record.get('critical', '')}; "
                f"<b>Handed:</b> {record.get('handed', '')}</p>"
            )
    return {
        "id": record.get("id"),
        "slug": record.get("slug", ""),
        "name": record.get("name", ""),
        "source_url": record.get("source_url", ""),
        "book_slug": book_slug,
        "category": "items",
        "index": index,
        "detail": detail,
    }


def convert_race(record: dict[str, Any], book_slug: str) -> dict[str, Any]:
    from scraper.wrpg_support import build_race_fg

    detail = {
        "size": record.get("size") or (record.get("index") or {}).get("size") or "",
        "speed": record.get("speed") or "",
        "ability_adjustments": record.get("ability_adjustments") or "",
        "description_html": record.get("description_html") or "",
        "description_text": record.get("description_text") or "",
        "raw_sections": [],
    }
    # Build FG racial trait automation for WRPG (and any record with bullet traits).
    if (record.get("index") or {}).get("source_abbrev") == "WRPG" or (
        record.get("source") or {}
    ).get("abbrev") == "WRPG":
        detail["fg"] = build_race_fg(record)
    return {
        "id": record.get("id"),
        "slug": record.get("slug", ""),
        "name": record.get("name", ""),
        "source_url": record.get("source_url", ""),
        "book_slug": book_slug,
        "category": "races",
        "index": record.get("index") or {},
        "detail": detail,
    }


def convert_monster(record: dict[str, Any], book_slug: str) -> dict[str, Any]:
    detail = {
        "cr": record.get("challenge_rating") or (record.get("index") or {}).get("cr") or "",
        "ac": record.get("armor_class") or "",
        "hp": record.get("hit_points") or "",
        "hd": record.get("hit_dice") or (record.get("index") or {}).get("hd") or "",
        "fort": record.get("fortitude") or "",
        "ref": record.get("reflex") or "",
        "will": record.get("will") or "",
        "str": record.get("str") or "",
        "dex": record.get("dex") or "",
        "con": record.get("con") or "",
        "int": record.get("int") or "",
        "wis": record.get("wis") or "",
        "cha": record.get("cha") or "",
        "attack": record.get("attack") or "",
        "full_attack": record.get("full_attack") or "",
        "special_abilities": record.get("special_abilities") or [],
        "description_html": record.get("description_html") or record.get("flavor_html") or "",
        "stat_line": record.get("stat_line") or "",
        "type": record.get("type") or (record.get("index") or {}).get("type") or "",
    }
    return {
        "id": record.get("id"),
        "slug": record.get("slug", ""),
        "name": record.get("name", ""),
        "source_url": record.get("source_url", ""),
        "book_slug": book_slug,
        "category": "monsters",
        "index": record.get("index") or {},
        "detail": detail,
    }


def convert_deity(record: dict[str, Any], book_slug: str) -> dict[str, Any]:
    index = record.get("index") or {}
    detail = {
        "alignment": index.get("alignment") or "",
        "pantheon": index.get("pantheon") or "",
        "description_html": record.get("description_html") or "",
        "description_text": record.get("description_text") or "",
    }
    return {
        "id": record.get("id"),
        "slug": record.get("slug", ""),
        "name": record.get("name", ""),
        "source_url": record.get("source_url", ""),
        "book_slug": book_slug,
        "category": "deities",
        "index": index,
        "detail": detail,
    }


def convert_domain(record: dict[str, Any], book_slug: str) -> dict[str, Any]:
    detail = {
        "description_html": record.get("description_html") or "",
        "description_text": record.get("description_text") or "",
        "domain_spells": record.get("domain_spells") or [],
    }
    return {
        "id": record.get("id"),
        "slug": record.get("slug", ""),
        "name": record.get("name", ""),
        "source_url": record.get("source_url", ""),
        "book_slug": book_slug,
        "category": "domains",
        "index": record.get("index") or {},
        "detail": detail,
    }


def convert_psionic(record: dict[str, Any], book_slug: str) -> dict[str, Any]:
    rec = convert_spell(record, book_slug)
    rec["category"] = "psionics"
    detail = rec["detail"]
    index = record.get("index") or {}
    detail["casting_time"] = record.get("manifesting_time") or detail.get("casting_time") or ""
    detail["level"] = _spell_level_string(record.get("classes")) or str(index.get("level") or "")
    detail["description_html"] = (
        (detail.get("description_html") or "")
        + (f"<p><b>Power Points:</b> {record.get('power_points')}</p>" if record.get("power_points") else "")
        + (f"<p><b>Discipline:</b> {index.get('discipline')}</p>" if index.get("discipline") else "")
    )
    return rec


CONVERTERS = {
    "classes": convert_class,
    "feats": convert_feat,
    "spells": convert_spell,
    "items": convert_item,
    "equipment": lambda r, s: convert_item(r, s, mundane=True),
    "races": convert_race,
    "monsters": convert_monster,
    "deities": convert_deity,
    "domains": convert_domain,
    "psionics": convert_psionic,
}


def build_scraped_book(
    title: str,
    abbrev: str,
    book_slug: str,
    output_dir: Path,
) -> dict[str, int]:
    output_dir.mkdir(parents=True, exist_ok=True)
    counts: dict[str, int] = {}

    summary = {
        "title": title,
        "book_slug": book_slug,
        "source_abbrev": abbrev,
        "source": "dndtools-reference",
    }
    (output_dir / "summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    (output_dir / "book.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    merged_items: list[dict[str, Any]] = []
    for cat, filename in CATEGORY_FILES.items():
        records = filter_by_abbrev(load_category(cat), abbrev)
        if not records:
            continue
        converter = CONVERTERS[cat]
        converted = [converter(r, book_slug) for r in records]
        # Drop WRPG cosmology stub and any other skip-marked records.
        converted = [
            rec
            for rec in converted
            if not (rec.get("detail") or {}).get("skip")
            and not (rec.get("index") or {}).get("skip")
        ]
        if not converted:
            continue
        fg_cat = FG_CATEGORY_MAP[cat]
        if fg_cat == "items" and cat == "equipment":
            merged_items.extend(converted)
            continue
        if fg_cat == "items":
            merged_items.extend(converted)
            continue
        out_path = output_dir / f"{fg_cat}.json"
        out_path.write_text(json.dumps(converted, indent=2, ensure_ascii=False), encoding="utf-8")
        counts[fg_cat] = len(converted)

    if merged_items:
        (output_dir / "items.json").write_text(
            json.dumps(merged_items, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        counts["items"] = len(merged_items)

    return counts
