/** Cursor skill text for generating NPC FG JSON (DnD Helper NPC Creator). */
export const NPC_FG_SKILL_MARKDOWN = `---
name: npc-fg-wiki-json
description: >-
  Generates partial or complete JSON compatible with the DnD Helper
  NPC Creator (#/tools/npc-creator) Paste JSON → Apply. Use when the user asks
  for wiki JSON, exportable NpcFgExportState, or to fill DR/SR/spells before XML.
---

# JSON for NPC Creator — Export NPC (Fantasy Grounds)

## Goal

Emit a JSON object the NPC Creator accepts via **Paste JSON → Apply**.
Merge is **deep over defaults** (or stacked onto the current NPC with conflict resolution).

Canonical types live in \`dndtools-reference/web/src/lib/npc-creator/types.ts\`.
XML from \`buildXml.ts\`.

## FG XML structure (root)

\`\`\`xml
<root version="5.1" dataversion="..." release="9|CoreRPG:7">
  <npc>
    <name type="string">...</name>
    <ac type="string">...</ac>
    <hp type="number">42</hp>
    <feats type="string">Alertness, Weapon Focus</feats>
    <spellmode type="string">preparation</spellmode>
    <spellset>...</spellset>
    <specialqualities type="string">DR 10/magic; SR 22</specialqualities>
    ...
  </npc>
</root>
\`\`\`

## Canonical format (\`NpcFgExportState\`)

| Block | Useful fields |
|-------|--------------|
| \`meta\` | \`rootVersion\`, \`rootDataversion\`, \`rootRelease\` |
| \`identity\` | \`name\`, \`alignment\`, \`creatureTypeTag\`, \`cr\`, \`advancement\`, \`organization\`, \`environment\`, \`treasure\`, \`levelAdjustment\`, \`locked\` |
| \`defense\` | \`ac\`, \`hp\`, \`hd\`, \`fort\`, \`ref\`, \`will\`, \`init\` (totals) |
| \`abilities\` | \`str\`, \`dex\`, \`con\`, \`int\`, \`wis\`, \`cha\` |
| \`offense\` | \`atk\`, \`fullatk\`, \`babgrp\`, \`speed\`, \`spaceReach\`, \`specialattacks\` |
| \`aura\`, \`senses\`, \`languages\`, \`feats\`, \`skills\` | Free strings |
| DR / SR | \`dr\`, \`spellResistance\`, \`immunities\`, \`resistances\`, \`vulnerabilities\`, \`specialqualitiesExtra\` |
| \`notesFormattedHtml\` | FG HTML for the NPC **Notes** block — written to \`<text type="formattedtext">\` in XML (\`buildXml.ts\`) |
| \`magicalEffectsNotes\` | Plain-text magical-effects line; appended as \`<p><b>Magical effects:</b> …</p>\` after \`notesFormattedHtml\` |
| \`spellcasting\` | \`enabled\`, \`mode\`, \`label\`, \`casterLevel\`, \`dcAbility\`, \`dcMisc\`, \`slots[]\`, \`spells[]\`, \`spellsetXmlOverride\` |
| \`media\` | \`picturePath\`, \`tokenPath\`, \`token3DPath\` (FG paths); data URLs are preview-only |

## Formatted notes (\`notesFormattedHtml\`)

NPC lore, tactics, and GM reminders live in the FG **Notes** pane. Set \`notesFormattedHtml\` to FG HTML (not Markdown, not a full HTML document).

**References**

- FG HTML tags and rules: \`fg-builder/skills/reference/fantasy-grounds/fg-export-json-conventions.md\` (section **FG HTML-like text**)
- XML output: \`dndtools-reference/web/src/lib/npc-creator/buildXml.ts\` → \`<text type="formattedtext">\`
- Import round-trip: \`parseNpcFgXml.ts\` reads the same block back into \`notesFormattedHtml\`

**Allowed tags** (same as class/feat/race exports): \`<p>\`, \`<list><li>\`, \`<b>\`, \`<i>\`, \`<h>\`, \`<table>\`.

**Example**

\`\`\`json
{
  "notesFormattedHtml": "<p><b>Tactics:</b> Opens with <i>bless</i>, then closes to melee.</p><list><li>Will flee below 10 HP</li><li>Speaks Elven and Common</li></list>",
  "magicalEffectsNotes": "+2 deflection to AC (ring of protection +2)"
}
\`\`\`

Use \`magicalEffectsNotes\` for a separate **Magical effects** line; keep long narrative text in \`notesFormattedHtml\`.

## Attack lines (\`offense.atk\` / \`offense.fullatk\`)

FG stores attacks as plain strings in \`<atk>\` and \`<fullatk>\`. Fantasy Grounds parses the parenthetical for damage and critical info — always include it when known.

### Format (Monster Manual style)

\`\`\`
Attack +BAB melee|ranged (damage[/threat[/×multiplier]])
\`\`\`

- **\`atk\`**: best single attack — usually highest-damage melee, or the creature's primary natural attack.
- **\`fullatk\`**: full attack routine; list every attack, separated by \` and \` or \` or \`.
- Always include **weapon or attack name**, **bonus**, **mode** (\`melee\` / \`ranged\`), and a **damage parenthetical**. Never leave \`"Weapon +5 melee"\` without \`(…)\` damage.
- **Threat range** (critical range): append \`/19-20\` or \`/18-20\` when not the default 20.
- **Multiplier**: append \`/×3\` or \`/×4\` when not ×2. Combine when both differ from default, e.g. \`(1d6+2/18-20)\` or \`(1d12+4/×3)\`.
- **Iterative attacks**: repeat the bonus after a slash — \`Longsword +9/+4 melee (1d8+4/19-20)\`.

### When to show crit info

| Case | Show in parenthetical | Example |
|------|----------------------|---------|
| Standard 20/×2 | damage only | \`(1d8+3)\` |
| Expanded threat | \`/19-20\` or \`/18-20\` | \`(1d8+3/19-20)\` |
| Non-×2 multiplier | \`/×3\` or \`/×4\` | \`(1d8+3/×3)\` |
| Both non-default | both parts | \`(1d6+2/18-20)\` or \`(1d12+4/×3)\` |

Do **not** append \`/x2\` or \`/20\` — those are the default and are omitted in MM stat blocks.

### Main manufactured weapons (SRD)

| Weapon | Threat / mult | Example parenthetical |
|--------|---------------|----------------------|
| Longsword, shortsword, greatsword, bastard sword, dagger | 19–20/×2 | \`(1d8+3/19-20)\` |
| Rapier, scimitar, falchion, kukri | 18–20/×2 | \`(1d6+2/18-20)\` |
| Light crossbow, heavy crossbow, hand crossbow, repeating crossbow | 19–20/×2 | \`(1d8/19-20)\` |
| Greataxe, longbow, shortbow, composite bows, lance, spear, guisarme, halberd, handaxe, warhammer | 20/×3 | \`(1d12+4/×3)\` |
| Light pick, heavy pick, scythe | 20/×4 | \`(1d6+2/×4)\` |
| Club, mace, morningstar, quarterstaff, trident, flail, sickle, javelin, sling, greatclub | 20/×2 | \`(1d8+1)\` — omit crit |

Composite bows: add Str bonus inside the parens — \`(1d8+3/×3)\`.

### Natural attacks

Most natural attacks default to **20/×2**. Omit the slash suffix unless the creature's stat block or template lists a different threat or multiplier.

| Attack | Typical damage (Medium) | Default crit |
|--------|------------------------|--------------|
| Bite | 1d6 + Str (1d8 Large, 2d6 Huge) | 20/×2 |
| Claw | 1d4 + Str (1d6 Large, 1d8 Huge) | 20/×2 |
| Gore | 1d6 + Str (1d8 Large) | 20/×2 |
| Slam | 1d4 + Str (1d6 Large, 1d8 Huge) | 20/×2 |
| Tail slap | 1d4 + Str (1d6 Large) | 20/×2 |
| Sting | 1d4 + Str | 20/×2 |
| Tentacle | 1d4 + Str (1d6 Large) | 20/×2 |
| Wing buffet | 1d4 + Str (1d6 Huge) | 20/×2 |

Natural attack rules:

- **Primary** natural attacks add full Str to damage; **secondary** attacks add **½ Str** (round down) unless the stat block says otherwise.
- **Multiattack** full lines list each attack: \`Bite +11 (2d6+6) and 2 claws +6 (1d8+3)\`.
- Poison, disease, grab, swallow, etc. belong in \`specialattacks\`, not in the damage parenthetical.
- When copying SRD monsters, use their published attack line — some templates change damage or add unusual crit (e.g. vorpal, keen weapons).

### Attack examples

Humanoid (manufactured):

\`\`\`json
"offense": {
  "atk": "Longsword +9 melee (1d8+4/19-20)",
  "fullatk": "Longsword +9/+4 melee (1d8+4/19-20)"
}
\`\`\`

Monster (natural):

\`\`\`json
"offense": {
  "atk": "Bite +11 melee (2d6+6)",
  "fullatk": "Bite +11 melee (2d6+6) and 2 claws +6 melee (1d8+3) and tail slap +6 melee (1d8+3)"
}
\`\`\`

Mixed melee / ranged:

\`\`\`json
"offense": {
  "atk": "Composite longbow +8 ranged (1d8+3/×3) or longsword +7 melee (1d8+2/19-20)",
  "fullatk": "Composite longbow +8 ranged (1d8+3/×3) or longsword +7/+2 melee (1d8+2/19-20)"
}
\`\`\`

### Modifiers that change threat range

- **Keen** (magic weapon) or **Improved Critical** (feat): double threat range — longsword 19–20 → 17–20; rapier 18–20 → 15–20.
- **Keen edge** spell: same doubling as keen.
- Expanded ranges from different sources do **not** stack; use the best single effect.

## Spell list shorthand

\`\`\`json
"spells": [
  { "level": 1, "spells": ["bless", "command"] },
  "detect magic",
  { "level": 1, "name": "Inflict Light Wounds", "prepared": 1 }
]
\`\`\`

## Minimal example

\`\`\`json
{
  "identity": {
    "name": "Captain Example (5th lvl Fighter)",
    "alignment": "Lawful Neutral",
    "cr": 5
  },
  "defense": {
    "ac": "18 (breastplate + Dex)",
    "hp": 42,
    "hd": "5d10+10",
    "fort": 7,
    "ref": 3,
    "will": 2,
    "init": 2
  },
  "abilities": { "str": 16, "dex": 14, "con": 14, "int": 10, "wis": 12, "cha": 8 },
  "offense": {
    "atk": "Longsword +9 melee (1d8+4/19-20)",
    "fullatk": "Longsword +9 melee (1d8+4/19-20)",
    "babgrp": "+5"
  }
}
\`\`\`

## Common mistakes

| Wrong | Right |
|--------|-------|
| \`"savetype": "Fortitude"\` | \`"savetype": "fort"\` |
| Missing \`dmgType\` on damage \`action2\` | Always set \`dmgType\` |
| Effect \`label: "dazzled"\` | \`"Dazzled"\` (FG title case) |
| Notes as Markdown or plain text | FG HTML in \`notesFormattedHtml\` — see **Formatted notes** above |
| \`(1d8+4)\` on longsword / crossbow | \`(1d8+4/19-20)\` — include non-default threat |
| \`(1d12+4/19-20)\` on greataxe | \`(1d12+4/×3)\` — show multiplier, not threat |
| \`(1d8+4/19-20/x2)\` | \`(1d8+4/19-20)\` — omit default ×2 |
| \`"Weapon +5 melee"\` with no damage | \`Longsword +5 melee (1d8+2/19-20)\` — name weapon + parenthetical |
| \`/19-20\` on claw/bite/slam by default | \`(1d6+2)\` — natural attacks are 20/×2 unless stat block says otherwise |

## Expected output

1. Valid JSON in a single \`\`\`json\`\`\` block (or pasteable object).
2. Fragments OK for nested objects.
3. Numbers as numbers; booleans as \`true\`/\`false\`.
`;
