"""Parse DMG/SRD scroll tables and resolve FG item slugs."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from fg_common import spell_to_scroll_slug

DATA = Path(__file__).resolve().parent / "data"
SRD_PATH = DATA / "scroll-srd.md"

# SRD table uses shortened names; map to substring expected in FG scroll keys.
SPELL_ALIASES: dict[str, str] = {
    "floating disk": "floatingdisk",
    "acid arrow": "acidarrow",
    "tiny hut": "tinyhut",
    "magic aura": "magicaura",
    "confusion, lesser": "confusionlesser",
    "enlarge person, mass": "enlargepersonmass",
    "reduce person, mass": "reducepersonmass",
    "fox's cunning, mass": "foxscunningmass",
    "owl's wisdom, mass": "owlswisdommass",
    "eagle's splendor, mass": "eaglesplendormass",
    "cat's grace, mass": "catsgracemass",
    "bull's strength, mass": "bullsstrengthmass",
    "bear's endurance, mass": "bearsendurancemass",
    "cure serious wounds, mass": "cureseriouswoundsmass",
    "cure critical wounds, mass": "curecriticalwoundsmass",
    "charm monster, mass": "charmmonstermass",
    "heroism, greater": "heroismgreater",
    "invisibility, greater": "invisibilitygreater",
    "magic weapon, greater": "magicweapongreater",
    "restoration, lesser": "restorationlesser",
    "restoration, greater": "restorationgreater",
    "globe of invulnerability, lesser": "globeofinvulnerabilitylesser",
    "planar ally, lesser": "planarallylesser",
    "planar binding, lesser": "planarbindinglesser",
    "shadow conjuration, greater": "shadowconjurationgreater",
    "shadow evocation, greater": "shadowevocationgreater",
    "summon monster IX": "summonmonsterix",
    "summon nature's ally IX": "summonnaturesallyix",
    "protection from chaos/ evil/ good/ law": "protectionfromchaosevilgoodlaw",
    "magic circle against chaos/ evil/ good/ law": "magiccircleagainstchaosevilgoodlaw",
    "detect chaos/ evil/ good/ law": "detectchaosevilgoodlaw",
    "inflict critical wounds, mass": "inflictcriticalwoundsmass",
    "inflict light wounds, mass": "inflictlightwoundsmass",
    "inflict moderate wounds, mass": "inflictmoderatewoundsmass",
    "inflict serious wounds, mass": "inflictseriouswoundsmass",
    "cure light wounds, mass": "curelightwoundsmass",
    "cure moderate wounds, mass": "curemoderatewoundsmass",
    "heal, mass": "healmass",
    "hallow/unhallow": "hallow",
}

ROMAN = {
    "i": "i",
    "ii": "ii",
    "iii": "iii",
    "iv": "iv",
    "v": "v",
    "vi": "vi",
    "vii": "vii",
    "viii": "viii",
    "ix": "ix",
}


def normalize_spell(spell: str) -> str:
    return spell.replace("\u2019", "'").replace("×", "x").strip()


def parse_range(cell: str) -> tuple[int, int] | None:
    cell = cell.strip()
    m = re.match(r"^(\d+)-(\d+)$", cell)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.match(r"^(\d+)$", cell)
    if m:
        n = int(m.group(1))
        return n, n
    return None


LEVEL_RE = re.compile(r"(\d+)(?:st|nd|rd|th)?-level", re.I)


def level_from_header(header: str) -> str | None:
    m = LEVEL_RE.search(header)
    return m.group(1) if m else None


def parse_srd_tables(text: str) -> dict[str, dict[str, list[dict]]]:
    result: dict[str, dict[str, list[dict]]] = {"arcane": {}, "divine": {}}
    current_type: str | None = None
    current_level: str | None = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.split("|")[1:-1]]
        if not cells:
            continue
        header = " ".join(cells).lower()
        if "0-level arcane" in header or "table: arcane spell scrolls" in header:
            current_type = "arcane"
            current_level = "0"
            continue
        if "0-level divine" in header or "table: divine spell scrolls" in header:
            current_type = "divine"
            current_level = "0"
            continue
        lvl = level_from_header(header)
        if lvl is not None:
            if "arcane" in header:
                current_type = "arcane"
                current_level = lvl
            elif "divine" in header:
                current_type = "divine"
                current_level = lvl
            continue
        if cells[0].lower() in {"d%", "---"} or cells[0].lower().startswith("table:"):
            continue
        if current_type is None or current_level is None:
            continue
        rng = parse_range(cells[0])
        if not rng or len(cells) < 2:
            continue
        spell = normalize_spell(cells[1])
        if spell.lower() in {"spell", "market price"}:
            continue
        entry = {"from": rng[0], "to": rng[1], "spell": spell}
        result[current_type].setdefault(current_level, []).append(entry)
    return result


def slug_candidates(spell: str) -> list[str]:
    spell_l = spell.lower()
    alias = SPELL_ALIASES.get(spell_l)
    cands: list[str] = []
    if alias:
        cands.append(f"scroll{alias}")
        cands.append(f"scrollof{alias}")
    base = spell_to_scroll_slug(spell)
    cands.append(base)
    cands.append(f"scrollof{base[6:]}")
    words = re.findall(r"[a-z0-9]+", spell_l)
    if words:
        joined = "".join(words)
        cands.append(f"scroll{joined}")
        cands.append(f"scrollof{joined}")
        # summon monster I -> summmonsteri style
        if "summon" in words and words[-1] in ROMAN:
            roman = words[-1]
            prefix = "".join(words[:-1])
            cands.append(f"scroll{prefix}{roman}")
            cands.append(f"scrollof{prefix}{roman}")
    # dedupe preserve order
    seen: set[str] = set()
    out: list[str] = []
    for c in cands:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


def resolve_scroll_key(spell: str, known: set[str]) -> str:
    for cand in slug_candidates(spell):
        if cand in known:
            return cand
    words = [w for w in re.findall(r"[a-z0-9]+", spell.lower()) if len(w) > 2]
    if words:
        matches = [k for k in known if all(w in k for w in words)]
        if len(matches) == 1:
            return matches[0]
        if matches:
            matches.sort(key=len)
            return matches[0]
    return spell_to_scroll_slug(spell)


def main() -> None:
    text = SRD_PATH.read_text(encoding="utf-8")
    tables = parse_srd_tables(text)
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "scroll-spells.json").write_text(json.dumps(tables, indent=2), encoding="utf-8")
    for kind in ("arcane", "divine"):
        levels = tables[kind]
        print(kind, "levels", sorted(levels.keys(), key=int))
        for lvl in sorted(levels.keys(), key=int):
            print(f"  L{lvl}: {len(levels[lvl])} spells")


if __name__ == "__main__":
    main()
