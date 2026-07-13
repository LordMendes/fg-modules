# FG 3.5E — spell action mapping

Reference for spellset entries (NPC/PC `<spellset>` blocks) with automation actions.

Source: `docs/09-recursos/fantasy-grounds/alderhaven-sede-npcs/generate_npc_xml.py`, FG `manager_spell.lua`, exported NPC XML.

## Action block structure

Each spell in a spellset has an `<actions>` node with ordered child actions:

| Order | `type` | Purpose |
|-------|--------|---------|
| 1 | `cast` | Cast action — DC, save type, SR, school, tags |
| 2+ | `damage` / `heal` / `effect` | Mechanical follow-up (optional) |

## Cast action (`type: "cast"`)

| Field | Type | Notes |
|-------|------|-------|
| `order` | number | Always `1` |
| `othertags` | string | Semicolon-separated FG tags, e.g. `"fire; one; "` |
| `replacedcstatmod` | number | Caster ability modifier (set by spellset DC ability) |
| `school` | string | Short school slug: `evocation`, `necromancy`, … |
| `savetype` | string | `fort`, `reflex`, or `will` — omit if no save |
| `atktype` | string | `rtouch`, `mtouch`, or `ranged` when spell needs attack roll |
| `onmissdamage` | string | `"half"` for Reflex half on area spells |
| `srnotallowed` | number | `1` when SR is No or harmless |
| `stype` | string | Always `"spell"` |
| `type` | string | Always `"cast"` |

### Common `othertags` tokens

`zero`, `one`, `two`, `fire`, `cold`, `acid`, `electricity`, `sonic`, `negative`, `healing`, `harmless`, `creation`, `compulsion`, `mindaffecting`, `light`, `force`.

Trailing semicolon + space is normal: `"fire; one; "`.

## Damage action (`type: "damage"`)

| Field | Type | Notes |
|-------|------|-------|
| `order` | number | `2` when single follow-up |
| `damagelist/id-00001/dice` | dice | e.g. `d8`, `d6` |
| `damagelist/id-00001/bonus` | number | Flat bonus (often `0`) |
| `damagelist/id-00001/dicestat` | string | `"cl"` for per-caster-level scaling |
| `damagelist/id-00001/dicestatmax` | number | Max dice count (e.g. `5` for 1d8+1/level max +5) |
| `damagelist/id-00001/type` | string | Energy/type: `fire`, `cold`, `negative`, `force`, … |

## Heal action (`type: "heal"`)

| Field | Type | Notes |
|-------|------|-------|
| `heallist/id-00001/dice` | dice | e.g. `2d8` |
| `heallist/id-00001/stat` | string | `"cl"` for +1/level |
| `heallist/id-00001/statmax` | number | Max bonus (e.g. `10` for Cure Moderate) |
| `heallist/id-00001/statmult` | number | Usually `1` |

## Effect action (`type: "effect"`)

Applies a FG condition label to the target. Label must match FG vocabulary.

| Field | Type | Notes |
|-------|------|-------|
| `label` | string | Condition name — see table below |
| `durdice` | dice | Empty string for fixed duration |
| `durmod` | number | Duration multiplier (e.g. `1`) |
| `durunit` | string | `round`, `minute`, `hour`, `day`, or `""` for rounds |

### Recognized effect labels (common)

`Blinded`, `Dazzled`, `Deafened`, `Entangled`, `Exhausted`, `Fatigued`, `Frightened`, `Grappled`, `Helpless`, `Nauseated`, `Panicked`, `Paralyzed`, `Prone`, `Shaken`, `Sickened`, `Stunned`, `Unconscious`, `Dazed`, `Invisible`, `Confused`, `Cowering`, `Disabled`, `Petrified`, `Staggered`.

Capitalization matters — use title case as FG expects.

## Spell node fields (spellset entry)

Separate from action `effect` — the spell node's `<effect type="string">` is the **target/area** line (PHB "Effect" column):

- `"Creature touched"`, `"Ray"`, `"20-ft.-radius spread"`, etc.

Do not confuse with `type: "effect"` actions.

## JSON shorthand (`action2`)

NPC and spell export tools accept a single follow-up action as `action2`:

```json
{ "type": "damage", "dice": "d8", "dmgType": "negative", "dicestat": "cl", "dicestatmax": 5 }
{ "type": "heal", "dice": "2d8", "statmax": 10 }
{ "type": "effect", "label": "Dazzled", "durmod": 1, "durunit": "minute" }
```

Or a full `actions[]` array for multi-step spells.

## Reference vs spellset

| Mode | XML wrapper | Has `<actions>` |
|------|-------------|-----------------|
| `reference` | `<spells><slug>` library node | No |
| `spellset` | `<id-NNNNN>` inside NPC spellset | Yes |
