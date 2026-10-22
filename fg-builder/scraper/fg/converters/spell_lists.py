"""Build Fantasy Grounds class/rune spell lists from spell records."""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from typing import Any

from ..loader import BuildReport
from ..xml_builder import typed_number, typed_string

# Class names that get a flat level-grouped spell list.
CASTER_LIST_NAMES = frozenset(
    {
        "Warlock",
        "Mage",
        "Necromancer",
        "Priest",
        "Druid",
        "Shaman",
        "Witch Doctor",
        "Argent Dawn Templar",
        "Paladin",
        "Hunter",
        "Arcanist",
    }
)

# Rune pattern names stored on MMM rune "spell" class tags.
RUNE_PATTERN_NAMES = frozenset(
    {
        "Frost",
        "Flame",
        "Fire",
        "Stone",
        "Storm",
        "Restoration",
        "Motion",
        "Awareness",
        "Beast",
        "Shielding",
        "Striking",
        "Healing",
    }
)

# MMM class record name -> spell list key / link target.
CLASS_TO_LIST = {
    "Witch Doctor": ("witchdoctor", "Witch Doctor spell list", "reference_classspelllist"),
    "Argent Dawn Templar": (
        "argentdawntemplar",
        "Argent Dawn Templar spell list",
        "reference_classspelllist",
    ),
    "Runemaster": ("runepatterns", "Rune pattern lists", "reference_schoolspelllist"),
    "Inscriber": ("runepatterns", "Rune pattern lists", "reference_schoolspelllist"),
}

ARCANIST_PATH_LISTS = (
    ("mage", "Mage spell list"),
    ("necromancer", "Necromancer spell list"),
    ("warlock", "Warlock spell list"),
)

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def list_key(name: str) -> str:
    return _SLUG_RE.sub("", (name or "").lower())


def level_label(level: int) -> str:
    if level == 0:
        return "Level 0"
    if level == 1:
        return "Level 1"
    if level == 2:
        return "Level 2"
    if level == 3:
        return "Level 3"
    return f"Level {level}"


def index_spell_paths(spell_section: ET.Element, module_name: str) -> dict[str, str]:
    """Map lowercase spell name -> spell.id-xxxxx@Module."""
    paths: dict[str, str] = {}
    for category in spell_section.findall("category"):
        for node in category:
            name_el = node.find("name")
            if name_el is None or not (name_el.text or "").strip():
                continue
            name = name_el.text.strip()
            paths[name.lower()] = f"spell.{node.tag}@{module_name}"
    return paths


def _windowreference(parent: ET.Element, tag: str, cls: str, recordname: str) -> ET.Element:
    el = ET.SubElement(parent, tag)
    el.set("type", "windowreference")
    class_el = ET.SubElement(el, "class")
    class_el.text = cls
    rec_el = ET.SubElement(el, "recordname")
    rec_el.text = recordname
    return el


def _add_spell_entry(
    spells_el: ET.Element,
    *,
    spell_name: str,
    level: int,
    record_path: str,
    short: str,
) -> None:
    node = ET.SubElement(spells_el, list_key(spell_name) or "spell")
    _windowreference(node, "link", "spelldesc", record_path)
    typed_string(node, "name", spell_name)
    typed_number(node, "level", level)
    if short:
        typed_string(node, "shortdescription", short)


def _collect_by_list(
    spell_records: list[dict[str, Any]],
) -> tuple[dict[str, dict[int, list[dict[str, Any]]]], dict[str, dict[int, list[dict[str, Any]]]]]:
    casters: dict[str, dict[int, list[dict[str, Any]]]] = defaultdict(
        lambda: defaultdict(list)
    )
    patterns: dict[str, dict[int, list[dict[str, Any]]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for rec in spell_records:
        name = (rec.get("name") or "").strip()
        if not name:
            continue
        detail = rec.get("detail") or {}
        short = (detail.get("shortdescription") or detail.get("description_text") or "")[
            :160
        ]
        classes = detail.get("classes") or rec.get("classes") or []
        # After adapter conversion, classes may be only in level string; prefer structured.
        if not classes and isinstance(detail.get("level"), str):
            # "Warlock 4, Mage 3," style
            for part in detail["level"].split(","):
                part = part.strip()
                if not part:
                    continue
                m = re.match(r"^(.+?)\s+(\d+)$", part)
                if not m:
                    continue
                classes.append({"name": m.group(1), "level": int(m.group(2))})
        for entry in classes:
            if isinstance(entry, dict):
                cname = (entry.get("name") or "").strip()
                try:
                    level = int(entry.get("level"))
                except (TypeError, ValueError):
                    continue
            else:
                continue
            item = {"name": name, "level": level, "short": short}
            if cname in CASTER_LIST_NAMES:
                casters[cname][level].append(item)
            elif cname in RUNE_PATTERN_NAMES:
                patterns[cname][level].append(item)
    return casters, patterns


def _fill_level_groups(
    groups_el: ET.Element,
    by_level: dict[int, list[dict[str, Any]]],
    spell_paths: dict[str, str],
) -> int:
    count = 0
    for level in sorted(by_level):
        entries = sorted(by_level[level], key=lambda e: e["name"].lower())
        group = ET.SubElement(groups_el, f"level{level}")
        typed_string(group, "description", level_label(level))
        spells_el = ET.SubElement(group, "spells")
        for entry in entries:
            path = spell_paths.get(entry["name"].lower())
            if not path:
                continue
            _add_spell_entry(
                spells_el,
                spell_name=entry["name"],
                level=entry["level"],
                record_path=path,
                short=entry.get("short") or "",
            )
            count += 1
    return count


def build_spell_lists(
    spell_records: list[dict[str, Any]],
    spell_paths: dict[str, str],
    module_name: str,
    report: BuildReport,
) -> tuple[ET.Element | None, ET.Element | None, dict[str, str]]:
    """Return (spelllists, library, class_name->linklist html)."""
    if not spell_records or not spell_paths:
        return None, None, {}

    casters, patterns = _collect_by_list(spell_records)
    if not casters and not patterns:
        return None, None, {}

    spelllists = ET.Element("spelllists")
    spelllists.set("static", "true")
    library_entries: list[tuple[str, str, str, str]] = []
    # (node_key, display_name, window_class, recordname)

    for cname in sorted(casters):
        key = list_key(cname)
        node = ET.SubElement(spelllists, key)
        typed_string(node, "description", f"{cname} Spells")
        groups = ET.SubElement(node, "groups")
        written = _fill_level_groups(groups, casters[cname], spell_paths)
        if written:
            library_entries.append(
                (
                    key,
                    f"{cname} spells",
                    "reference_classspelllist",
                    f"spelllists.{key}@{module_name}",
                )
            )
            report.add_written("spelllists")

    if patterns:
        root = ET.SubElement(spelllists, "runepatterns")
        typed_string(root, "description", "Rune Pattern Lists")
        schools = ET.SubElement(root, "schools")
        for pname in sorted(patterns):
            skey = list_key(pname)
            school = ET.SubElement(schools, skey)
            typed_string(school, "description", f"{pname} Pattern")
            groups = ET.SubElement(school, "groups")
            _fill_level_groups(groups, patterns[pname], spell_paths)
            # Also expose each pattern as its own class list for direct links.
            pnode = ET.SubElement(spelllists, skey)
            typed_string(pnode, "description", f"{pname} Pattern Runes")
            pgroups = ET.SubElement(pnode, "groups")
            _fill_level_groups(pgroups, patterns[pname], spell_paths)
        library_entries.append(
            (
                "runepatterns",
                "Rune pattern lists",
                "reference_schoolspelllist",
                f"spelllists.runepatterns@{module_name}",
            )
        )
        report.add_written("spelllists")

    library = None
    if library_entries:
        library = ET.Element("library")
        lib_id = list_key(module_name) or "module"
        lib_root = ET.SubElement(library, lib_id)
        lib_root.set("static", "true")
        typed_string(lib_root, "name", module_name)
        typed_string(lib_root, "categoryname", "WoW RPG")
        entries = ET.SubElement(lib_root, "entries")
        for key, display, wclass, recordname in library_entries:
            entry = ET.SubElement(entries, key)
            _windowreference(entry, "librarylink", wclass, recordname)
            typed_string(entry, "name", display)

    class_links = _class_link_html(module_name, casters, bool(patterns))
    return spelllists, library, class_links


def _linklist(items: list[tuple[str, str, str]]) -> str:
    """items: (window_class, recordname, label)."""
    if not items:
        return ""
    parts = ['<linklist>']
    for wclass, recordname, label in items:
        parts.append(
            f'<link class="{wclass}" recordname="{recordname}">{label}</link>'
        )
    parts.append("</linklist>")
    return "".join(parts)


def _class_link_html(
    module_name: str,
    casters: dict[str, Any],
    has_patterns: bool,
) -> dict[str, str]:
    links: dict[str, str] = {}
    for class_name, (key, label, wclass) in CLASS_TO_LIST.items():
        if key == "runepatterns":
            if not has_patterns:
                continue
        elif class_name not in casters:
            continue
        links[class_name] = _linklist(
            [(wclass, f"spelllists.{key}@{module_name}", label)]
        )

    for cname in casters:
        if cname in links:
            continue
        key = list_key(cname)
        links[cname] = _linklist(
            [
                (
                    "reference_classspelllist",
                    f"spelllists.{key}@{module_name}",
                    f"{cname} spell list",
                )
            ]
        )
    return links


def arcanist_path_spell_links(module_name: str = "More Magic and Mayhem") -> str:
    items = [
        (
            "reference_classspelllist",
            f"spelllists.{key}@{module_name}",
            label,
        )
        for key, label in ARCANIST_PATH_LISTS
    ]
    return (
        "<p><b>Spell Lists</b></p>"
        + _linklist(items)
    )
