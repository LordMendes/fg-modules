# Dungeon Master's Guide — Module Refactor

Refactored: 2026-10-21
Module: modules/Dungeon Master's Guide.mod
Web source: `DMG` — /sources/DMG
Compat report: [reviews/v3/dungeon-master-s-guide.md](v3/dungeon-master-s-guide.md)

## Record counts (module vs web)

| Category | Module | Web | Delta |
|----------|-------:|----:|------:|
| classes | 32 | 32 | 0 |
| feats | 15 | 15 | 0 |
| spells | 1 | 1 | 0 |
| items | 247 | 247 | 0 |
| races | 0 | 0 | 0 |
| monsters | 0 | 0 | 0 |
| deities | 0 | 0 | 0 |
| domains | 0 | 0 | 0 |
| psionics | 0 | 0 | 0 |

`items.json` has 247 DMG records. There is no DMG equipment file. Rules (142 web records) are not an FG category in this builder. The source checklist's older item count of 246 is short of the current JSON.

## Fixes applied

### Classes

Reviewed all 32 records: 5 NPC classes, 16 prestige classes, 11 epic progressions.

- NPC tables (Aristocrat, Commoner, Expert, Warrior) had been stored as level plus one number. BAB and saves now come from the HTML table. Warrior is Fast / Good Fort. Commoner is Slow with bad saves. Aristocrat and Expert are Medium with a good Will.
- Dwarven Defender's AC bonus column is no longer shifted into Special. Level 1 special is Defensive stance 1/day.
- Epic classes keep the core class BAB and saves (Fighter Fast, good Fort, bad Ref and Will; Wizard Slow, bad Fort, good Will; Paladin good Will). The site table used one +1/+5 bonus column for every epic class. Displayed rows are the continued 3.5 totals.
- Duelist had null requirements. Restored from the SRD prestige entry: Base Attack Bonus +6, Perform 3 ranks, Tumble 5 ranks, Dodge, Mobility, Weapon Finesse. It is a prestige class.
- Feature labels in italics, such as Arcane Archer's Imbue Arrow, are class features. Headings no longer swallow later features (Blackguard fiendish servant, Horizon Walker terrains).
- Adept and the epic casters include the ability score requirement on the Spells feature.
- Expert no longer lists Truespeak, which is not a 3.5 ruleset skill.
- Class audit: 32 classes, no_features=0, bad_saves=0, (Non)=0, prereq_table=0, h4 Advancement=0.

### Feats

15 feats packaged from web JSON. Not line-reviewed in this pass.

### Spells

1 spell packaged from web JSON.

### Items

247 item records packaged. Caster level stays a number. Weapon range increment stays a number. The compat reviewer was treating both as spell-style strings and reporting false warnings. After that check, the module report is 0 errors and 0 warnings.

### Added categories

None. Web JSON has no races, monsters, deities, domains, or psionics for `DMG`.

## Spot-check notes

Checked inside the packaged module, not in the Fantasy Grounds client:

- Adept: base, d6, Slow, bad Fort, bad Ref, good Will, Spells feature present
- Arcane Archer: prestige, Fast, good Fort and Ref, bad Will, Imbue Arrow at level 2, race prerequisite kept
- Aristocrat: Medium BAB, Will +2 at level 1
- Duelist: prestige, requirements include Tumble 5 ranks and Weapon Finesse
- Epic Fighter: Fast, BAB +21 at 21st, +30 at 30th
- Epic Paladin: good Will, Will +12 at 21st

## Verdict

OK

## Follow-up

- [ ] Line-review feats, the single spell, and magic item types in Fantasy Grounds
- [ ] Full `DMG` source evaluation (rules and items) is still open on the web checklist
