/** Cursor skill text for generating NPC FG JSON (Arcane Archives NPC Creator). */
export const NPC_FG_SKILL_MARKDOWN = `---
name: npc-fg-wiki-json
description: >-
  Generates partial or complete JSON compatible with the Arcane Archives
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

## Expected output

1. Valid JSON in a single \`\`\`json\`\`\` block (or pasteable object).
2. Fragments OK for nested objects.
3. Numbers as numbers; booleans as \`true\`/\`false\`.
`;
