# Unearthed Arcana (`UA`) — Data Review

Reviewed: 2026-08-19  
Dataset: `dndtools-reference/data/dndtools/`  
Site route: `/sources/UA`

## Record counts

| Category | Index | Full JSON | Status |
|----------|------:|----------:|--------|
| classes | 50 | 50 | OK |
| feats | 95 | 95 | OK |
| spells | 2 | 2 | OK |
| domains | 0 | 0 | OK |
| races | 0 | 0 | OK |
| items | 0 | 0 | OK |
| skills | 0 | 0 | OK |
| rules | 0 | 0 | OK |
| monsters | 0 | 0 | OK |
| psionics | 0 | 0 | OK |
| deities | 0 | 0 | OK |
| templates | 0 | 0 | OK |

No index/full mismatches. `source.abbrev` matches `index.source_abbrev` (`UA`) on all UA records. `source.name` is "Unearthed Arcana" (not the cosmetic "Core" mislabel).

## Classes (50)

UA is mostly **alternate class variants** (hit die `—` + "retained from base class" prose), **paragon classes**, **prestige alternate-entry** classes, **NPC classes**, **tainted/scion** prestige classes, and standalone alternates.

| Group | Count | Status |
|-------|------:|--------|
| Base-class / specialist variants (`—` hit die + variant prose) | 21 | OK — expected UA variant pattern |
| Standalone alternates / prestige / paragons / NPC | 27 | OK after earlier patches; see warnings |
| Expert / Warrior | 2 | Warnings — empty `class_skills` by design |

`audit_source.py UA`: 0 errors, 2 warnings (Expert, Warrior).

### Fixes already in dataset

- **Elf Paragon** (`elf-paragon-1002`): `hit_die` patched to `d6`.
- **Battle Sorcerer** (`battle-sorcerer-119`): `skill_points` patched to `2+ Int`.

### Accepted warnings

- **Expert** (`expert2-124`) and **Warrior** (`warrior2-135`): no `class_skills` array — UA text is "choose any twelve/six skills"; description prose documents this.
- Several named alternates (Divine Bard, Cloistered Cleric, Totem Barbarian, Paladin of Freedom/Slaughter/Tyranny, Urban Ranger, Domain Wizard, Thug, etc.) keep `—` skill points or empty `class_skills` because they inherit from a PH base class. Audit treats this as variant prose, not an error.

### Upstream garbled class text (not patched)

`Paladin of Slaughter` (`paladin-of-slaughter-126`) and `Paladin of Tyranny` (`paladin-of-tyranny-127`) have broken sentences where the scraper wrapped neighboring phrases in spell links. Same text is on new.dndtools.org:

- Slaughter **Detect Good** reads as using "paladin's ability to smite evil".
- Slaughter **Deadly Touch** follow-up reads as "just as an paladin's aura of courage class feature".
- Slaughter **Associates** names "paladin of tyranny" instead of slaughter.

Advancement tables and most feature headings are present. Leave as upstream scrape quality; do not invent replacement rules text.

### Spot-checks (JSON + local site)

All returned HTTP 200:

| Record | Route | Result |
|--------|-------|--------|
| Bardic Sage | `/classes/bardic-sage-118` | d6, 6+ Int, class skills, spellcasting prose, advancement |
| Elf Paragon | `/classes/elf-paragon-1002` | d6, Elfsight, spells per day |
| Tainted Sorcerer | `/classes/tainted-sorcerer-881` | d8, Blood Component, requirements |
| Barbarian Variant | `/classes/barbarian-variant-950` | retained-from-base prose, no standalone table (expected) |
| Paladin of Tyranny | `/classes/paladin-of-tyranny-127` | advancement table + features; Detect Good sentence still garbled |
| Expert | `/classes/expert2-124` | "Choose any twelve skills" in description |

## Feats (95)

All 95 have description/benefit content. Types: Trait 35, General 25, Spelltouched 17, Flaw 13, Item Creation 5.

Spot-checked: Aggressive (`aggressive-47`, 200), Inatenttive (`inatentive-1600`, 200).

### Naming quirks (accepted)

- **Inatenttive** (`inatentive-1600`, Trait p. 88) vs **Inattentive** (`inattentive-1601`, Flaw p. 91): two different UA entries that share a name in the book. Trait is the complex-skill-check variant; Flaw is −4 Listen/Spot. Typo is upstream; slug left unchanged.
- **Weapon Group (Slings and Thrown Weapons)** (`weapon-group-slings-and-thrown-weapon-3121`): display name was truncated (missing `s)`); patched locally. Slug kept.

## Spells (2)

Both are Luck-domain-only (empty `classes[]` is correct):

- **Auspicious Odds** (`auspicious-odds-3523`) — Evocation, Luck 3, description OK
- **Auspicious Odds, Mass** (`auspicious-odds-mass-3524`) — Luck 5, description OK

Domain slug `luck-100` exists (PH Luck domain; UA spells are inserted into that list). Site `/spells/auspicious-odds-3523` 200.

## Scraper errors

Two `errors.json` hits are **false positives** from the `UA` substring filter:

- `feats/ritual-transference-3782` (contains "ua")
- `classes/planar-vanguard-1043` (contains "ua")

Neither is an Unearthed Arcana record.

## Verdict

**Reviewed with warnings** — no Bard-style stubs, no index/full mismatches, spell domain links resolve. Remaining gaps: Expert/Warrior pick-N skills, garbled Paladin of Slaughter/Tyranny sentences (upstream), Inatenttive typo (upstream).

## Follow-up

- [ ] Re-import if production DB is stale: `cd web && npx tsx prisma/import-dndtools.ts` or `/docker-entrypoint.sh import`
- [ ] Optional: model Expert/Warrior "pick N skills" in UI instead of empty `class_skills`
- [ ] Optional: re-scrape Paladin of Slaughter/Tyranny if classic HTML is cleaner than new.dndtools.org
