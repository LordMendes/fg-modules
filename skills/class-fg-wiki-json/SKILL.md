---
name: class-fg-wiki-json
description: >-
  Generates partial or complete JSON compatible with the wiki Export Class (FG) tool
  to paste at #/tools/class-fg-export. Use when the user asks for wiki JSON,
  exportable ClassFgExportState, or to fill class features before XML.
---

# JSON for the wiki — Export Class (Fantasy Grounds 3.5E)

## Goal

Emit a JSON object the wiki form accepts via **Apply JSON**. Merge is **deep over defaults** — omitted keys keep default values.

Shared conventions: `docs/09-recursos/fantasy-grounds/fg-export-json-conventions.md`.

## Canonical source

Mirror **`ClassFgExportState`** in `wiki/src/tools/class-fg-export/types.ts` and merge logic in `mergeState.ts`. XML output follows `buildXml.ts` / `3.5E-basicrules/client.xml`.

## FG XML structure

```xml
<root version="2.0">
  <classes>
    <fighter>
      <bab type="string">Fast</bab>
      <classfeatures>
        <weaponandarmorproficiency_1>
          <level type="number">1</level>
          <name type="string">Weapon and Armor Proficiency</name>
          <text type="formattedtext"><p>...</p></text>
        </weaponandarmorproficiency_1>
      </classfeatures>
      <classskills type="string">Climb, Craft, ...</classskills>
      <classtype type="string">base</classtype>
      <fort type="string">Good</fort>
      <hitdie type="string">d10</hitdie>
      <name type="string">Fighter</name>
      <ref type="string">Bad</ref>
      <skillranks type="number">2</skillranks>
      <startingwealth type="string">6d4 × 10 gp</startingwealth>
      <text type="formattedtext">...</text>
      <will type="string">Bad</will>
    </fighter>
  </classes>
</root>
```

## Canonical format (`ClassFgExportState`)

| Block | Fields |
|-------|--------|
| `recordSlug` | XML node slug (e.g. `"fighter"`). Generated from name if empty. |
| `encoding` | XML declaration encoding. Default `"utf-8"`. |
| `identity` | `name`, `alignment`, `hitDie` (`"d4"`–`"d12"`), `bab` (`"Fast"`\|`"Medium"`\|`"Slow"`), `fort`/`ref`/`will` (`"Good"`\|`"Bad"`), `classType` (`"base"`\|`"prestige"`), `skillRanks` (number), `startingWealth`. |
| `classSkills` | Comma-separated skill list. |
| `features` | Array of `{ level, name, text }`. `text` is FG HTML (`<p>`, `<list>/<li>`, `<b>`, `<i>`, `<table>`). |
| `bodyText` | FG HTML for main `<text type="formattedtext">`. |

## Feature key convention (CRITICAL)

Each feature becomes `<{slug}_{level}>` where slug = lowercase name without spaces/punctuation:

| Feature | Level | XML key |
|---------|-------|---------|
| Weapon and Armor Proficiency | 1 | `weaponandarmorproficiency_1` |
| Bonus Feat | 2 | `bonusfeat_2` |

Duplicate name + level gets a numeric suffix (`bonusfeat_1`, `bonusfeat_1_2`).

## BAB and saves

| `bab` | Progression |
|-------|-------------|
| `"Fast"` | +1/level — Fighter, Barbarian, Paladin |
| `"Medium"` | +3/4 — Cleric, Rogue, Bard |
| `"Slow"` | +1/2 — Wizard, Sorcerer |

`fort` / `ref` / `will`: `"Good"` or `"Bad"` only — not numeric values.

## Expected output

1. Valid JSON in a single ` ```json ` block (no comments).
2. Fragments OK — merge completes the rest.

## Example — Fighter

```json
{
  "recordSlug": "fighter",
  "identity": {
    "name": "Fighter",
    "alignment": "Any",
    "hitDie": "d10",
    "bab": "Fast",
    "fort": "Good",
    "ref": "Bad",
    "will": "Bad",
    "classType": "base",
    "skillRanks": 2,
    "startingWealth": "6d4 × 10 gp (average 150 gp)"
  },
  "classSkills": "Climb, Craft, Handle Animal, Intimidate, Jump, Ride, Swim",
  "features": [
    {
      "level": 1,
      "name": "Weapon and Armor Proficiency",
      "text": "<p>A fighter is proficient with all simple and martial weapons and with all armor (heavy, medium, and light) and shields (including tower shields).</p>"
    },
    {
      "level": 1,
      "name": "Bonus Feat",
      "text": "<p>At 1st level, a fighter gets a bonus combat-oriented feat in addition to the feat that any 1st-level character gets and the bonus feat granted to a human character.</p>"
    }
  ],
  "bodyText": "<p><b>Alignment:</b> Any.</p>"
}
```

## Common mistakes

| Wrong | Right |
|--------|-------|
| `"bab": "+1"` or `"bab": "full"` | `"bab": "Fast"` |
| `"fort": "+2"` | `"fort": "Good"` |
| `"classType": "core"` | `"classType": "base"` or `"prestige"` |
| Feature `text` as plain prose | Wrap in `<p>...</p>` |
| Prestige class with `"classType": "base"` | `"classType": "prestige"` |
| Putting alignment only in `identity.alignment` when `bodyText` needs it | Add `<p><b>Alignment:</b> …</p>` to `bodyText` (tool injects if missing) |

## Relation to other skills

- Conventions: `docs/09-recursos/fantasy-grounds/fg-export-json-conventions.md`
- 3.5 rules: `.cursor/skills/dnd-35/SKILL.md`
- Export Race (FG): `.cursor/skills/race-fg-wiki-json/SKILL.md`
- Export Feat (FG): `.cursor/skills/feat-fg-wiki-json/SKILL.md`
- Export Spell (FG): `.cursor/skills/spell-fg-wiki-json/SKILL.md`
- Export NPC (FG): `.cursor/skills/npc-fg-wiki-json/SKILL.md`
