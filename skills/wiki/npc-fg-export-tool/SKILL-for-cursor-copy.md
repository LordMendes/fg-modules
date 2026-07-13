---
name: npc-fg-wiki-json
description: >-
  Generates partial or complete JSON compatible with the wiki Export NPC (FG) tool
  to paste at #/tools/npc-fg-export. Use when the user asks for wiki JSON,
  exportable NpcFgExportState, or to fill DR/SR/spells before XML.
---

# JSON for the wiki — Export NPC (Fantasy Grounds)

## Goal

Emit a JSON object the wiki form accepts via **Paste JSON → Apply**. Merge is **deep over defaults** — see `wiki/src/tools/npc-fg-export/mergeState.ts`.

Shared conventions: `docs/09-recursos/fantasy-grounds/fg-export-json-conventions.md`.

## Canonical source

Mirror **`NpcFgExportState`** in `wiki/src/tools/npc-fg-export/types.ts`. XML from `buildXml.ts`.

## FG XML structure (root)

```xml
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
```

## Canonical format (`NpcFgExportState`)

| Block | Useful fields |
|-------|--------------|
| `meta` | `rootVersion`, `rootDataversion`, `rootRelease` — copy from a real FG NPC export when possible. |
| `identity` | `name`, `alignment`, `creatureTypeTag`, `cr`, `advancement`, `organization`, `environment`, `treasure`, `levelAdjustment`, `locked`. |
| `defense` | `ac`, `hp`, `hd`, `fort`, `ref`, `will`, `init` (totals, numbers). |
| `abilities` | `str`, `dex`, `con`, `int`, `wis`, `cha`. |
| `offense` | `atk`, `fullatk`, `babgrp`, `speed`, `spaceReach`, `specialattacks`. |
| `aura`, `senses`, `languages`, `feats`, `skills` | Free strings. |
| DR / SR | `dr`, `spellResistance`, `immunities`, `resistances`, `vulnerabilities`, `specialqualitiesExtra`, or `useLegacySpecialqualitiesOnly` + `specialqualitiesManual`. |
| `spellcasting` | `enabled`, `mode`, `label`, `casterLevel`, `dcAbility`, `dcMisc`, `slots[]`, `spells[]`, `spellsetXmlOverride`. |
| `spellDisplayMode` | e.g. `"action"`. |

## Spell rows (`NpcFgSpellRow`)

Flat metadata + optional automation actions. Names resolve against SRD library via `srdSpellLookup.ts`.

| Field | Notes |
|-------|-------|
| `level`, `name`, `prepared` | Slot level 0–9; prepared count. |
| `schoolShort`, `schoolFull`, `levelStr`, `castingTime`, `components`, `range`, `area`, `duration`, `save`, `sr`, `short`, `description`, `othertags` | Spell metadata. |
| `savetype` | `fort`, `reflex`, or `will` — for cast action. |
| `srNotAllowed` | `true` when SR is No/harmless. |
| `atktype` | `rtouch`, `mtouch`, or `ranged`. |
| `onmissdamage` | `"half"` for Reflex-half area spells. |
| `action2` | Single follow-up: damage, heal, or effect. |
| `actions` | Array of follow-up actions (overrides `action2` when both set). |

### Spell list shorthand

```json
"spells": [
  { "level": 1, "spells": ["bless", "command"] },
  "detect magic",
  { "level": 1, "name": "Inflict Light Wounds", "prepared": 1 }
]
```

Name-only entries lookup SRD metadata + `action2` from library when available.

## Spell action schema

See `docs/09-recursos/fantasy-grounds/fg-35e-spell-action-mapping.md`.

```json
"action2": { "type": "damage", "dice": "d8", "dicestat": "cl", "dicestatmax": 5, "dmgType": "negative" }
"action2": { "type": "heal", "dice": "2d8", "statmax": 10 }
"action2": { "type": "effect", "label": "Dazzled", "durmod": 1, "durunit": "minute" }
```

## Expected output

1. Valid JSON in a single ` ```json ` block.
2. Fragments OK for nested objects.
3. Numbers as numbers; booleans as `true`/`false`.
4. Complex casters: use `spellsetXmlOverride` with raw FG XML when needed.

## Minimal example

```json
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
```

## Spellcasting with actions example

```json
{
  "spellcasting": {
    "enabled": true,
    "mode": "preparation",
    "label": "Cleric",
    "casterLevel": 5,
    "dcAbility": "wisdom",
    "slots": [3, 4, 3, 1, 0, 0, 0, 0, 0, 0],
    "spells": [
      { "level": 1, "name": "Inflict Light Wounds", "prepared": 1 }
    ]
  }
}
```

Library supplies `action2` damage for Inflict Light Wounds automatically.

## Common mistakes

| Wrong | Right |
|--------|-------|
| `"savetype": "Fortitude"` | `"savetype": "fort"` |
| `"dmgType": "fire"` missing on damage `action2` | Always set `dmgType` |
| Effect `label: "dazzled"` | `"Dazzled"` (FG title case) |
| `area` confused with effect action | `area` = target line; `action2.type: "effect"` = condition |
| Replacing spell list when you only have FG XML | Use `spellsetXmlOverride` |
| Inventing `meta` versions | Copy from exported NPC when possible |

## Campaign canon

JSON/XML for FG does not replace a sheet in `docs/05-pessoas/npcs/` when the NPC is fixed world canon.

## Relation to other skills

- Conventions: `docs/09-recursos/fantasy-grounds/fg-export-json-conventions.md`
- Spell actions: `docs/09-recursos/fantasy-grounds/fg-35e-spell-action-mapping.md`
- 3.5 rules: `.cursor/skills/dnd-35/SKILL.md`
- Export Spell (FG): `.cursor/skills/spell-fg-wiki-json/SKILL.md`
- Markdown → Python XML: `.cursor/skills/npc-doc-to-fantasy-grounds/SKILL.md`
- Export Class / Race / Feat (FG): sibling `*-fg-wiki-json` skills.
