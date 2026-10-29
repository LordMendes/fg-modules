"""Build Fantasy Grounds class/rune spell lists from spell records."""

from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
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
    node_id: str = "",
) -> None:
    node = ET.SubElement(spells_el, node_id or list_key(spell_name) or "spell")
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


DREAD_NECROMANCER_CLASS = "Dread Necromancer"
PH_MODULE_NAME = "Player's Handbook"


def indexed_module_spell_paths(spells_json: Any, module_name: str) -> dict[str, str]:
    """Map lowercase spell name to spell.id-#####@Module using write order.

    ``spells_json`` is a path to the staged spells list. Ids match convert_spells,
    which assigns id-00001 to the first record and keeps that order.
    """
    path = Path(spells_json)
    if not path.is_file():
        return {}
    records = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        return {}
    paths: dict[str, str] = {}
    for index, rec in enumerate(records, start=1):
        if not isinstance(rec, dict):
            continue
        name = (rec.get("name") or "").strip()
        if not name:
            continue
        paths[name.lower()] = f"spell.id-{index:05d}@{module_name}"
    return paths


def catalog_class_spell_entries(class_name: str) -> list[dict[str, Any]]:
    """Spell name and level for one class, from the shared spell catalog."""
    from scraper.dndtools_adapter import load_category

    found: list[dict[str, Any]] = []
    seen: set[tuple[str, int]] = set()
    for spell in load_category("spells"):
        name = (spell.get("name") or "").strip()
        if not name:
            continue
        for entry in spell.get("classes") or []:
            if not isinstance(entry, dict):
                continue
            if (entry.get("name") or "") != class_name:
                continue
            try:
                level = int(entry.get("level"))
            except (TypeError, ValueError):
                continue
            key = (name.lower(), level)
            if key in seen:
                continue
            seen.add(key)
            found.append({"name": name, "level": level, "short": ""})
    return found


def _unique_spell_id(used: set[str], spell_name: str) -> str:
    base = list_key(spell_name) or "spell"
    key = base
    suffix = 2
    while key in used:
        key = f"{base}{suffix}"
        suffix += 1
    used.add(key)
    return key


def _append_level_groups(
    groups_el: ET.Element,
    entries: list[dict[str, Any]],
    spell_paths: dict[str, str],
) -> tuple[int, list[str]]:
    by_level: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for entry in entries:
        by_level[int(entry["level"])].append(entry)
    written = 0
    missing: list[str] = []
    for level in sorted(by_level):
        spells_el: ET.Element | None = None
        used: set[str] = set()
        for entry in sorted(by_level[level], key=lambda item: item["name"].lower()):
            path = spell_paths.get(entry["name"].lower())
            if not path:
                missing.append(entry["name"])
                continue
            if spells_el is None:
                group = ET.SubElement(groups_el, f"level{level}")
                typed_string(group, "description", level_label(level))
                spells_el = ET.SubElement(group, "spells")
            _add_spell_entry(
                spells_el,
                spell_name=entry["name"],
                level=level,
                record_path=path,
                short=entry.get("short") or "",
                node_id=_unique_spell_id(used, entry["name"]),
            )
            written += 1
    return written, missing


def _ensure_spell_library(
    library: ET.Element | None,
    module_name: str,
) -> tuple[ET.Element, ET.Element]:
    if library is None:
        library = ET.Element("library")
        lib_root = ET.SubElement(library, list_key(module_name) or "module")
        lib_root.set("static", "true")
        typed_string(lib_root, "name", module_name)
        typed_string(lib_root, "categoryname", module_name)
        entries = ET.SubElement(lib_root, "entries")
        return library, entries
    entries = library.find(".//entries")
    if entries is None:
        lib_root = library[0] if len(library) else ET.SubElement(library, "module")
        entries = ET.SubElement(lib_root, "entries")
    return library, entries


def add_dread_necromancer_spell_list(
    spelllists: ET.Element | None,
    library: ET.Element | None,
    *,
    current_paths: dict[str, str],
    module_name: str,
    ph_spells_json: Any,
    report: BuildReport,
    entries: list[dict[str, Any]] | None = None,
) -> tuple[ET.Element | None, ET.Element | None, dict[str, str]]:
    """Add the Dread Necromancer list and a link for the class text.

    Spells printed in this module link here. The rest link into Player's Handbook
    using that module's spell ids.
    """
    spells = entries if entries is not None else catalog_class_spell_entries(
        DREAD_NECROMANCER_CLASS
    )
    if not spells:
        return spelllists, library, {}

    paths = indexed_module_spell_paths(ph_spells_json, PH_MODULE_NAME)
    paths.update(current_paths)

    if spelllists is None:
        spelllists = ET.Element("spelllists")
        spelllists.set("static", "true")

    key = list_key(DREAD_NECROMANCER_CLASS)
    node = ET.SubElement(spelllists, key)
    typed_string(node, "description", f"{DREAD_NECROMANCER_CLASS} Spells")
    groups = ET.SubElement(node, "groups")
    written, missing = _append_level_groups(groups, spells, paths)
    if not written:
        spelllists.remove(node)
        return spelllists, library, {}

    recordname = f"spelllists.{key}@{module_name}"
    library, entries_el = _ensure_spell_library(library, module_name)
    entry = ET.SubElement(entries_el, key)
    _windowreference(entry, "librarylink", "reference_classspelllist", recordname)
    typed_string(entry, "name", f"{DREAD_NECROMANCER_CLASS} spell list")
    report.add_written("spelllists")
    if missing:
        sample = ", ".join(missing[:8])
        report.warnings.append(
            f"spelllists: {len(missing)} Dread Necromancer spells have no module link ({sample})"
        )
    link_html = "<p />" + _linklist(
        [
            (
                "reference_classspelllist",
                recordname,
                f"{DREAD_NECROMANCER_CLASS} spell list",
            )
        ]
    )
    return spelllists, library, {DREAD_NECROMANCER_CLASS: link_html}


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
