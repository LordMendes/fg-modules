---
name: fg-35e-equipment
description: >-
  Builds Fantasy Grounds 3.5E item records (weapons, armor/shields, goods) that
  match the official 3.5E Basic Rules module field shapes and subtype
  vocabulary. Use when converting, generating, or fixing equipment for FG
  modules, WRPG/WoW item adapters, item XML, weapon subtypes, armor numbers,
  or goods categories.
---

# FG 3.5E Equipment

Canonical source of truth for field shapes and subtype strings: the local
`3.5E-basicrules/` module (`client.xml`), when present. That folder is
gitignored; do not commit it. Prefer matching its XML over inventing new
schemas.

Repo implementation lives in:

- `fg-builder/scraper/wrpg_support.py` (`fg_weapon_fields`, `fg_armor_fields`, `fg_goods_subtype`, `fg_damage_type`)
- `fg-builder/scraper/fg/converters/items.py` (`convert_items`)
- `fg-builder/scraper/dndtools_adapter.py` (`convert_item`)
- Tests: `fg-builder/scraper/tests/test_wow_weapons.py`

Detailed field tables and XML samples: [reference.md](reference.md).

## Decision tree

1. **Weapon** (has attack dice / is a weapon) → `type` = `Weapon`
2. **Armor or shield** → `type` = `Armor` (shields are Armor with subtype `Shield`)
3. **Everything else mundane** (ammo, gear, services) → `type` = `Goods and Services`
4. **Magic / wondrous** without weapon or armor combat stats → aura/CL style item (not covered by Basic Rules mundane lists)

Never emit ammo or gear as Weapon just because it relates to combat.

## Hard rules (must match Basic Rules)

### Shared

- Typed nodes: strings use `type="string"`, numbers use `type="number"`.
- `cost` is a string (`5 gp`, `-`, `+50 gp`, `1 cp`). Not a number.
- `weight` is a number (lb as integer; fractional weights become integers in FG).
- `description` is optional `formattedtext` with `<p>` blocks.
- Empty `properties` still exists as `<properties type="string"></properties>` on weapons and armor.

### Weapons

Required fields (order used by tests / converter):

`name`, `cost`, `weight`, `damage`, `critical`, `range`, `damagetype`, `properties`, `type`, `subtype`

| Field | Rules |
| --- | --- |
| `damage` | Medium damage dice. Double weapons use `1d6/1d6`. |
| `critical` | `x2`, `x3`, or `19-20/x2` (ASCII `x`, hyphen ranges). |
| `range` | Feet as number. Melee with no throw: `0`. Thrown melee keeps a Melee subtype but nonzero range. |
| `damagetype` | Title-case first word: `Piercing`, `Slashing`, `Bludgeoning`, or `Piercing or slashing`. |
| `properties` | Only Basic Rules values seen: empty, `Double`, `Reach`, or (armor) `Special`. Use comma+space if combining (`Double, Reach`). |
| `subtype` | Exact proficiency + grip phrase (see below). |

**Subtype must include one of:** `Melee`, `Ranged`, or `Firearm`.

Canonical weapon subtypes:

- `Simple Unarmed Melee`
- `Simple Light Melee` / `Simple One-Handed Melee` / `Simple Two-Handed Melee` / `Simple Ranged`
- `Martial Light Melee` / `Martial One-Handed Melee` / `Martial Two-Handed Melee` / `Martial Ranged`
- `Exotic Light Melee` / `Exotic One-Handed Melee` / `Exotic Two-Handed Melee` / `Exotic Ranged`
- Extension used by WRPG firearms: `Exotic Firearm` (not in Basic Rules; still valid FG grip token)

Mechanics implied by subtype / properties:

- `two-handed` in subtype → 1.5× Strength damage in FG
- `Double` in properties → slash-separated damage is two heads
- `firearm` grip → do not treat as melee Strength weapon

Thrown melee examples from Basic Rules: dagger/club/spear keep Melee subtypes with `range` 10 or 20.

### Armor and shields

Required combat fields:

`name`, `cost`, `weight`, `ac`, `maxstatbonus`, `checkpenalty`, `spellfailure`, `speed30`, `speed20`, `properties`, `type`, `subtype`

| Field | Rules |
| --- | --- |
| `type` | Always `Armor` (including shields). |
| `subtype` | `Light`, `Medium`, `Heavy`, `Shield`, or `Extras`. |
| `ac` | Armor/shield bonus as number. |
| `maxstatbonus` | Max Dex. Shields usually `0` (tower shield uses `2`). |
| `checkpenalty` | Signed number (`0`, `-1`, `-10`). |
| `spellfailure` | Percent as number without `%` (`5`, not `5%`). |
| `speed30` / `speed20` | Land speed while worn. Shields and extras use `0`. |

Shields are never `type=Shield`. Armor spikes / locked gauntlet / shield spikes use subtype `Extras`.

### Goods and Services

Required: `name`, `cost`, `weight`, `type`, `subtype` (+ optional `description`).

`type` is always `Goods and Services`.

Canonical subtypes (exact casing, lowercase "and"):

- `Ammunition`
- `Adventuring Gear`
- `Special Substances and Items`
- `Tools and Skill Kits`
- `Clothing`
- `Food, Drink, and Lodging`
- `Mounts and Related Gear`
- `Transport`
- `Spellcasting and Services`

Ammunition is goods, not a weapon.

## Workflow when adding or fixing equipment

```
Task progress:
- [ ] Classify: Weapon / Armor / Goods
- [ ] Pick exact subtype string from the lists above
- [ ] Fill required typed fields (defaults: range 0, empty properties, weight 0)
- [ ] Map through wrpg_support helpers when adapting WRPG/JSON source data
- [ ] Emit via convert_items (keeps node order and typed attributes)
- [ ] Add/adjust tests in test_wow_weapons.py for new edge cases
- [ ] If 3.5E-basicrules/client.xml is available, spot-check a similar official item
```

## Do not

- Invent subtype strings like `Martial Weapon` or `Light Armor` for weapons
- Put shields under a separate top-level type
- Put `%` in `spellfailure`
- Omit `properties` / `range` on weapons (use empty string / `0`)
- Treat double-weapon slash damage as a single die without `Double`
- Commit `3.5E-basicrules/` or PDF book scans

## Quick validation

```bash
# From fg-builder/
python -m pytest scraper/tests/test_wow_weapons.py -q
```

When `3.5E-basicrules/client.xml` exists, compare a known item (for example Longsword, Padded, Arrows) before inventing a new shape.
