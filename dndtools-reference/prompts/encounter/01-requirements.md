# 01. Requirements

Fantasy Grounds 3.5E combat tracker features mapped onto this VTT. Phase numbers are the implementation order.

M = must in that phase. S = should if time. L = later. X = out of scope.

## Tracker and turn engine

| Feature | FG behavior | Phase | Us |
|---|---|---|---|
| Start / end combat | CT "Clear / Reset", round counter reset | 0 | M |
| Round counter | Increments when init wraps | 0 | M (exists) |
| Next actor | Next actor button, skips inactive | 0 | M (skip dead/removed) |
| Roll initiative (all, NPCs only, one) | CT menu: roll init for all / NPCs | 0 | M |
| Init tiebreak | init + initMod/100 ordering | 0 | M |
| Manual init edit and drag reorder | Edit field, drag row | 0 | M (edit), S (drag) |
| Set active actor by click | Click init column arrow | 0 | M |
| Delay / ready / act now | Change init, re-sort | 0 | S |
| Faction friend / foe / neutral | Colored token frame | 0 | M (exists) |
| Active / visible / identified toggles per NPC | CT toggles | 0 | M |
| Space / reach | Fields on row | 0 | M (exists) |
| Remove combatant, remove all NPCs, clear all effects, clear targets | CT menu | 0 | M |
| Wounds, temp HP, nonlethal | Three fields | 0 | M |
| Health band | Healthy / Light / Moderate / Heavy / Critical / Dying / Dead | 0 | M (extend bands) |
| Death and dying (0 disabled, -1 to -9 dying, -10 dead, massive damage) | Auto "Dying" / "Dead" effects | 0 | M |
| Stabilize checks per round for dying | Manual in FG | 0 | S (prompt DM) |

## Targeting

| Feature | FG behavior | Phase | Us |
|---|---|---|---|
| Multi-target by current actor | Target mode, Ctrl+click | 0 | M (exists) |
| Target arrows on map | Yes | 0 | M (exists) |
| Clear targets for actor / all | CT menu | 0 | M |
| Target by dropping roll on row | Drag attack onto CT entry | 0 | M (drag and click alternative) |
| Owner PC targets any time (not only on turn) | Yes | 3 | M |
| AOE pointer selects tokens inside as targets | Pointer targeting | 1 | M |
| Auto target on hit | Option | 3 | L |

## Attacks and damage

| Feature | FG behavior | Phase | Us |
|---|---|---|---|
| Attack type melee / ranged / touch / ranged touch / grapple | Attack tag | 0 | M |
| Resolve vs AC / touch / flat-footed | Automatic per type and target state | 0 | M |
| Natural 1 auto miss, natural 20 auto hit | Yes | 0 | M |
| Critical threat and confirmation roll | `[CRITICAL THREAT]` then confirm roll | 0 | M |
| Crit multiplier applied to damage, extra crit-only dice | Yes | 0 | M |
| Typed damage packets (fire, slashing, magic, ...) | `[TYPE: fire (2d6=7)]` | 0 | M |
| DR n/type with bypass tags | `DR: 10 magic` | 0 | M |
| Energy resistance, immunity, vulnerability | `RESIST`, `IMMUNE`, `VULN` | 0 | M |
| Regeneration and fast healing per round | `REGEN`, `FHEAL` | 0 | M |
| Nonlethal damage | Nonlethal field | 0 | M |
| Half damage (on save) | `[HALF]` | 1 | M |
| Ongoing damage effects | `DMGO: 1d6 fire` | 0 | S |
| Concealment / total concealment miss chance | `CONC`, `TCONC` | 0 | S |
| Cover AC bonus | `COVER`, `SCOVER` | 0 | S |
| Sneak attack / precision damage vs immune | precision tag | 0 | S |
| Modifier stack (ad hoc +2, -4 for next roll) | Modifier box | 0 | M |
| Iterative full attack | One roll per attack | 0 | M (exists for PCs, add NPC) |
| DM rolls PC attacks from tracker | Drag from CT | 0 | M (PC attacks on row) |

## Saves, spells, healing

| Feature | FG behavior | Phase | Us |
|---|---|---|---|
| Roll save vs DC for targets | Drop save DC on row, target rolls | 1 | M (DM roll now, player prompt Phase 3) |
| Save bonuses from effects | `SAVE: 2 morale`, `FORT: 2` | 0 | M (engine), 1 (UI) |
| Spell cast action: attack or save DC, SR check | Cast button | 1 | M |
| SR check: CL + 1d20 vs SR | `[SR]` | 1 | M |
| Damage / heal / effect follow-up actions from spell | Action buttons | 1 | M |
| Dice scaling by caster level | `dicestat cl` | 1 | M |
| Spell slot / prepared consumption | Counter | 1 | M (PC), S (NPC) |
| Heal (to max, temp HP, remove nonlethal) | `[HEAL]` | 0 | M |
| NPC spell and SLA list on row | Spells tab | 1 | M |
| Player rolls own save when asked | Save request | 3 | M |
| Metamagic / DC overrides | Manual edit | 1 | S |

## Effects

| Feature | FG behavior | Phase | Us |
|---|---|---|---|
| Free-text effect string with tags | `Label; ATK: 1; AC: 2 dodge` | 0 | M |
| Standard 3.5e conditions as presets | Prone, Stunned, ... | 0 | M |
| Duration in rounds/min/hours, decrement on source init | Yes | 0 | M |
| Expire at start or end of turn | Yes | 0 | M |
| Apply mode all / once / roll / single | Yes | 0 | S (all, once) |
| Visibility visible / hidden / GM | Yes | 0 | M |
| Active / inactive toggle | Yes | 0 | M |
| Effect from spell action with dice duration | Yes | 1 | M |
| Ability score modifiers with derived changes | `STR: -4` | 0 | S |
| Negative levels | `NLVL` | 0 | L |

## Log and feedback

| Feature | FG behavior | Phase | Us |
|---|---|---|---|
| Combat log lines for every action | Chat window | 0 | M |
| Per-viewer wording (players see bands, not numbers) | GM-only whispers | 0 | M |
| Undo last damage/heal on a row | Manual | 3 | M |
| HP and condition on tokens | Token health bar, effect icons | 2 | M |
| Dead / prone token markers | Overlay | 2 | M |
| Hit / miss / crit / damage floaters | No (chat only) | 2 | M |
| Projectile and burst animations for attacks and spells | No | 2 | M |
| Reduced motion respected | n/a | 2 | M |

## Encounter lifecycle

| Feature | FG behavior | Phase | Us |
|---|---|---|---|
| Add encounter preset to CT | Encounter record | 0 | M (exists) |
| Encounter Builder (EL) sends to campaign | n/a | 3 | S |
| XP award on end combat | Party sheet XP | 3 | S |
| Remove dead NPCs, keep PCs | Clear NPCs | 0 | M |
| Rest (heal per day, remove nonlethal) | Rest button | 3 | S |

## Explicitly out of scope

- Pathfinder combat maneuvers, 5e advantage, any non-3.5e rule.
- Automatic movement or attacks of opportunity detection.
- Full automation of grapple checks (roll only, DM adjudicates).
- Programmable macros, scripting, or Lua-like effect extensions.
- Mobile layout of the tracker (desktop first, same as the map).
