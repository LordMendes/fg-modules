#!/usr/bin/env python3
"""Audit dndtools JSON data for a given source abbrev.

Usage:
  python scripts/audit_source.py PH
  python scripts/audit_source.py BV --write reviews/bv.md
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "dndtools"
INDEX_DIR = DATA / ".index"
REVIEWS = ROOT / "reviews"

CATEGORIES: dict[str, str] = {
    "classes": "classes.json",
    "domains": "domains.json",
    "feats": "feats.json",
    "items": "items.json",
    "equipment": "equipment.json",
    "races": "races.json",
    "rules": "rules.json",
    "skills": "skills.json",
    "spells": "spells.json",
    "monsters": "monsters.json",
    "psionics": "psionics.json",
    "deities": "deities.json",
    "templates": "templates.json",
}

EXPECTED_PH: dict[str, int] = {
    "classes": 11,
    "domains": 22,
    "feats": 109,
    "items": 77,
    "races": 7,
    "rules": 97,
    "skills": 47,
    "spells": 605,
}

MONSTER_STAT_KEYS = [
    "hit_dice",
    "initiative",
    "speed",
    "armor_class",
    "challenge_rating",
    "stat_line",
]

CLASS_SLUG_ALIASES = {"bard-90": "bard"}


class Issue:
    __slots__ = ("severity", "category", "record", "message")

    def __init__(self, severity: str, category: str, record: str, message: str) -> None:
        self.severity = severity
        self.category = category
        self.record = record
        self.message = message


def load_json(path: Path) -> list:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else []


def load_source_abbrevs() -> dict[str, str]:
    """Return canonical abbrev -> source name from source-names.json."""
    path = INDEX_DIR / "source-names.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {}


def resolve_source_abbrev(raw: str) -> str:
    """Resolve CLI abbrev to canonical form (exact match, then case-insensitive)."""
    raw = raw.strip()
    if not raw:
        return raw
    abbrevs = load_source_abbrevs()
    if raw in abbrevs:
        return raw
    lower = raw.lower()
    for canonical in abbrevs:
        if canonical.lower() == lower:
            return canonical
    return raw.upper()


def source_abbrev(record: dict) -> str | None:
    idx = record.get("index") or {}
    if idx.get("source_abbrev"):
        return idx["source_abbrev"]
    src = record.get("source") or {}
    return src.get("abbrev")


def filter_source(records: list, abbrev: str) -> list:
    return [r for r in records if source_abbrev(r) == abbrev]


def has_description(record: dict, category: str) -> bool:
    if record.get("description_html") or record.get("description_text"):
        return True
    if category == "feats":
        return bool(
            record.get("benefit_html")
            or record.get("benefit_text")
            or record.get("prerequisite_html")
        )
    if category == "spells":
        return bool(record.get("description"))
    return False


def is_variant_prose(record: dict) -> bool:
    blob = " ".join(
        str(record.get(k) or "")
        for k in ("description_html", "description_text", "requirements_html")
    ).lower()
    return "retained from base" in blob or "unless noted" in blob


def resolve_class_slug(slug: str, class_slugs: set[str]) -> bool:
    if slug in class_slugs:
        return True
    return CLASS_SLUG_ALIASES.get(slug, slug) in class_slugs


def audit_classes(records: list, issues: list[Issue]) -> list[str]:
    lines = []
    for c in sorted(records, key=lambda x: x.get("name", "")):
        name = c.get("name", "?")
        slug = c.get("slug", "?")
        rid = c.get("id", "?")
        row_issues: list[str] = []

        hd = c.get("hit_die") or (c.get("index") or {}).get("hit_die")
        sp = c.get("skill_points") or (c.get("index") or {}).get("skill_points")
        idx_abbr = (c.get("index") or {}).get("source_abbrev")
        src_abbr = (c.get("source") or {}).get("abbrev")

        if idx_abbr and src_abbr and idx_abbr != src_abbr:
            row_issues.append("index/source abbrev mismatch")
            issues.append(Issue("warning", "classes", name, "index.source_abbrev != source.abbrev"))

        if hd in (None, "—", ""):
            if is_variant_prose(c):
                row_issues.append("variant (— hit die expected)")
            else:
                row_issues.append("missing hit_die")
                issues.append(Issue("error", "classes", name, "missing hit_die"))
        if sp in (None, "—", ""):
            if not is_variant_prose(c):
                row_issues.append("missing skill_points")
                issues.append(Issue("warning", "classes", name, "missing skill_points"))

        if not c.get("description_html"):
            row_issues.append("missing description_html")
            issues.append(Issue("warning", "classes", name, "missing description_html"))
        if not c.get("advancement_html") and not is_variant_prose(c):
            row_issues.append("missing advancement_html")
            issues.append(Issue("warning", "classes", name, "missing advancement_html"))
        if not c.get("class_skills") and not is_variant_prose(c):
            row_issues.append("missing class_skills")
            issues.append(Issue("warning", "classes", name, "missing class_skills"))

        if rid and not re.search(rf"-{rid}$", slug):
            row_issues.append(f"slug anomaly (expected *-{rid})")
            issues.append(Issue("info", "classes", name, f"slug `{slug}` lacks `-{rid}` suffix"))

        status = "OK" if not row_issues else "; ".join(row_issues)
        lines.append(f"| {name} | `{slug}` | {status} |")
    return lines


def audit_category(records: list, category: str, issues: list[Issue]) -> list[str]:
    if not records:
        return ["No records."]
    missing = []
    for r in records:
        name = r.get("name", r.get("slug", "?"))
        if not has_description(r, category):
            missing.append(name)
            issues.append(Issue("warning", category, name, "missing description"))

        if category == "monsters":
            for key in MONSTER_STAT_KEYS:
                if not r.get(key):
                    issues.append(Issue("warning", category, name, f"missing {key}"))
                    break

        if category == "spells":
            for field in ("school", "casting_time", "range"):
                if not r.get(field):
                    issues.append(Issue("warning", category, name, f"missing {field}"))

        if category == "feats" and not r.get("type") and not (r.get("index") or {}).get("type"):
            issues.append(Issue("info", category, name, "missing feat type"))

        if category == "skills":
            idx = r.get("index") or {}
            if not idx.get("key_ability") and not r.get("key_ability"):
                issues.append(Issue("warning", category, name, "missing key_ability"))

        if category == "races":
            for field in ("size", "type"):
                if not r.get(field):
                    issues.append(Issue("warning", category, name, f"missing {field}"))

        if category == "psionics":
            for field in ("manifesting_time", "range", "power_points"):
                if not r.get(field) and not (r.get("index") or {}).get("power_points"):
                    issues.append(Issue("warning", category, name, f"missing {field}"))

    if missing:
        preview = ", ".join(missing[:10])
        suffix = f" (+{len(missing) - 10} more)" if len(missing) > 10 else ""
        return [f"Missing description: {len(missing)}/{len(records)} — {preview}{suffix}"]
    return [f"All {len(records)} records have description content."]


def audit_spell_class_links(spells: list, class_slugs: set[str], issues: list[Issue]) -> list[str]:
    unresolved: Counter[str] = Counter()
    for spell in spells:
        for cls in spell.get("classes") or []:
            slug = cls.get("slug")
            if slug and not resolve_class_slug(slug, class_slugs):
                unresolved[slug] += 1
    if not unresolved:
        return ["All spell class links resolve."]
    lines = [f"Unresolved class slugs in spell lists ({sum(unresolved.values())} refs):"]
    for slug, count in unresolved.most_common(15):
        alias = CLASS_SLUG_ALIASES.get(slug)
        hint = f" (alias -> `{alias}`)" if alias else ""
        lines.append(f"- `{slug}`: {count} spell refs{hint}")
        issues.append(Issue("error" if not alias else "info", "spells", slug, f"{count} unresolved spell class refs"))
    return lines


def audit_scraper_errors(abbrev: str) -> list[str]:
    errors_path = DATA / "errors.json"
    if not errors_path.exists():
        return ["No errors.json found."]
    errors = json.loads(errors_path.read_text(encoding="utf-8"))
    if not isinstance(errors, list):
        return ["errors.json is not a list."]
    matched = [e for e in errors if abbrev.lower() in json.dumps(e).lower()]
    if not matched:
        return ["No scraper errors mention this source."]
    return [f"Scraper errors mentioning source: {len(matched)} (see data/dndtools/errors.json)"]


def build_report(abbrev: str) -> tuple[str, list[Issue]]:
    issues: list[Issue] = []
    now = datetime.now(UTC).strftime("%Y-%m-%d")
    lines = [
        f"# Source audit: `{abbrev}`",
        "",
        f"Generated: {now}",
        f"Dataset: `data/dndtools/`",
        f"Site route: `/sources/{abbrev}`",
        "",
        "## Record counts",
        "",
        "| Category | Index | Full JSON | Notes |",
        "|----------|------:|----------:|-------|",
    ]

    counts: dict[str, tuple[int, int]] = {}
    for cat, filename in CATEGORIES.items():
        idx_count = len(filter_source(load_json(INDEX_DIR / filename), abbrev))
        full_count = len(filter_source(load_json(DATA / filename), abbrev))
        counts[cat] = (idx_count, full_count)
        note = ""
        if idx_count != full_count:
            note = "INDEX/FULL MISMATCH"
            issues.append(Issue("error", cat, abbrev, f"index={idx_count} full={full_count}"))
        expected = EXPECTED_PH.get(cat) if abbrev == "PH" else None
        if expected is not None and full_count != expected:
            note = (note + "; " if note else "") + f"expected {expected}"
            issues.append(Issue("warning", cat, abbrev, f"count {full_count} != expected {expected}"))
        lines.append(f"| {cat} | {idx_count} | {full_count} | {note or 'OK'} |")

    classes = filter_source(load_json(DATA / "classes.json"), abbrev)
    if classes:
        lines.extend(["", "## Classes", "", "| Class | Slug | Status |", "|-------|------|--------|"])
        lines.extend(audit_classes(classes, issues))

    all_class_slugs = {c["slug"] for c in load_json(DATA / "classes.json") if c.get("slug")}

    for cat in CATEGORIES:
        if cat == "classes":
            continue
        recs = filter_source(load_json(DATA / CATEGORIES[cat]), abbrev)
        if not recs:
            continue
        lines.extend(["", f"## {cat} ({len(recs)} records)", ""])
        lines.extend(audit_category(recs, cat, issues))

    spells = filter_source(load_json(DATA / "spells.json"), abbrev)
    if spells:
        lines.extend(["", "## Spell class link resolution", ""])
        lines.extend(audit_spell_class_links(spells, all_class_slugs, issues))

    lines.extend(["", "## Scraper errors", ""])
    lines.extend(audit_scraper_errors(abbrev))

    errors = [i for i in issues if i.severity == "error"]
    warnings = [i for i in issues if i.severity == "warning"]
    infos = [i for i in issues if i.severity == "info"]

    lines.extend(
        [
            "",
            "## Summary",
            "",
            f"- Errors: {len(errors)}",
            f"- Warnings: {len(warnings)}",
            f"- Info: {len(infos)}",
            "",
            "## Verdict",
            "",
        ]
    )
    if errors:
        lines.append("**Needs fixes** — catastrophic or parity issues found (Bard-style stubs, index/full mismatch, broken links).")
    elif warnings:
        lines.append("**Reviewed with warnings** — data loads but has content gaps to investigate.")
    else:
        lines.append("**OK** — no critical issues detected.")

    lines.extend(["", "## Follow-up", "", "- [ ] Update `reviews/source-review-checklist.md` (mark `- [x]`, progress count, review notes)", "- [ ] Re-import if production DB is stale: `/docker-entrypoint.sh import`"])
    return "\n".join(lines) + "\n", issues


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit dndtools JSON for a source abbrev")
    parser.add_argument("abbrev", nargs="?", default="PH", help="Source abbrev, e.g. PH, BV, CD")
    parser.add_argument(
        "--write",
        nargs="?",
        const="",
        metavar="PATH",
        help="Write markdown report (default path: reviews/{abbrev}.md)",
    )
    args = parser.parse_args()

    abbrev = resolve_source_abbrev(args.abbrev)
    report, issues = build_report(abbrev)
    print(report)

    if args.write is not None:
        out = Path(args.write) if args.write else REVIEWS / f"{abbrev.lower()}.md"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(report, encoding="utf-8")
        print(f"Wrote {out}", file=sys.stderr)

    return 1 if any(i.severity == "error" for i in issues) else 0


if __name__ == "__main__":
    sys.exit(main())
