---
name: feat-fg-wiki-json
description: >-
  Generates partial or complete JSON compatible with the wiki Export Feat (FG) tool
  to paste at #/tools/feat-fg-export. Use when the user asks for wiki JSON,
  exportable FeatFgExportState, or to fill feat benefit/summary before XML.
---

# JSON for the wiki — Export Feat (Fantasy Grounds 3.5E)

## Goal

Emit a JSON object the wiki form accepts via **Apply JSON**. Merge is **deep over defaults**.

Shared conventions: `docs/09-recursos/fantasy-grounds/fg-export-json-conventions.md`.

## Canonical source

Mirror **`FeatFgExportState`** in `wiki/src/tools/feat-fg-export/types.ts`. XML from `buildXml.ts` / `3.5E-basicrules/client.xml` `<feats>` nodes.

## FG XML structure

```xml
<feats>
  <alertness>
    <name type="string">Alertness</name>
    <type type="string">General</type>
    <mult type="number">0</mult>
    <stack type="number">0</stack>
    <benefit type="formattedtext">
      <p>You get a +2 bonus on all Listen checks and Spot checks.</p>
    </benefit>
    <special type="formattedtext">
      <p>The master of a familiar gains the benefit of the Alertness feat whenever the familiar is within arm's reach.</p>
    </special>
    <summary type="string">+2 bonus on Listen and Spot checks</summary>
  </alertness>
</feats>
```

## Canonical format (`FeatFgExportState`)

| Block | Fields |
|-------|--------|
| `recordSlug` | XML slug (e.g. `"alertness"`). From name if empty. |
| `encoding` | Default `"utf-8"`. |
| `identity.name` | Display name. |
| `identity.type` | `"General"`, `"Fighter"`, `"Metamagic"`, `"Item Creation"`, etc. |
| `identity.mult` | Number — can feat be taken multiple times (usually `0`). |
| `identity.stack` | Number — do multiples stack (usually `0`). |
| `identity.prerequisites` | Plain string (optional). |
| `identity.summary` | **Plain string** — one-line summary for FG list. |
| `benefit` | FG HTML — **required** (`<p>...</p>`). |
| `normal` | FG HTML — what happens without the feat (optional). |
| `special` | FG HTML — exceptions (optional). |
| `flavor` | FG HTML — italic flavor (optional). |

## Expected output

1. Valid JSON in a single ` ```json ` block.
2. Fragments OK.

## Example — Alertness

```json
{
  "recordSlug": "alertness",
  "identity": {
    "name": "Alertness",
    "type": "General",
    "mult": 0,
    "stack": 0,
    "prerequisites": "",
    "summary": "+2 bonus on Listen and Spot checks"
  },
  "benefit": "<p>You get a +2 bonus on all Listen checks and Spot checks.</p>",
  "special": "<p>The master of a familiar gains the benefit of the Alertness feat whenever the familiar is within arm's reach.</p>"
}
```

## Example — Power Attack

```json
{
  "recordSlug": "powerattack",
  "identity": {
    "name": "Power Attack",
    "type": "Fighter",
    "mult": 0,
    "stack": 0,
    "prerequisites": "Str 13",
    "summary": "Trade attack bonus for damage bonus"
  },
  "benefit": "<p>On your action, before making attack rolls for a round, you may choose to subtract a number from all melee attack rolls and add the same number to all melee damage rolls. This number may not exceed your base attack bonus.</p>",
  "normal": "<p>Without this feat, you attack and deal damage normally.</p>"
}
```

## Common mistakes

| Wrong | Right |
|--------|-------|
| `summary` as HTML | `summary` is plain string only |
| `benefit` as plain text | Wrap in `<p>...</p>` (formattedtext) |
| `recordSlug: "Power Attack"` | `powerattack` (slug, no spaces) |
| Putting prerequisites in `benefit` | Use `identity.prerequisites` string |
| `type: "Combat"` when SRD says Fighter | Use SRD feat type from source |

## Relation to other skills

- Conventions: `docs/09-recursos/fantasy-grounds/fg-export-json-conventions.md`
- 3.5 rules: `.cursor/skills/dnd-35/SKILL.md`
- Export Class / Race / Spell / NPC (FG): sibling `*-fg-wiki-json` skills.
