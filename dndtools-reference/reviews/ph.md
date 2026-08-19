# Player's Handbook v.3.5 (`PH`) — Data Review

Reviewed: 2026-08-19  
Dataset: `dndtools-reference/data/dndtools/`  
Site route: `/sources/PH`

## Record counts

All category counts match the checklist expectations.

| Category | Expected | Index | Full JSON | Status |
|----------|----------|------:|----------:|--------|
| classes | 11 | 11 | 11 | OK |
| domains | 22 | 22 | 22 | OK |
| feats | 109 | 109 | 109 | OK |
| items | 77 | 77 | 77 | OK |
| races | 7 | 7 | 7 | OK |
| rules | 97 | 97 | 97 | OK |
| skills | 47 | 47 | 47 | OK |
| spells | 605 | 605 | 605 | OK |

## Classes (11 PH base classes)

| Class | Slug | Status |
|-------|------|--------|
| Barbarian | `barbarian-89` | OK — hit die, skills, advancement, features |
| **Bard** | **`bard`** | **Partial** — metadata patched (PH source, d6, skills, advancement); **`description_html` still null** |
| Cleric | `cleric-91` | OK |
| Druid | `druid-92` | OK |
| Fighter | `fighter-93` | OK |
| Monk | `monk-94` | OK |
| Paladin | `paladin-95` | OK |
| Ranger | `ranger-96` | OK |
| Rogue | `rogue-97` | OK |
| Sorcerer | `sorcerer-98` | OK |
| Wizard | `wizard-99` | OK |

### Bard-specific issues

1. **Only bare slug in dataset** — `bard` instead of `bard-90`; all other PH classes use `{name}-{id}`.
2. **Import alias required** — `import-dndtools.ts` maps `bard-90` -> `bard` for ~1,380 spell links.
3. **Missing class feature prose** — only PH class without `description_html` (other 10 have full feature text).
4. **No ECS campaign stub** — unlike other base classes, there is no separate `bard-XX` ECS cross-reference record (intentional upstream gap).
5. **Production** — requires redeploy + `/docker-entrypoint.sh import` for DB to pick up patched JSON.

## Other categories

Spot-check via `scripts/audit_source.py PH`:

- **feats** (109): all have description content
- **domains** (22): all have description content
- **races** (7): all have description content
- **skills** (47): all have description content
- **rules** (97): all have description content
- **items** (77): all have description content
- **spells** (605): all have description content

## Verdict

**Reviewed complete** 2026-08-19. Known follow-up: Bard `description_html` and production re-import.

## Follow-up

- [ ] Patch Bard `description_html` from classic dndtools / SRD (see `scripts/patch_bard.py`)
- [ ] Re-import production database after deploy
- [ ] Optionally rename slug to `bard-90` for consistency with other PH classes
