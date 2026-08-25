---
name: modules-refactoring
description: >-
  Refactors Fantasy Grounds 3.5E .mod rulebooks using dndtools-reference web JSON
  as ground truth. Audits and fixes classes, feats, spells, items, monsters,
  races, deities, domains, and psionics; splits feat prerequisites from
  descriptions; corrects item types; validates class advancement tables; adds
  spell automations with Better Effects and AURA syntax. Updates
  reviews/mod-source-review-checklist.md. Use when refactoring an FG module,
  fixing module content against web data, or working through
  mod-source-review-checklist.md.
---
# Modules Refactoring (FG 3.5E)

Systematic refactor of one Fantasy Grounds `.mod` rulebook in `fg-builder/`, using **dndtools-reference web JSON** as ground truth. Modeled on [source-evaluation](../../dndtools-reference/skills/source-evaluation/SKILL.md): compare module content to web data, fix structural issues, add missing categories, and sign off in the checklist.

## When to use

- User asks to refactor / audit / fix an FG module (`Complete Divine.mod`, etc.)
- Working through `reviews/mod-source-review-checklist.md`
- Module has merged feat sections, wrong item types, broken class tables, or missing spell automations
- Web JSON for the book is already reviewed (run source-evaluation first if not)

## Quick start

```bash
cd fg-builder
python -m scraper.build_from_dndtools "Complete Divine"
python scraper/review_modules.py modules --output reviews/v3 --books "Complete Divine"
```

Regenerate from dndtools web JSON (ground truth):

```bash
python -m scraper.build_from_dndtools   # all known books
python -m scraper.build_from_dndtools "Complete Divine" "Complete Warrior"  # subset
```

Staged JSON lands in `scraped/dndtools/{slug}/`; packaged `.mod` in `modules/`.

Manual workflow (patch existing scraped JSON or `.mod`):
2. Filter web JSON by `index.source_abbrev == "{ABBREV}"` (fallback: `source.abbrev`).
3. Unpack or inspect the module's `db.xml`; count records per FG section.
4. Diff module vs web counts and spot-check flagged records.
5. Refactor per category — see [reference.md](reference.md).
6. Rebuild/repack `.mod`; spot-check 3–5 records per category in Fantasy Grounds.
7. Write `reviews/{slug}.md` notes.
8. **Update `reviews/mod-source-review-checklist.md`** (required — see [Completion](#completion-required)).

## Workflow

Copy and track:

```
Modules refactor: {MODULE_NAME}
- [ ] Map module ↔ web source abbrev ({ABBREV})
- [ ] Verify web JSON quality (source-evaluation done or run audit_source.py)
- [ ] Count web records per category for {ABBREV}
- [ ] Count module db.xml records per FG section
- [ ] Diff: missing / extra / mismatched names
- [ ] Classes — description, advancement, tables, classfeatures
- [ ] Feats (+ flaws) — split prerequisites vs benefit/description
- [ ] Spells — cast/save/damage/effects (BCE + AURA when needed)
- [ ] Items — complete records, weapon/armor typing, goods
- [ ] Races — traits, LA, description
- [ ] Monsters — add from web if applicable
- [ ] Deities — add from web if applicable
- [ ] Domains — add from web if applicable
- [ ] Psionics — add from web if applicable
- [ ] Rebuild/repack .mod; FG spot-check
- [ ] Write reviews/{slug}.md
- [ ] Update reviews/mod-source-review-checklist.md (required)
```

## Severity model

| Level | Meaning | Example |
|-------|---------|---------|
| **Error** | Broken or misleading in FG | Prereqs merged into `<benefit>`; magic shield typed as Wondrous; merged advancement tables; spell with save but no cast action |
| **Warning** | Loads but incomplete | Missing `summary` on feat; spell missing `save`/`sr` (use `—` or `None` when truly N/A); class missing requirements prose |
| **Info** | Expected gap | Web has no monsters for this abbrev; UA variant with inherited base-class stats |

## Data locations

| Layer | Path |
|-------|------|
| Module (packed) | `fg-builder/modules/{Name}.mod` |
| Module (staging) | `fg-builder/reviews/v1-staging/`, `reviews/v2/` |
| Module XML | `{mod}/db.xml`, `{mod}/definition.xml` |
| Web ground truth | `dndtools-reference/data/dndtools/{category}.json` |
| Web index | `dndtools-reference/data/dndtools/.index/{category}.json` |
| Checklist | `fg-builder/reviews/mod-source-review-checklist.md` |
| Reports | `fg-builder/reviews/{slug}.md` |
| Build from web JSON | `python -m scraper.build_from_dndtools` |
| Adapter | `scraper/dndtools_adapter.py` |
| Class audit gate | `python scripts/audit_class_modules.py` |
| Class spot-check | `python scripts/spotcheck_classes.py` |

Filter web records: `record["index"]["source_abbrev"] == "{ABBREV}"` (fallback: `record["source"]["abbrev"]`).

## Source abbrev mapping

| Module (example) | Web abbrev | fg-builder scraped slug |
|------------------|------------|-------------------------|
| Complete Divine | `CD` | `complete-divine--56` |
| Book of Vile Darkness | `BV` | (check web `source.abbrev`) |
| Unearthed Arcana | `UA` | `unearthed-arcana--*` |

When abbrev is unknown, search web index JSON for `source.name` matching the module title.

## Categories covered

| Category | Web JSON | FG section | Add if missing? |
|----------|----------|------------|-----------------|
| Classes | `classes.json` | `<class>` | yes |
| Feats (+ flaws) | `feats.json` | `<feat>` | yes |
| Spells | `spells.json` | `<spell>` | yes |
| Items (magic) | `items.json` | `<item>` | yes |
| Goods (mundane) | `equipment.json` | `<item>` | yes |
| Races | `races.json` | `<race>` | yes |
| Monsters | `monsters.json` | `<npc>` | yes, if web has records |
| Deities | `deities.json` | `<deity>` or notes | yes, if web has records |
| Domains | `domains.json` | `<domain>` or `<reference>` | yes, if web has records |
| Psionics | `psionics.json` | `<spell>` (psionic category) | yes, if web has records |

Per-category checks and web→FG field maps: [reference.md](reference.md).

## Related skills and references

| Topic | Skill / doc |
|-------|-------------|
| Web JSON quality | [source-evaluation](../../dndtools-reference/skills/source-evaluation/SKILL.md) |
| Effect strings (BCE, AURA) | [fg-35e-effect-creation](../fg-35e-effect-creation/SKILL.md) |
| Spell actions | [fg-35e-spell-action-mapping.md](../reference/fantasy-grounds/fg-35e-spell-action-mapping.md) |
| FG export JSON | [fg-export-json-conventions.md](../reference/fantasy-grounds/fg-export-json-conventions.md) |
| Classes | [class-fg-wiki-json](../class-fg-wiki-json/SKILL.md) |
| Feats | [feat-fg-wiki-json](../feat-fg-wiki-json/SKILL.md) |
| Spells | [spell-fg-wiki-json](../spell-fg-wiki-json/SKILL.md) |
| Races | [race-fg-wiki-json](../race-fg-wiki-json/SKILL.md) |
| Monsters/NPCs | [npc-fg-wiki-json](../npc-fg-wiki-json/SKILL.md) |

## Refactor procedure (by category)

### 1. Feats and flaws

**Problem:** Prerequisites and benefit/description merged into one section (often all in `<prerequisites>` or `<benefit>`).

**Fix:**
1. Look up the feat in web JSON by name/slug.
2. Split using web fields: `prerequisite_text` → `<prerequisites>`, `benefit_html` → `<benefit>`, `normal_html` → `<normal>`, `special_html` → `<special>`.
3. Short intro from `description_html` goes into `<summary>` (plain string) if no dedicated summary.
4. Never put mechanical benefit text in `<prerequisites>`.

See [reference.md — Feats](reference.md#feats-and-flaws).

### 2. Items

**Problem:** Magic weapons/armor/shields typed as generic Wondrous or missing combat stats.

**Fix:**
1. Cross-check web `items.json` + `equipment.json`.
2. If description names a base weapon/armor/shield with enhancement (e.g. "*+1 heavy steel shield*"), set FG `<type>` to the correct slot (`Armor`, `Shield`, weapon category) — not Wondrous.
3. Fill aura, CL, cost, weight, description from web.
4. Encode special properties in `<effectlist>` or formatted description; link base item stats when known.

See [reference.md — Items](reference.md#items).

### 3. Classes

**Problems seen in dndtools regenerations:**
- Prerequisites rendered as a 1-column `<table>` next to Advancement → FG merges them (Advancement title appears inside the last prereq cell)
- Empty FEATURES tab → `classfeatures` never built from web `description_html`
- Saves show `-` → adapter emitted `Poor` (FG only accepts `Good`/`Bad`)
- Skills show `(Non)` → web `class_skills[]` lack ability codes; `"None"[:3]` → `Non`

**Fix (required):**
1. Prefer `python -m scraper.build_from_dndtools` — adapter in `scraper/dndtools_adapter.py` already applies these rules.
2. Prerequisites in `<text>`: **paragraphs only** (`<p><b>Alignment:</b> …</p>`), never an indented `<table>`.
3. Advancement heading: `<p><b>Advancement</b></p>` then one `<table>` — **never** `<h4>Advancement</h4>` after another table.
4. Saves: only `Good` or `Bad` (map Poor→Bad). BAB: `Fast`/`Medium`/`Slow`.
5. Class skills: `Skill (Abl)` with real abilities (`Con`, `Int`, …) via lookup if web omits them.
6. Build `classfeatures` from web prose:
   - Complete books: `<p><strong>Name (Ex):</strong> …</p>`
   - UA variants/totems: `<h4>Section</h4>` + following blocks
7. One advancement table per class from `advancement[]`; column order Level, BAB, Fort, Ref, Will, Special, Spellcasting*.
8. After rebuild, run `python scripts/audit_class_modules.py` — expect `no_features=0`, `bad_saves=0`, `(Non)=0`, `prereq_table=0`.

See [reference.md — Classes](reference.md#classes).

### 4. Spells

**Problem:** Reference-only spells with no automation; missing save/SR fields.

**Fix for every spell with mechanical effects:**

1. **Cast action** — `savetype`, `onmissdamage`, `srnotallowed`, `atktype` per [fg-35e-spell-action-mapping.md](../reference/fantasy-grounds/fg-35e-spell-action-mapping.md).
2. **Damage/heal actions** — dice + CL scaling from `description_text`.
3. **Effect actions** — simple FG condition labels (`Entangled`, `Paralyzed`, …) when a bare condition suffices.
4. **Better Effects** — use [fg-35e-effect-creation](../fg-35e-effect-creation/SKILL.md) when the spell needs prompted saves, ongoing damage, pass/fail helpers, or per-round re-saves.
5. **Auras** — fixed/mobile area effects use AoE `AURA:` syntax on the effect string (not item aura school/strength).

Decision tree for effects:

```
Area persists and affects entrants each round?
  YES → AURA: on marker token or aura source + BCE save tags
  NO → target CT effect

Save with different pass/fail outcomes?
  YES → helper effects + SAVEADD / SAVEADDP
  NO → simple effect action or standard condition name

Damage on failed save only?
  YES → SAVEDMG (not SDMGOS)
```

Fill missing header fields from web: `school`, `level`, `casting_time`, `range`, `duration`, `save`, `sr`, `components`, `description`.

See [reference.md — Spells](reference.md#spells).

### 5. Adding missing categories

When web JSON has records for `{ABBREV}` but the module lacks the FG section:

1. **Monsters** — build `<npc>` nodes from `monsters.json`; follow [npc-fg-wiki-json](../npc-fg-wiki-json/SKILL.md).
2. **Races** — build `<race>` from `races.json`; follow [race-fg-wiki-json](../race-fg-wiki-json/SKILL.md).
3. **Deities** — build deity reference nodes from `deities.json` (name, alignment, pantheon, portfolio, domains, favored weapon in formatted text).
4. **Domains** — build domain nodes from `domains.json` (granted power, spell list by level).
5. **Psionics** — treat as spells under a psionic category; map PP, discipline, manifesting time; add actions like spells.

Skip categories with zero web records for the abbrev; note "N/A" in the report.

## Remediation patterns

| Problem | Approach |
|---------|----------|
| Feat prereqs in benefit | Split using web `prerequisite_*` / `benefit_*` fields |
| Wrong item type | Re-type weapon/armor/shield; fill from web description |
| Merged class tables | Split tables; rebuild from web `advancement[]` |
| Missing spell save/SR | Fill from web; use `None` when truly no save/SR |
| No spell actions | Add `<actions>` block; use spell_actions.py patterns or manual JSON via spell-fg-wiki-json |
| Complex spell effect | Draft BCE/AURA string per fg-35e-effect-creation; attach to effect action or CT custom effect |
| Missing monsters/domains/etc. | Add section from web JSON for that abbrev |
| Bad web data | Fix JSON first via source-evaluation; re-import site; then refactor module |

After module changes:

```bash
cd fg-builder
python scraper/review_modules.py "modules/{Name}.mod"
# Repack if working on unpacked folder — see scraper/fg/packager.py
```

## Report template

Use for `reviews/{slug}.md`:

```markdown
# {Module Name} — Module Refactor

Refactored: YYYY-MM-DD
Module: modules/{Name}.mod
Web source: `{ABBREV}` — /sources/{ABBREV}

## Record counts (module vs web)

| Category | Module | Web | Delta |
|----------|-------:|----:|------:|
| classes | | | |
| feats | | | |
| spells | | | |
| items | | | |
| races | | | |
| monsters | | | |
| deities | | | |
| domains | | | |
| psionics | | | |

## Fixes applied

### Feats
(bullets)

### Spells
(bullets)

### Classes
(bullets)

### Items
(bullets)

### Added categories
(bullets or "none")

## Spot-check notes
(3–5 records verified in FG)

## Verdict
OK | Refactored with warnings | Needs follow-up

## Follow-up
- [ ] items
```

## Completion (required)

**Do not mark the refactor done until `reviews/mod-source-review-checklist.md` is updated.**

File: `fg-builder/reviews/mod-source-review-checklist.md`

### 1. Table row — mark reviewed

In `## Modules`, find the row for `{MODULE_NAME}`. Change **Done** from `- [ ]` to `- [x]`:

```markdown
| - [x] | Complete Divine | `modules/Complete Divine.mod` | [complete-divine.md](reviews/v2/complete-divine.md) |
```

### 2. Progress count

Update the line near the top:

```markdown
**Progress:** N / 13 reviewed
```

Increment `N` by 1 (count rows with `- [x]` to verify).

### 3. Review notes section

Under `## Review notes`, find `### {Module Name}` and replace placeholder `-` with bullets:

```markdown
### Complete Divine

Categories touched: classes=31, feats=56, spells=128, items=1 (+ monsters=12 added)

- **YYYY-MM-DD:** refactor — see [complete-divine.md](reviews/v2/complete-divine.md)
- **Verdict:** OK | Refactored with warnings | Needs follow-up
- Feats: split 4 merged prereq/benefit records
- Spells: added actions to 87 spells; 12 BCE/AURA effects
- (list other fixes or "no issues")
```

### 4. When not to check off

Leave `- [ ]` if:

- Known **errors** remain (merged feat sections, wrong item types on weapons/armor, broken class tables)
- User asked for assessment only, not sign-off
- Follow-ups block "refactor complete" — note them and use "Refactored with warnings"

## Reference

- Per-category FG checks and web→FG maps: [reference.md](reference.md)
- Web JSON field requirements: [source-evaluation/reference.md](../../dndtools-reference/skills/source-evaluation/reference.md)
- FG compat example: [reviews/v2/complete-divine.md](../../reviews/v2/complete-divine.md)
- Known feat merge bug (arkalseif scrape): prerequisites field containing Benefit prose — always verify against web JSON
