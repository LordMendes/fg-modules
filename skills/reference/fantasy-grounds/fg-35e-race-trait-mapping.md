# Racial trait mapping — Fantasy Grounds 3.5E

Source of truth: `mods/working/3.5E-basicrules/client.xml` (decompiled from the official module).

Fantasy Grounds uses the trait **XML slug** and **`<name>`** to trigger automation (apply size, speed, vision bonuses, etc.). Any mismatch prevents FG from recognizing the trait.

---

## General rule

Inside each trait the pattern is:

```xml
<slug>
  <locked type="number">1</locked>
  <name type="string">Exact Name</name>
  <text type="formattedtext">
    <h>Header</h>
    <p>Description.</p>
  </text>
</slug>
```

- **`<name>`** — exact string FG displays and uses to identify the trait.
- **`<h>`** — header inside the trait body. Must match `<name>` (except `attributes`, which has different name and header).
- **Mechanical values** (darkvision range, language list, ability modifiers) go **only inside `<p>`**, never in `<name>`.

---

## Standard trait table (3.5E)

| XML slug | `<name>` | `<h>` (header) | When to use | Notes |
|---|---|---|---|---|
| `attributes` | `Attribute Adjustments` | `Ability Scores` | Race with ability modifiers | Only case where `<name>` ≠ `<h>` |
| `size` | `Medium` / `Small` / `Large` / … | `Size` | Always | Size word only |
| `speed` | `Normal Speed` | `Normal Speed` | Base speed = 30 ft. | Name and header identical |
| `speed` | `Slow Speed` | `Slow Speed` | Base speed = 20 ft. | E.g. Gnome, Halfling |
| `speed` | `Slow and Steady` | `Slow and Steady` | 20 ft. + immune to armor speed penalty | Dwarf-only in base module |
| `speed` | `Base Speed: N ft.` | `Base Speed: N ft.` | Any other value | Fallback — no speed automation |
| `vision` | `Darkvision` | `Darkvision` | Race with darkvision | Range goes in `<p>`, not in name |
| `vision` | `Low-Light Vision` | `Low-Light Vision` | Race with low-light vision | Same slug `vision`; use when there is **no** darkvision |
| `languages` | `Languages` | `Languages` | Whenever there is a starting language | Language list goes in `<p>` |
| `favoredclass` | `Favored Class: ClassName` | `Favored Class: ClassName` | Always | Replace `ClassName` with the actual class |

> **If the race has darkvision AND low-light vision:** use slug `vision` with name `Darkvision` and mention low-light vision in the same `<p>`. Do not create two `<vision>` nodes.

---

## Text templates (`<p>`) per trait

### `attributes` — Ability adjustments

```xml
<attributes>
  <locked type="number">1</locked>
  <name type="string">Attribute Adjustments</name>
  <text type="formattedtext">
    <h>Ability Scores</h>
    <p>+2 Constitution, -2 Charisma</p>
  </text>
</attributes>
```

- Use **full ability names** in English: `Strength`, `Dexterity`, `Constitution`, `Intelligence`, `Wisdom`, `Charisma`.
- Positives before negatives; comma-separated; no trailing period.
- The wiki tool generates the Effect string `ABIL: STR -4, DEX 2` to paste in the FG Effects panel.

---

### `size` — Size

**Medium:**
```xml
<size>
  <locked type="number">1</locked>
  <name type="string">Medium</name>
  <text type="formattedtext">
    <h>Size</h>
    <p>[Race] are Medium creatures and have no bonuses or penalties due to their size.</p>
  </text>
</size>
```

**Small:**
```xml
<size>
  <locked type="number">1</locked>
  <name type="string">Small</name>
  <text type="formattedtext">
    <h>Size</h>
    <p>[Race] are Small creatures and gain a +1 size bonus to Armor Class, a +1 size bonus on attack rolls, and a +4 size bonus on Hide checks, but they use smaller weapons than humans use, and their lifting and carrying limits are three-quarters of those of a Medium character.</p>
  </text>
</size>
```

---

### `speed` — Speed

**30 ft. (Normal Speed):**
```xml
<speed>
  <locked type="number">1</locked>
  <name type="string">Normal Speed</name>
  <text type="formattedtext">
    <h>Normal Speed</h>
    <p>[Race] have a base speed of 30 feet.</p>
  </text>
</speed>
```

**20 ft. (Slow Speed):**
```xml
<speed>
  <locked type="number">1</locked>
  <name type="string">Slow Speed</name>
  <text type="formattedtext">
    <h>Slow Speed</h>
    <p>[Race] have a base speed of 20 feet.</p>
  </text>
</speed>
```

**Dwarf (Slow and Steady — includes armor speed penalty immunity):**
```xml
<speed>
  <locked type="number">1</locked>
  <name type="string">Slow and Steady</name>
  <text type="formattedtext">
    <h>Slow and Steady</h>
    <p>Dwarves have a base speed of 20 feet. However, dwarves can move at this speed even when wearing medium or heavy armor or when carrying a medium or heavy load (unlike other creatures, whose speed is reduced in such situations).</p>
  </text>
</speed>
```

---

### `vision` — Darkvision

```xml
<vision>
  <locked type="number">1</locked>
  <name type="string">Darkvision</name>
  <text type="formattedtext">
    <h>Darkvision</h>
    <p>[Race] can see in the dark up to 60 feet. Darkvision is black and white only, but it is otherwise like normal sight, and [race] can function just fine with no light at all.</p>
  </text>
</vision>
```

---

### `vision` — Low-Light Vision

```xml
<vision>
  <locked type="number">1</locked>
  <name type="string">Low-Light Vision</name>
  <text type="formattedtext">
    <h>Low-Light Vision</h>
    <p>A [race] can see twice as far as a human in starlight, moonlight, torchlight, and similar conditions of poor illumination. They retain the ability to distinguish color and detail under these conditions.</p>
  </text>
</vision>
```

---

### `languages` — Languages

```xml
<languages>
  <locked type="number">1</locked>
  <name type="string">Languages</name>
  <text type="formattedtext">
    <h>Languages</h>
    <p>[Race] begin play speaking Common and [Language]. [Race] with high Intelligence scores can choose from the following: [list].</p>
  </text>
</languages>
```

---

### `favoredclass` — Favored class

```xml
<favoredclass>
  <locked type="number">1</locked>
  <name type="string">Favored Class: Fighter</name>
  <text type="formattedtext">
    <h>Favored Class: Fighter</h>
    <p>A multiclass [race]'s fighter class does not count when determining whether they take an experience point penalty.</p>
  </text>
</favoredclass>
```

For humans and half-elves (any class):
```xml
<name type="string">Favored Class: Any</name>
```

---

## Custom traits (free slug)

Traits that do not match the standard slugs above are created with any `kebab-case` slug. FG displays the trait but **does not apply specific automation** — the mechanical effect must be described in the text.

Examples from the base module:

| Slug | `<name>` | Race |
|---|---|---|
| `stonecunning` | `Stonecunning` | Dwarf |
| `stability` | `Stability` | Dwarf |
| `hardy` | `Hardy` | Dwarf |
| `magicresistance` | `Magic Resistance` | Dwarf |
| `hatred` | `Hatred` | Dwarf, Gnome |
| `defensivetraining` | `Defensive Training` | Dwarf, Gnome |
| `greed` | `Greed` | Dwarf |
| `smithing` | `Smithing` | Dwarf |
| `weapons` | `Weapon Familiarity` | Dwarf, Elf, Gnome, Halfling |
| `elvenimmunities` | `Elven Immunities` | Elf, Half-elf |
| `keensenses` | `Keen Senses` | Elf, Gnome, Half-elf, Halfling |
| `illusionresistance` | `Illusion Resistance` | Gnome |
| `gnomemagic` | `Gnome Magic` | Gnome |
| `alchemy` | `Alchemy` | Gnome |
| `spelllikeabilities` | `Gnome Spell-Like Abilities` | Gnome |
| `silvertongue` | `Silver Tongue` | Half-elf |
| `elvenblood` | `Elven Blood` | Half-elf |
| `orcblood` | `Orc Blood` | Half-orc |
| `surefooted` | `Sure-Footed` | Halfling |
| `halflingluck` | `Halfling Luck` | Halfling |
| `fearless` | `Fearless` | Halfling |
| `bonusfeat` | `Bonus Feat` | Human |
| `skilled` | `Skilled` | Human |

---

## Common mistakes to avoid

| Mistake | Correct |
|---|---|
| `<name>Normal Speed (30 ft.)</name>` | `<name>Normal Speed</name>` |
| `<name>Darkvision (60 ft.)</name>` | `<name>Darkvision</name>` |
| `<name>Languages: Common, Dwarven</name>` | `<name>Languages</name>` |
| `<name>Attribute Adjustments</name>` + `<h>Attribute Adjustments</h>` | `<name>Attribute Adjustments</name>` + `<h>Ability Scores</h>` |
| `<name>Size: Medium</name>` | `<name>Medium</name>` |
| `<name>Favored Class</name>` | `<name>Favored Class: Fighter</name>` |
| Slug `lowlightvision` for low-light | Slug `vision` with `<name>Low-Light Vision</name>` |
| `<h>Speed</h>` for 30 ft. speed | `<h>Normal Speed</h>` (same as `<name>`) |

---

## Wiki tool

The **Race Export (FG)** tool at `#/tools/race-fg-export` generates all standard traits above automatically with correct names and headers. Custom traits (free slug) are added manually through the interface.

For PFRPG, see `mods/working/PFRPG - Races (Linked)/common.xml` — slugs and names differ.
