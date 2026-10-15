"""Patch Runemaster advancement, features, and Knowledge (arcana)."""
from __future__ import annotations

import json
import re
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "data" / "dndtools" / "supplemental" / "wowrpg_mmm_classes.json"

# Table 1-2: Runemaster Rune Slots Per Day (levels 0-9)
SLOTS = {
    1: ["3", "1", "-", "-", "-", "-", "-", "-", "-", "-"],
    2: ["4", "2", "-", "-", "-", "-", "-", "-", "-", "-"],
    3: ["4", "2", "1", "-", "-", "-", "-", "-", "-", "-"],
    4: ["4", "3", "2", "-", "-", "-", "-", "-", "-", "-"],
    5: ["4", "3", "2", "1", "-", "-", "-", "-", "-", "-"],
    6: ["4", "3", "3", "2", "-", "-", "-", "-", "-", "-"],
    7: ["4", "4", "3", "2", "1", "-", "-", "-", "-", "-"],
    8: ["4", "4", "3", "3", "2", "-", "-", "-", "-", "-"],
    9: ["4", "4", "4", "3", "2", "1", "-", "-", "-", "-"],
    10: ["4", "4", "4", "3", "3", "2", "-", "-", "-", "-"],
    11: ["4", "4", "4", "4", "3", "2", "1", "-", "-", "-"],
    12: ["4", "4", "4", "4", "3", "3", "2", "-", "-", "-"],
    13: ["4", "4", "4", "4", "4", "3", "2", "1", "-", "-"],
    14: ["4", "4", "4", "4", "4", "3", "3", "2", "-", "-"],
    15: ["4", "4", "4", "4", "4", "4", "3", "2", "1", "-"],
    16: ["4", "4", "4", "4", "4", "4", "3", "3", "2", "-"],
    17: ["4", "4", "4", "4", "4", "4", "4", "3", "2", "1"],
    18: ["4", "4", "4", "4", "4", "4", "4", "3", "3", "2"],
    19: ["4", "4", "4", "4", "4", "4", "4", "4", "3", "3"],
    20: ["4", "4", "4", "4", "4", "4", "4", "4", "4", "4"],
}


def medium_bab(level: int) -> str:
    # Medium BAB: floor(level * 3/4)
    primary = (level * 3) // 4
    attacks = [f"+{primary}"]
    next_atk = primary - 5
    while next_atk >= 1:
        attacks.append(f"+{next_atk}")
        next_atk -= 5
    return "/".join(attacks)


FEATURES_APPEND = """
<p><strong>Runic Sense (Su):</strong> At 2nd level, the runemaster can sense the presence of runes in his vicinity. The runemaster can use detect magic at will, though this effect only detects runes of a level equal to or lower than the runes that he can cast. The runemaster gains a +2 bonus on Spot checks to notice runes of a higher level.</p>
<p><strong>Runic Dispelling (Ex):</strong> At 3rd level, the runemaster may infuse another rune with some of his own power, overloading its empowerment and destroying it. He must make a Spellcraft check (DC 10 + level of the rune). If this check succeeds, he may touch the rune, expend a rune slot of at least equal level, and make a caster level check (DC = 11 + the level of the caster who created the rune). Dispelling a rune in this way is a standard action that provokes attacks of opportunity. The rune itself remains behind, unless it was spontaneously scribed, and can be empowered again.</p>
<p><strong>Rune Feat:</strong> At 5th level and every 5 levels thereafter (10th, 15th and 20th), the runemaster gets a bonus feat chosen from the rune feats later in this chapter. He must meet all the prerequisites for his bonus feat.</p>
<p><strong>Additional Pattern:</strong> At 6th, 12th and 18th level, the runemaster gains Additional Pattern as a bonus feat.</p>
<p><strong>Runic Attunement:</strong> At 8th and 16th level, the runemaster gains Runic Attunement as a bonus feat.</p>
""".strip()


def clean_description_html(html: str) -> str:
    # Remove truncated Runic Sense + dumped tables glued into the Hastened Empowerment block.
    # Keep Hastened Empowerment paragraph; replace the broken Runic Sense dump.
    pattern = re.compile(
        r"<p><strong>Hastened Empowerment \(Ex\):</strong>.*?</p>"
        r"<p><strong>Runic Sense \(Su\):</strong>.*?</p>",
        re.S,
    )
    hastened = (
        "<p><strong>Hastened Empowerment (Ex):</strong> A runemaster may empower a rune "
        "that is scribed or tattooed as a permanent mark on his body as a move action. "
        "The rune's normal empowerment time must be a standard action, and he may only do "
        "this a number of times per day equal to half his level in the runemaster class. "
        "Empowering a rune in this way still provokes attacks of opportunity. "
        "(See Chapter 2: Enchantments, Runes and Brews, \"The Runic Art,\" for more "
        "information on marks and empowering runes.)</p>"
    )
    if pattern.search(html):
        html = pattern.sub(hastened, html)
    elif "Runic Sense (Su):" in html and "Table 1-1" in html:
        # Fallback: cut from Runic Sense through end of dumped tables
        start = html.find("<p><strong>Runic Sense (Su):</strong>")
        if start < 0:
            start = html.find("Runic Sense (Su):")
        if start >= 0:
            # Keep Hastened Empowerment if present before this
            html = html[:start].rstrip()
            if not html.endswith("</p>"):
                # ensure we did not cut mid-tag awkwardly
                pass
            html = html + hastened if "Hastened Empowerment" not in html else html
    if "Runic Dispelling (Ex):" not in html:
        html = html.rstrip() + FEATURES_APPEND
    return html


def rebuild_advancement_html(rows: list[dict]) -> str:
    headers = ["Level", "BAB", "Fort", "Ref", "Will", "Special"] + [
        str(i) for i in range(10)
    ]
    head = "".join(f"<th>{h}</th>" for h in headers)
    body = []
    for row in rows:
        cells = [
            row["level"],
            row["bab"],
            row["fort"],
            row["ref"],
            row["will"],
            row["special"],
        ] + row["spells_per_day"]
        body.append("<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>")
    return (
        "<table><thead><tr>"
        + head
        + "</tr></thead><tbody>"
        + "".join(body)
        + "</tbody></table>"
    )


def main() -> None:
    data = json.loads(PATH.read_text(encoding="utf-8"))
    record = next(c for c in data if c.get("name") == "Runemaster")

    for skill in record.get("class_skills") or []:
        if skill.get("name") == "Knowledge (arcane)":
            skill["name"] = "Knowledge (arcana)"
            skill["slug"] = "knowledge-arcana"
            skill["url"] = "/skills/knowledge-arcana"

    for row in record["advancement"]:
        level = int(row["level"])
        row["bab"] = medium_bab(level)
        row["spells_per_day"] = list(SLOTS[level])

    record["advancement_html"] = rebuild_advancement_html(record["advancement"])
    record["advancement_text"] = " ".join(
        f"{row['level']} {row['bab']} {row['fort']} {row['ref']} {row['will']} "
        f"{row['special']} {' '.join(row['spells_per_day'])}"
        for row in record["advancement"]
    )

    html = record.get("description_html") or ""
    html = clean_description_html(html)
    record["description_html"] = html
    # plain text approx
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()
    record["description_text"] = text

    PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("patched Runemaster")
    print("bab8", record["advancement"][7]["bab"])
    print("bab15", record["advancement"][14]["bab"])
    print("slots1", record["advancement"][0]["spells_per_day"][:3])
    print("has dispelling", "Runic Dispelling" in record["description_html"])
    print("has sense clean", "Table 1-1" not in record["description_html"])
    print("arcana", any(s["name"] == "Knowledge (arcana)" for s in record["class_skills"]))


if __name__ == "__main__":
    main()
