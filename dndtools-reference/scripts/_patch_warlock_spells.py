"""Fix Warlock spell list entries in MMM spells JSON."""
from __future__ import annotations

import copy
import json
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "data" / "dndtools" / "supplemental" / "wowrpg_mmm_spells.json"


def warlock_entry(level: int) -> dict:
    return {
        "name": "Warlock",
        "slug": "warlock-wow",
        "level": level,
        "url": None,
        "id": None,
    }


def necro_entry(level: int) -> dict:
    return {
        "name": "Necromancer",
        "slug": "necromancer-wow",
        "level": level,
        "url": None,
        "id": None,
    }


def main() -> None:
    data = json.loads(PATH.read_text(encoding="utf-8"))
    by_name = {s["name"]: s for s in data}

    for name, level in (
        ("Searing Pain, Lesser", 2),
        ("Searing Pain", 3),
        ("Searing Pain, Greater", 5),
    ):
        spell = by_name[name]
        spell["classes"] = [warlock_entry(level)]

    sense = by_name["Sense Demon"]
    sense["name"] = "Sense Demons"
    sense["slug"] = "sense-demons-mmm"
    # keep Warlock 0

    if "Crushing Despair" not in by_name:
        template = copy.deepcopy(by_name["Curse of Tongues"])
        template.update(
            {
                "slug": "crushing-despair-mmm",
                "name": "Crushing Despair",
                "source": {
                    "name": "More Magic and Mayhem",
                    "abbrev": "MMM",
                    "edition": "WoW RPG (3.5)",
                    "page": 74,
                    "url": None,
                },
                "index": {
                    "source_abbrev": "MMM",
                    "edition": "WoW RPG (3.5)",
                    "school": "Enchantment (Compulsion) [Mind-Affecting]",
                    "components": {
                        "V": True,
                        "S": True,
                        "M": True,
                        "F": False,
                        "DF": False,
                        "XP": False,
                    },
                    "description_snippet": (
                        "An invisible cone of despair causes great sadness in the targets. "
                        "Each affected creature takes a -2 penalty on attack rolls, saving "
                        "throws, ability checks, skill checks and weapon damage rolls."
                    ),
                },
                "school": "Enchantment (Compulsion) [Mind-Affecting]",
                "casting_time": "1 standard action",
                "components": "V, S, M",
                "range": "30 ft.",
                "target": None,
                "area": "Cone-shaped burst",
                "effect": None,
                "duration": "1 min./level",
                "saving_throw": "Will negates",
                "spell_resistance": "Yes",
                "classes": [necro_entry(4), warlock_entry(4)],
                "description_html": (
                    "<p>An invisible cone of despair causes great sadness in the targets. "
                    "Each affected creature takes a -2 penalty on attack rolls, saving throws, "
                    "ability checks, skill checks and weapon damage rolls.</p>"
                    "<p><b>Material Component:</b> A vial of tears.</p>"
                ),
                "description_text": (
                    "An invisible cone of despair causes great sadness in the targets. "
                    "Each affected creature takes a -2 penalty on attack rolls, saving throws, "
                    "ability checks, skill checks and weapon damage rolls. "
                    "Material Component: A vial of tears."
                ),
                "descriptors": ["Mind-Affecting"],
                "domains": None,
            }
        )
        data.append(template)

    PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # verify
    data = json.loads(PATH.read_text(encoding="utf-8"))
    wl = sorted(
        s["name"]
        for s in data
        if any(
            (c.get("name") if isinstance(c, dict) else c) == "Warlock"
            for c in (s.get("classes") or [])
        )
    )
    print("warlock count", len(wl))
    print("\n".join(wl))
    print("sense", next(s["name"] for s in data if "Sense Demon" in s["name"]))


if __name__ == "__main__":
    main()
