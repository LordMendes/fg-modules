"""Fill open SRD rules text into class flavor sidecars.

Source: https://srd.dndtools.org/

Base-class pages on that site paste the closed book essays (Adventures, Religion,
and the rest) in front of the rules, with no headings. Those essays are not
copied. This module stores the labeled rules lines that follow them, and the
short prestige and NPC introductions that end at Hit Die. The same rules lines
are stored for the Complete base classes, and the same introductions for the
Complete Warrior prestige classes that the site publishes.
"""

from __future__ import annotations

import html
import json
import re
import urllib.request
from typing import Any

from bs4 import BeautifulSoup, Tag

from scraper.class_flavor import (
    CATALOG,
    MANIFEST_PATH,
    build_manifest,
    sidecar_path,
    write_flavor_files,
)

SRD_CLASS_ROOT = "https://srd.dndtools.org/srd/classes/"

CORE_PAGES = {
    "Barbarian": "baseCore/barbarian.html",
    "Bard": "baseCore/bard.html",
    "Cleric": "baseCore/cleric.html",
    "Druid": "baseCore/druid.html",
    "Fighter": "baseCore/fighter.html",
    "Monk": "baseCore/monk.html",
    "Paladin": "baseCore/paladin.html",
    "Ranger": "baseCore/ranger.html",
    "Rogue": "baseCore/rogue.html",
    "Sorcerer": "baseCore/sorcerer.html",
    "Wizard": "baseCore/wizard.html",
}

PRESTIGE_PAGES = {
    "Arcane Archer": "prestigeCore/arcaneArcher.html",
    "Arcane Trickster": "prestigeCore/arcaneTrickster.html",
    "Archmage": "prestigeCore/archmage.html",
    "Assassin": "prestigeCore/assassin.html",
    "Blackguard": "prestigeCore/blackguard.html",
    "Dragon Disciple": "prestigeCore/dragonDisciple.html",
    "Duelist": "prestigeCore/duelist.html",
    "Dwarven Defender": "prestigeCore/dwarvenDefender.html",
    "Eldritch Knight": "prestigeCore/eldritchKnight.html",
    "Hierophant": "prestigeCore/hierophant.html",
    "Horizon Walker": "prestigeCore/horizonWalker.html",
    "Loremaster": "prestigeCore/loremaster.html",
    "Mystic Theurge": "prestigeCore/mysticTheurge.html",
    "Red Wizard": "prestigeCore/redWizard.html",
    "Shadowdancer": "prestigeCore/shadowdancer.html",
    "Thaumaturgist": "prestigeCore/thaumaturgist.html",
}

NPC_PAGE = "npcClasses.html"
NPC_NAMES = ("Adept", "Aristocrat", "Commoner", "Expert", "Warrior")

# Complete Warrior, Divine, Arcane, and Adventurer. These base classes use the
# Player's Handbook chapter shape, so the labeled rules lines go in phb-base.
# Prestige pages exist on the site for Complete Warrior only.
COMPLETE_BASE = {
    "complete-warrior": {
        "Hexblade": "baseCwar/hexblade.html",
        "Samurai": "baseCwar/samurai.html",
        "Swashbuckler": "baseCwar/swashbuckler.html",
    },
    "complete-divine": {
        "Favored Soul": "baseCd/favoredSoul.html",
        "Shugenja": "baseCd/shugenja.html",
        "Spirit Shaman": "baseCd/spiritShaman.html",
    },
    "complete-arcane": {
        "Warlock": "baseCarc/warlock.html",
        "Warmage": "baseCarc/warmage.html",
        "Wu Jen": "baseCarc/wujen.html",
    },
    "complete-adventurer": {
        "Ninja": "baseCad/ninja.html",
        "Scout": "baseCad/scout.html",
        "Spellthief": "baseCad/spellthief.html",
    },
}

COMPLETE_PRESTIGE = {
    "complete-warrior": {
        "Bear Warrior": "prestigeCwar/bearWarrior.html",
        "Bladesinger": "prestigeCwar/bladesinger.html",
        "Cavalier": "prestigeCwar/cavalier.html",
        "Dark Hunter": "prestigeCwar/darkHunter.html",
        "Darkwood Stalker": "prestigeCwar/darkwoodStalker.html",
        "Dervish": "prestigeCwar/dervish.html",
        "Drunken Master": "prestigeCwar/drunkenMaster.html",
        "Exotic Weapon Master": "prestigeCwar/exoticWeaponMaster.html",
        "Eye of Gruumsh": "prestigeCwar/eyeofGruumsh.html",
        "Frenzied Berserker": "prestigeCwar/frenziedBerserker.html",
        "Gnome Giant-slayer": "prestigeCwar/gnomeGiantSlayer.html",
        "Halfling Outrider": "prestigeCwar/halflingOutrider.html",
        "Hulking Hurler": "prestigeCwar/hulkingHurler.html",
        "Hunter of the Dead": "prestigeCwar/hunteroftheDead.html",
        "Invisible Blade": "prestigeCwar/invisibleBlade.html",
        "Justiciar": "prestigeCwar/justiciar.html",
        "Kensai": "prestigeCwar/kensai.html",
        "Knight of the Chalice": "prestigeCwar/knightoftheChalice.html",
        "Knight Protector": "prestigeCwar/knightProtector.html",
        "Master of the Unseen Hand": "prestigeCwar/masteroftheUnseenHand.html",
        "Master Thrower": "prestigeCwar/masterThrower.html",
        "Mindspy": "prestigeCwar/mindspy.html",
        "Nature's Warrior": "prestigeCwar/naturesWarrior.html",
        "Occult Slayer": "prestigeCwar/occultSlayer.html",
        "Order of the Bow Initiate": "prestigeCwar/orderoftheBowInitiate.html",
        "Purple Dragon Knight": "prestigeCwar/purpleDragonKnight.html",
        "Rage Mage": "prestigeCwar/rageMage.html",
        "Ravager": "prestigeCwar/ravager.html",
        "Reaping Mauler": "prestigeCwar/reapingMauler.html",
        "Ronin": "prestigeCwar/ronin.html",
        "Spellsword": "prestigeCwar/spellsword.html",
        "Stonelord": "prestigeCwar/stonelord.html",
        "Tattooed Monk": "prestigeCwar/tattooedMonk.html",
        "Thayan Knight": "prestigeCwar/thayanKnight.html",
        "War Chanter": "prestigeCwar/warChanter.html",
        "Warshaper": "prestigeCwar/warshaper.html",
    },
}

_RULE_CHAR_CAP = {
    "abilities": 800,
    "alignment_restriction": 800,
    "hit_die": 80,
    "class_skills": 2500,
}

_LABEL_RE = re.compile(
    r"^(Abilities|Alignment|Hit Die|Class Skills|Requirements|Class Features)\s*:?\s*(.*)$",
    re.I,
)
_STOP_RE = re.compile(
    r"^(class features|all of the following|ex-[a-z])",
    re.I,
)


def _fetch(path: str) -> BeautifulSoup:
    url = SRD_CLASS_ROOT + path
    raw = urllib.request.urlopen(url, timeout=60).read()
    return BeautifulSoup(raw, "lxml")


def _same_name(left: str, right: str) -> bool:
    def norm(value: str) -> str:
        value = (
            value.replace("\u2019", "'")
            .replace("\u2018", "'")
            .replace("\u2013", "-")
            .replace("\u2014", "-")
        )
        return value.casefold()

    return norm(left) == norm(right)


def _text(tag: Tag) -> str:
    return re.sub(r"\s+", " ", tag.get_text(" ", strip=True)).strip()


def _blocks(soup: BeautifulSoup) -> list[Tag]:
    body = soup.body or soup
    return [tag for tag in body.find_all(["h2", "h3", "h4", "h5", "h6", "p", "table"])]


def _paragraphs(texts: list[str]) -> str:
    parts = [f"<p>{html.escape(text, quote=False)}</p>" for text in texts if text]
    return "".join(parts)


def _rules_from_blocks(blocks: list[Tag]) -> dict[str, str]:
    """Labeled rules only. Unlabeled paragraphs in front of them are skipped."""
    fields: dict[str, list[str]] = {
        "abilities": [],
        "alignment_restriction": [],
        "hit_die": [],
        "class_skills": [],
    }
    mode = ""
    for tag in blocks:
        if tag.name == "table":
            if mode:
                break
            continue
        text = _text(tag)
        if not text or text.lower().startswith("table:"):
            if text.lower().startswith("table:"):
                break
            continue
        if _STOP_RE.match(text):
            break
        match = _LABEL_RE.match(text)
        if match:
            label = match.group(1).lower()
            rest = match.group(2).strip()
            if label == "abilities":
                mode = "abilities"
            elif label == "alignment":
                mode = "alignment_restriction"
            elif label == "hit die":
                mode = "hit_die"
            elif label == "class skills":
                mode = "class_skills"
            else:
                break
            if rest and mode in {"abilities", "alignment_restriction", "hit_die"}:
                # The rules line is the last labeled one. An earlier Alignment
                # heading is the closed essay, so it is not kept.
                fields[mode] = [rest]
            elif rest and mode:
                fields[mode].append(rest)
            continue
        if mode == "class_skills" and tag.name == "p":
            fields["class_skills"].append(text)
    return {key: _paragraphs(value) for key, value in fields.items()}


def _intro_before_hit_die(blocks: list[Tag], class_name: str) -> str:
    paragraphs: list[str] = []
    started = False
    for tag in blocks:
        if tag.name == "table":
            continue
        text = _text(tag)
        if tag.name in {"h2", "h3"} and _same_name(text, class_name):
            started = True
            continue
        if not started or not text:
            continue
        if tag.name in {"h2", "h3"} or _LABEL_RE.match(text) or text.lower().startswith("table:"):
            break
        if _STOP_RE.match(text):
            break
        if tag.name == "p":
            paragraphs.append(text)
    return _paragraphs(paragraphs)


def rules_from_page(path: str, name: str) -> tuple[str, dict[str, str]]:
    blocks = _blocks(_fetch(path))
    # Start at this class heading so a shared header is ignored.
    start = 0
    for index, tag in enumerate(blocks):
        if tag.name in {"h2", "h3"} and _same_name(_text(tag), name):
            start = index + 1
            break
    rules = _rules_from_blocks(blocks[start:])
    kept: dict[str, str] = {}
    for key, value in rules.items():
        cap = _RULE_CHAR_CAP.get(key, 800)
        if value and len(value) <= cap:
            kept[key] = value
    return SRD_CLASS_ROOT + path, kept


def core_rules(name: str) -> tuple[str, dict[str, str]]:
    return rules_from_page(CORE_PAGES[name], name)


def prestige_intro_at(path: str, name: str) -> tuple[str, str]:
    blocks = _blocks(_fetch(path))
    intro = _intro_before_hit_die(blocks, name)
    # A missing Hit Die label would pull the rest of the page in. Keep the
    # short introduction only.
    if intro.count("<p>") > 8 or len(intro) > 4000:
        intro = ""
    return SRD_CLASS_ROOT + path, intro


def prestige_intro(name: str) -> tuple[str, str]:
    return prestige_intro_at(PRESTIGE_PAGES[name], name)


def npc_intros() -> dict[str, tuple[str, str]]:
    url = SRD_CLASS_ROOT + NPC_PAGE
    blocks = _blocks(_fetch(NPC_PAGE))
    names = {name.casefold(): name for name in NPC_NAMES}
    found: dict[str, tuple[str, str]] = {}
    current = ""
    bucket: list[str] = []

    def flush() -> None:
        nonlocal bucket, current
        if current:
            found[current] = (url + "#" + current.casefold(), _paragraphs(bucket))
        bucket = []
        current = ""

    for tag in blocks:
        if tag.name == "table":
            continue
        text = _text(tag)
        if tag.name in {"h2", "h3", "h4"} and text.casefold() in names:
            flush()
            current = names[text.casefold()]
            continue
        if not current or not text:
            continue
        if _LABEL_RE.match(text) or _STOP_RE.match(text) or text.lower().startswith("table:"):
            flush()
            continue
        if tag.name == "p":
            bucket.append(text)
    flush()
    return found


def _catalog_entry(name: str, book_slug: str) -> dict[str, Any] | None:
    for book in CATALOG:
        if book["slug"] != book_slug:
            continue
        for entry in book["classes"]:
            if entry.get("name") == name and entry.get("track") != "deferred":
                return entry
    return None


def _write_sections(book_slug: str, entry: dict[str, Any], updates: dict[str, str], srd_url: str) -> list[str]:
    path = sidecar_path(book_slug, entry["slug"])
    doc = json.loads(path.read_text(encoding="utf-8"))
    written: list[str] = []
    for section in doc.get("sections") or []:
        html_value = (updates.get(section["key"]) or "").strip()
        if not html_value:
            continue
        section["html"] = html_value
        written.append(section["key"])
    if written:
        doc["srd_url"] = srd_url
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return written


def _save_manifest() -> None:
    MANIFEST_PATH.write_text(
        json.dumps(build_manifest(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def fill_complete_srd_flavor() -> dict[str, list[str]]:
    """Rules lines for Complete base classes, and Complete Warrior prestige intros."""
    write_flavor_files()
    report: dict[str, list[str]] = {}
    for book_slug, pages in COMPLETE_BASE.items():
        for name, path in pages.items():
            entry = _catalog_entry(name, book_slug)
            if entry is None:
                report[f"{book_slug}/{name}"] = []
                continue
            url, rules = rules_from_page(path, name)
            written = _write_sections(book_slug, entry, rules, url)
            report[f"{book_slug}/{name}"] = written
    for book_slug, pages in COMPLETE_PRESTIGE.items():
        for name, path in pages.items():
            entry = _catalog_entry(name, book_slug)
            if entry is None:
                report[f"{book_slug}/{name}"] = []
                continue
            url, intro = prestige_intro_at(path, name)
            written = _write_sections(book_slug, entry, {"intro": intro}, url)
            report[f"{book_slug}/{name}"] = written
    _save_manifest()
    return report


def fill_srd_flavor() -> dict[str, list[str]]:
    report: dict[str, list[str]] = {}
    for name in CORE_PAGES:
        entry = _catalog_entry(name, "players-handbook")
        if entry is None:
            continue
        url, rules = core_rules(name)
        written = _write_sections("players-handbook", entry, rules, url)
        report[f"PH/{name}"] = written
    for name in PRESTIGE_PAGES:
        entry = _catalog_entry(name, "dungeon-masters-guide")
        if entry is None:
            continue
        url, intro = prestige_intro(name)
        written = _write_sections(
            "dungeon-masters-guide",
            entry,
            {"intro": intro},
            url,
        )
        report[f"DMG/{name}"] = written
    for name, (url, intro) in npc_intros().items():
        entry = _catalog_entry(name, "dungeon-masters-guide")
        if entry is None:
            continue
        written = _write_sections(
            "dungeon-masters-guide",
            entry,
            {"intro": intro},
            url,
        )
        report[f"DMG/{name}"] = written
    report.update(fill_complete_srd_flavor())
    _save_manifest()
    return report


def main() -> None:
    import sys

    report = fill_complete_srd_flavor() if "--complete" in sys.argv else fill_srd_flavor()
    for key, keys in report.items():
        print(f"{key}: {', '.join(keys) if keys else 'nothing new'}")


if __name__ == "__main__":
    main()
