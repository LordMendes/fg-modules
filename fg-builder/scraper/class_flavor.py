"""Book flavor sections for class Notes tabs.

Mechanical class data stays in classes.json. Each tracked class has a sidecar
whose sections mirror the source book. Empty html means the section is still
missing. Transcribe those paragraphs from a book you own. This module does not
fetch or store closed book text.

Sidecars live under dndtools-reference/data/dndtools/flavor/classes/.
Regenerate the checklist with: python -m scraper.class_flavor
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path
from typing import Any

from scraper.class_flavor_catalog import MORE_BOOKS
from scraper.fg.html_utils import normalize_class_body_html

FLAVOR_ROOT = (
    Path(__file__).resolve().parents[2]
    / "dndtools-reference"
    / "data"
    / "dndtools"
    / "flavor"
)
CLASS_FLAVOR_DIR = FLAVOR_ROOT / "classes"
MANIFEST_PATH = FLAVOR_ROOT / "class-flavor-manifest.json"


def _section(key: str, title: str | None, placement: str, hint: str) -> dict[str, str | None]:
    return {"key": key, "title": title, "placement": placement, "hint": hint}


# Titles may use {name} and {plural}. Placement "before" sits above the
# existing class features. Placement "after" sits below the advancement table,
# which is where Player's Handbook II puts Playing / World / Lore / In the Game.
SCHEMAS: dict[str, dict[str, Any]] = {
    "phb-base": {
        "sections": [
            _section("intro", None, "before", "Opening paragraphs before Adventures."),
            _section("adventures", "Adventures", "before", "Why this class adventures."),
            _section("characteristics", "Characteristics", "before", "How the class plays and what it is good at."),
            _section(
                "alignment",
                "Alignment",
                "before",
                "Roleplaying discussion. This is the essay, not the rules restriction.",
            ),
            _section("religion", "Religion", "before", "Deities and temples."),
            _section("background", "Background", "before", "How someone becomes this class."),
            _section("races", "Races", "before", "Which peoples commonly take the class."),
            _section("other_classes", "Other Classes", "before", "How the class works with a party."),
            _section("role", "Role", "before", "Job in an adventuring group."),
            _section(
                "abilities",
                "Abilities",
                "before",
                "Ability score guidance under Game Rule Information.",
            ),
            _section(
                "alignment_restriction",
                "Alignment",
                "before",
                "Rules restriction under Game Rule Information, such as any nonlawful.",
            ),
            _section("hit_die", "Hit Die", "before", "Hit die line under Game Rule Information."),
            _section(
                "class_skills",
                "Class Skills",
                "before",
                "Skill point sentence. The skill list stays on the class stat tab.",
            ),
        ],
        "groups": [
            {
                "title": "Game Rule Information",
                "placement": "before",
                "opens": ["abilities", "alignment_restriction", "hit_die", "class_skills"],
            }
        ],
    },
    "phb2-standard": {
        "sections": [
            _section("intro", None, "before", "Opening paragraphs before Making a [Class]."),
            _section("abilities", "Abilities", "before", "Making a [Class]: ability scores."),
            _section("races", "Races", "before", "Making a [Class]: peoples."),
            _section("alignment", "Alignment", "before", "Making a [Class]: alignment."),
            _section("starting_gold", "Starting Gold", "before", "Making a [Class]: starting gold."),
            _section("starting_age", "Starting Age", "before", "Making a [Class]: starting age."),
            _section("religion", "Religion", "after", "Playing a [Class]."),
            _section("other_classes", "Other Classes", "after", "Playing a [Class]."),
            _section("combat", "Combat", "after", "Playing a [Class]."),
            _section(
                "advancement",
                "Advancement",
                "after",
                "Playing a [Class]. Story advancement, not the level table.",
            ),
            _section("daily_life", "Daily Life", "after", "[Class]s in the World."),
            _section("notables", "Notables", "after", "[Class]s in the World."),
            _section("organizations", "Organizations", "after", "[Class]s in the World."),
            _section("lore", "{name} Lore", "after", "Knowledge check lore block."),
            _section("adaptation", "Adaptation", "after", "[Class]s in the Game."),
            _section("encounters", "Encounters", "after", "[Class]s in the Game."),
        ],
        "groups": [
            {
                "title": "Making a {name}",
                "placement": "before",
                "opens": ["abilities", "races", "alignment", "starting_gold", "starting_age"],
            },
            {
                "title": "Playing a {name}",
                "placement": "after",
                "opens": ["religion", "other_classes", "combat", "advancement"],
            },
            {
                "title": "{plural} in the World",
                "placement": "after",
                "opens": ["daily_life", "notables", "organizations"],
            },
            {
                "title": "{plural} in the Game",
                "placement": "after",
                "opens": ["adaptation", "encounters"],
            },
        ],
    },
    "phb2-variant": {
        "sections": [
            _section(
                "intro",
                None,
                "before",
                "Short variant blurb. This record is not a full class essay.",
            )
        ],
        "groups": [],
    },
    "dmg-prestige": {
        "sections": [
            _section(
                "intro",
                None,
                "before",
                "Opening paragraphs before Hit Die. This book has no Adventures or Role sections.",
            )
        ],
        "groups": [],
    },
    "dmg-npc": {
        "sections": [
            _section("intro", None, "before", "Short introduction before the statistics.")
        ],
        "groups": [],
    },
    "rules-preamble": {
        "sections": [
            _section(
                "intro",
                None,
                "before",
                "Opening paragraphs. This book stops at the game rules, with no Playing or Lore chapters.",
            ),
            _section("abilities", "Abilities", "before", "Ability score guidance under Game Rule Information."),
            _section(
                "alignment_restriction",
                "Alignment",
                "before",
                "Rules restriction under Game Rule Information.",
            ),
            _section("hit_die", "Hit Die", "before", "Hit die line under Game Rule Information."),
            _section(
                "class_skills",
                "Class Skills",
                "before",
                "Skill point sentence. The skill list stays on the class stat tab.",
            ),
        ],
        "groups": [
            {
                "title": "Game Rule Information",
                "placement": "before",
                "opens": ["abilities", "alignment_restriction", "hit_die", "class_skills"],
            }
        ],
    },
}


def _class(name: str, slug: str, schema: str, page: int | None = None) -> dict[str, Any]:
    return {"name": name, "slug": slug, "schema": schema, "page": page}


def _deferred(name: str, slug: str) -> dict[str, Any]:
    return {
        "name": name,
        "slug": slug,
        "track": "deferred",
        "reason": "Epic level progression, not a class essay.",
    }


# Book order, not alphabetical. Pages are filled only when the scrape records one.
CATALOG: list[dict[str, Any]] = [
    {
        "abbrev": "PH",
        "title": "Player's Handbook",
        "slug": "players-handbook",
        "classes": [
            _class("Barbarian", "barbarian-89", "phb-base"),
            _class("Bard", "bard", "phb-base", 26),
            _class("Cleric", "cleric-91", "phb-base"),
            _class("Druid", "druid-92", "phb-base"),
            _class("Fighter", "fighter-93", "phb-base"),
            _class("Monk", "monk-94", "phb-base"),
            _class("Paladin", "paladin-95", "phb-base"),
            _class("Ranger", "ranger-96", "phb-base"),
            _class("Rogue", "rogue-97", "phb-base"),
            _class("Sorcerer", "sorcerer-98", "phb-base"),
            _class("Wizard", "wizard-99", "phb-base"),
        ],
    },
    {
        "abbrev": "PH2",
        "title": "Player's Handbook II",
        "slug": "players-handbook-ii",
        "classes": [
            _class("Beguiler", "beguiler-100", "phb2-standard"),
            _class("Dragon Shaman", "dragon-shaman-101", "phb2-standard"),
            _class("Duskblade", "duskblade-102", "phb2-standard"),
            _class("Knight", "knight-103", "phb2-standard"),
            _class("Metamagic Specialist", "metamagic-specialist-1031", "phb2-variant"),
        ],
    },
    {
        "abbrev": "DMG",
        "title": "Dungeon Master's Guide",
        "slug": "dungeon-masters-guide",
        "classes": [
            _class("Adept", "adept-917", "dmg-npc"),
            _class("Aristocrat", "aristocrat-31", "dmg-npc"),
            _class("Commoner", "commoner-32", "dmg-npc"),
            _class("Expert", "expert-33", "dmg-npc"),
            _class("Warrior", "warrior-34", "dmg-npc"),
            _class("Arcane Archer", "arcane-archer-378", "dmg-prestige"),
            _class("Arcane Trickster", "arcane-trickster-379", "dmg-prestige"),
            _class("Archmage", "archmage-380", "dmg-prestige"),
            _class("Assassin", "assassin-381", "dmg-prestige"),
            _class("Blackguard", "blackguard-382", "dmg-prestige"),
            _class("Dragon Disciple", "dragon-disciple-383", "dmg-prestige"),
            _class("Duelist", "duelist-384", "dmg-prestige"),
            _class("Dwarven Defender", "dwarven-defender-385", "dmg-prestige"),
            _class("Eldritch Knight", "eldritch-knight-386", "dmg-prestige"),
            _class("Hierophant", "hierophant-387", "dmg-prestige"),
            _class("Horizon Walker", "horizon-walker-388", "dmg-prestige"),
            _class("Loremaster", "loremaster-389", "dmg-prestige"),
            _class("Mystic Theurge", "mystic-theurge-390", "dmg-prestige"),
            _class("Red Wizard", "red-wizard-391", "dmg-prestige"),
            _class("Shadowdancer", "shadowdancer-392", "dmg-prestige"),
            _class("Thaumaturgist", "thaumaturgist-393", "dmg-prestige"),
            _deferred("Epic Barbarian", "epic-barbarian-991"),
            _deferred("Epic Bard", "epic-bard-1012"),
            _deferred("Epic Cleric", "epic-cleric-1013"),
            _deferred("Epic Druid", "epic-druid-1014"),
            _deferred("Epic Fighter", "epic-fighter-1016"),
            _deferred("Epic Monk", "epic-monk-1017"),
            _deferred("Epic Paladin", "epic-paladin-1018"),
            _deferred("Epic Ranger", "epic-ranger-1019"),
            _deferred("Epic Rogue", "epic-rogue-1020"),
            _deferred("Epic Sorcerer", "epic-sorcerer-1021"),
            _deferred("Epic Wizard", "epic-wizard-1022"),
        ],
    },
]
CATALOG.extend(MORE_BOOKS)


def plural_class_name(name: str) -> str:
    if name.endswith("s"):
        return name
    return f"{name}s"


def format_title(template: str | None, name: str) -> str | None:
    if not template:
        return None
    return template.format(name=name, plural=plural_class_name(name))


def sidecar_path(book_slug: str, slug: str) -> Path:
    return CLASS_FLAVOR_DIR / book_slug / f"{slug}.json"


def _blank_sections(schema_id: str, name: str) -> list[dict[str, Any]]:
    sections: list[dict[str, Any]] = []
    for spec in SCHEMAS[schema_id]["sections"]:
        sections.append(
            {
                "key": spec["key"],
                "title": format_title(spec["title"], name),
                "placement": spec["placement"],
                "hint": spec["hint"],
                "html": "",
            }
        )
    return sections


def _blank_sidecar(book: dict[str, Any], entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": entry["name"],
        "slug": entry["slug"],
        "source_abbrev": book["abbrev"],
        "book_slug": book["slug"],
        "page": entry.get("page"),
        "schema": entry["schema"],
        "sections": _blank_sections(entry["schema"], entry["name"]),
    }


def load_class_flavor(book_slug: str, slug: str) -> dict[str, Any] | None:
    path = sidecar_path(book_slug, slug)
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _body_html(raw: str) -> str:
    text = (raw or "").strip()
    if not text:
        return ""
    if text.startswith("<"):
        return normalize_class_body_html(text)
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    wrapped = "".join(f"<p>{html.escape(part)}</p>" for part in paragraphs)
    return normalize_class_body_html(wrapped)


def render_flavor_html(doc: dict[str, Any] | None, placement: str) -> str:
    """Render one placement. Empty sections are omitted, including their headings."""
    if not doc:
        return ""
    name = doc.get("name") or ""
    sections = [
        section
        for section in doc.get("sections") or []
        if (section.get("placement") or "before") == placement
    ]
    filled = {section["key"] for section in sections if (section.get("html") or "").strip()}
    header_at: dict[str, str] = {}
    schema = SCHEMAS.get(doc.get("schema") or "", {})
    for group in schema.get("groups") or []:
        if group.get("placement") != placement:
            continue
        for key in group.get("opens") or []:
            if key in filled:
                title = format_title(group.get("title"), name)
                if title:
                    header_at[key] = title
                break
    parts: list[str] = []
    for section in sections:
        key = section.get("key") or ""
        if key in header_at:
            parts.append(f"<p><b>{html.escape(header_at[key])}</b></p>")
        body = _body_html(section.get("html") or "")
        if not body:
            continue
        title = (section.get("title") or "").strip()
        if title:
            parts.append(f"<p><b>{html.escape(title)}</b></p>")
        parts.append(body)
    return "".join(parts)


def attach_class_flavor(detail: dict[str, Any], book_slug: str, slug: str) -> None:
    doc = load_class_flavor(book_slug, slug)
    detail["flavor_html_before"] = render_flavor_html(doc, "before")
    detail["flavor_html_after"] = render_flavor_html(doc, "after")
    if doc:
        detail["flavor_schema"] = doc.get("schema") or ""


def _section_status(section: dict[str, Any]) -> str:
    return "done" if (section.get("html") or "").strip() else "missing"


def build_manifest() -> dict[str, Any]:
    books: list[dict[str, Any]] = []
    sections_done = 0
    sections_missing = 0
    classes_tracked = 0
    classes_deferred = 0
    for book in CATALOG:
        class_rows: list[dict[str, Any]] = []
        deferred_rows: list[dict[str, Any]] = []
        for entry in book["classes"]:
            if entry.get("track") == "deferred":
                classes_deferred += 1
                deferred_rows.append(
                    {
                        "name": entry["name"],
                        "slug": entry["slug"],
                        "status": "deferred",
                        "reason": entry.get("reason") or "",
                    }
                )
                continue
            classes_tracked += 1
            doc = load_class_flavor(book["slug"], entry["slug"])
            if doc is None:
                sections = [
                    {
                        "key": spec["key"],
                        "title": format_title(spec["title"], entry["name"]),
                        "placement": spec["placement"],
                        "hint": spec["hint"],
                        "status": "missing",
                    }
                    for spec in SCHEMAS[entry["schema"]]["sections"]
                ]
            else:
                sections = [
                    {
                        "key": section.get("key"),
                        "title": section.get("title"),
                        "placement": section.get("placement"),
                        "hint": section.get("hint") or "",
                        "status": _section_status(section),
                    }
                    for section in doc.get("sections") or []
                ]
            done = sum(1 for section in sections if section["status"] == "done")
            missing = len(sections) - done
            sections_done += done
            sections_missing += missing
            class_rows.append(
                {
                    "name": entry["name"],
                    "slug": entry["slug"],
                    "schema": entry["schema"],
                    "page": entry.get("page"),
                    "file": f"{book['slug']}/{entry['slug']}.json",
                    "done": done,
                    "missing": missing,
                    "sections": sections,
                }
            )
        books.append(
            {
                "abbrev": book["abbrev"],
                "title": book["title"],
                "slug": book["slug"],
                "classes": class_rows,
                "deferred": deferred_rows,
            }
        )
    return {
        "summary": {
            "sections_done": sections_done,
            "sections_missing": sections_missing,
            "classes_tracked": classes_tracked,
            "classes_deferred": classes_deferred,
        },
        "books": books,
    }


def flavor_coverage_summary() -> list[dict[str, Any]]:
    manifest = build_manifest()
    rows: list[dict[str, Any]] = []
    for book in manifest["books"]:
        done = sum(row["done"] for row in book["classes"])
        missing = sum(row["missing"] for row in book["classes"])
        rows.append(
            {
                "abbrev": book["abbrev"],
                "title": book["title"],
                "slug": book["slug"],
                "classes": len(book["classes"]),
                "deferred": len(book["deferred"]),
                "sections": done + missing,
                "done": done,
                "missing": missing,
            }
        )
    return rows


def flavor_gap_warning(book_title: str) -> str | None:
    """One build warning when a tracked book still has empty flavor sections."""
    for book in flavor_coverage_summary():
        if book["title"] != book_title or book["missing"] <= 0:
            continue
        return (
            f"classes: flavor text {book['done']}/{book['sections']} sections "
            f"across {book['classes']} classes"
        )
    return None


def flavor_coverage_warnings() -> list[str]:
    """One line per tracked class that still has an empty section."""
    warnings: list[str] = []
    for book in build_manifest()["books"]:
        for row in book["classes"]:
            missing = [
                section["key"]
                for section in row["sections"]
                if section["status"] == "missing"
            ]
            if missing:
                warnings.append(
                    f"{book['abbrev']}/{row['name']}: missing flavor sections "
                    + ", ".join(missing)
                )
    return warnings


def write_flavor_files() -> None:
    """Write sidecars and the manifest. Existing section html is preserved."""
    for book in CATALOG:
        for entry in book["classes"]:
            if entry.get("track") == "deferred":
                continue
            path = sidecar_path(book["slug"], entry["slug"])
            fresh = _blank_sidecar(book, entry)
            if path.is_file():
                old = json.loads(path.read_text(encoding="utf-8"))
                if old.get("srd_url"):
                    fresh["srd_url"] = old["srd_url"]
                old_html = {
                    section.get("key"): section.get("html") or ""
                    for section in old.get("sections") or []
                }
                for section in fresh["sections"]:
                    previous = (old_html.get(section["key"]) or "").strip()
                    if previous:
                        section["html"] = old_html[section["key"]]
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(
                json.dumps(fresh, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(
        json.dumps(build_manifest(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    write_flavor_files()
    for book in flavor_coverage_summary():
        print(
            f"{book['abbrev']}: {book['done']}/{book['sections']} sections "
            f"across {book['classes']} classes, {book['deferred']} deferred"
        )
    summary = build_manifest()["summary"]
    print(
        f"total: {summary['sections_done']}/{summary['sections_done'] + summary['sections_missing']} "
        f"tracked, {summary['classes_deferred']} deferred"
    )


if __name__ == "__main__":
    main()
