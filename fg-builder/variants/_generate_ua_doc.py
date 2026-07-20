"""One-off generator for unearthed-arcana.md from dndtools classes.json."""
from __future__ import annotations

import html as html_lib
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CLASSES_JSON = ROOT / "dndtools-reference" / "data" / "dndtools" / "classes.json"
OUT = Path(__file__).resolve().parent / "unearthed-arcana.md"


def html_paragraphs(raw_html: str) -> list[str]:
    paras = re.findall(r"<p>(.*?)</p>", raw_html, re.S | re.I)
    out: list[str] = []
    for para in paras:
        text = re.sub(r"<[^>]+>", "", para)
        text = html_lib.unescape(text)
        text = re.sub(r"\s+", " ", text).strip()
        if not text or text.startswith("All starting gold"):
            continue
        out.append(text)
    return out


def parse_gain_lose(text: str) -> tuple[str | None, str | None]:
    gain = lose = None
    m = re.search(r"Gain\s*:\s*(.+?)(?:\.\s*Lose\s*:|$)", text, re.I | re.S)
    if m:
        gain = re.sub(r"\s+", " ", m.group(1)).strip().rstrip(".")
    m = re.search(r"Lose\s*:\s*(.+?)(?:\.\s|$)", text, re.I | re.S)
    if m:
        lose = re.sub(r"\s+", " ", m.group(1)).strip().rstrip(".")
    return gain, lose


MONK_FIGHTING_STYLES = (
    "Cobra Strike",
    "Demon Hunter",
    "Forest Master",
    "Janni Tempest",
    "Mantis Warrior",
    "Monkey Claw",
    "Sun School",
    "Wind Storm",
)


def base_class(item: dict) -> str:
    if item.get("slug") == "sorcererwizard-variant-957":
        return "Sorcerer / Wizard"
    raw_html = item.get("description_html", "")
    for pat in (
        r"base class,?\s*<a[^>]*>([^<]+)</a>",
        r"base classes,?\s*<a[^>]*>([^<]+)</a>",
        r"base class,?\s*([^,\.]+)",
        r"base classes,?\s*([^,\.]+)",
    ):
        m = re.search(pat, raw_html, re.I)
        if m:
            return m.group(1).strip()
    return "—"


def feature_paragraphs(item: dict, gain: str | None, lose: str | None) -> list[str]:
    paras = html_paragraphs(item.get("description_html", ""))
    if item.get("slug") == "monk-variant-fighting-styles-949":
        return paras[:3]
    if not gain and not lose:
        return paras
    filtered: list[str] = []
    for para in paras:
        if re.match(r"^(Gain|Lose)\s*:", para, re.I):
            continue
        if lose and para.strip() == f"Lose: {lose}.":
            continue
        if gain and lose and gain in para and lose in para:
            continue
        filtered.append(para)
    return filtered


def main() -> None:
    data = json.loads(CLASSES_JSON.read_text(encoding="utf-8"))
    variants = sorted(
        [
            x
            for x in data
            if (x.get("index") or {}).get("source_abbrev") == "UA"
            and "variant" in x.get("name", "").lower()
        ],
        key=lambda i: i.get("name", "").lower(),
    )

    lines: list[str] = []
    lines.append("# Unearthed Arcana — Class Variants")
    lines.append("")
    lines.append(
        "Reference for all **class variants** from *Unearthed Arcana* (3.5E), "
        "generated from `dndtools-reference/data/dndtools/classes.json`."
    )
    lines.append("")
    lines.append(
        "Variant classes keep the base class HD, saves, BAB, skill points, and class skills "
        "unless the variant text says otherwise. In Fantasy Grounds, expect **manual level-1 "
        "class skill selection** for variants (see `reviews/v1/README.md`)."
    )
    lines.append("")
    lines.append("**Source:** Unearthed Arcana (`UA`), Supplementals 3.5")
    lines.append("")
    lines.append("## Quick reference")
    lines.append("")
    lines.append("| Variant | Base class | Gain (summary) | Lose (summary) |")
    lines.append("|---------|------------|----------------|----------------|")

    for v in variants:
        text = " ".join(html_paragraphs(v.get("description_html", "")))
        gain, lose = parse_gain_lose(text)
        g = (gain or "—")[:90].replace("|", "/")
        l = (lose or "—")[:90].replace("|", "/")
        if gain and len(gain) > 90:
            g += "…"
        if lose and len(lose) > 90:
            l += "…"
        lines.append(f"| {v['name']} | {base_class(v)} | {g} | {l} |")

    lines.append("")
    lines.append("## Variants by base class")
    lines.append("")

    groups: dict[str, list[dict]] = defaultdict(list)
    for v in variants:
        groups[base_class(v)].append(v)

    base_order = [
        "barbarian",
        "bard",
        "cleric",
        "druid",
        "fighter",
        "Monk",
        "paladin",
        "ranger",
        "Rogue",
        "Sorcerer / Wizard",
        "Wizard",
    ]
    for key in sorted(groups):
        if key not in base_order:
            base_order.append(key)

    for base in base_order:
        if base not in groups:
            continue
        heading = base.title() if base not in ("Monk", "Rogue", "Wizard") else base
        if base == "Sorcerer / Wizard":
            heading = "Sorcerer / Wizard"
        lines.append(f"### {heading}")
        lines.append("")
        for v in groups[base]:
            text = " ".join(html_paragraphs(v.get("description_html", "")))
            gain, lose = parse_gain_lose(text)
            lines.append(f"#### {v['name']}")
            lines.append("")
            lines.append(f"- **Slug:** `{v['slug']}`")
            lines.append(f"- **Source URL:** {v.get('source_url', '—')}")
            if gain:
                lines.append(f"- **Gain:** {gain}")
            if lose:
                lines.append(f"- **Lose:** {lose}")
            feats = feature_paragraphs(v, gain, lose)
            if feats:
                lines.append("")
                lines.append("**Features:**")
                lines.append("")
                for f in feats:
                    lines.append(f"- {f}")
            if v.get("slug") == "monk-variant-fighting-styles-949":
                lines.append("")
                lines.append("**Fighting styles (1st-level choice):**")
                lines.append("")
                for style in MONK_FIGHTING_STYLES:
                    lines.append(f"- {style}")
                lines.append("")
                lines.append(
                    "Each style fixes bonus feats at 1st, 2nd, and 6th level, grants a +2 skill bonus at 1st, "
                    "and a 6th-level bonus ability when prerequisites are met. Full feat/skill tables are in the "
                    "source URL above (dndtools scrape merges style blocks)."
                )
            lines.append("")

    lines.append("## FG builder notes")
    lines.append("")
    lines.append(
        "- Variant pages often omit hit die / skill point index fields (`—`); treat as identical to the base class."
    )
    lines.append(
        "- Wizard school variants retain PHB specialization restrictions and bonus spell slot trade-offs where noted."
    )
    lines.append(
        "- **Monk Variant: Fighting Styles** is a 1st-level sub-choice (cobra, demon, forest, janni, mantis, "
        "monkey, sun, wind); each style grants a different bonus-feat progression at 1st, 2nd, and 6th level."
    )
    lines.append(
        "- Related UA alternate base classes (not named \"Variant\"): Bardic Sage, Battle Sorcerer, "
        "Cloistered Cleric, Divine Bard, Domain Wizard, Druidic Avenger, Paladin of Freedom/Slaughter/Tyranny, "
        "Planar Ranger, Prestige Bard/Paladin/Ranger, Savage Bard, Totem Barbarian, Urban Ranger, "
        "Wilderness Rogue, and paragon classes."
    )
    lines.append("")
    lines.append("## Related UA optional rules (outside this doc)")
    lines.append("")
    lines.append(
        "Bloodlines, gestalt, taint, racial substitution levels, and similar systems are not class variants "
        "and are excluded here."
    )
    lines.append("")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} ({len(lines)} lines, {len(variants)} variants)")


if __name__ == "__main__":
    main()
