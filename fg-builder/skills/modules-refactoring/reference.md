# Modules refactoring — per-category checks

FG validation rules and web→FG field maps when refactoring `.mod` files against `dndtools-reference/data/dndtools/`.

Filter web records: `record["index"]["source_abbrev"] == "{ABBREV}"` (fallback: `record["source"]["abbrev"]`).

## Common (all entities)

| Check | Error if | Fix from web |
|-------|----------|--------------|
| Name present | `<name>` empty or wrong | `name` |
| Source flavor | Missing book tag | Add `<flavor>` or source string matching module |
| Record exists in web | Module has entity web lacks | Verify abbrev mapping; may be arkalseif-only — document |
| Web record missing in module | Web has entity module lacks | Add record (see category section) |

---

## Classes

### FG required structure

```xml
<class>
  <category name="Book Title">
    <slug>
      <name type="string">...</name>
      <hitdie type="string">d8</hitdie>
      <bab type="string">Medium</bab>
      <fort type="string">Good</fort>
      <ref type="string">Bad</ref>
      <will type="string">Good</will>
      <classtype type="string">base|prestige</classtype>
      <skillranks type="number">2</skillranks>
      <classskills type="string">Climb (Str), Craft (Int), ...</classskills>
      <requirements type="formattedtext">...</requirements>
      <classfeatures>...</classfeatures>
      <text type="formattedtext"><!-- intro + prereq paragraphs + features + advancement table --></text>
    </slug>
  </category>
</class>
```

### Checks

| Check | Severity | Rule |
|-------|----------|------|
| Description | error | `<text>` has overview and/or feature prose |
| Class features | **error** | `<classfeatures>` non-empty for every class with feature prose in web JSON |
| Advancement table | error | Prestige/base with `advancement[]` need Level/BAB/Fort/Ref/Will/Special table |
| Table not merged | **error** | Prerequisites must **not** be a `<table>` adjacent to Advancement |
| Advancement heading | **error** | Use `<p><b>Advancement</b></p>` — never `<h4>Advancement</h4>` after a table (FG swallows h4 into prior cell) |
| Column headers | error | Headers match columns: Level, BAB, Fort, Ref, Will, Special, Spellcasting* |
| Spellcasting column | warning | Include only when any `advancement[]` row has `spellcasting` |
| Hit die / skill points | error | Must not be empty/`—` unless UA variant with inheritance prose |
| Class skills | **error** | `Skill (Abl)` with real abilities — never `(Non)` |
| Saves | **error** | Only `Good` or `Bad` — never `Poor` / empty when progression known |
| Requirements | warning | Prestige: clean labeled paragraphs from web `requirements_html` |
| Spell hooks | warning | Caster classes: feature named `Spells` or `Spells per Day`; text includes "score equal to 10 + spell level" |
| Unknown skills | warning | Skill name must exist in 3.5E ruleset (Scry, Control Shape, etc.) |

### Known failure modes (dndtools → FG)

| Symptom in FG | Root cause | Required fix |
|---------------|------------|--------------|
| Prerequisites list glued to Advancement; "Advancement" inside last prereq cell | Prereqs emitted as indented 1-column `<table>` then `<h4>Advancement</h4>` | Paragraphs for prereqs; `<p><b>Advancement</b></p>` before table |
| FEATURES tab empty | Web has no `class_features`; adapter forgot to parse `description_html` | Parse `<strong>Name:</strong>` paragraphs **and** `<h4>` sections into `classfeatures` |
| Fort/Ref/Will show `-` | Save progression set to `Poor` | Map to `Bad` |
| Skills show `(Non)` | `ability` missing on web skill links; code used `"None"[:3]` | Ability lookup map (`Concentration`→`Con`, …) |
| One-word-per-row prerequisites | Web `requirements_html` has label/value on separate lines | Reassemble tokens into structured Alignment/Skills/Feats/… |

### Web → FG field map

| Web JSON | FG XML |
|----------|--------|
| `name` | `<name>` |
| `hit_die` | `<hitdie>` (`d6`, or prefix `d` if numeric) |
| `skill_points` | `<skillranks>` (parse leading number) |
| advancement BAB pattern | `<bab>` Fast/Medium/Slow |
| advancement saves (level-1 ≥ +2 → Good) | `<fort>`, `<ref>`, `<will>` Good/Bad only |
| `class_skills[]` + ability lookup | `<classskills>` |
| `requirements_html` → structured | `<requirements>` + prereq paragraphs in `<text>` |
| `description_html` intro | start of `<text>` |
| `description_html` features | `<classfeatures>` + feature prose in `<text>` |
| `advancement[]` | HTML table in `<text>` under `<p><b>Advancement</b></p>` |

### Feature extraction rules

1. **Strong paragraphs** (Complete books): `<p><strong>Radiance:</strong> …</p>` or `<strong>Divine Health (Ex):</strong>` → one `classfeatures` node (`name`, optional `type`, `level` from prose or advancement special).
2. **H4 sections** (UA totems/variants): `<h4>Ape Totem Class Features</h4>` + following `<p>`/`<ul>` until next h4 → one feature; convert `<ul>`→`<list>` for FG.
3. Level: prefer “at Nth level” / “starting at Nth level” in body; else match name against `advancement[].special`.

### Advancement table template

| Level | BAB | Fort | Ref | Will | Special | Spellcasting |
|-------|-----|------|-----|------|---------|--------------|
| 1st | +0 | +2 | +0 | +2 | Feature name | +1 level of existing arcane spellcasting class |

Build from web `advancement[]` rows. Omit Spellcasting column when no row has `spellcasting`. UA variants with empty `advancement[]` and “retained from base class” prose: skip table (info, not error).

### Table integrity checks

1. Prerequisites in `<text>` must be `<p>` blocks — **zero** `<table>` for prereqs.
2. Exactly one Advancement `<table>` when `advancement[]` is non-empty.
3. No `</table><h4>Advancement</h4><table>` pattern.
4. Compare Advancement row count to `len(advancement[])`.
5. Spot-check level 1 and max level rows against web JSON.
6. Audit: `python scripts/audit_class_modules.py` after every regen.

### Regeneration path

```bash
cd fg-builder
python -m scraper.build_from_dndtools          # all books
python scripts/audit_class_modules.py          # class structural gate
python scripts/spotcheck_classes.py            # sample FG XML sanity
```

Adapter: `scraper/dndtools_adapter.py` (`convert_class`, `_split_class_description`, `_parse_requirements_structured`).
Converter: `scraper/fg/converters/classes.py` (indent=False prereqs; Advancement as `<p><b>`).

## Feats and flaws

### FG required structure

```xml
<feat>
  <slug>
    <name type="string">Power Attack</name>
    <type type="string">General</type>
    <summary type="string">Trade attack bonus for damage</summary>
    <prerequisites type="string">Str 13</prerequisites>
    <benefit type="formattedtext"><p>...</p></benefit>
    <normal type="formattedtext"><p>...</p></normal>
    <special type="formattedtext"><p>...</p></special>
    <flavor type="string">( Complete Divine )</flavor>
  </slug>
</feat>
```

### Checks

| Check | Severity | Rule |
|-------|----------|------|
| Prerequisites separate | **error** | `<prerequisites>` plain string only — no Benefit/Special prose |
| Benefit not in prereqs | **error** | Mechanical text in `<benefit>`, not `<prerequisites>` |
| Benefit present | error | `<benefit>` must have content (from `benefit_html`) |
| Summary | warning | Plain one-liner for FG list view |
| Type | warning | General, Fighter, Metamagic, Item Creation, etc. |
| Flaws | info | Same section rules; type may indicate flaw |

### Known bad pattern (arkalseif / early scrape)

```xml
<!-- ERROR: benefit merged into prerequisites -->
<prerequisites type="string">Str 13, Benefit On your action, before making attack rolls...</prerequisites>
<benefit type="formattedtext"><p /></benefit>
```

**Fix:** Look up web JSON; split fields:

| Web field | FG field | Format |
|-----------|----------|--------|
| `prerequisite_text` | `<prerequisites>` | plain string |
| `benefit_html` | `<benefit>` | formattedtext |
| `normal_html` | `<normal>` | formattedtext |
| `special_html` | `<special>` | formattedtext |
| `description_html` (short) | `<summary>` | plain string (first sentence) |

Strip HTML from prerequisites: use `prerequisite_text`, not `prerequisite_html`.

### Flaws

Filter web feats where `type` contains "Flaw" or name appears in flaw lists. Same XML shape; ensure benefit describes the flaw's mechanical penalty/restriction.

---

## Spells

### FG reference spell structure

```xml
<spell>
  <category name="Book Title">
    <slug>
      <name type="string">Fireball</name>
      <school type="string">Evocation [Fire]</school>
      <level type="string">Sor/Wiz 3</level>
      <castingtime type="string">1 standard action</castingtime>
      <components type="string">V, S, M</components>
      <range type="string">Long (400 ft. + 40 ft./level)</range>
      <effect type="string">20-ft.-radius spread</effect>
      <duration type="string">Instantaneous</duration>
      <save type="string">Reflex half</save>
      <sr type="string">Yes</sr>
      <description type="string">...</description>
      <shortdescription type="string">...</shortdescription>
      <actions>...</actions>
    </slug>
  </category>
</spell>
```

### Header field checks

| Check | Severity | Rule |
|-------|----------|------|
| save | warning | Required field; use `None` when no save |
| sr | warning | Required field; use `No` or `Yes` |
| school, level, castingtime | error | Must match web |
| effect vs actions | info | `<effect>` = PHB target/area line; `<actions>` = automation |

### Web → FG header map

| Web JSON | FG XML |
|----------|--------|
| `school` + descriptors | `<school>` e.g. `Evocation [Fire]` |
| `classes[]` → level string | `<level>` e.g. `Clr 3, Sor/Wiz 2` |
| `casting_time` | `<castingtime>` |
| `components` | `<components>` |
| `range` | `<range>` |
| `area` or `effect` | `<effect>` |
| `duration` | `<duration>` |
| `saving_throw` | `<save>` |
| `spell_resistance` | `<sr>` |
| `description_text` | `<description>`, `<shortdescription>` (truncated) |

### Spell automation (required when rules support it)

Every spell with saves, damage, healing, or conditions needs an `<actions>` block.

#### Layer 1 — FG spellset actions

Follow [fg-35e-spell-action-mapping.md](../reference/fantasy-grounds/fg-35e-spell-action-mapping.md):

| Action | When | Key fields |
|--------|------|------------|
| `cast` (order 1) | Always for targeted/save spells | `savetype`, `onmissdamage`, `srnotallowed`, `atktype`, `school`, `othertags` |
| `damage` (order 2+) | Energy/typed damage | `dice`, `dicestat` (`cl`, `halfcl`), `dicestatmax`, `type` |
| `heal` | Healing spells | `heallist`, `stat`, `statmax` |
| `effect` | Simple conditions | `label` (title case: `Entangled`, `Paralyzed`), `durmod`, `durunit` |

Parse patterns from `description_text`:
- `"1d6 points of fire damage per caster level (maximum 10d6)"` → damage d6, dicestat halfcl, max 10
- `"Reflex half"` → cast savetype reflex, onmissdamage half
- `"Will negates"` → cast savetype will
- `"Spell Resistance: No"` → srnotallowed 1

Reference implementation: `fg-builder/scraper/fg/spell_actions.py`.

#### Layer 2 — Better Effects (BCE/BCEG)

Use [fg-35e-effect-creation](../fg-35e-effect-creation/SKILL.md) when:

| Pattern | BCE approach |
|---------|--------------|
| Initial save on apply | `SAVEA: [SDC] FORTITUDE` |
| Re-save each round | `SAVES:` or `SSAVES:` (BCE Gold, Applied By = caster) |
| Damage on failed save | `SAVEDMG: NdX` |
| Different pass vs fail | Helper effects + `SAVEADD` / `SAVEADDP` |
| Ongoing damage every round | `SDMGOS:` (BCE Gold) |
| Passive mod while active | Standard tags: `ATK`, `SAVE`, `AC`, `SKILL` |

Attach BCE strings to:
- Spell `<actions>` effect action `label` field (when FG accepts extended labels), or
- Custom effect definitions referenced by the spell, or
- Documented helper effects the DM applies from spell description

#### Layer 3 — AURA (AoE Effects extension)

For persistent areas (clouds, emanations, desecrate-like zones):

```
Spell Name; IF: !DYING; AURA: 20 all,point,fogcloud; SAVEA: 14 FORTITUDE; SAVES: 14 FORTITUDE; SAVEADD: Helper Name
```

| Spell pattern | AURA setup |
|---------------|------------|
| Fixed cloud (stinking cloud) | Marker token at center + `AURA: N all,point,visual` |
| Emanation from caster | `AURA:` on caster CT row, no `point` flag |
| Mobile aura | `AURA:` on creature; `sticky` if effect persists after leaving |

Do **not** confuse with item `<aura>` (magic item school strength like `ModerateTransmutation`).

### Psionic powers

Same automation rules as spells. Additional header fields from web `psionics.json`:

| Web JSON | FG field |
|----------|----------|
| `power_points` / `index.pp` | Display in level or description |
| `index.discipline` | School-like discipline string |
| `manifesting_time` | `<castingtime>` |
| `display` | Append to components or description |

Place under `<spell>` with psionic category or dedicated book category node.

---

## Items

### FG item structure

```xml
<item>
  <category name="Book Title">
    <slug>
      <name type="string">Absorbing Shield</name>
      <aura type="string">StrongTransmutation</aura>
      <cl type="number">17</cl>
      <cost type="string">50,170 gp</cost>
      <weight type="number">15</weight>
      <type type="string">Shield</type>
      <description type="formattedtext"><p>...</p></description>
      <effectlist />
    </slug>
  </category>
</item>
```

### Checks

| Check | Severity | Rule |
|-------|----------|------|
| Description | error | Non-empty formattedtext from web |
| Aura / CL / cost | warning | Fill from web when magical |
| Correct FG type | **error** | Weapon/armor/shield items must not be generic Wondrous |
| Complete record | error | No name-only stubs |
| effectlist | info | Populate when mechanical bonuses apply |

### Item type classification

| Description signal | FG `<type>` |
|--------------------|-------------|
| "*+N* heavy/light/medium armor", "breastplate", "chain shirt" | `Armor` (or specific slot) |
| "*+N* shield", "buckler", "tower shield" | `Shield` |
| "*+N* longsword", named magic weapon | Weapon category (`Melee`, `Ranged`, etc.) |
| Amulet, cloak, ring, belt (no base weapon/armor) | `Wondrous` or body slot |
| Potion, scroll, wand, staff, rod | `Potion`, `Scroll`, `Wand`, `Staff`, `Rod` |
| Mundane gear from equipment.json | Match `kind`: weapon, armor, goods |

**Wondrous mis-type fix:** If description says "This *+1 heavy steel shield*…" but `<type>` is empty or Wondrous → set `Shield`, keep enhancement in description and effectlist.

### Web → FG map

| Web JSON | FG XML |
|----------|--------|
| `name` | `<name>` |
| `aura` | `<aura>` (concatenate school+strength if split) |
| `caster_level` | `<cl>` |
| `price` / `index.price` | `<cost>` |
| `weight` | `<weight>` |
| `description_html` | `<description>` |
| Derived from description | `<type>` |
| Mechanical bonuses | `<effectlist>` entries |

### Mundane equipment (`equipment.json`)

| Web field | FG field |
|-----------|----------|
| `kind: weapon` | `<type>` weapon + damage/critical in description |
| `kind: armor` | `<type>` Armor + AC bonus in description |
| `damage_m`, `critical`, `handed` | Include in `<description>` |

---

## Races

### FG race structure

Follow [race-fg-wiki-json](../race-fg-wiki-json/SKILL.md) and [fg-35e-race-trait-mapping.md](../reference/fantasy-grounds/fg-35e-race-trait-mapping.md).

### Checks

| Check | Severity | Rule |
|-------|----------|------|
| Description | error | Racial traits in `<text>` or `<racialtraits>` |
| Size / type | error | Match web `size`, `type` |
| LA | warning | Level adjustment when non-zero |
| Trait names | warning | FG-compatible trait slugs |

### Web → FG map

| Web JSON | FG XML |
|----------|--------|
| `name` | `<name>` |
| `size` | `<size>` |
| `type` | `<type>` |
| `speed` | `<speed>` or in traits |
| `description_html` | `<text>` + parse into `<racialtraits>` |
| `level_adjustment` | `<leveladjustment>` or trait text |

---

## Monsters

Add when web `monsters.json` has records for the abbrev.

### FG NPC structure

Follow [npc-fg-wiki-json](../npc-fg-wiki-json/SKILL.md).

### Checks

| Check | Severity | Rule |
|-------|----------|------|
| Stat block | error | AC, HP, HD, saves, abilities |
| CR | error | Match web `challenge_rating` |
| Attacks | warning | `attack` / `full_attack` from web |
| Special abilities | warning | From web `special_abilities[]` or description |

### Web → FG map

| Web JSON | FG XML |
|----------|--------|
| `name` | `<name>` |
| `armor_class` | `<ac>` |
| `hit_dice` | `<hd>` |
| `hit_points` or derived | `<hp>` |
| `str`–`cha` | `<strength>`, etc. |
| `fortitude`, `reflex`, `will` | `<fort>`, `<ref>`, `<will>` |
| `challenge_rating` | `<cr>` |
| `attack`, `full_attack` | `<atk>`, `<fullatk>` |
| `special_abilities[]` | `<specialattacks>`, `<specialqualities>` |
| `description_html` | `<text>` notes |

Place under `<npc>` with book category.

---

## Deities

Add when web `deities.json` has records for the abbrev.

### FG structure (reference nodes)

Deities may live as reference entries or formatted notes depending on ruleset extensions. Minimum viable node:

```xml
<reference>
  <category name="Deities">
    <deityslug>
      <name type="string">Pelor</name>
      <alignment type="string">NG</alignment>
      <pantheon type="string">General</pantheon>
      <text type="formattedtext">
        <p>Portfolio: Sun, Light, Healing. Domains: Good, Healing, Strength, Sun. Favored weapon: mace (heavy).</p>
      </text>
    </deityslug>
  </category>
</reference>
```

Adapt container tag to match target module's existing deity section if present.

### Checks

| Check | Severity | Rule |
|-------|----------|------|
| Description | error | Portfolio, worshipers, dogma from web |
| Alignment / pantheon | warning | From web index |
| Domains / favored weapon | warning | Parsed from description or web links |

### Web → FG map

| Web JSON | FG field |
|----------|----------|
| `name` | `<name>` |
| `index.alignment` | `<alignment>` |
| `index.pantheon` | `<pantheon>` |
| `description_html` | `<text>` (portfolio, domains, favored weapon, clerics) |

---

## Domains

Add when web `domains.json` has records for the abbrev.

### FG structure

```xml
<domain>
  <category name="Book Title">
    <domainslug>
      <name type="string">War</name>
      <text type="formattedtext">
        <p><b>Granted Power:</b> ...</p>
        <p><b>Domain Spells:</b></p>
        <list>...</list>
      </text>
    </domainslug>
  </category>
</domain>
```

Adapt to module conventions if a `<domain>` section already exists.

### Checks

| Check | Severity | Rule |
|-------|----------|------|
| Granted power | error | From web description |
| Spell list | error | Spells by level (1–9) |
| Deity links | info | Cross-ref optional |

### Web → FG map

| Web JSON | FG field |
|----------|----------|
| `name` | `<name>` |
| `description_html` | `<text>` with granted power + spell list |
| `domain_spells[]` | Spell list by level in formattedtext |

---

## Cross-reference checks

| Link type | Rule |
|-----------|------|
| Spell → class | Every web `classes[].slug` should resolve in module or core ruleset |
| Feat prereqs | Named feats/classes in prereq string should exist |
| Domain spells | Named spells should exist in module or SRD |
| Item references | Scrolls/potions reference spell names that exist |

---

## Diff workflow (module vs web)

1. Load web records for `{ABBREV}` per category; build `{name: record}` map.
2. Parse module `db.xml` sections; build `{name: node}` map per category.
3. Report:
   - **In web only** → add to module
   - **In module only** → verify abbrev mapping; may be legacy arkalseif extra
   - **In both** → run category checks above
4. Prioritize **errors** before warnings.
5. Run `python scraper/review_modules.py {mod}` after rebuild.

---

## Import note

Fixing web JSON does not update modules automatically. Module refactor uses web JSON as read-only ground truth from `dndtools-reference/data/dndtools/`. If web data is wrong, fix via [source-evaluation](../../dndtools-reference/skills/source-evaluation/SKILL.md) first, then re-run module refactor.
