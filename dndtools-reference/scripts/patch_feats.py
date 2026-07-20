#!/usr/bin/env python3
"""Patch feats.json with manually corrected content from SRD/source books."""

from __future__ import annotations

import json
from pathlib import Path

FEATS_PATH = Path(__file__).resolve().parents[1] / "data" / "dndtools" / "feats.json"

ARMOR_BENEFIT_HTML = (
    "<p>When you wear a type of armor with which you are proficient, the armor check "
    "penalty for that armor applies only to Balance, Climb, Escape Artist, Hide, Jump, "
    "Move Silently, Pick Pocket, and Tumble checks.</p>"
)
ARMOR_BENEFIT_TEXT = (
    "When you wear a type of armor with which you are proficient, the armor check "
    "penalty for that armor applies only to Balance, Climb, Escape Artist, Hide, Jump, "
    "Move Silently, Pick Pocket, and Tumble checks."
)
ARMOR_NORMAL_HTML = (
    "<p>A character who is wearing armor with which she is not proficient applies its "
    "armor check penalty to attack rolls and to all skill checks that involve moving, "
    "including Ride.</p>"
)
ARMOR_NORMAL_TEXT = (
    "A character who is wearing armor with which she is not proficient applies its "
    "armor check penalty to attack rolls and to all skill checks that involve moving, "
    "including Ride."
)


def _leadership_main_table_rows() -> str:
    rows = [
        ("1 or lower", "—", "—", "—", "—", "—", "—", "—"),
        ("2", "1st", "—", "—", "—", "—", "—", "—"),
        ("3", "2nd", "—", "—", "—", "—", "—", "—"),
        ("4", "3rd", "—", "—", "—", "—", "—", "—"),
        ("5", "3rd", "—", "—", "—", "—", "—", "—"),
        ("6", "4th", "—", "—", "—", "—", "—", "—"),
        ("7", "5th", "—", "—", "—", "—", "—", "—"),
        ("8", "5th", "—", "—", "—", "—", "—", "—"),
        ("9", "6th", "—", "—", "—", "—", "—", "—"),
        ("10", "7th", "5", "—", "—", "—", "—", "—"),
        ("11", "7th", "6", "—", "—", "—", "—", "—"),
        ("12", "8th", "8", "—", "—", "—", "—", "—"),
        ("13", "9th", "10", "1", "—", "—", "—", "—"),
        ("14", "10th", "15", "1", "—", "—", "—", "—"),
        ("15", "10th", "20", "2", "1", "—", "—", "—"),
        ("16", "11th", "25", "2", "1", "—", "—", "—"),
        ("17", "12th", "30", "3", "1", "1", "—", "—"),
        ("18", "12th", "35", "3", "1", "1", "—", "—"),
        ("19", "13th", "40", "4", "2", "1", "1", "—"),
        ("20", "14th", "50", "5", "3", "2", "1", "—"),
        ("21", "15th", "60", "6", "3", "2", "1", "1"),
        ("22", "15th", "75", "7", "4", "2", "2", "1"),
        ("23", "16th", "90", "9", "5", "3", "2", "1"),
        ("24", "17th", "110", "11", "6", "3", "2", "1"),
        ("25 or higher", "17th", "135", "13", "7", "4", "2", "2"),
    ]
    return "".join(
        "<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>" for row in rows
    )


def build_leadership_benefit_html() -> str:
    main_rows = _leadership_main_table_rows()
    return (
        "<p>Having this feat enables the character to attract loyal companions and devoted "
        "followers, subordinates who assist her. See the table below for what sort of cohort "
        "and how many followers the character can recruit.</p>"
        "<h4>Leadership Modifiers</h4>"
        "<p>Several factors can affect a character's Leadership score, causing it to vary from "
        "the base score (character level + Cha modifier). A character's reputation (from the "
        "point of view of the cohort or follower he is trying to attract) raises or lowers his "
        "Leadership score:</p>"
        "<table><thead><tr><th>Leader's Reputation</th><th>Modifier</th></tr></thead><tbody>"
        "<tr><td>Great renown</td><td>+2</td></tr>"
        "<tr><td>Fairness and generosity</td><td>+1</td></tr>"
        "<tr><td>Special power</td><td>+1</td></tr>"
        "<tr><td>Failure</td><td>–1</td></tr>"
        "<tr><td>Aloofness</td><td>–1</td></tr>"
        "<tr><td>Cruelty</td><td>–2</td></tr>"
        "</tbody></table>"
        "<p>Other modifiers may apply when the character tries to attract a cohort:</p>"
        "<table><thead><tr><th>The Leader . . .</th><th>Modifier</th></tr></thead><tbody>"
        "<tr><td>Has a familiar, special mount, or animal companion</td><td>–2</td></tr>"
        "<tr><td>Recruits a cohort of a different alignment</td><td>–1</td></tr>"
        "<tr><td>Caused the death of a cohort</td><td>–2<sup>1</sup></td></tr>"
        "</tbody></table>"
        "<p><sup>1</sup> Cumulative per cohort killed.</p>"
        "<p>Followers have different priorities from cohorts. When the character tries to "
        "attract a new follower, use any of the following modifiers that apply.</p>"
        "<table><thead><tr><th>The Leader . . .</th><th>Modifier</th></tr></thead><tbody>"
        "<tr><td>Has a stronghold, base of operations, guildhouse, or the like</td><td>+2</td></tr>"
        "<tr><td>Moves around a lot</td><td>–1</td></tr>"
        "<tr><td>Caused the death of other followers</td><td>–1</td></tr>"
        "</tbody></table>"
        "<table><thead>"
        "<tr>"
        "<th rowspan=\"2\">Leadership Score</th>"
        "<th rowspan=\"2\">Cohort Level</th>"
        "<th colspan=\"6\">Number of Followers by Level</th>"
        "</tr>"
        "<tr>"
        "<th>1st</th><th>2nd</th><th>3rd</th><th>4th</th><th>5th</th><th>6th</th>"
        "</tr>"
        "</thead><tbody>"
        f"{main_rows}"
        "</tbody></table>"
        "<h4>Leadership Score</h4>"
        "<p>A character's base Leadership score equals his level plus any Charisma modifier. "
        "In order to take into account negative Charisma modifiers, this table allows for very "
        "low Leadership scores, but the character must still be 6th level or higher in order to "
        "gain the Leadership feat. Outside factors can affect a character's Leadership score, "
        "as detailed above.</p>"
        "<h4>Cohort Level</h4>"
        "<p>The character can attract a cohort of up to this level. Regardless of a character's "
        "Leadership score, he can only recruit a cohort who is two or more levels lower than "
        "himself. The cohort should be equipped with gear appropriate for its level. A character "
        "can try to attract a cohort of a particular race, class, and alignment. The cohort's "
        "alignment may not be opposed to the leader's alignment on either the law-vs-chaos or "
        "good-vs-evil axis, and the leader takes a Leadership penalty if he recruits a cohort "
        "of an alignment different from his own.</p>"
        "<p>Cohorts earn XP as follows:</p>"
        "<ul>"
        "<li>The cohort does not count as a party member when determining the party's XP.</li>"
        "<li>Divide the cohort's level by the level of the PC with whom he or she is associated "
        "(the character with the Leadership feat who attracted the cohort).</li>"
        "<li>Multiply this result by the total XP awarded to the PC and add that number of "
        "experience points to the cohort's total.</li>"
        "<li>If a cohort gains enough XP to bring it to a level one lower than the associated "
        "PC's character level, the cohort does not gain the new level—its new XP total is 1 less "
        "than the amount needed to attain the next level.</li>"
        "</ul>"
        "<h4>Number of Followers by Level</h4>"
        "<p>The character can lead up to the indicated number of characters of each level. "
        "Followers are similar to cohorts, except they're generally low-level NPCs. Because "
        "they're generally five or more levels behind the character they follow, they're rarely "
        "effective in combat.</p>"
        "<p>Followers don't earn experience and thus don't gain levels. However, when a character "
        "with Leadership attains a new level, the player consults the table above to determine if "
        "she has acquired more followers, some of which may be higher level than the existing "
        "followers. (You don't consult the table to see if your cohort gains levels, however, "
        "because cohorts earn experience on their own.)</p>"
    )


LEADERSHIP_BENEFIT_HTML = build_leadership_benefit_html()


LEADERSHIP_BENEFIT_TEXT = """Having this feat enables the character to attract loyal companions and devoted followers, subordinates who assist her. See the table below for what sort of cohort and how many followers the character can recruit.
Leadership Modifiers
Several factors can affect a character's Leadership score, causing it to vary from the base score (character level + Cha modifier). A character's reputation (from the point of view of the cohort or follower he is trying to attract) raises or lowers his Leadership score:
Leader's Reputation — Modifier: Great renown +2; Fairness and generosity +1; Special power +1; Failure –1; Aloofness –1; Cruelty –2.
Other modifiers may apply when the character tries to attract a cohort: Has a familiar, special mount, or animal companion –2; Recruits a cohort of a different alignment –1; Caused the death of a cohort –2 (cumulative per cohort killed).
Followers have different priorities from cohorts: Has a stronghold, base of operations, guildhouse, or the like +2; Moves around a lot –1; Caused the death of other followers –1.
Leadership Score — Cohort Level — Followers (1st/2nd/3rd/4th/5th/6th): 1 or lower — — —; 2 — 1st —; 3 — 2nd —; 4 — 3rd —; 5 — 3rd —; 6 — 4th —; 7 — 5th —; 8 — 5th —; 9 — 6th —; 10 — 7th — 5; 11 — 7th — 6; 12 — 8th — 8; 13 — 9th — 10/1; 14 — 10th — 15/1; 15 — 10th — 20/2/1; 16 — 11th — 25/2/1; 17 — 12th — 30/3/1/1; 18 — 12th — 35/3/1/1; 19 — 13th — 40/4/2/1/1; 20 — 14th — 50/5/3/2/1; 21 — 15th — 60/6/3/2/1/1; 22 — 15th — 75/7/4/2/2/1; 23 — 16th — 90/9/5/3/2/1; 24 — 17th — 110/11/6/3/2/1; 25+ — 17th — 135/13/7/4/2/2.
Leadership Score: A character's base Leadership score equals his level plus any Charisma modifier. The character must still be 6th level or higher to gain this feat.
Cohort Level: The character can attract a cohort of up to this level, but only if the cohort is two or more levels lower than the leader. Cohorts earn XP based on the party's awards (see full rules above).
Number of Followers by Level: Followers don't earn XP. When the leader gains a level, consult the table to determine if more followers are acquired."""

SRD_IMPROVED_FAMILIAR_INTRO_HTML = (
    "<p>When choosing a familiar, the creatures listed below are also available to the "
    "spellcaster. The spellcaster may choose a familiar with an alignment up to one step "
    "away on each of the alignment axes (lawful through chaotic, good through evil).</p>"
    "<p>Improved familiars otherwise use the rules for regular familiars, with two "
    "exceptions: If the creature's type is something other than animal, its type does "
    "not change; and improved familiars do not gain the ability to speak with other "
    "creatures of their kind (although many of them already have the ability to "
    "communicate).</p>"
)

SRD_IMPROVED_FAMILIAR_TABLE_HTML = (
    "<table><tr><th>Familiar</th><th>Alignment</th>"
    "<th>Arcane Spellcaster Level</th></tr>"
    "<tr><td>Shocker lizard</td><td>Neutral</td><td>5th</td></tr>"
    "<tr><td>Stirge</td><td>Neutral</td><td>5th</td></tr>"
    "<tr><td>Formian worker</td><td>Lawful neutral</td><td>7th</td></tr>"
    "<tr><td>Imp</td><td>Lawful evil</td><td>7th</td></tr>"
    "<tr><td>Pseudodragon</td><td>Neutral good</td><td>7th</td></tr>"
    "<tr><td>Quasit</td><td>Chaotic evil</td><td>7th</td></tr></table>"
)

SRD_IMPROVED_FAMILIAR_ALT_TABLE_HTML = (
    "<p>Almost any creature of the same general size and power as those on the list "
    "makes a suitable familiar. Improved familiars can also be assigned by the master's "
    "creature type or subtype:</p>"
    "<table><tr><th>Familiar</th><th>Type/Subtype</th>"
    "<th>Arcane Spellcaster Level</th></tr>"
    "<tr><td>Celestial hawk<sup>1</sup></td><td>Good</td><td>3rd</td></tr>"
    "<tr><td>Fiendish Tiny viper snake<sup>2</sup></td><td>Evil</td><td>3rd</td></tr>"
    "<tr><td>Air elemental, Small</td><td>Air</td><td>5th</td></tr>"
    "<tr><td>Earth elemental, Small</td><td>Earth</td><td>5th</td></tr>"
    "<tr><td>Fire elemental, Small</td><td>Fire</td><td>5th</td></tr>"
    "<tr><td>Shocker lizard</td><td>Electricity</td><td>5th</td></tr>"
    "<tr><td>Water elemental, Small</td><td>Water</td><td>5th</td></tr>"
    "<tr><td>Homunculus<sup>3</sup></td><td>Undead</td><td>7th</td></tr>"
    "<tr><td>Ice mephit</td><td>Cold</td><td>7th</td></tr></table>"
    "<p><sup>1</sup> Or other celestial animal from the standard familiar list.</p>"
    "<p><sup>2</sup> Or other fiendish animal from the standard familiar list.</p>"
    "<p><sup>3</sup> The master must first create the homunculus, substituting ichor or "
    "another part of the master's body for blood if necessary.</p>"
)

SRD_IMPROVED_FAMILIAR_INTRO_TEXT = (
    "When choosing a familiar, the creatures listed below are also available to the "
    "spellcaster. The spellcaster may choose a familiar with an alignment up to one step "
    "away on each of the alignment axes (lawful through chaotic, good through evil). "
    "Improved familiars otherwise use the rules for regular familiars, with two "
    "exceptions: If the creature's type is something other than animal, its type does "
    "not change; and improved familiars do not gain the ability to speak with other "
    "creatures of their kind (although many of them already have the ability to "
    "communicate)."
)

PG_FR_TABLE_HTML = (
    "<h4>Forgotten Realms Improved Familiars</h4>"
    "<p>In addition to the choices presented in the Dungeon Master's Guide, the following "
    "familiars are available in a Forgotten Realms campaign:</p>"
    "<table><tr><th>Familiar</th><th>Alignment</th><th>Level</th></tr>"
    "<tr><td>Deathfang</td><td>Neutral evil</td><td>9th</td></tr>"
    "<tr><td>Flying snake</td><td>Neutral</td><td>3rd</td></tr>"
    "<tr><td>Lizard, spitting crawler</td><td>Neutral</td><td>3rd</td></tr>"
    "<tr><td>Lynx</td><td>Neutral</td><td>3rd</td></tr>"
    "<tr><td>Osquip</td><td>Neutral evil</td><td>5th</td></tr>"
    "<tr><td>Tressym</td><td>Neutral good</td><td>5th</td></tr></table>"
    "<p>Improved familiars do not grant any special abilities to their masters other than "
    "the Alertness feat, an empathic link, and the ability to share spells with the "
    "familiar.</p>"
)

PG_FR_TABLE_TEXT = (
    "Forgotten Realms Improved Familiars: Deathfang (neutral evil, 9th); Flying snake "
    "(neutral, 3rd); Lizard, spitting crawler (neutral, 3rd); Lynx (neutral, 3rd); "
    "Osquip (neutral evil, 5th); Tressym (neutral good, 5th). Improved familiars do not "
    "grant any special abilities to their masters other than the Alertness feat, an "
    "empathic link, and the ability to share spells with the familiar."
)

SK_FR_TABLE_HTML = (
    "<h4>Serpent Kingdoms Improved Familiars</h4>"
    "<p>In addition to the choices presented in the Dungeon Master's Guide, the following "
    "familiars are available in a Forgotten Realms campaign:</p>"
    "<table><tr><th>Familiar</th><th>Alignment</th><th>Level</th></tr>"
    "<tr><td>Jaculi</td><td>Chaotic evil</td><td>5th</td></tr>"
    "<tr><td>Lizard, spitting crawler</td><td>Neutral</td><td>3rd</td></tr>"
    "<tr><td>Mlarraun</td><td>Neutral</td><td>5th</td></tr>"
    "<tr><td>Muckdweller</td><td>Lawful evil</td><td>5th</td></tr>"
    "<tr><td>Snake, deathfang</td><td>Neutral evil</td><td>9th</td></tr>"
    "<tr><td>Snake, flying</td><td>Neutral</td><td>3rd</td></tr>"
    "<tr><td>Snake, glacier</td><td>Neutral</td><td>3rd</td></tr>"
    "<tr><td>Snake, tree python</td><td>Chaotic evil</td><td>3rd</td></tr>"
    "<tr><td>Snake, whipsnake</td><td>Neutral</td><td>3rd</td></tr></table>"
    "<p>Improved familiars do not grant any special abilities to their masters other than "
    "the Alertness feat, an empathic link, and the ability to share spells with the "
    "familiar.</p>"
)

SK_FR_TABLE_TEXT = (
    "Serpent Kingdoms Improved Familiars: Jaculi (chaotic evil, 5th); Lizard, spitting "
    "crawler (neutral, 3rd); Mlarraun (neutral, 5th); Muckdweller (lawful evil, 5th); "
    "Snake, deathfang (neutral evil, 9th); Snake, flying (neutral, 3rd); Snake, glacier "
    "(neutral, 3rd); Snake, tree python (chaotic evil, 3rd); Snake, whipsnake (neutral, "
    "3rd). Improved familiars do not grant special abilities beyond Alertness, an "
    "empathic link, and spell sharing."
)

PATCHES: dict[str, dict] = {
    "leadership-1740": {
        "benefit_html": LEADERSHIP_BENEFIT_HTML,
        "benefit_text": LEADERSHIP_BENEFIT_TEXT,
    },
    "armor-proficiency-light-115": {
        "prerequisite_html": "<p>\n</p>",
        "prerequisite_text": "",
    },
    "armor-proficiency-medium-117": {
        "benefit_html": ARMOR_BENEFIT_HTML,
        "benefit_text": ARMOR_BENEFIT_TEXT,
        "normal_html": ARMOR_NORMAL_HTML,
        "normal_text": ARMOR_NORMAL_TEXT,
        "prerequisite_html": "<p>\n\n    \n    \n    \n    \n        Armor Proficiency (light),\n    \n</p>",
        "prerequisite_text": "Armor Proficiency (light),",
    },
    "armor-proficiency-heavy-113": {
        "benefit_html": ARMOR_BENEFIT_HTML,
        "benefit_text": ARMOR_BENEFIT_TEXT,
        "normal_html": ARMOR_NORMAL_HTML,
        "normal_text": ARMOR_NORMAL_TEXT,
        "prerequisite_html": (
            "<p>\n\n    \n    \n    \n    \n        Armor Proficiency (light),\n    \n"
            "        Armor Proficiency (medium),\n    \n</p>"
        ),
        "prerequisite_text": "Armor Proficiency (light),\nArmor Proficiency (medium),",
    },
    "verminfriend-3431": {
        "benefit_html": (
            "<p>Whenever a vermin is about to attack you, you can attempt a Charisma check "
            "(DC 15 + 1/4 the vermin's HD) as an immediate action. If you succeed, the "
            "vermin cannot attack you for 24 hours.</p>"
            "<p>If you attack a vermin that has been affected by this feat, you lose the "
            "feat's benefit for 24 hours.</p>"
        ),
        "benefit_text": (
            "Whenever a vermin is about to attack you, you can attempt a Charisma check "
            "(DC 15 + 1/4 the vermin's HD) as an immediate action. If you succeed, the "
            "vermin cannot attack you for 24 hours.\n"
            "If you attack a vermin that has been affected by this feat, you lose the "
            "feat's benefit for 24 hours."
        ),
    },
    "kuo-toan-monasticism-1730": {
        "benefit_html": (
            "<p>As a swift action, a kuo-toa can smear a strange, sticky substance on its "
            "hands. When using flurry of blows, the kuo-toa automatically hits with one of "
            "its extra attacks if its first attack hits. A kuo-toa that has this feat uses "
            "Hit Dice, rather than character level, to determine its Stunning Fist save "
            "DC.</p>"
        ),
        "benefit_text": (
            "As a swift action, a kuo-toa can smear a strange, sticky substance on its "
            "hands. When using flurry of blows, the kuo-toa automatically hits with one of "
            "its extra attacks if its first attack hits. A kuo-toa that has this feat uses "
            "Hit Dice, rather than character level, to determine its Stunning Fist save DC."
        ),
        "prerequisite_html": (
            "<p>\n\n    \n    \n    \n    \n        Kuo-toa,\n    \n"
            "        Flurry of blows,\n    \n</p>"
        ),
        "prerequisite_text": "Kuo-toa,\nFlurry of blows,",
    },
    "improved-familiar-1484": {
        "benefit_html": (
            SRD_IMPROVED_FAMILIAR_INTRO_HTML
            + SRD_IMPROVED_FAMILIAR_TABLE_HTML
            + SRD_IMPROVED_FAMILIAR_ALT_TABLE_HTML
            + PG_FR_TABLE_HTML
        ),
        "benefit_text": SRD_IMPROVED_FAMILIAR_INTRO_TEXT + "\n" + PG_FR_TABLE_TEXT,
        "prerequisite_html": (
            "<p>\n\n    \n    \n    \n    \n        Ability to acquire a new familiar,\n    \n"
            "        compatible alignment,\n    \n        sufficiently high level (see below),\n    \n</p>"
        ),
        "prerequisite_text": (
            "Ability to acquire a new familiar,\ncompatible alignment,\n"
            "sufficiently high level (see below),"
        ),
    },
    "improved-familiar-1485": {
        "benefit_html": (
            SRD_IMPROVED_FAMILIAR_INTRO_HTML
            + SRD_IMPROVED_FAMILIAR_TABLE_HTML
            + SRD_IMPROVED_FAMILIAR_ALT_TABLE_HTML
            + "<p>See also the Forgotten Realms Campaign Setting (Table 1-6) and "
            "Races of Faerûn (Table A-5) for additional improved familiars available "
            "with this feat.</p>"
        ),
        "benefit_text": (
            SRD_IMPROVED_FAMILIAR_INTRO_TEXT
            + "\nSee also the Forgotten Realms Campaign Setting (Table 1-6) and "
            "Races of Faerûn (Table A-5) for additional improved familiars available "
            "with this feat."
        ),
        "prerequisite_html": (
            "<p>\n\n    \n    \n    \n    \n        Ability to acquire a new familiar,\n    \n"
            "        compatible alignment,\n    \n        sufficiently high level (see below),\n    \n</p>"
        ),
        "prerequisite_text": (
            "Ability to acquire a new familiar,\ncompatible alignment,\n"
            "sufficiently high level (see below),"
        ),
    },
    "improved-familiar-1486": {
        "benefit_html": (
            SRD_IMPROVED_FAMILIAR_INTRO_HTML
            + SRD_IMPROVED_FAMILIAR_TABLE_HTML
            + SRD_IMPROVED_FAMILIAR_ALT_TABLE_HTML
            + SK_FR_TABLE_HTML
        ),
        "benefit_text": SRD_IMPROVED_FAMILIAR_INTRO_TEXT + "\n" + SK_FR_TABLE_TEXT,
        "prerequisite_html": (
            "<p>\n\n    \n    \n    \n    \n        Ability to acquire a new familiar,\n    \n"
            "        compatible alignment,\n    \n        sufficiently high level (see below),\n    \n</p>"
        ),
        "prerequisite_text": (
            "Ability to acquire a new familiar,\ncompatible alignment,\n"
            "sufficiently high level (see below),"
        ),
    },
}


def main() -> None:
    with FEATS_PATH.open(encoding="utf-8") as handle:
        feats = json.load(handle)

    patched = 0
    for feat in feats:
        slug = feat.get("slug")
        if slug not in PATCHES:
            continue
        feat.update(PATCHES[slug])
        patched += 1

    with FEATS_PATH.open("w", encoding="utf-8") as handle:
        json.dump(feats, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print(f"Patched {patched} feats in {FEATS_PATH}")


if __name__ == "__main__":
    main()
