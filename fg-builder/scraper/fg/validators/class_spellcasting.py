"""Validate class records for Fantasy Grounds spell-class automation."""

from __future__ import annotations

import re
from typing import Any, Literal

SpellFeatureKind = Literal[
    "primary_caster",
    "prestige_advancement",
    "variant_modifier",
    None,
]

_SCORE_EQUAL_TO_RE = re.compile(r"must have an? \w+ score equal to", re.I)

_VARIANT_SPELLCASTING_RE = re.compile(
    r"(?:"
    r"as a normal \w+|"
    r"casts spells as (?:a )?\w+|"
    r"learns and casts spells as (?:a )?\w+|"
    r"retained from (?:base class|the base class)|"
    r"all (?:standard )?[\w ]*class features.*retained|"
    r"does not change (?:\w+ )?(?:spells per day|number of spells per day)|"
    r"spells per day does not change"
    r")",
    re.I,
)

_PRIMARY_CASTING_RE = re.compile(
    r"(?:"
    r"to cast a spell|"
    r"spells per day|"
    r"spells known|"
    r"casts (?:\w+ )*spells|"
    r"spell(?:s)? (?:she|he|they|a \w+) (?:knows|can cast)"
    r")",
    re.I,
)

_PRESTIGE_SPELL_TEXT_RE = re.compile(
    r"(?:"
    r"as if (?:you )?had also gained a level in|"
    r"gains new spells per day as if|"
    r"determines spells per day and caster level accordingly|"
    r"existing (?:\w+ )*spellcasting class"
    r")",
    re.I,
)

_PRESTIGE_ADVANCEMENT_NAME_RE = re.compile(
    r"(?:"
    r"^\+?\s*1\s+level of existing\b|"
    r"^spells per day(?:/|\s*/\s*)spells known"
    r")",
    re.I,
)

_SPELLCASTING_ADVANCEMENT_SPECIAL_RE = re.compile(
    r"(?:"
    r"\+?\s*1\s+level of existing\b|"
    r"gains new spells per day|"
    r"determines spells per day"
    r")",
    re.I,
)


def is_variant_spellcasting(text: str) -> bool:
    return bool(_VARIANT_SPELLCASTING_RE.search(text or ""))


def has_primary_casting_text(text: str) -> bool:
    if is_prestige_spell_advancement(text):
        return False
    return bool(_PRIMARY_CASTING_RE.search(text or ""))


def is_prestige_spell_advancement(text: str) -> bool:
    return bool(
        _PRESTIGE_SPELL_TEXT_RE.search(text or "")
        or _PRESTIGE_ADVANCEMENT_NAME_RE.match(text or "")
    )


def classify_spell_feature(
    feat: dict[str, Any],
    detail: dict[str, Any] | None = None,
) -> SpellFeatureKind:
    """Classify a parsed class feature for FG spell-class hooks."""
    detail = detail or {}
    name = (feat.get("name") or "").strip()
    name_lower = name.lower()
    text = feat.get("text") or ""
    notes = detail.get("notes_text") or ""
    combined = f"{text}\n{notes}"

    if name_lower == "spells":
        return "primary_caster"

    if name_lower.startswith("spells per day") or _PRESTIGE_ADVANCEMENT_NAME_RE.match(
        name
    ):
        return "prestige_advancement"

    if _PRESTIGE_ADVANCEMENT_NAME_RE.match(text) or is_prestige_spell_advancement(text) or (
        feat.get("source") == "advancement"
        and _SPELLCASTING_ADVANCEMENT_SPECIAL_RE.search(text)
    ):
        return "prestige_advancement"

    if name_lower == "spellcasting":
        if is_variant_spellcasting(combined):
            return "variant_modifier"
        if is_prestige_spell_advancement(combined):
            return "prestige_advancement"
        if detail.get("spell_progression") or has_primary_casting_text(combined):
            return "primary_caster"
        return "variant_modifier"

    if name_lower == "alchemy":
        return "primary_caster"

    return None


def normalize_spell_feature_name(
    feat: dict[str, Any],
    detail: dict[str, Any] | None = None,
) -> str:
    kind = classify_spell_feature(feat, detail)
    name = (feat.get("name") or "").strip()
    if kind == "primary_caster":
        return "Spells"
    if kind == "prestige_advancement":
        return "Spells per Day"
    return name


def feature_text_has_score_equal_to(text: str) -> bool:
    return bool(_SCORE_EQUAL_TO_RE.search(text or ""))


def class_has_spell_progression(detail: dict[str, Any]) -> bool:
    return bool(detail.get("spell_progression"))


def class_looks_like_primary_caster(detail: dict[str, Any]) -> bool:
    if class_has_spell_progression(detail):
        return True
    for feat in detail.get("class_features") or []:
        if classify_spell_feature(feat, detail) == "primary_caster":
            return True
    return False


def validate_class_spellcasting_automation(
    class_name: str,
    detail: dict[str, Any],
    *,
    features: list[dict[str, Any]] | None = None,
) -> list[tuple[str, str, str]]:
    """Return (code, severity, message) tuples for spell-class automation gaps."""
    name = class_name or detail.get("title") or "?"
    features = features if features is not None else detail.get("class_features") or []
    issues: list[tuple[str, str, str]] = []

    kinds = [classify_spell_feature(f, detail) for f in features]
    spells_features = [
        f
        for f, kind in zip(features, kinds)
        if kind == "primary_caster" and (f.get("name") or "").strip().lower() != "alchemy"
    ]
    spd_features = [f for f, kind in zip(features, kinds) if kind == "prestige_advancement"]
    variant_features = [
        f for f, kind in zip(features, kinds) if kind == "variant_modifier"
    ]

    if class_looks_like_primary_caster(detail) and not spells_features:
        issues.append(
            (
                "class_missing_spells_feature",
                "warning",
                "Primary caster missing level-1 Spells classfeature for FG spell-class hook",
            )
        )

    for feat in spells_features:
        text = feat.get("text") or ""
        if not feature_text_has_score_equal_to(text):
            issues.append(
                (
                    "class_spell_ability_text",
                    "warning",
                    f"Spells feature at level {feat.get('level', '?')} missing "
                    "'score equal to' ability requirement text for handleClassFeatureSpells",
                )
            )

    advancement = detail.get("advancement") or []
    adv_spell_levels = [
        row.get("level")
        for row in advancement
        if _SPELLCASTING_ADVANCEMENT_SPECIAL_RE.search(row.get("special") or "")
    ]
    if adv_spell_levels:
        spd_levels = {f.get("level") for f in spd_features}
        missing = [level for level in adv_spell_levels if level not in spd_levels]
        if missing:
            issues.append(
                (
                    "class_missing_spells_per_day",
                    "warning",
                    f"Advancement grants spellcasting at level(s) {missing} "
                    "but no Spells per Day classfeature",
                )
            )

    if variant_features and not spells_features:
        issues.append(
            (
                "class_spell_variant_reference_only",
                "info",
                "Variant Spellcasting only — FG will not create a new spell-class track",
            )
        )

    return issues


def summarize_spellclass_readiness(
    class_records: list[tuple[str, list[dict[str, str]]]],
) -> dict[str, int]:
    """Summarize spell-class hook counts from built XML class records.

    Each record is (class_name, [(feature_name, feature_text), ...]).
    """
    stats = {
        "spell_related_features": 0,
        "named_spells": 0,
        "named_spellcasting": 0,
        "named_spells_per_day": 0,
        "score_equal_to_count": 0,
    }
    for _class_name, features in class_records:
        for feat_name, feat_text in features:
            lower = feat_name.lower()
            if lower in {"spells", "spellcasting"} or lower.startswith("spells per day"):
                stats["spell_related_features"] += 1
            if lower == "spells":
                stats["named_spells"] += 1
            elif lower == "spellcasting":
                stats["named_spellcasting"] += 1
            elif lower.startswith("spells per day"):
                stats["named_spells_per_day"] += 1
            if feature_text_has_score_equal_to(feat_text):
                stats["score_equal_to_count"] += 1
    return stats
